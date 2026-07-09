import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdmin } from "@/lib/supabase/admin";
import { checkLimit, limitExceededResponse } from "@/lib/plan-limits";

export const dynamic = "force-dynamic";

export interface PredictionFactor {
  label: string;
  value: string;
  impact: "positive" | "neutral" | "negative";
  detail: string;
}

export interface PredictionRecommendation {
  action: string;
  reason: string;
  cta: { label: string; href: string };
  urgency: "alta" | "media" | "baja";
}

export interface PredictionData {
  subjectId: string;
  subjectName: string;
  predictedGrade: number;              // 0-10
  gradeLabel: string;
  approvalProb: "alta" | "media" | "baja" | "sin datos";
  approvalProbPct: number;             // 0-100
  explanation: string;                 // one paragraph why
  factors: PredictionFactor[];
  recommendations: PredictionRecommendation[];
  dataQuality: "high" | "medium" | "low"; // how much data we have
}

function gradeLabel(g: number): string {
  if (g >= 9)  return "Sobresaliente";
  if (g >= 7)  return "Notable";
  if (g >= 6)  return "Bien";
  if (g >= 5)  return "Aprobado justo";
  return "En riesgo";
}

function daysUntil(dateStr: string): number {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr); target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ subjectId: string }> }
) {
  const { subjectId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const check = await checkLimit(user.id, "performance_prediction");
  if (!check.allowed) return limitExceededResponse(check);

  const admin = getAdmin();
  const today = new Date().toISOString().slice(0, 10);
  const since7d = new Date(Date.now() - 7 * 86_400_000).toISOString();

  const [subjectRes, conceptsRes, knowledgeRes, cogProfileRes, examRes, recentXpRes] = await Promise.all([
    supabase.from("subjects").select("name, goal_type, goal_value").eq("id", subjectId).single(),
    supabase.from("subject_concepts").select("id").eq("subject_id", subjectId),
    admin
      .from("student_knowledge")
      .select("confidence, mastery_level, next_review, subject_concepts!inner(subject_id)")
      .eq("user_id", user.id)
      .eq("subject_concepts.subject_id", subjectId),
    supabase
      .from("cognitive_profile")
      .select("performance_estimate, learning_speed, retention_strength, preferred_style, error_patterns")
      .eq("user_id", user.id)
      .eq("subject_id", subjectId)
      .maybeSingle(),
    supabase
      .from("calendar_events")
      .select("title, event_date")
      .eq("subject_id", subjectId)
      .eq("event_type", "exam")
      .gte("event_date", today)
      .order("event_date")
      .limit(1)
      .maybeSingle(),
    admin
      .from("xp_events")
      .select("event_type, xp_earned")
      .eq("user_id", user.id)
      .gte("created_at", since7d),
  ]);

  if (!subjectRes.data) return NextResponse.json({ error: "Subject not found" }, { status: 404 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const knowledge = (knowledgeRes.data ?? []) as any[];
  const totalConcepts = (conceptsRes.data ?? []).length;
  const cog = cogProfileRes.data;
  const nextExam = examRes.data;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recentXp = (recentXpRes.data ?? []) as any[];

  const mastered   = knowledge.filter((k: { mastery_level: string }) => k.mastery_level === "mastered").length;
  const practiced  = knowledge.filter((k: { mastery_level: string }) => k.mastery_level === "practiced").length;
  const learning   = knowledge.filter((k: { mastery_level: string }) => k.mastery_level === "learning").length;
  const weakCount  = knowledge.filter((k: { confidence: number }) => k.confidence < 0.4).length;
  const overdueCount = knowledge.filter((k: { next_review: string | null }) => k.next_review && new Date(k.next_review) <= new Date()).length;
  const avgConfidence = knowledge.length > 0
    ? knowledge.reduce((s: number, k: { confidence: number }) => s + k.confidence, 0) / knowledge.length
    : 0;
  const coveragePct = totalConcepts > 0 ? Math.round((knowledge.length / totalConcepts) * 100) : 0;
  const masteredPct = totalConcepts > 0 ? Math.round((mastered / totalConcepts) * 100) : 0;
  const recentSessions = recentXp.filter((e: { event_type: string }) =>
    ["quiz_complete","flashcard_session"].includes(e.event_type)
  ).length;

  // ── Grade calculation ─────────────────────────────────────────────────────
  // Use stored performance_estimate if available, otherwise derive
  let rawGrade: number;
  if (cog?.performance_estimate != null) {
    rawGrade = cog.performance_estimate;
  } else {
    // Weighted: avgConfidence 60% + masteredPct 40%
    rawGrade = (avgConfidence * 0.6 + (masteredPct / 100) * 0.4) * 10;
  }

  // Exam pressure modifier: if exam < 7 days and coverage < 50%, penalize
  if (nextExam && daysUntil(nextExam.event_date) <= 7 && coveragePct < 50) {
    rawGrade *= 0.85;
  }

  const predictedGrade = Math.min(10, Math.max(0, Math.round(rawGrade * 10) / 10));

  const approvalProbPct =
    predictedGrade >= 8 ? 90 :
    predictedGrade >= 7 ? 75 :
    predictedGrade >= 6 ? 60 :
    predictedGrade >= 5 ? 40 :
    20;

  const approvalProb: PredictionData["approvalProb"] =
    knowledge.length === 0 ? "sin datos" :
    predictedGrade >= 7 ? "alta" :
    predictedGrade >= 5.5 ? "media" :
    "baja";

  // ── Data quality ─────────────────────────────────────────────────────────
  const dataQuality: PredictionData["dataQuality"] =
    knowledge.length >= 10 ? "high" :
    knowledge.length >= 3  ? "medium" :
    "low";

  // ── Factors ──────────────────────────────────────────────────────────────
  const factors: PredictionFactor[] = [];

  factors.push({
    label: "Cobertura del temario",
    value: `${coveragePct}%`,
    impact: coveragePct >= 70 ? "positive" : coveragePct >= 40 ? "neutral" : "negative",
    detail: `Practicaste ${knowledge.length} de ${totalConcepts} conceptos. ${
      coveragePct < 40 ? "Hay muchos temas sin tocar aún." :
      coveragePct < 70 ? "Falta cubrir la segunda mitad del temario." :
      "Buena cobertura general del contenido."
    }`,
  });

  factors.push({
    label: "Conceptos dominados",
    value: `${mastered} (${masteredPct}%)`,
    impact: masteredPct >= 50 ? "positive" : masteredPct >= 20 ? "neutral" : "negative",
    detail: `${mastered} dominados, ${practiced} en repaso, ${learning} aprendiendo. ${
      masteredPct < 20 ? "La mayoría de los conceptos todavía no están consolidados." :
      masteredPct < 50 ? "Buen avance, pero la mitad del material sigue frágil." :
      "Más de la mitad del temario está bien consolidada."
    }`,
  });

  if (weakCount > 0) {
    factors.push({
      label: "Conceptos débiles",
      value: `${weakCount} temas`,
      impact: weakCount > 5 ? "negative" : "neutral",
      detail: `${weakCount} conceptos con confianza menor al 40%. Son los que más probabilidades tienen de bajar la nota en el examen.`,
    });
  }

  if (nextExam) {
    const days = daysUntil(nextExam.event_date);
    factors.push({
      label: "Examen próximo",
      value: days === 0 ? "Hoy" : days === 1 ? "Mañana" : `en ${days} días`,
      impact: days <= 3 && coveragePct < 60 ? "negative" : days <= 7 ? "neutral" : "positive",
      detail: `${nextExam.title}. ${
        days <= 3 ? "Tiempo muy limitado — priorizar conceptos de mayor peso." :
        days <= 7 ? "Semana de examen: foco en repasar dominados y cerrar conceptos débiles." :
        "Hay tiempo suficiente para cubrir el temario restante."
      }`,
    });
  }

  factors.push({
    label: "Práctica reciente",
    value: recentSessions > 0 ? `${recentSessions} sesiones (7 días)` : "Sin actividad",
    impact: recentSessions >= 3 ? "positive" : recentSessions >= 1 ? "neutral" : "negative",
    detail: recentSessions === 0
      ? "Sin práctica en los últimos 7 días. La retención decae rápido sin repaso."
      : recentSessions < 3
      ? "Actividad baja. Al menos 3-4 sesiones por semana mantienen la retención."
      : "Buena constancia de práctica esta semana.",
  });

  if (overdueCount > 0) {
    factors.push({
      label: "Repasos pendientes",
      value: `${overdueCount} concepto${overdueCount > 1 ? "s" : ""}`,
      impact: overdueCount > 3 ? "negative" : "neutral",
      detail: `Tienes ${overdueCount} concepto${overdueCount > 1 ? "s" : ""} que ya vencieron en el sistema SM-2. Sin repaso, la confianza cae gradualmente.`,
    });
  }

  if (cog?.retention_strength != null && cog.retention_strength < 0.45) {
    factors.push({
      label: "Retención",
      value: `${Math.round(cog.retention_strength * 100)}% — baja`,
      impact: "negative",
      detail: "Tu perfil indica baja retención en esta materia. Las sesiones cortas y frecuentes son más efectivas que sesiones largas espaciadas.",
    });
  }

  // ── Explanation paragraph ─────────────────────────────────────────────────
  const goalStr = subjectRes.data.goal_type === "grade" && subjectRes.data.goal_value
    ? ` Tu meta es ${subjectRes.data.goal_value}/10.`
    : "";
  const gapStr = subjectRes.data.goal_type === "grade" && subjectRes.data.goal_value
    ? parseFloat(subjectRes.data.goal_value) > predictedGrade
      ? ` Hay una brecha de ${(parseFloat(subjectRes.data.goal_value) - predictedGrade).toFixed(1)} puntos para alcanzar tu meta.`
      : " ¡Vas bien para tu meta!"
    : "";

  const explanation = knowledge.length === 0
    ? "Todavía no hay suficiente actividad para generar una predicción confiable. Practica flashcards, haz quizzes o chatea con el tutor para que Mnemora construya tu perfil."
    : `La nota proyectada de ${predictedGrade.toFixed(1)} se basa en tu cobertura actual del ${coveragePct}% del temario, con ${mastered} conceptos dominados de ${totalConcepts} totales. El promedio de confianza en tus conceptos practicados es del ${Math.round(avgConfidence * 100)}%.${goalStr}${gapStr}${
        weakCount > 0 ? ` Tienes ${weakCount} concepto${weakCount > 1 ? "s" : ""} con confianza baja que pueden impactar negativamente en el examen.` : ""
      }${
        overdueCount > 0 ? ` Además, ${overdueCount} repaso${overdueCount > 1 ? "s" : ""} ya está${overdueCount > 1 ? "n" : ""} vencido${overdueCount > 1 ? "s" : ""}.` : ""
      }`;

  // ── Recommendations ───────────────────────────────────────────────────────
  const recs: PredictionRecommendation[] = [];

  if (weakCount >= 3) {
    recs.push({
      action: "Reforzar conceptos débiles con flashcards",
      reason: `Tienes ${weakCount} conceptos con confianza < 40%. Son el mayor riesgo para el examen.`,
      cta: { label: "Ir a Flashcards", href: `/flashcards/${subjectId}` },
      urgency: "alta",
    });
  }

  if (overdueCount >= 2) {
    recs.push({
      action: "Completar repasos pendientes",
      reason: `${overdueCount} conceptos vencidos. Sin repaso, la confianza cae y baja la nota proyectada.`,
      cta: { label: "Practicar ahora", href: `/flashcards/${subjectId}` },
      urgency: "alta",
    });
  }

  if (coveragePct < 50) {
    recs.push({
      action: "Cubrir más conceptos del temario",
      reason: `Solo practicaste el ${coveragePct}% del temario. Subir al 70% sube significativamente la predicción.`,
      cta: { label: "Ver Roadmap", href: `/roadmap/${subjectId}` },
      urgency: coveragePct < 30 ? "alta" : "media",
    });
  }

  if (nextExam && daysUntil(nextExam.event_date) <= 14 && predictedGrade < 6) {
    recs.push({
      action: "Activar Modo Examen",
      reason: "Con el examen cerca y la nota proyectada por debajo del aprobado, un plan de preparación intensiva puede marcar la diferencia.",
      cta: { label: "Modo Examen", href: `/examen/${subjectId}` },
      urgency: "alta",
    });
  }

  if (recentSessions === 0) {
    recs.push({
      action: "Retomar la práctica diaria",
      reason: "Sin actividad reciente, la retención cae. Incluso 15 minutos al día mantienen la nota estable.",
      cta: { label: "Hacer un quiz", href: `/quiz/${subjectId}` },
      urgency: "media",
    });
  }

  if (predictedGrade >= 5.5 && predictedGrade < 7) {
    recs.push({
      action: "Haz un quiz de diagnóstico",
      reason: "Con nota proyectada cerca del aprobado, un quiz revela qué conceptos están flaqueando antes del examen real.",
      cta: { label: "Iniciar Quiz", href: `/quiz/${subjectId}` },
      urgency: "media",
    });
  }

  if (recs.length === 0 && predictedGrade >= 7) {
    recs.push({
      action: "Haz simulacros de examen",
      reason: "Con nota proyectada alta, practicar en condiciones de examen consolida el rendimiento.",
      cta: { label: "Modo Examen", href: `/examen/${subjectId}` },
      urgency: "baja",
    });
  }

  const masteredCount = mastered;

  return NextResponse.json({
    subjectId,
    subjectName: subjectRes.data.name,
    predictedGrade,
    gradeLabel: gradeLabel(predictedGrade),
    approvalProb,
    approvalProbPct,
    explanation,
    factors: factors.slice(0, 6),
    recommendations: recs.slice(0, 4),
    dataQuality,
  } satisfies PredictionData);

  void masteredCount; // used above, suppress unused warning
}
