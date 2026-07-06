import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkLimit, limitExceededResponse } from "@/lib/plan-limits";
import { generateText } from "@/lib/ai";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export interface CoachRecommendation {
  type: "review" | "exam_prep" | "new_topic" | "encouragement";
  title: string;
  description: string;
  urgency: "high" | "medium" | "low";
  subjectId: string | null;
  actionLabel: string;
  actionHref: string;
}

export interface CoachResponse {
  greeting: string;
  recommendations: CoachRecommendation[];
  generatedAt: string;
}

export async function GET(_req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allowed = await rateLimit(`study-coach:${user.id}`, 20, 60 * 60 * 1000); // 20/hr
  if (!allowed) return NextResponse.json({ error: "Demasiadas solicitudes. Intenta más tarde." }, { status: 429 });

  const check = await checkLimit(user.id, "ai_coaches");
  if (!check.allowed) return limitExceededResponse(check);

  const today = new Date().toISOString().slice(0, 10);
  const in14 = new Date(Date.now() + 14 * 86_400_000).toISOString().slice(0, 10);

  // Fetch all context in parallel
  const [profileRes, subjectRes, dueRes, examRes] = await Promise.all([
    supabase.from("profiles").select("name").eq("id", user.id).single(),
    supabase.from("subjects").select("id, name, goal_type, goal_value").order("created_at").limit(6),
    // Concepts due today (next_review <= now) ordered by confidence asc
    supabase
      .from("student_knowledge")
      .select("confidence, mastery_level, subject_concepts!inner(name, subject_id, subjects!inner(id, name))")
      .eq("user_id", user.id)
      .lte("next_review", new Date().toISOString())
      .order("confidence", { ascending: true })
      .limit(10),
    // Upcoming exams in next 14 days
    supabase
      .from("calendar_events")
      .select("title, event_date, subject_id, subjects!inner(name)")
      .eq("event_type", "exam")
      .gte("event_date", today)
      .lte("event_date", in14)
      .order("event_date")
      .limit(3),
    // Cognitive profile errors — per-subject, get the most recent
  ]);

  const cogRes = await supabase
    .from("cognitive_profile")
    .select("subject_id, error_patterns, learning_speed, preferred_style")
    .eq("user_id", user.id)
    .limit(5);

  const studentName = (profileRes.data?.name ?? "").split(" ")[0] || "estudiante";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const subjects = (subjectRes.data ?? []) as any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dueConcepts = (dueRes.data ?? []) as any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const upcomingExams = (examRes.data ?? []) as any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cogProfiles = (cogRes.data ?? []) as any[];

  // ── Build compact context for the AI ──────────────────────────────────────
  const subjectNames = subjects.map(s => s.name).join(", ");
  const dueList = dueConcepts.slice(0, 5).map(k =>
    `• ${k.subject_concepts?.name} (${k.subject_concepts?.subjects?.name}) — confianza ${Math.round(k.confidence * 100)}%`
  ).join("\n");

  const examList = upcomingExams.map(e => {
    const days = Math.round((new Date(e.event_date).getTime() - Date.now()) / 86_400_000);
    return `• ${e.title} (${(e.subjects as any)?.name}) en ${days} día${days !== 1 ? "s" : ""}`;
  }).join("\n");

  const errorList = cogProfiles.flatMap(p => (p.error_patterns ?? []).slice(0, 2)).slice(0, 4).join(", ");

  const goalLines = subjects
    .filter((s: { goal_type?: string | null }) => s.goal_type)
    .map((s: { name: string; goal_type: string; goal_value?: string | null }) => {
      const label = s.goal_type === "pass" ? "Aprobar"
        : s.goal_type === "grade" ? `Nota ${s.goal_value ?? "?"}`
        : s.goal_type === "exam" ? "Preparar examen"
        : s.goal_type === "scholarship" ? "Mantener beca"
        : s.goal_type === "hours" ? `${s.goal_value ?? "?"} horas/semana`
        : s.goal_type;
      return `• ${s.name}: ${label}`;
    }).join("\n");

  const context = [
    `Estudiante: ${studentName}`,
    subjectNames ? `Materias: ${subjectNames}` : null,
    goalLines ? `Objetivos del estudiante:\n${goalLines}` : null,
    dueList ? `Conceptos pendientes hoy:\n${dueList}` : "Sin conceptos pendientes de repaso hoy.",
    examList ? `Exámenes próximos:\n${examList}` : "Sin exámenes en los próximos 14 días.",
    errorList ? `Errores frecuentes del estudiante: ${errorList}` : null,
  ].filter(Boolean).join("\n\n");

  // Fallback: if no AI key, compute recommendations deterministically
  if (!process.env.GEMINI_API_KEY && !process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(buildFallback(studentName, dueConcepts, upcomingExams, subjects));
  }

  try {
    const resp = await generateText({
      model: "processor",
      maxTokens: 512,
      system: `Eres el AI Study Coach de Mnemora, un tutor académico personalizado para universitarios.
Analiza el estado de estudio de un estudiante y genera exactamente 3 recomendaciones concretas para hoy.
Devuelve SOLO JSON válido. Sin texto extra. Sin markdown. Sin explicaciones.`,
      messages: [{
        role: "user",
        content: `Contexto del estudiante:
${context}

Genera 3 recomendaciones de estudio para hoy. JSON con este formato exacto:
{
  "greeting": "saludo breve y motivador de 1 línea para ${studentName}",
  "recommendations": [
    {
      "type": "review" | "exam_prep" | "new_topic" | "encouragement",
      "title": "título corto (máx 6 palabras)",
      "description": "consejo concreto de 1 oración (máx 20 palabras). Menciona el concepto o materia específica.",
      "urgency": "high" | "medium" | "low",
      "subjectId": "${subjects[0]?.id ?? "null"} (o el id correcto, o null)"
    }
  ]
}

Reglas:
- Si hay exámenes próximos, la primera recomendación siempre es exam_prep.
- Si hay conceptos pendientes, la segunda es review con el concepto específico.
- Sé muy concreto: mencioná el concepto o materia por nombre.
- subjectId debe ser uno de estos IDs: ${subjects.map(s => `${s.name}="${s.id}"`).join(", ")} — o null.`,
      }],
    });

    const json = JSON.parse(resp.text.replace(/```json\n?|```/g, "").trim());

    // Enrich with actionHref and actionLabel
    const enriched: CoachResponse = {
      greeting: json.greeting ?? `¡Hola, ${studentName}!`,
      generatedAt: new Date().toISOString(),
      recommendations: (json.recommendations ?? []).slice(0, 3).map((r: Omit<CoachRecommendation, "actionLabel" | "actionHref">) => {
        const subId = r.subjectId && r.subjectId !== "null" ? r.subjectId : subjects[0]?.id ?? null;
        const actionHref =
          r.type === "exam_prep" && subId ? `/examen/${subId}`
          : r.type === "review" && subId ? `/flashcards/${subId}`
          : r.type === "new_topic" && subId ? `/tutor/${subId}`
          : "/progreso";
        const actionLabel =
          r.type === "exam_prep" ? "Modo intensivo"
          : r.type === "review" ? "Practicar ahora"
          : r.type === "new_topic" ? "Preguntarle al tutor"
          : "Ver progreso";
        return { ...r, subjectId: subId, actionHref, actionLabel };
      }),
    };

    return NextResponse.json(enriched);

  } catch {
    return NextResponse.json(buildFallback(studentName, dueConcepts, upcomingExams, subjects));
  }
}

// Deterministic fallback — no AI needed
function buildFallback(
  name: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dueConcepts: any[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  exams: any[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  subjects: any[]
): CoachResponse {
  const recs: CoachRecommendation[] = [];

  if (exams.length > 0) {
    const e = exams[0];
    const days = Math.round((new Date(e.event_date).getTime() - Date.now()) / 86_400_000);
    const subId = e.subject_id ?? null;
    recs.push({
      type: "exam_prep",
      title: `${e.subjects?.name ?? "Examen"} en ${days}d`,
      description: `Tienes el ${e.title} en ${days} día${days !== 1 ? "s" : ""}. Repasa los conceptos críticos.`,
      urgency: days <= 3 ? "high" : "medium",
      subjectId: subId,
      actionLabel: "Modo intensivo",
      actionHref: subId ? `/examen/${subId}` : "/progreso",
    });
  }

  if (dueConcepts.length > 0) {
    const k = dueConcepts[0];
    const subId = k.subject_concepts?.subjects?.id ?? subjects[0]?.id ?? null;
    recs.push({
      type: "review",
      title: "Repaso del día",
      description: `${dueConcepts.length} concepto${dueConcepts.length !== 1 ? "s" : ""} pendiente${dueConcepts.length !== 1 ? "s" : ""} hoy. Empezá por "${k.subject_concepts?.name}".`,
      urgency: "medium",
      subjectId: subId,
      actionLabel: "Practicar ahora",
      actionHref: subId ? `/flashcards/${subId}` : "/flashcards",
    });
  }

  if (subjects.length > 0 && recs.length < 3) {
    const s = subjects[recs.length] ?? subjects[0];
    recs.push({
      type: "new_topic",
      title: `Explorar ${s.name}`,
      description: `Sube un documento o chatea con el tutor de ${s.name} para que Mnemora aprenda tus conceptos.`,
      urgency: "low",
      subjectId: s.id,
      actionLabel: "Abrir materia",
      actionHref: `/materias/${s.id}`,
    });
  }

  while (recs.length < 3) {
    recs.push({
      type: "encouragement",
      title: "Todo al día",
      description: "No tienes repasos pendientes hoy. Aprovecha para adelantar contenido nuevo.",
      urgency: "low",
      subjectId: subjects[0]?.id ?? null,
      actionLabel: "Ver progreso",
      actionHref: "/progreso",
    });
  }

  return {
    greeting: `¡Hola, ${name}! Esto es lo que te recomiendo para hoy.`,
    recommendations: recs.slice(0, 3),
    generatedAt: new Date().toISOString(),
  };
}
