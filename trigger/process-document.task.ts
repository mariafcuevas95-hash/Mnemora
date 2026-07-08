import { task, logger } from "@trigger.dev/sdk/v3";
import { createClient } from "@supabase/supabase-js";
import { generateText } from "@/lib/ai";
import { extractText } from "@/lib/ocr";
import WebSocket from "ws";

// Usa service_role porque corre en los servidores de Trigger.dev,
// fuera de la sesión del usuario.
function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
      realtime: { transport: WebSocket as unknown as typeof globalThis.WebSocket },
    }
  );
}

export interface ProcessDocumentPayload {
  documentId: string;
  subjectId: string;
  userId: string;
  type: "syllabus" | "document";
  subjectName?: string;
  fileUrl: string;
}

export const processDocumentTask = task({
  id: "process-document",
  maxDuration: 300, // 5 min — imposible con Vercel serverless, trivial con Trigger.dev
  retry: { maxAttempts: 2, minTimeoutInMs: 3_000, factor: 2 },

  run: async (payload: ProcessDocumentPayload) => {
    const { documentId, subjectId, userId, type, subjectName, fileUrl } = payload;
    const db = getAdmin();

    logger.info("Iniciando procesamiento", { documentId, type, subjectName });
    await db.from("documents").update({ processing_status: "processing" }).eq("id", documentId);

    try {
      // 1. Descargar PDF de Supabase Storage
      const { data: fileData, error } = await db.storage.from("documents").download(fileUrl);
      if (!fileData || error) throw new Error(`Storage download failed: ${error?.message}`);

      const buffer = Buffer.from(await fileData.arrayBuffer());

      // Validar que el contenido descargado sea un PDF real
      const header = buffer.slice(0, 5).toString("ascii");
      if (!header.startsWith("%PDF")) {
        const preview = buffer.toString("utf8", 0, 200);
        throw new Error(`Storage devolvió contenido inválido (no es PDF). Primeros bytes: ${preview}`);
      }

      // 2. OCR por niveles (digital/escaneado, STEM/no STEM)
      const { text: pdfText, strategy } = await extractText(buffer, subjectName);
      logger.info("OCR completado", { strategy, chars: pdfText.length });

      if (type === "syllabus") {
        // ── Extracción de fechas del syllabus ──────────────────────────────
        const resp = await generateText({
          model: "extractor",
          maxTokens: 1024,
          messages: [{
            role: "user",
            content: `Extrae TODAS las fechas importantes de este programa universitario latinoamericano.
Devuelve SOLO un JSON válido con este formato exacto:
{
  "events": [
    { "title": "Parcial 1", "date": "2026-03-15", "event_type": "exam" },
    { "title": "TP Grupal entrega", "date": "2026-03-28", "event_type": "project" }
  ]
}
event_type puede ser: exam, assignment, project
Si no hay fecha exacta, infiere razonablemente del contexto.

PROGRAMA DE LA MATERIA:
${pdfText.slice(0, 8000)}`,
          }],
        });

        const { events } = JSON.parse(resp.text.replace(/```json\n?|```/g, "").trim()) as {
          events: { title: string; date: string; event_type: string }[];
        };

        if (events?.length) {
          await db.from("calendar_events").insert(
            events.map(e => ({
              subject_id: subjectId,
              user_id: userId,
              title: e.title,
              event_date: e.date,
              event_type: e.event_type,
              source: "extracted",
            }))
          );
        }

        // Extraer temario del syllabus → subject_concepts (en paralelo con la DB insert de eventos)
        const conceptsResp = await generateText({
          model: "extractor",
          maxTokens: 512,
          messages: [{
            role: "user",
            content: `Del siguiente programa de materia universitario, extrae la lista de temas/conceptos académicos principales.
Devuelve SOLO JSON:
{ "concepts": ["Límites y continuidad", "Derivadas", "Regla de la cadena"] }
Máximo 30 conceptos. Solo nombres de temas, sin descripciones.

PROGRAMA DE LA MATERIA:
${pdfText.slice(0, 6000)}`,
          }],
        });

        try {
          const { concepts } = JSON.parse(conceptsResp.text.replace(/```json\n?|```/g, "").trim()) as { concepts: string[] };
          if (concepts?.length) {
            // upsert: ignorar duplicados (same subject_id + name)
            await db.from("subject_concepts").upsert(
              concepts.map((name, i) => ({ subject_id: subjectId, name: name.trim(), learning_order: i + 1 })),
              { onConflict: "subject_id,name", ignoreDuplicates: true }
            );
            logger.info("Conceptos extraídos", { count: concepts.length });
          }
        } catch { /* extracción de conceptos no es crítica */ }

        const yearMonth = new Date().toISOString().slice(0, 7);
        await db.rpc("increment_usage", { p_user_id: userId, p_year_month: yearMonth, p_field: "syllabuses_count" });
        await db.from("documents").update({ processing_status: "done" }).eq("id", documentId);

        logger.info("Syllabus procesado", { events: events?.length ?? 0 });
        return { events: events?.length ?? 0 };

      } else {
        // ── Flashcards + resumen (en paralelo) ─────────────────────────────
        const [flashcardsResp, summaryResp, conceptsResp] = await Promise.all([
          generateText({
            model: "processor",
            maxTokens: 2048,
            messages: [{
              role: "user",
              content: `Eres un experto en pedagogía universitaria. Genera flashcards de alta calidad para estudiar "${subjectName ?? "la materia"}".

Reglas para el frente (front):
- Preguntas específicas y directas (no genéricas como "¿Qué es X?")
- Varía los tipos: definición, aplicación, causa-efecto, comparación, ejemplo concreto
- Ejemplos buenos: "¿Qué distingue al empirismo de Locke del de Hume?", "¿Por qué el falsacionismo de Popper es relevante para la ciencia moderna?", "Da un ejemplo concreto del principio de inercia"

Reglas para el reverso (back):
- Respuesta completa pero concisa (1-3 oraciones)
- Incluye el concepto clave en la respuesta
- Si hay una fórmula, dato o ejemplo clave, inclúyelo

Devuelve SOLO JSON válido:
{ "flashcards": [{ "front": "pregunta específica", "back": "respuesta completa y precisa" }] }

Genera entre 15 y 25 flashcards de los conceptos más importantes del material.

MATERIAL (${subjectName ?? "materia"}):
${pdfText.slice(0, 8000)}`,
            }],
          }),
          generateText({
            model: "processor",
            maxTokens: 512,
            messages: [{
              role: "user",
              content: `Haz un resumen ejecutivo en español de este material universitario.
Máximo 5 puntos clave, en bullets. Sé conciso.

MATERIAL:
${pdfText.slice(0, 6000)}`,
            }],
          }),
          generateText({
            model: "extractor",
            maxTokens: 512,
            messages: [{
              role: "user",
              content: `De este material universitario, extrae los conceptos académicos principales.
Devuelve SOLO JSON:
{ "concepts": ["Epistemología", "Método científico", "Falsabilidad"] }
Máximo 20 conceptos. Solo nombres de temas, sin descripciones.

MATERIAL:
${pdfText.slice(0, 6000)}`,
            }],
          }),
        ]);

        const { flashcards } = JSON.parse(
          flashcardsResp.text.replace(/```json\n?|```/g, "").trim()
        ) as { flashcards: { front: string; back: string }[] };

        const summary = summaryResp.text;

        if (flashcards?.length) {
          await db.from("flashcards").insert(
            flashcards.map(f => ({
              document_id: documentId,
              subject_id: subjectId,
              user_id: userId,
              front: f.front,
              back: f.back,
            }))
          );
        }

        try {
          const { concepts } = JSON.parse(conceptsResp.text.replace(/```json\n?|```/g, "").trim()) as { concepts: string[] };
          if (concepts?.length) {
            await db.from("subject_concepts").upsert(
              concepts.map((name, i) => ({ subject_id: subjectId, name: name.trim(), learning_order: i + 1 })),
              { onConflict: "subject_id,name", ignoreDuplicates: true }
            );
            logger.info("Conceptos extraídos del documento", { count: concepts.length });
          }
        } catch { /* no crítico */ }

        await db.from("documents").update({ processing_status: "done", summary }).eq("id", documentId);

        const yearMonth = new Date().toISOString().slice(0, 7);
        await Promise.all([
          db.rpc("increment_usage", { p_user_id: userId, p_year_month: yearMonth, p_field: "summaries_count" }),
          db.rpc("increment_usage", { p_user_id: userId, p_year_month: yearMonth, p_field: "flashcards_count" }),
        ]);

        // Registrar sesión de aprendizaje para el learning engine (002_intelligence)
        await db.from("learning_sessions").insert({
          user_id: userId,
          subject_id: subjectId,
          concepts_covered: [],
          insights: null,
        });

        logger.info("Documento procesado", { flashcards: flashcards?.length ?? 0 });
        return { flashcards: flashcards?.length ?? 0, summary };
      }

    } catch (err) {
      await db.from("documents").update({ processing_status: "failed" }).eq("id", documentId);
      logger.error("Procesamiento fallido", { documentId, error: String(err) });
      throw err; // Trigger.dev reintenta automáticamente
    }
  },
});
