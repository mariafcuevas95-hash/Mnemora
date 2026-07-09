import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdmin } from "@/lib/supabase/admin";
import { generateText } from "@/lib/ai";

export const dynamic = "force-dynamic";

export interface CognitiveProfileData {
  learningSpeed:       number;   // 0-100
  retentionStrength:   number;   // 0-100
  coverageDepth:       number;   // 0-100 (avg mastery across subjects)
  style:               string;   // "Sistemático" | "Conceptual" | "Aplicado" | "Versátil"
  styleDesc:           string;
  strengths:           string[];
  weaknesses:          string[];
  insight:             string;   // 2-3 sentence Claude summary
  totalConcepts:       number;
  masteredConcepts:    number;
  quizSessions:        number;
  avgQuizScore:        number;
  dataQuality:         "low" | "medium" | "high";
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = getAdmin();

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysStr = thirtyDaysAgo.toISOString();

  const [knowledgeRes, quizRes, profilesRes] = await Promise.all([
    admin
      .from("student_knowledge")
      .select("concept_id, confidence, mastery_level, next_review, last_reviewed_at, error_patterns, subject_concepts!inner(name, subject_id)")
      .eq("user_id", user.id),
    admin
      .from("quiz_sessions")
      .select("pct, correct, total, created_at")
      .eq("user_id", user.id)
      .gte("created_at", thirtyDaysStr)
      .order("created_at", { ascending: false })
      .limit(50),
    admin
      .from("cognitive_profile")
      .select("subject_id, learning_speed, retention_strength, preferred_style, error_patterns")
      .eq("user_id", user.id),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const knowledge = (knowledgeRes.data ?? []) as any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const quizSessions = (quizRes.data ?? []) as any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const profiles = (profilesRes.data ?? []) as any[];

  const totalConcepts   = knowledge.length;
  const masteredConcepts = knowledge.filter(k => k.mastery_level === "mastered").length;
  const learningConcepts = knowledge.filter(k => k.mastery_level === "learning" || k.mastery_level === "practiced").length;
  const quizCount       = quizSessions.length;
  const avgQuizScore    = quizCount > 0
    ? Math.round(quizSessions.reduce((s: number, q: { pct: number }) => s + q.pct, 0) / quizCount)
    : 0;

  const dataQuality: CognitiveProfileData["dataQuality"] =
    totalConcepts >= 30 && quizCount >= 3 ? "high"
    : totalConcepts >= 10 || quizCount >= 1 ? "medium"
    : "low";

  // ── Learning speed: % of concepts progressing in last 30 days ──
  const recentlyReviewed = knowledge.filter(k => k.last_reviewed_at && k.last_reviewed_at >= thirtyDaysStr);
  const progressing = recentlyReviewed.filter(k => k.confidence > 0.3);
  const learningSpeed = totalConcepts > 0
    ? Math.min(100, Math.round((progressing.length / Math.max(totalConcepts, 1)) * 180))
    : 0;

  // ── Retention strength: avg confidence of mastered concepts ──
  const masteredRows = knowledge.filter(k => k.mastery_level === "mastered");
  const avgMasteredConf = masteredRows.length > 0
    ? masteredRows.reduce((s: number, k: { confidence: number }) => s + k.confidence, 0) / masteredRows.length
    : 0;
  const retentionStrength = Math.round(avgMasteredConf * 100);

  // ── Coverage depth: % of concepts known (confidence > 0.4) ──
  const knownConf = knowledge.filter(k => k.confidence > 0.4).length;
  const coverageDepth = totalConcepts > 0 ? Math.round((knownConf / totalConcepts) * 100) : 0;

  // ── Infer learning style from profiles + quiz performance ──
  const prefStyles = profiles.map((p: { preferred_style: string | null }) => p.preferred_style).filter(Boolean) as string[];
  const rawStyle = prefStyles.length > 0 ? prefStyles[0] : null;

  let style: string;
  let styleDesc: string;

  if (rawStyle) {
    style = rawStyle;
    styleDesc = styleDescMap[rawStyle] ?? "Adaptas tu estrategia según la materia.";
  } else if (avgQuizScore >= 75 && retentionStrength >= 70) {
    style = "Sistemático";
    styleDesc = "Construyes el conocimiento de forma ordenada y con alta retención.";
  } else if (avgQuizScore >= 65) {
    style = "Conceptual";
    styleDesc = "Entiendes los conceptos profundamente antes de memorizar.";
  } else if (learningConcepts > masteredConcepts) {
    style = "Aplicado";
    styleDesc = "Aprendes mejor haciendo: el quiz y las flashcards son tu mejor herramienta.";
  } else {
    style = "Versátil";
    styleDesc = "Adaptas tu estrategia según la materia y el tipo de contenido.";
  }

  // ── Strengths & weaknesses from error_patterns ──
  const allErrors: string[] = [];
  for (const k of knowledge) {
    if (Array.isArray(k.error_patterns)) allErrors.push(...k.error_patterns);
  }
  for (const p of profiles) {
    if (Array.isArray(p.error_patterns)) allErrors.push(...p.error_patterns);
  }

  const errorFreq: Record<string, number> = {};
  for (const e of allErrors) { errorFreq[e] = (errorFreq[e] ?? 0) + 1; }
  const topErrors = Object.entries(errorFreq).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([e]) => e);

  const strengths: string[] = [];
  const weaknesses: string[] = [];

  if (retentionStrength >= 70) strengths.push("Alta retención de conceptos memorizados");
  if (avgQuizScore >= 75)      strengths.push("Buen rendimiento en evaluaciones");
  if (learningSpeed >= 60)     strengths.push("Ritmo de aprendizaje constante");
  if (masteredConcepts > 10)   strengths.push(`${masteredConcepts} conceptos dominados`);
  if (strengths.length === 0)  strengths.push("Estás construyendo tu base de conocimiento");

  if (topErrors.length > 0)    weaknesses.push(...topErrors.map(e => `Patrón de error: ${e}`));
  if (retentionStrength < 50 && totalConcepts > 5) weaknesses.push("Retención débil en conceptos memorizados");
  if (avgQuizScore < 60 && quizCount > 0)          weaknesses.push("Oportunidad de mejorar en quizzes");
  if (weaknesses.length === 0) weaknesses.push("Sin patrones de error detectados aún");

  // ── AI insight ──
  let insight = "Sigue practicando para que Mnemora construya tu perfil cognitivo personalizado.";
  if (dataQuality !== "low" && process.env.ANTHROPIC_API_KEY) {
    try {
      const resp = await generateText({
        model: "processor",
        maxTokens: 200,
        system: "Eres un coach académico. Genera un insight de 2 oraciones, personal y accionable, sobre el perfil de aprendizaje del estudiante. En español neutro. Sin emojis. Sin voseo.",
        messages: [{
          role: "user",
          content: `Perfil del estudiante:
- Estilo: ${style} — ${styleDesc}
- Velocidad de aprendizaje: ${learningSpeed}/100
- Retención: ${retentionStrength}/100
- Conceptos dominados: ${masteredConcepts} de ${totalConcepts}
- Promedio en quizzes: ${avgQuizScore}%
- Fortalezas: ${strengths.join(", ")}
- Áreas a mejorar: ${weaknesses.join(", ")}

Genera 2 oraciones de insight personalizado. Menciona algo específico sobre sus números.`,
        }],
      });
      insight = resp.text.trim();
    } catch { /* usa el fallback */ }
  }

  const result: CognitiveProfileData = {
    learningSpeed,
    retentionStrength,
    coverageDepth,
    style,
    styleDesc,
    strengths: strengths.slice(0, 3),
    weaknesses: weaknesses.slice(0, 2),
    insight,
    totalConcepts,
    masteredConcepts,
    quizSessions: quizCount,
    avgQuizScore,
    dataQuality,
  };

  return NextResponse.json(result);
}

const styleDescMap: Record<string, string> = {
  "Sistemático": "Construyes el conocimiento de forma ordenada y con alta retención.",
  "Conceptual":  "Entiendes los conceptos profundamente antes de memorizar.",
  "Aplicado":    "Aprendes mejor haciendo: el quiz y las flashcards son tu mejor herramienta.",
  "Versátil":    "Adaptas tu estrategia según la materia y el tipo de contenido.",
};
