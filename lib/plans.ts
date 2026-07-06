/**
 * Single source of truth for plan limits and feature gates.
 * Backend enforces via checkLimit(). UI reads PLANS for display.
 *
 * Strategy:
 *  Free    → descubrir el producto (1 materia activa es el principal driver de upgrade)
 *  Pro     → herramienta diaria de estudio, elimina fricciones ($9.99/mes · $89/año)
 *  Premium → coach académico personal con IA proactiva ($16.99/mes · $159/año)
 */

export type PlanId = "free" | "pro" | "premium";

export type Feature =
  // ── Numeric (tracked monthly in usage_monthly) ──────────────────────────
  | "subjects"           // max active subjects
  | "syllabuses"         // syllabus extractions per month
  | "summaries"          // AI summaries per month
  | "flashcards"         // flashcards generated per month
  | "tutor_messages"     // tutor chat messages per month
  // ── Boolean: Pro+ ───────────────────────────────────────────────────────
  | "quiz"               // AI-generated adaptive quizzes
  | "advanced_memory"    // persistent cross-session memory (Mem0)
  | "daily_planner"      // basic daily study planner
  | "mind_maps"          // static mind maps from documents
  // ── Boolean: Premium only ───────────────────────────────────────────────
  | "exam_mode"            // Modo de preparación intensiva para exámenes
  | "ai_coaches"           // AI Study Coach + AI Exam Coach (proactive)
  | "multimodal"           // photos of notes, handwritten exercises, whiteboards, diagrams
  | "transcription"        // class audio transcription → concepts (disabled for MVP)
  | "advanced_analytics"   // dashboard avanzado de aprendizaje y rendimiento
  | "performance_prediction" // predicción de nota y probabilidad de aprobar
  | "semester_replanner"   // intelligent semester reorganizer
  | "advanced_mind_maps"   // interactive mind maps with mastery-colored nodes
  | "learning_roadmap"     // roadmap personalizado: qué aprender después según el progreso
  | "exam_coverage"        // cobertura del examen: % dominado + temas que faltan
  | "academic_goals";      // objetivos académicos personalizados (aprobar, nota, beca, etc.)

export interface PlanLimits {
  // Numeric (-1 = unlimited)
  subjects:       number;
  syllabuses:     number;
  summaries:      number;
  flashcards:     number;
  tutor_messages: number;
  // Boolean: Pro+
  quiz:            boolean;
  advanced_memory: boolean;
  daily_planner:   boolean;
  mind_maps:       boolean;
  // Boolean: Premium only
  exam_mode:               boolean;
  ai_coaches:              boolean;
  multimodal:              boolean;
  transcription:           boolean;
  advanced_analytics:      boolean;
  performance_prediction:  boolean;
  semester_replanner:      boolean;
  advanced_mind_maps:      boolean;
  learning_roadmap:        boolean;
  exam_coverage:           boolean;
  academic_goals:          boolean;
}

export interface Plan {
  id:              PlanId;
  name:            string;
  price_usd:       number;  // monthly price USD
  price_usd_year:  number;  // annual price USD (billed yearly via Hotmart)
  limits:          PlanLimits;
  badge?:          string;
  highlight?:      boolean;
}

const PREMIUM_EXCLUSIVE = {
  exam_mode:               true,
  ai_coaches:              true,
  multimodal:              true,
  transcription:           false,
  advanced_analytics:      true,
  performance_prediction:  true,
  semester_replanner:      true,
  advanced_mind_maps:      true,
  learning_roadmap:        true,
  exam_coverage:           true,
  academic_goals:          true,
} as const;

const PREMIUM_EXCLUSIVE_OFF = Object.fromEntries(
  Object.keys(PREMIUM_EXCLUSIVE).map(k => [k, false])
) as { [K in keyof typeof PREMIUM_EXCLUSIVE]: false };

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id:             "free",
    name:           "Free",
    price_usd:      0,
    price_usd_year: 0,
    limits: {
      subjects:       1,
      syllabuses:     1,
      summaries:      3,
      flashcards:     30,
      tutor_messages: 20,
      quiz:            false,
      advanced_memory: false,
      daily_planner:   false,
      mind_maps:       false,
      ...PREMIUM_EXCLUSIVE_OFF,
    },
  },

  pro: {
    id:             "pro",
    name:           "Pro",
    price_usd:      9.99,
    price_usd_year: 89,
    highlight:      true,
    badge:          "Más popular",
    limits: {
      subjects:       -1,
      syllabuses:     -1,
      summaries:      -1,
      flashcards:     -1,
      tutor_messages: 500,
      quiz:            true,
      advanced_memory: true,
      daily_planner:   true,
      mind_maps:       true,
      ...PREMIUM_EXCLUSIVE_OFF,
    },
  },

  premium: {
    id:             "premium",
    name:           "Premium",
    price_usd:      14.99,
    price_usd_year: 159,
    badge:          "Todo desbloqueado",
    limits: {
      subjects:       -1,
      syllabuses:     -1,
      summaries:      -1,
      flashcards:     -1,
      tutor_messages: -1,
      quiz:            true,
      advanced_memory: true,
      daily_planner:   true,
      mind_maps:       true,
      ...PREMIUM_EXCLUSIVE,
    },
  },
};

export const FEATURE_LABELS: Record<Feature, string> = {
  quiz:                   "quizzes adaptativos con IA",
  subjects:               "materias activas",
  syllabuses:             "programas de materia/mes",
  summaries:              "resúmenes con IA/mes",
  flashcards:             "flashcards generadas/mes",
  tutor_messages:         "preguntas al tutor/mes",
  advanced_memory:        "memoria avanzada entre sesiones",
  daily_planner:          "planificador diario",
  mind_maps:              "mapas mentales básicos",
  exam_mode:              "modo de preparación intensiva para exámenes",
  ai_coaches:             "AI Study Coach + AI Exam Coach",
  multimodal:             "analiza fotos de apuntes, ejercicios escritos a mano y pizarrones",
  transcription:          "transcripción de clases",
  advanced_analytics:     "dashboard avanzado de aprendizaje y rendimiento",
  performance_prediction: "predicción de tu nota y probabilidad de aprobar",
  semester_replanner:     "replanificador inteligente del semestre",
  advanced_mind_maps:     "mapas mentales interactivos avanzados",
  learning_roadmap:       "roadmap de aprendizaje personalizado",
  exam_coverage:          "cobertura inteligente del examen",
  academic_goals:         "objetivos académicos personalizados",
};

/** Checks if a trial is still active */
export function isTrialActive(trialEndsAt: string | null): boolean {
  if (!trialEndsAt) return false;
  return new Date(trialEndsAt) > new Date();
}

/** Effective plan: during trial, Free users get Pro features */
export function effectivePlan(plan: PlanId, trialEndsAt: string | null): PlanId {
  if (plan === "free" && isTrialActive(trialEndsAt)) return "pro";
  return plan;
}

export interface LimitCheck {
  allowed:      boolean;
  feature:      Feature;
  used:         number;
  limit:        number | boolean;
  remaining:    number;
  planRequired: PlanId | null;
}
