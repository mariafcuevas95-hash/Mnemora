import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkLimit, limitExceededResponse } from "@/lib/plan-limits";

export const dynamic = "force-dynamic";

export type PlanTask = {
  type: "review" | "quiz" | "exam_prep" | "study_weak";
  subjectId: string;
  subjectName: string;
  title: string;
  description: string;
  minutesEst: number;
  priority: 1 | 2 | 3;
  ctaHref: string;
  ctaLabel: string;
};

function daysUntil(dateStr: string): number {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr); target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

export async function GET(_req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const check = await checkLimit(user.id, "daily_planner");
  if (!check.allowed) return limitExceededResponse(check);

  const today = new Date().toISOString().slice(0, 10);

  const [subjectRes, reviewRes, knowledgeRes, cogRes, eventRes] = await Promise.all([
    supabase.from("subjects").select("id, name, goal_type, goal_value").order("created_at"),
    supabase
      .from("student_knowledge")
      .select("mastery_level, subject_concepts!inner(name, subject_id, subjects!inner(id, name))")
      .eq("user_id", user.id)
      .lte("next_review", new Date().toISOString())
      .limit(50),
    supabase
      .from("student_knowledge")
      .select("confidence, mastery_level, subject_concepts!inner(name, subject_id)")
      .eq("user_id", user.id),
    supabase
      .from("cognitive_profile")
      .select("subject_id, performance_estimate")
      .eq("user_id", user.id),
    supabase
      .from("calendar_events")
      .select("id, title, event_date, event_type, subject_id")
      .gte("event_date", today)
      .order("event_date")
      .limit(10),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const subjects = (subjectRes.data ?? []) as any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allKnowledge = (knowledgeRes.data ?? []) as any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cogProfiles = (cogRes.data ?? []) as any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const events = (eventRes.data ?? []) as any[];

  // Due counts per subject
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dueBySubject = new Map<string, number>();
  for (const r of (reviewRes.data ?? []) as any[]) {
    const sid = r.subject_concepts?.subjects?.id;
    if (sid) dueBySubject.set(sid, (dueBySubject.get(sid) ?? 0) + 1);
  }

  const cogMap = new Map(cogProfiles.map((p: { subject_id: string; performance_estimate: number | null }) => [p.subject_id, p.performance_estimate]));

  const tasks: PlanTask[] = [];

  for (const s of subjects) {
    const rows = allKnowledge.filter((k: { subject_concepts: { subject_id: string } }) => k.subject_concepts?.subject_id === s.id);
    const total = rows.length;
    const mastered = rows.filter((k: { mastery_level: string }) => k.mastery_level === "mastered").length;
    const known = rows.filter((k: { confidence: number }) => k.confidence > 0).length;
    const weak = rows
      .filter((k: { confidence: number; mastery_level: string }) => k.confidence < 0.5 && k.mastery_level !== "mastered")
      .sort((a: { confidence: number }, b: { confidence: number }) => a.confidence - b.confidence)
      .slice(0, 2)
      .map((k: { subject_concepts: { name: string } }) => k.subject_concepts?.name ?? "");

    const coveragePct = total > 0 ? Math.round((known / total) * 100) : 0;
    const masteryPct = total > 0 ? Math.round((mastered / total) * 100) : 0;

    const perfEstimate = cogMap.get(s.id) as number | undefined | null;
    const avgConf = total > 0 ? rows.reduce((acc: number, k: { confidence: number }) => acc + k.confidence, 0) / total : 0;
    const predictedGrade = perfEstimate != null
      ? Math.round(perfEstimate * 10) / 10
      : Math.round(avgConf * 100) / 10;

    const subjectExams = events.filter((e: { event_type: string; subject_id: string }) => e.event_type === "exam" && e.subject_id === s.id);
    const nextExam = subjectExams[0] ?? null;
    const daysToExam = nextExam ? daysUntil(nextExam.event_date) : null;
    const due = dueBySubject.get(s.id) ?? 0;

    const goalType = s.goal_type ?? null;
    const goalValue = s.goal_value ?? null;
    let goalBoost = false;
    if (goalType === "grade" && goalValue) {
      const target = parseFloat(goalValue);
      if (!isNaN(target) && predictedGrade < target) goalBoost = true;
    }
    if (goalType === "scholarship" && predictedGrade < 7) goalBoost = true;

    if (goalType === "hours" && goalValue) {
      const hoursTarget = parseInt(goalValue);
      if (!isNaN(hoursTarget) && hoursTarget > 0) {
        tasks.push({
          type: "study_weak",
          subjectId: s.id, subjectName: s.name,
          title: `Bloque de ${s.name}`,
          description: `Meta: ${hoursTarget}h/semana. Dedica tiempo hoy para cumplir tu objetivo.`,
          minutesEst: Math.round(hoursTarget * 60 / 7),
          priority: 2,
          ctaHref: `/tutor/${s.id}`, ctaLabel: "Estudiar ahora",
        });
      }
    }

    if (daysToExam !== null && daysToExam <= 3) {
      tasks.push({
        type: "exam_prep",
        subjectId: s.id, subjectName: s.name,
        title: `Preparar examen de ${s.name}`,
        description: daysToExam === 0 ? "¡El examen es hoy!" : daysToExam === 1 ? "El examen es mañana." : `Faltan ${daysToExam} días. Repasa los conceptos críticos.`,
        minutesEst: 25,
        priority: 1,
        ctaHref: `/examen/${s.id}`, ctaLabel: "Modo Examen",
      });
    }

    if (due > 0) {
      tasks.push({
        type: "review",
        subjectId: s.id, subjectName: s.name,
        title: `Repasar ${s.name}`,
        description: `${due} flashcard${due !== 1 ? "s" : ""} pendiente${due !== 1 ? "s" : ""} de repaso hoy.`,
        minutesEst: Math.max(5, Math.round(due * 1.5)),
        priority: goalBoost ? 1 : due >= 5 ? 1 : 2,
        ctaHref: `/flashcards/${s.id}`, ctaLabel: "Repasar ahora",
      });
    }

    if (daysToExam !== null && daysToExam > 3 && daysToExam <= 7) {
      tasks.push({
        type: "exam_prep",
        subjectId: s.id, subjectName: s.name,
        title: `Preparar examen de ${s.name}`,
        description: `Examen en ${daysToExam} días. Cobertura actual: ${coveragePct}%.`,
        minutesEst: 20,
        priority: goalBoost ? 1 : 2,
        ctaHref: `/examen/${s.id}`, ctaLabel: "Ver plan de ataque",
      });
    }

    if (total > 0 && coveragePct < 60 && due === 0) {
      tasks.push({
        type: "quiz",
        subjectId: s.id, subjectName: s.name,
        title: `Quiz de ${s.name}`,
        description: `Solo dominas el ${coveragePct}% del temario. Un quiz identifica tus puntos débiles.`,
        minutesEst: 8,
        priority: goalBoost ? 2 : 3,
        ctaHref: `/quiz/${s.id}`, ctaLabel: "Hacer quiz",
      });
    }

    if (weak.length > 0 && !tasks.find(t => t.subjectId === s.id && t.type === "exam_prep")) {
      tasks.push({
        type: "study_weak",
        subjectId: s.id, subjectName: s.name,
        title: `Reforzar ${s.name}`,
        description: goalBoost
          ? `Meta: nota ${goalType === "grade" ? goalValue : "7"}. Conceptos débiles: ${weak.filter(Boolean).slice(0, 2).join(", ")}.`
          : `Conceptos débiles: ${weak.filter(Boolean).slice(0, 2).join(", ")}.`,
        minutesEst: 15,
        priority: goalBoost ? 1 : 3,
        ctaHref: `/tutor/${s.id}`, ctaLabel: "Preguntarle al tutor",
      });
    }

    void masteryPct; // used implicitly via masteryPct
  }

  tasks.sort((a, b) => a.priority - b.priority || a.minutesEst - b.minutesEst);
  const seen = new Map<string, number>();
  const result = tasks.filter(t => {
    const count = seen.get(t.subjectId) ?? 0;
    if (count >= 2) return false;
    seen.set(t.subjectId, count + 1);
    return true;
  }).slice(0, 6);

  return NextResponse.json({ tasks: result });
}
