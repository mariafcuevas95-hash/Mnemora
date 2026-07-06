import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkLimit, limitExceededResponse } from "@/lib/plan-limits";
import { generateText } from "@/lib/ai";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export interface ExamDayPlan {
  label: string;    // "Hoy", "Mañana", "En 2 días"
  focus: string;    // what to focus on
  action: string;   // specific action
  actionHref: string;
  actionLabel: string;
}

export interface ExamCoachResponse {
  assessment: string;           // honest 2-sentence readiness assessment
  readiness: "ready" | "on_track" | "needs_work" | "critical";
  dailyPlan: ExamDayPlan[];     // up to 3 days
  keyMessage: string;           // closing motivational line
  generatedAt: string;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ subjectId: string }> }
) {
  const { subjectId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allowed = await rateLimit(`exam-coach:${user.id}`, 20, 60 * 60 * 1000); // 20/hr
  if (!allowed) return NextResponse.json({ error: "Demasiadas solicitudes. Intenta más tarde." }, { status: 429 });

  const check = await checkLimit(user.id, "exam_mode");
  if (!check.allowed) return limitExceededResponse(check);

  const today = new Date().toISOString().slice(0, 10);

  const [subjectRes, knowledgeRes, examRes, profileRes, nameRes] = await Promise.all([
    supabase.from("subjects").select("name").eq("id", subjectId).single(),
    supabase
      .from("student_knowledge")
      .select("confidence, mastery_level, subject_concepts!inner(name, learning_order)")
      .eq("user_id", user.id)
      .eq("subject_concepts.subject_id", subjectId)
      .order("confidence", { ascending: true }),
    supabase
      .from("calendar_events")
      .select("title, event_date")
      .eq("subject_id", subjectId)
      .eq("event_type", "exam")
      .gte("event_date", today)
      .order("event_date")
      .limit(1)
      .maybeSingle(),
    supabase
      .from("cognitive_profile")
      .select("error_patterns, learning_speed, preferred_style, performance_estimate")
      .eq("user_id", user.id)
      .eq("subject_id", subjectId)
      .maybeSingle(),
    supabase.from("profiles").select("name").eq("id", user.id).single(),
  ]);

  const subjectName = subjectRes.data?.name ?? "la materia";
  const studentName = (nameRes.data?.name ?? "").split(" ")[0] || "estudiante";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const knowledge = (knowledgeRes.data ?? []) as any[];
  const exam = examRes.data;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const profile = profileRes.data as any;

  const days = exam ? Math.round((new Date(exam.event_date).getTime() - Date.now()) / 86_400_000) : null;

  // Compute state
  const total = knowledge.length;
  const mastered = knowledge.filter((k: { mastery_level: string }) => k.mastery_level === "mastered").length;
  const critical = knowledge.filter((k: { confidence: number; mastery_level: string }) => k.confidence < 0.4 && k.mastery_level !== "mastered");
  const needsWork = knowledge.filter((k: { confidence: number; mastery_level: string }) => k.confidence >= 0.4 && k.confidence < 0.7 && k.mastery_level !== "mastered");
  const coveragePct = total > 0 ? Math.round(((total - critical.length) / total) * 100) : 0;
  const masteryPct = total > 0 ? Math.round((mastered / total) * 100) : 0;

  const readiness: ExamCoachResponse["readiness"] =
    days !== null && days <= 1 && critical.length > 3 ? "critical"
    : masteryPct >= 70 && critical.length <= 2 ? "ready"
    : masteryPct >= 40 || (days !== null && days >= 5) ? "on_track"
    : "needs_work";

  // Fallback if no AI
  if (!process.env.GEMINI_API_KEY && !process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(buildFallback(studentName, subjectName, days, critical, needsWork, mastered, total, subjectId, readiness));
  }

  // Build AI context
  const criticalList = critical.slice(0, 5).map((k: { subject_concepts: { name: string }; confidence: number }) => `"${k.subject_concepts?.name}" (${Math.round(k.confidence * 100)}%)`).join(", ");
  const workList = needsWork.slice(0, 4).map((k: { subject_concepts: { name: string }; confidence: number }) => `"${k.subject_concepts?.name}" (${Math.round(k.confidence * 100)}%)`).join(", ");
  const errorPatterns = (profile?.error_patterns ?? []).slice(0, 3).join(", ");

  const context = [
    `Estudiante: ${studentName}`,
    `Materia: ${subjectName}`,
    exam ? `Examen: ${exam.title} en ${days} día${days !== 1 ? "s" : ""} (${exam.event_date})` : "Sin examen programado",
    `Estado: ${mastered}/${total} conceptos dominados (${masteryPct}%), cobertura ${coveragePct}%`,
    criticalList ? `Conceptos críticos (<40% confianza): ${criticalList}` : "Sin conceptos críticos",
    workList ? `Necesita refuerzo (40-70%): ${workList}` : null,
    errorPatterns ? `Errores frecuentes del estudiante: ${errorPatterns}` : null,
    profile?.learning_speed != null ? `Velocidad de aprendizaje: ${Math.round(profile.learning_speed * 100)}%` : null,
  ].filter(Boolean).join("\n");

  const daysForPlan = days !== null ? Math.min(days, 3) : 2;
  const dayLabels = ["Hoy", "Mañana", `En 2 días`, `En 3 días`].slice(0, daysForPlan || 2);

  try {
    const resp = await generateText({
      model: "processor",
      maxTokens: 600,
      system: `Eres el AI Exam Coach de Mnemora. Analiza el estado de preparación de un estudiante universitario antes de un examen y genera un plan diario concreto y realista.
Sé honesto pero motivador. No exageres ni minimices la situación.
Devuelve SOLO JSON válido. Sin texto extra.`,
      messages: [{
        role: "user",
        content: `Contexto:
${context}

Genera el plan de examen. JSON exacto:
{
  "assessment": "evaluación honesta de 1-2 oraciones sobre la preparación actual. Sé específico con los números.",
  "dailyPlan": [
    {
      "label": "${dayLabels[0]}",
      "focus": "concepto o tema específico a estudiar",
      "action": "acción concreta de 1 oración"
    }${dayLabels.length > 1 ? `,
    {
      "label": "${dayLabels[1]}",
      "focus": "...",
      "action": "..."
    }` : ""}${dayLabels.length > 2 ? `,
    {
      "label": "${dayLabels[2]}",
      "focus": "...",
      "action": "..."
    }` : ""}
  ],
  "keyMessage": "mensaje motivador de cierre, 1 oración. Mencioná el nombre ${studentName}."
}

Reglas:
- En dailyPlan, el primer día siempre enfoca los conceptos críticos específicos por nombre.
- Si quedan 0-1 días, el plan es solo de repaso rápido y descanso.
- Sé muy concreto, no genérico.`,
      }],
    });

    const json = JSON.parse(resp.text.replace(/```json\n?|```/g, "").trim());

    const enriched: ExamCoachResponse = {
      assessment: json.assessment ?? "",
      readiness,
      keyMessage: json.keyMessage ?? "",
      generatedAt: new Date().toISOString(),
      dailyPlan: (json.dailyPlan ?? []).slice(0, 3).map((d: { label: string; focus: string; action: string }, i: number) => {
        const isFirst = i === 0;
        return {
          label: d.label,
          focus: d.focus,
          action: d.action,
          actionHref: isFirst && critical.length > 0 ? `/flashcards/${subjectId}` : `/tutor/${subjectId}`,
          actionLabel: isFirst && critical.length > 0 ? "Practicar críticos" : "Preguntarle al tutor",
        };
      }),
    };

    return NextResponse.json(enriched);

  } catch {
    return NextResponse.json(buildFallback(studentName, subjectName, days, critical, needsWork, mastered, total, subjectId, readiness));
  }
}

function buildFallback(
  name: string,
  subjectName: string,
  days: number | null,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  critical: any[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  needsWork: any[],
  mastered: number,
  total: number,
  subjectId: string,
  readiness: ExamCoachResponse["readiness"]
): ExamCoachResponse {
  const masteryPct = total > 0 ? Math.round((mastered / total) * 100) : 0;

  const assessment =
    readiness === "ready"
      ? `Dominas el ${masteryPct}% del material y tienes solo ${critical.length} conceptos críticos. Estás bien preparado/a.`
      : readiness === "on_track"
      ? `Dominas el ${masteryPct}% del material. ${critical.length > 0 ? `Hay ${critical.length} concepto${critical.length !== 1 ? "s" : ""} crítico${critical.length !== 1 ? "s" : ""} que conviene reforzar.` : "Sigue el plan y llegas bien."}`
      : readiness === "needs_work"
      ? `Dominas el ${masteryPct}% del material y hay ${critical.length} conceptos críticos. Necesitas intensificar el estudio.`
      : `Con solo ${days} día${days !== 1 ? "s" : ""} y ${critical.length} conceptos críticos, el foco total es necesario ahora.`;

  const plan: ExamDayPlan[] = [];

  if (critical.length > 0) {
    const topCritical = critical.slice(0, 2).map((k: { subject_concepts: { name: string } }) => k.subject_concepts?.name).join(" y ");
    plan.push({
      label: "Hoy",
      focus: topCritical,
      action: `Repasá intensivamente ${topCritical} con flashcards hasta llegar a 70% de confianza.`,
      actionHref: `/flashcards/${subjectId}`,
      actionLabel: "Practicar críticos",
    });
  }

  if (needsWork.length > 0 && days !== null && days >= 2) {
    const top = needsWork[0]?.subject_concepts?.name;
    plan.push({
      label: "Mañana",
      focus: top ?? "conceptos de refuerzo",
      action: `Consolidá "${top}" con el tutor y practicá ejercicios de aplicación.`,
      actionHref: `/tutor/${subjectId}`,
      actionLabel: "Abrir tutor",
    });
  }

  if (days !== null && days >= 3) {
    plan.push({
      label: `En ${Math.min(days - 1, 2)} días`,
      focus: "Repaso general",
      action: `Repasá todos los conceptos de ${subjectName} de principio a fin. Enfocate en los errores frecuentes.`,
      actionHref: `/flashcards/${subjectId}`,
      actionLabel: "Repaso general",
    });
  }

  if (plan.length === 0) {
    plan.push({
      label: "Ahora",
      focus: "Repaso de emergencia",
      action: `Repasá los conceptos más importantes de ${subjectName} con flashcards.`,
      actionHref: `/flashcards/${subjectId}`,
      actionLabel: "Practicar ahora",
    });
  }

  return {
    assessment,
    readiness,
    dailyPlan: plan.slice(0, 3),
    keyMessage: `${name}, puedes lograrlo. Enfócate en lo que importa y confía en lo que ya estudiaste.`,
    generatedAt: new Date().toISOString(),
  };
}
