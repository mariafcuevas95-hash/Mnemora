import { task, logger } from "@trigger.dev/sdk/v3";
import { createClient } from "@supabase/supabase-js";
import { generateText } from "@/lib/ai";
import WebSocket from "ws";

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

async function transcribeWithGemini(buffer: Buffer, mimeType: string, subjectName: string): Promise<string> {
  const { GoogleGenerativeAI } = await import("@google/generative-ai");
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const gemini = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const base64 = buffer.toString("base64");
  const result = await gemini.generateContent([
    { inlineData: { data: base64, mimeType } },
    `Transcribe esta grabación de clase de "${subjectName}".
Devuelve ÚNICAMENTE el texto transcrito, sin comentarios adicionales.
Corrige errores obvios del habla pero conserva todo el contenido académico.
Si puedes identificar cambios de tema, sepáralos con una línea en blanco.`,
  ]);

  return result.response.text();
}

async function analyzeTranscript(transcript: string, subjectName: string): Promise<ClassAnalysis> {
  const today = new Date().toISOString().slice(0, 10);
  const resp = await generateText({
    model: "processor",
    maxTokens: 8192,
    messages: [{
      role: "user",
      content: `Eres un experto académico universitario. Analiza la siguiente transcripción de clase de "${subjectName}" y genera materiales de estudio de alta calidad.
Hoy es ${today}.

TRANSCRIPCIÓN:
${transcript.slice(0, 12000)}

Devuelve SOLO JSON válido con esta estructura exacta (sin markdown, sin comentarios):
{
  "summary": ["Punto clave 1...", "Punto clave 2..."],
  "smart_notes": "## Título del tema\\n\\n### Subtema\\n\\n- Concepto importante\\n",
  "concepts": [{"name": "Nombre del concepto", "definition": "Definición concisa y clara"}],
  "flashcards": [{"front": "¿Pregunta específica y directa?", "back": "Respuesta completa y precisa (1-2 oraciones)"}],
  "quiz": [{"question": "Pregunta de opción múltiple", "options": ["A) Opción 1", "B) Opción 2", "C) Opción 3", "D) Opción 4"], "correct": "A", "explanation": "Explicación de por qué A es correcto"}],
  "open_questions": ["¿Pregunta de reflexión profunda para estudiar antes del examen?"],
  "detected_tasks": [{"title": "Título de la tarea", "due_hint": "próximo viernes", "due_date": "2026-07-18"}],
  "detected_exams": [{"title": "Nombre del examen", "due_hint": "15 de agosto", "due_date": "2026-08-15"}]
}

Reglas estrictas:
- summary: 6-9 puntos clave en español, concisos y específicos
- smart_notes: apuntes bien organizados en Markdown (NO copiados literalmente de la transcripción)
- concepts: 8-15 conceptos académicos más importantes con definiciones claras
- flashcards: 15-22 tarjetas, frentes específicos y variados (definición, aplicación, causa-efecto, comparación)
- quiz: 6-10 preguntas MCQ con 4 opciones cada una
- open_questions: 3-6 preguntas de reflexión para preparar examen
- detected_tasks: SOLO si el profesor mencionó explícitamente tarea/trabajo/proyecto/entregar/laboratorio/ensayo/actividad
- detected_exams: SOLO si mencionó explícitamente parcial/examen/quiz/evaluación/midterm/final con alguna referencia de fecha
- Si no hay tareas o exámenes detectados, usar arrays vacíos []
- Todas las fechas absolutas en formato YYYY-MM-DD
- Todo en español`,
    }],
  });

  const raw = resp.text.replace(/```json\n?|```/g, "").trim();
  return JSON.parse(raw) as ClassAnalysis;
}

export interface ProcessClassPayload {
  classId: string;
  userId: string;
  subjectId: string;
  subjectName: string;
  source: "recording" | "audio" | "video" | "youtube";
  fileUrl: string;
  mimeType: string;
}

export const processClassTask = task({
  id: "process-class",
  maxDuration: 600,
  retry: { maxAttempts: 2, minTimeoutInMs: 5_000, factor: 2 },

  run: async (payload: ProcessClassPayload) => {
    const { classId, userId, subjectId, subjectName, fileUrl, mimeType } = payload;
    const db = getAdmin();

    logger.info("Iniciando procesamiento de clase", { classId, subjectName });

    async function setStage(status: string, stage: string) {
      await db.from("classes").update({ processing_status: status, processing_stage: stage, updated_at: new Date().toISOString() }).eq("id", classId);
    }

    try {
      // ── 1. Descargar audio ────────────────────────────────────────────────
      await setStage("transcribing", "Descargando audio...");
      const { data: audioBlob, error: downloadErr } = await db.storage.from("classes").download(fileUrl);
      if (!audioBlob || downloadErr) throw new Error(`Error descargando audio: ${downloadErr?.message}`);

      const buffer = Buffer.from(await audioBlob.arrayBuffer());
      logger.info("Audio descargado", { bytes: buffer.length, mimeType });

      // ── 2. Transcribir con Gemini ─────────────────────────────────────────
      await setStage("transcribing", "Transcribiendo con IA...");
      const transcript = await transcribeWithGemini(buffer, mimeType, subjectName);
      logger.info("Transcripción completada", { chars: transcript.length });

      await db.from("classes").update({ transcript, processing_stage: "Analizando contenido...", updated_at: new Date().toISOString() }).eq("id", classId);

      // ── 3. Análisis completo con Claude Haiku ─────────────────────────────
      await setStage("analyzing", "Generando materiales de estudio...");

      let analysis: ClassAnalysis;
      let analysisOk = true;

      try {
        analysis = await analyzeTranscript(transcript, subjectName);
      } catch (parseErr) {
        logger.error("JSON de análisis inválido", { error: String(parseErr) });
        analysisOk = false;
        analysis = {
          summary: ["Transcripción completada. El análisis completo no está disponible."],
          smart_notes: transcript.slice(0, 3000),
          concepts: [],
          flashcards: [],
          quiz: [],
          open_questions: [],
          detected_tasks: [],
          detected_exams: [],
        };
      }

      // ── 4. Persistir en paralelo ──────────────────────────────────────────
      await setStage("analyzing", "Guardando materiales...");

      let flashcardsCount = 0;
      let quizCount = 0;

      // Flashcards
      if (analysis.flashcards.length > 0) {
        const { error: fcErr } = await db.from("flashcards").insert(
          analysis.flashcards.map(f => ({
            class_id: classId,
            subject_id: subjectId,
            user_id: userId,
            front: f.front,
            back: f.back,
            source: "class",
          }))
        );
        if (!fcErr) flashcardsCount = analysis.flashcards.length;
        else logger.error("Error insertando flashcards", { error: fcErr.message });
      }

      // Quiz
      if (analysis.quiz.length > 0) {
        const { error: quizErr } = await db.from("class_quiz").insert(
          analysis.quiz.map(q => ({
            class_id: classId,
            question: q.question,
            options: q.options,
            correct_answer: q.correct,
            explanation: q.explanation,
            question_type: "multiple_choice",
          }))
        );
        if (!quizErr) quizCount = analysis.quiz.length;
        else logger.error("Error insertando quiz", { error: quizErr.message });
      }

      // Conceptos → subject_concepts
      if (analysis.concepts.length > 0) {
        await db.from("subject_concepts").upsert(
          analysis.concepts.map((c, i) => ({
            subject_id: subjectId,
            name: c.name.trim(),
            learning_order: i + 1,
          })),
          { onConflict: "subject_id,name", ignoreDuplicates: true }
        );
      }

      // Sugerencias (tareas y exámenes detectados — el usuario decide si las aprueba)
      const suggestions: DetectedSuggestion[] = [
        ...(analysis.detected_exams ?? []).filter(e => e.due_date).map(e => ({
          title: e.title,
          due_date: e.due_date,
          event_type: "exam" as const,
          due_hint: e.due_hint,
          approved: false,
        })),
        ...(analysis.detected_tasks ?? []).filter(t => t.due_date).map(t => ({
          title: t.title,
          due_date: t.due_date,
          event_type: "assignment" as const,
          due_hint: t.due_hint,
          approved: false,
        })),
      ];

      // Incrementar contador de clases del mes
      const yearMonth = new Date().toISOString().slice(0, 7);
      await db.rpc("increment_usage", { p_user_id: userId, p_year_month: yearMonth, p_field: "classes_count", p_by: 1 });

      // ── 5. Actualizar clase ───────────────────────────────────────────────
      await db.from("classes").update({
        processing_status: "done",
        processing_stage: analysisOk ? "Completado" : "Completado (análisis parcial)",
        summary: analysis.summary,
        smart_notes: analysis.smart_notes,
        open_questions: analysis.open_questions,
        detected_suggestions: suggestions,
        flashcards_count: flashcardsCount,
        quiz_count: quizCount,
        concepts_count: analysis.concepts.length,
        tasks_count: (analysis.detected_tasks ?? []).length,
        events_count: (analysis.detected_exams ?? []).length,
        updated_at: new Date().toISOString(),
      }).eq("id", classId);

      logger.info("Clase procesada exitosamente", { classId, flashcardsCount, quizCount, concepts: analysis.concepts.length });

      return { classId, flashcards: flashcardsCount, quiz: quizCount, concepts: analysis.concepts.length };

    } catch (err) {
      await db.from("classes").update({
        processing_status: "failed",
        processing_stage: "Error en el procesamiento",
        error_message: String(err),
        updated_at: new Date().toISOString(),
      }).eq("id", classId);
      logger.error("Procesamiento fallido", { classId, error: String(err) });
      throw err;
    }
  },
});

interface ClassAnalysis {
  summary: string[];
  smart_notes: string;
  concepts: { name: string; definition: string }[];
  flashcards: { front: string; back: string }[];
  quiz: { question: string; options: string[]; correct: string; explanation: string }[];
  open_questions: string[];
  detected_tasks: { title: string; due_hint: string; due_date: string }[];
  detected_exams: { title: string; due_hint: string; due_date: string }[];
}

interface DetectedSuggestion {
  title: string;
  due_date: string;
  event_type: "exam" | "assignment";
  due_hint: string;
  approved: boolean;
}
