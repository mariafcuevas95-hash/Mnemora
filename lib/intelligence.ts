/**
 * Capa de inteligencia: consulta el perfil cognitivo del estudiante
 * para enriquecer el system prompt del tutor.
 * No lanza errores — devuelve contexto vacío si los datos no están disponibles.
 */
import { createClient } from "@/lib/supabase/server";

export interface IntelligenceContext {
  hasData: boolean;
  weakConcepts: string[];       // confianza < 0.4
  pendingReview: string[];      // next_review <= ahora
  masteredConcepts: string[];   // mastery_level = 'mastered'
  errorPatterns: string[];      // errores recurrentes del cognitive_profile
  preferredStyle: string;       // 'visual' | 'conceptual' | 'practical' | 'balanced'
  performanceEstimate: number | null; // 0-10
}

const EMPTY: IntelligenceContext = {
  hasData: false,
  weakConcepts: [],
  pendingReview: [],
  masteredConcepts: [],
  errorPatterns: [],
  preferredStyle: "balanced",
  performanceEstimate: null,
};

export async function getIntelligenceContext(
  userId: string,
  subjectId: string
): Promise<IntelligenceContext> {
  try {
    const supabase = await createClient();

    const [knowledgeRes, profileRes] = await Promise.all([
      supabase
        .from("student_knowledge")
        .select("confidence, next_review, mastery_level, subject_concepts!inner(name, subject_id)")
        .eq("user_id", userId)
        .eq("subject_concepts.subject_id", subjectId)
        .limit(50),
      supabase
        .from("cognitive_profile")
        .select("preferred_style, performance_estimate, error_patterns")
        .eq("user_id", userId)
        .eq("subject_id", subjectId)
        .maybeSingle(),
    ]);

    const rows = knowledgeRes.data ?? [];
    if (rows.length === 0 && !profileRes.data) return EMPTY;

    const now = new Date();
    const weakConcepts: string[] = [];
    const pendingReview: string[] = [];
    const masteredConcepts: string[] = [];

    for (const row of rows) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const name = (row.subject_concepts as any)?.name as string | undefined;
      if (!name) continue;
      if (row.confidence < 0.4) weakConcepts.push(name);
      if (row.next_review && new Date(row.next_review) <= now) pendingReview.push(name);
      if (row.mastery_level === "mastered") masteredConcepts.push(name);
    }

    const profile = profileRes.data;
    const errorPatterns: string[] = Array.isArray(profile?.error_patterns)
      ? (profile.error_patterns as string[])
      : [];

    return {
      hasData: rows.length > 0 || !!profile,
      weakConcepts,
      pendingReview,
      masteredConcepts,
      errorPatterns,
      preferredStyle: profile?.preferred_style ?? "balanced",
      performanceEstimate: profile?.performance_estimate ?? null,
    };
  } catch {
    return EMPTY;
  }
}

/** Construye el bloque de contexto cognitivo para inyectar en el system prompt */
export function buildCognitiveBlock(ctx: IntelligenceContext): string {
  if (!ctx.hasData) return "";

  const lines: string[] = ["### Perfil cognitivo del estudiante:"];

  if (ctx.pendingReview.length > 0) {
    lines.push(`- **Temas pendientes de repaso hoy** (curva de olvido): ${ctx.pendingReview.slice(0, 5).join(", ")}`);
  }
  if (ctx.weakConcepts.length > 0) {
    lines.push(`- **Áreas débiles** (confianza < 40%): ${ctx.weakConcepts.slice(0, 5).join(", ")}`);
  }
  if (ctx.masteredConcepts.length > 0) {
    lines.push(`- **Temas dominados**: ${ctx.masteredConcepts.slice(0, 5).join(", ")}`);
  }
  if (ctx.errorPatterns.length > 0) {
    lines.push(`- **Errores recurrentes detectados**: ${ctx.errorPatterns.slice(0, 3).join(", ")}`);
  }
  if (ctx.performanceEstimate !== null) {
    lines.push(`- **Rendimiento proyectado**: ${ctx.performanceEstimate.toFixed(1)}/10`);
  }

  lines.push(`\nAdaptá tu estilo a este perfil (${ctx.preferredStyle}). Priorizá los temas débiles y pendientes de repaso.`);

  return lines.join("\n");
}
