/**
 * Learning Engine: analiza cada intercambio del tutor y actualiza
 * el modelo cognitivo del estudiante (student_knowledge + cognitive_profile).
 *
 * Corre en Trigger.dev (sin timeout), fire-and-forget desde /api/chat.
 * El estudiante nunca espera esto — sucede en segundo plano.
 */
import { task, logger } from "@trigger.dev/sdk/v3";
import { createClient } from "@supabase/supabase-js";
import { generateText } from "@/lib/ai";

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export interface AnalyzeSessionPayload {
  userId: string;
  subjectId: string;
  subjectName: string;
  conversationId: string;
  /** Último intercambio: [user_message, assistant_response] */
  exchange: [string, string];
}

interface ConceptAnalysis {
  concept: string;
  understood: boolean;
  quality: 0 | 1 | 2 | 3 | 4 | 5; // SM-2 quality score
  errors?: string[];
}

interface SessionAnalysis {
  concepts: ConceptAnalysis[];
  overallUnderstanding: "high" | "medium" | "low";
  errorPatterns: string[];
  studyStyle: "visual" | "conceptual" | "practical" | "balanced";
}

export const analyzeSessionTask = task({
  id: "analyze-session",
  maxDuration: 60,
  retry: { maxAttempts: 2 },

  run: async (payload: AnalyzeSessionPayload) => {
    const { userId, subjectId, subjectName, exchange } = payload;
    const db = getAdmin();

    const [userMsg, assistantMsg] = exchange;

    // 1. Pedir a Gemini Flash Lite que analice el intercambio
    let analysis: SessionAnalysis;
    try {
      const resp = await generateText({
        model: "processor",
        maxTokens: 512,
        system: `Eres un analizador pedagógico experto. Analiza intercambios de tutoría universitaria.
Devuelve SOLO JSON válido, sin texto extra.`,
        messages: [{
          role: "user",
          content: `Analiza este intercambio de tutoría de "${subjectName}":

ESTUDIANTE: ${userMsg.slice(0, 500)}
TUTOR: ${assistantMsg.slice(0, 500)}

Devuelve JSON con este formato exacto:
{
  "concepts": [
    {
      "concept": "nombre corto del concepto matemático/académico",
      "understood": true,
      "quality": 4,
      "errors": ["error específico si hubo"]
    }
  ],
  "overallUnderstanding": "medium",
  "errorPatterns": ["patrón de error recurrente observado"],
  "studyStyle": "conceptual"
}

quality es 0-5 (0=olvido total, 3=correcto con dificultad, 5=perfecto).
overallUnderstanding: "high" | "medium" | "low"
studyStyle: "visual" | "conceptual" | "practical" | "balanced"
Incluí solo conceptos académicos concretos, máximo 3.`,
        }],
      });

      analysis = JSON.parse(resp.text.replace(/```json\n?|```/g, "").trim());
    } catch (err) {
      logger.warn("Análisis de sesión fallido — skip silencioso", { error: String(err) });
      return { skipped: true };
    }

    logger.info("Análisis completado", {
      concepts: analysis.concepts.length,
      understanding: analysis.overallUnderstanding,
    });

    // 2. Para cada concepto analizado: upsert en subject_concepts + sm2_update
    for (const item of analysis.concepts) {
      if (!item.concept?.trim()) continue;

      // Buscar o crear el concepto en subject_concepts
      let conceptId: string | null = null;

      const { data: existing } = await db
        .from("subject_concepts")
        .select("id")
        .eq("subject_id", subjectId)
        .ilike("name", item.concept.trim())
        .maybeSingle();

      if (existing) {
        conceptId = existing.id;
      } else {
        const { data: created } = await db
          .from("subject_concepts")
          .insert({ subject_id: subjectId, name: item.concept.trim() })
          .select("id")
          .single();
        conceptId = created?.id ?? null;
      }

      if (!conceptId) continue;

      // Actualizar SM-2 via función de Postgres
      await db.rpc("sm2_update", {
        p_user_id: userId,
        p_concept_id: conceptId,
        p_quality: Math.max(0, Math.min(5, item.quality)),
      });
    }

    // 3. Actualizar cognitive_profile (upsert)
    const qualityAvg = analysis.concepts.length > 0
      ? analysis.concepts.reduce((acc, c) => acc + c.quality, 0) / analysis.concepts.length
      : 3;
    const learningSpeed = Math.min(1, Math.max(0, qualityAvg / 5));

    const { data: existingProfile } = await db
      .from("cognitive_profile")
      .select("error_patterns")
      .eq("user_id", userId)
      .eq("subject_id", subjectId)
      .maybeSingle();

    const prevErrors: string[] = Array.isArray(existingProfile?.error_patterns)
      ? existingProfile.error_patterns as string[]
      : [];

    // Merge error patterns, keep unique, max 10
    const mergedErrors = [...new Set([...prevErrors, ...analysis.errorPatterns])].slice(0, 10);

    await db
      .from("cognitive_profile")
      .upsert({
        user_id: userId,
        subject_id: subjectId,
        learning_speed: learningSpeed,
        preferred_style: analysis.studyStyle,
        error_patterns: mergedErrors,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id,subject_id" });

    // 4. Marcar la learning_session como analizada
    await db
      .from("learning_sessions")
      .update({ analyzed_at: new Date().toISOString(), insights: analysis.overallUnderstanding })
      .eq("conversation_id", payload.conversationId)
      .is("analyzed_at", null);

    return {
      conceptsUpdated: analysis.concepts.length,
      errorPatterns: mergedErrors.length,
    };
  },
});
