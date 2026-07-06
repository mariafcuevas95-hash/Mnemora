import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdmin } from "@/lib/supabase/admin";
import { checkLimit, limitExceededResponse } from "@/lib/plan-limits";
import { generateText } from "@/lib/ai";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export interface DayPlan {
  date: string;        // YYYY-MM-DD
  label: string;       // "Lunes 7 jul"
  tasks: {
    subjectName: string;
    activity: string;  // "Repasar conceptos de Termodinámica"
    durationMin: number;
    priority: "alta" | "media" | "baja";
  }[];
  totalMin: number;
}

export interface ReplannerResult {
  weekStart: string;   // YYYY-MM-DD (Monday)
  diagnosis: string;   // Paragraph explaining WHY a replan is needed
  changes: string[];   // Bullet list of specific changes made
  plan: DayPlan[];     // 7 days
  generatedAt: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function nextMonday(): Date {
  const d = new Date();
  const day = d.getDay();           // 0=Sun, 1=Mon…
  const daysUntil = day === 1 ? 0 : (8 - day) % 7 || 7;
  d.setDate(d.getDate() + daysUntil);
  d.setHours(0, 0, 0, 0);
  return d;
}

function dateLabel(d: Date): string {
  return d.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "short" });
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// ── Route ─────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const check = await checkLimit(user.id, "semester_replanner");
  if (!check.allowed) return limitExceededResponse(check);

  // Optional: student-provided weekly hours (default 2h/day)
  const body = await req.json().catch(() => ({})) as { weeklyHoursPerDay?: number };
  const hoursPerDay = Math.min(Math.max(body.weeklyHoursPerDay ?? 2, 0.5), 6);

  const admin = getAdmin();
  const today = isoDate(new Date());
  const in60Days = isoDate(addDays(new Date(), 60));

  const [subjectsRes, eventsRes, knowledgeRes, cogProfilesRes] = await Promise.all([
    supabase.from("subjects").select("id, name, goal_type, goal_value").order("created_at"),
    supabase
      .from("calendar_events")
      .select("title, event_type, event_date, subject_id")
      .gte("event_date", today)
      .lte("event_date", in60Days)
      .order("event_date"),
    admin
      .from("student_knowledge")
      .select("concept_id, mastery_level, confidence, subject_concepts!inner(id, name, subject_id, learning_order)")
      .eq("user_id", user.id),
    admin
      .from("cognitive_profile")
      .select("subject_id, performance_estimate, learning_speed, preferred_style")
      .eq("user_id", user.id),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const subjects = (subjectsRes.data ?? []) as any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const events = (eventsRes.data ?? []) as any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const knowledge = (knowledgeRes.data ?? []) as any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cogProfiles = (cogProfilesRes.data ?? []) as any[];

  // Fetch ALL subject_concepts for subjects the student hasn't started yet
  const subjectIds = subjects.map(s => s.id);
  const { data: allConcepts } = subjectIds.length > 0
    ? await supabase
        .from("subject_concepts")
        .select("id, name, subject_id, learning_order")
        .in("subject_id", subjectIds)
        .order("learning_order", { ascending: true, nullsFirst: false })
    : { data: [] };

  const cogMap = new Map(cogProfiles.map(p => [p.subject_id, p]));
  const knownConceptIds = new Set(knowledge.map((k: { concept_id: string }) => k.concept_id));

  // ── Build context summary for the AI ─────────────────────────────────────
  const subjectSummaries = subjects.map(s => {
    const cog = cogMap.get(s.id);
    const sKnowledge = knowledge.filter((k: { subject_concepts: { subject_id: string } }) => k.subject_concepts?.subject_id === s.id);
    const sConcepts = (allConcepts ?? []).filter((c: { subject_id: string }) => c.subject_id === s.id);
    const mastered   = sKnowledge.filter((k: { mastery_level: string }) => k.mastery_level === "mastered").length;
    const inProgress = sKnowledge.filter((k: { mastery_level: string }) => ["learning","practiced"].includes(k.mastery_level)).length;
    const notStarted = sConcepts.filter((c: { id: string }) => !knownConceptIds.has(c.id)).length;
    const weakConcepts = sKnowledge
      .filter((k: { mastery_level: string; confidence: number }) => k.mastery_level !== "mastered" && k.confidence < 0.4)
      .slice(0, 5)
      .map((k: { subject_concepts: { name: string } }) => k.subject_concepts?.name)
      .filter(Boolean);
    const nextExams = events.filter((e: { subject_id: string; event_type: string }) => e.subject_id === s.id && e.event_type === "exam");
    const nextDeadlines = events.filter((e: { subject_id: string; event_type: string }) => e.subject_id === s.id && e.event_type !== "exam");

    return {
      name: s.name,
      goal: s.goal_type ? `${s.goal_type}: ${s.goal_value ?? ""}` : "sin objetivo definido",
      masteredConcepts: mastered,
      inProgressConcepts: inProgress,
      notStartedConcepts: notStarted,
      totalConcepts: sConcepts.length,
      performanceEstimate: cog?.performance_estimate ?? null,
      learningSpeed: cog?.learning_speed ?? null,
      weakConcepts,
      nextExams: nextExams.map((e: { title: string; event_date: string }) => ({ title: e.title, date: e.event_date })),
      nextDeadlines: nextDeadlines.map((e: { title: string; event_date: string }) => ({ title: e.title, date: e.event_date })),
    };
  });

  const monday = nextMonday();
  const weekDates = Array.from({ length: 7 }, (_, i) => ({
    iso: isoDate(addDays(monday, i)),
    label: dateLabel(addDays(monday, i)),
  }));

  const prompt = `Eres un planificador académico inteligente. Analiza la situación del estudiante y genera un plan de estudio semanal detallado.

CONTEXTO DEL ESTUDIANTE:
- Disponibilidad: ${hoursPerDay} horas por día (${hoursPerDay * 60} minutos)
- Semana a planificar: ${weekDates[0].label} al ${weekDates[6].label}

MATERIAS Y ESTADO ACTUAL:
${JSON.stringify(subjectSummaries, null, 2)}

INSTRUCCIONES:
1. Identifica qué materias tienen exámenes pronto y necesitan más atención urgente.
2. Prioriza conceptos débiles (confidence < 0.4) y conceptos sin iniciar de materias con examen próximo.
3. Distribuye el tiempo de forma realista respetando el límite de ${hoursPerDay * 60} minutos/día.
4. No sobrecargues días con examen o entrega.
5. Mezcla actividades: repasos cortos, flashcards, quiz de práctica.

RESPONDE SOLO con JSON válido, sin markdown ni texto extra, con este esquema exacto:
{
  "diagnosis": "Párrafo explicando el estado actual del estudiante y por qué el plan actual ya no es óptimo",
  "changes": ["cambio 1", "cambio 2", "cambio 3"],
  "plan": [
    {
      "date": "YYYY-MM-DD",
      "tasks": [
        {
          "subjectName": "nombre materia",
          "activity": "descripción específica de la actividad",
          "durationMin": 30,
          "priority": "alta|media|baja"
        }
      ]
    }
  ]
}
Los 7 días deben estar en orden de ${weekDates[0].iso} a ${weekDates[6].iso}.`;

  let result: Omit<ReplannerResult, "weekStart" | "generatedAt">;
  try {
    const aiResult = await generateText({
      model: "extractor",
      messages: [{ role: "user", content: prompt }],
      maxTokens: 3000,
    });

    const parsed = JSON.parse(aiResult.text.trim());
    result = parsed;
  } catch {
    return NextResponse.json({ error: "Error generando el plan. Intenta de nuevo." }, { status: 500 });
  }

  // Enrich plan with labels and totals
  const enrichedPlan: DayPlan[] = weekDates.map((wd, i) => {
    const day = result.plan[i] ?? { date: wd.iso, tasks: [] };
    const tasks = (day.tasks ?? []).map((t: { subjectName: string; activity: string; durationMin: number; priority: string }) => ({
      subjectName: t.subjectName,
      activity: t.activity,
      durationMin: t.durationMin ?? 30,
      priority: (["alta","media","baja"].includes(t.priority) ? t.priority : "media") as DayPlan["tasks"][number]["priority"],
    }));
    return {
      date: wd.iso,
      label: wd.label,
      tasks,
      totalMin: tasks.reduce((sum: number, t: { durationMin: number }) => sum + t.durationMin, 0),
    };
  });

  return NextResponse.json({
    weekStart: isoDate(monday),
    diagnosis: result.diagnosis,
    changes: result.changes ?? [],
    plan: enrichedPlan,
    generatedAt: new Date().toISOString(),
  } satisfies ReplannerResult);
}
