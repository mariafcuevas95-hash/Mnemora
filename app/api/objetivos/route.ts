import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export interface GoalProgress {
  subjectId: string;
  subjectName: string;
  goalType: "pass" | "grade" | "exam" | "scholarship" | "hours" | null;
  goalValue: string | null;
  // Progreso 0–100
  progress: number;
  // Datos adicionales según tipo
  masteryPct: number | null;        // % dominado (flashcards mastered / total concepts)
  daysUntilExam: number | null;     // para tipo "exam"
  weeklyActiveDays: number | null;  // para tipo "hours"
  targetHours: number | null;       // para tipo "hours"
  nextExamDate: string | null;
  nextExamTitle: string | null;
  flashcardCount: number;
  conceptCount: number;
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json([], { status: 401 });

  const today = new Date().toISOString().slice(0, 10);

  const [subjectsRes, knowledgeRes, eventsRes, examsRes] = await Promise.all([
    supabase.from("subjects")
      .select("id, name, goal_type, goal_value")
      .eq("user_id", user.id)
      .order("name"),
    supabase.from("student_knowledge")
      .select("mastery_level, subject_concepts!inner(subject_id)")
      .eq("user_id", user.id),
    supabase.from("xp_events")
      .select("created_at")
      .eq("user_id", user.id)
      .gte("created_at", new Date(Date.now() - 7 * 86_400_000).toISOString()),
    supabase.from("calendar_events")
      .select("subject_id, title, event_date")
      .eq("user_id", user.id)
      .eq("event_type", "exam")
      .gte("event_date", today)
      .order("event_date"),
  ]);

  const subjects = subjectsRes.data ?? [];
  const knowledge = knowledgeRes.data ?? [];
  const events = eventsRes.data ?? [];
  const exams = examsRes.data ?? [];

  // Weekly active days (this week)
  const activeDays = new Set(events.map(e => e.created_at.slice(0, 10))).size;

  // Build mastery map per subject
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const masteryBySubject = new Map<string, { mastered: number; total: number }>();
  for (const row of knowledge as any[]) {
    const sid: string = row.subject_concepts?.subject_id;
    if (!sid) continue;
    const cur = masteryBySubject.get(sid) ?? { mastered: 0, total: 0 };
    cur.total++;
    if (row.mastery_level === "mastered") cur.mastered++;
    masteryBySubject.set(sid, cur);
  }

  // Next exam per subject
  const nextExamBySubject = new Map<string, { title: string; date: string }>();
  for (const exam of exams) {
    if (!nextExamBySubject.has(exam.subject_id)) {
      nextExamBySubject.set(exam.subject_id, { title: exam.title, date: exam.event_date });
    }
  }

  const result: GoalProgress[] = subjects.map(s => {
    const mastery = masteryBySubject.get(s.id);
    const masteryPct = mastery && mastery.total > 0
      ? Math.round((mastery.mastered / mastery.total) * 100)
      : null;

    const nextExam = nextExamBySubject.get(s.id) ?? null;
    const daysUntilExam = nextExam
      ? Math.max(0, Math.round((new Date(nextExam.date).getTime() - Date.now()) / 86_400_000))
      : null;

    const goalType = s.goal_type as GoalProgress["goalType"];
    const goalValue = s.goal_value ?? null;

    // Compute progress 0–100
    let progress = 0;
    if (goalType === "pass" || goalType === "scholarship") {
      progress = masteryPct ?? 0;
    } else if (goalType === "grade" && goalValue) {
      const targetGrade = parseFloat(goalValue); // e.g. 8
      const maxGrade = 10;
      // Mastery → grade proxy: 85% mastery ≈ 9-10, 70% ≈ 7.5-8.5 etc.
      const estGrade = masteryPct !== null ? (masteryPct / 100) * maxGrade * 1.1 : 0;
      progress = Math.min(100, Math.round((estGrade / targetGrade) * 100));
    } else if (goalType === "exam") {
      // Progress = mastery towards exam readiness
      progress = masteryPct ?? 0;
    } else if (goalType === "hours" && goalValue) {
      const targetDays = Math.ceil(parseFloat(goalValue) / 2); // ~2h per active day
      progress = Math.min(100, Math.round((activeDays / Math.max(1, targetDays)) * 100));
    }

    return {
      subjectId: s.id,
      subjectName: s.name,
      goalType,
      goalValue,
      progress,
      masteryPct,
      daysUntilExam,
      weeklyActiveDays: goalType === "hours" ? activeDays : null,
      targetHours: goalType === "hours" && goalValue ? parseFloat(goalValue) : null,
      nextExamDate: nextExam?.date ?? null,
      nextExamTitle: nextExam?.title ?? null,
      flashcardCount: 0, // not needed here
      conceptCount: mastery?.total ?? 0,
    };
  });

  return NextResponse.json(result);
}
