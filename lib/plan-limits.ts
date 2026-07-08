/**
 * Server-side limit enforcement.
 * All functions use the Supabase service role to bypass RLS on reads.
 * Call these from API routes — never from client components.
 */

import { PLANS, effectivePlan, type Feature, type LimitCheck, type PlanId } from "./plans";
import { getAdmin } from "./supabase/admin";

interface UserPlanRow {
  plan: PlanId;
  trial_ends_at: string | null;
}

function currentYearMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

async function getUserPlanRow(userId: string): Promise<UserPlanRow> {
  const db = getAdmin();
  const { data } = await db
    .from("profiles")
    .select("plan, trial_ends_at, plan_expires_at")
    .eq("id", userId)
    .single();

  const plan: PlanId = data?.plan ?? "free";
  const trialEndsAt: string | null = data?.trial_ends_at ?? null;
  const planExpiresAt: string | null = data?.plan_expires_at ?? null;

  // Downgrade expired paid plans so server-side limits are enforced correctly
  // even if the Hotmart cancellation webhook was never received.
  if ((plan === "pro" || plan === "premium") && planExpiresAt) {
    if (new Date(planExpiresAt) < new Date()) {
      return { plan: "free", trial_ends_at: trialEndsAt };
    }
  }

  return { plan, trial_ends_at: trialEndsAt };
}

async function getMonthlyUsage(userId: string) {
  const db = getAdmin();
  const ym = currentYearMonth();

  const { data: existing } = await db
    .from("usage_monthly")
    .select("*")
    .eq("user_id", userId)
    .eq("year_month", ym)
    .maybeSingle();

  if (existing) return existing;

  const { data: created } = await db
    .from("usage_monthly")
    .insert({ user_id: userId, year_month: ym })
    .select()
    .single();

  return created ?? {
    flashcards_count: 0, summaries_count: 0,
    tutor_messages_count: 0, syllabuses_count: 0,
  };
}

const PRO_BOOLEAN_FEATURES = new Set<Feature>([
  "quiz", "advanced_memory", "daily_planner", "mind_maps",
]);

const PREMIUM_BOOLEAN_FEATURES = new Set<Feature>([
  "exam_mode", "ai_coaches", "multimodal", "transcription",
  "advanced_analytics", "performance_prediction", "semester_replanner",
  "advanced_mind_maps", "learning_roadmap", "exam_coverage", "academic_goals",
]);

export async function checkLimit(userId: string, feature: Feature): Promise<LimitCheck> {
  let planRow: UserPlanRow;
  let usage: Awaited<ReturnType<typeof getMonthlyUsage>>;
  let subjectCount: number;

  try {
    [planRow, usage, subjectCount] = await Promise.all([
      getUserPlanRow(userId),
      getMonthlyUsage(userId),
      feature === "subjects" ? countSubjects(userId) : Promise.resolve(0),
    ]);
  } catch {
    // DB error — fail closed (deny) to prevent free access on outage
    return { allowed: false, feature, used: 0, limit: 0, remaining: 0, planRequired: "pro" };
  }

  const effectiveId = effectivePlan(planRow.plan, planRow.trial_ends_at);
  const limits = PLANS[effectiveId].limits;

  if (PRO_BOOLEAN_FEATURES.has(feature) || PREMIUM_BOOLEAN_FEATURES.has(feature)) {
    const allowed = limits[feature as keyof typeof limits] as boolean;
    const planRequired: PlanId = PREMIUM_BOOLEAN_FEATURES.has(feature) ? "premium" : "pro";
    return {
      allowed,
      feature,
      used:         allowed ? 1 : 0,
      limit:        allowed,
      remaining:    -1,
      planRequired: allowed ? null : planRequired,
    };
  }

  const limit = limits[feature as keyof typeof limits] as number;
  if (limit === -1) {
    return { allowed: true, feature, used: 0, limit: -1, remaining: -1, planRequired: null };
  }

  let used = 0;
  switch (feature) {
    case "subjects":       used = subjectCount; break;
    case "syllabuses":     used = usage?.syllabuses_count ?? 0; break;
    case "summaries":      used = usage?.summaries_count ?? 0; break;
    case "flashcards":     used = usage?.flashcards_count ?? 0; break;
    case "tutor_messages": used = usage?.tutor_messages_count ?? 0; break;
  }

  const planRequired: PlanId = effectiveId === "free" ? "pro" : "premium";
  const allowed = used < limit;
  return {
    allowed,
    feature,
    used,
    limit,
    remaining:    Math.max(0, limit - used),
    planRequired: allowed ? null : planRequired,
  };
}

async function countSubjects(userId: string): Promise<number> {
  const db = getAdmin();
  const { count } = await db
    .from("subjects")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  return count ?? 0;
}

export async function incrementUsage(
  userId: string,
  field: "flashcards_count" | "summaries_count" | "tutor_messages_count" | "syllabuses_count",
  by = 1
): Promise<void> {
  const db = getAdmin();
  const ym = currentYearMonth();
  await db.rpc("increment_usage", { p_user_id: userId, p_year_month: ym, p_field: field, p_by: by });
}

export function limitExceededResponse(check: LimitCheck): Response {
  return new Response(
    JSON.stringify({
      error:        "limit_exceeded",
      feature:      check.feature,
      used:         check.used,
      limit:        check.limit,
      planRequired: check.planRequired,
      message:      limitMessage(check),
    }),
    { status: 403, headers: { "Content-Type": "application/json" } }
  );
}

export function limitMessage(check: LimitCheck): string {
  const { feature, used, limit } = check;
  switch (feature) {
    case "subjects":
      return "El plan Free permite 1 materia activa. Actualiza a Pro para agregar materias ilimitadas.";
    case "syllabuses":
      return `Usaste tu programa de materia del mes (${used}/${limit}). Actualiza a Pro para programas ilimitados.`;
    case "summaries":
      return `Alcanzaste el límite de resúmenes del mes (${used}/${limit}). Actualiza a Pro para resúmenes ilimitados.`;
    case "flashcards":
      return `Alcanzaste el límite de flashcards del mes (${used}/${limit}). Actualiza a Pro para flashcards ilimitadas.`;
    case "tutor_messages":
      return `Usaste tus ${limit} preguntas al tutor de este mes. Actualiza a Pro para continuar.`;
    case "advanced_memory":
      return "La memoria entre sesiones es una función Pro. Actualiza para que el tutor te recuerde.";
    case "daily_planner":
      return "El planificador diario es una función Pro. Actualiza para acceder.";
    case "mind_maps":
      return "Los mapas mentales son una función Pro. Actualiza para generarlos desde tus documentos.";
    case "exam_mode":
      return "El modo de preparación intensiva para exámenes es exclusivo de Premium.";
    case "ai_coaches":
      return "El AI Study Coach y AI Exam Coach son exclusivos de Premium.";
    case "multimodal":
      return "Analizar fotos de apuntes, ejercicios escritos a mano y pizarrones es exclusivo de Premium.";
    case "transcription":
      return "La transcripción de clases es exclusiva de Premium.";
    case "advanced_analytics":
      return "El dashboard avanzado de aprendizaje y rendimiento es exclusivo de Premium.";
    case "performance_prediction":
      return "La predicción de tu nota y probabilidad de aprobar es exclusiva de Premium.";
    case "semester_replanner":
      return "El replanificador inteligente del semestre es exclusivo de Premium.";
    case "advanced_mind_maps":
      return "Los mapas mentales interactivos avanzados son exclusivos de Premium.";
    case "learning_roadmap":
      return "El roadmap de aprendizaje personalizado es exclusivo de Premium.";
    case "exam_coverage":
      return "La cobertura inteligente del examen es exclusiva de Premium.";
    case "academic_goals":
      return "Los objetivos académicos personalizados son exclusivos de Premium.";
    default:
      return "Límite del plan alcanzado. Actualiza para continuar.";
  }
}
