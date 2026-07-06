/**
 * XP + gamification engine — server-side only.
 * Called from API routes after meaningful study actions.
 */

import { getAdmin } from "@/lib/supabase/admin";

// ── XP values per event ───────────────────────────────────────────────────────

export type XpEventType =
  | "quiz_complete"       // completed a quiz session
  | "flashcard_session"   // completed a flashcard practice session
  | "exam_mode"           // opened exam mode
  | "upload"              // uploaded a document
  | "transcription"       // transcribed a class
  | "photo_analysis"      // analyzed a photo
  | "daily_planner";      // completed a daily planner task

const BASE_XP: Record<XpEventType, number> = {
  quiz_complete:     50,
  flashcard_session: 30,
  exam_mode:         40,
  upload:            20,
  transcription:     35,
  photo_analysis:    25,
  daily_planner:     15,
};

export interface XpMeta {
  score_pct?:    number;   // quiz score 0-100 → bonus XP if ≥ 80
  cards_reviewed?: number; // flashcard session → extra XP per card
  subject_id?:   string;
}

function computeXP(event: XpEventType, meta: XpMeta = {}): number {
  let xp = BASE_XP[event];

  if (event === "quiz_complete") {
    if ((meta.score_pct ?? 0) >= 80) xp += 15;  // high score bonus
    if ((meta.score_pct ?? 0) === 100) xp += 10; // perfect score
  }

  if (event === "flashcard_session") {
    const cards = meta.cards_reviewed ?? 0;
    xp = Math.min(80, 20 + cards * 2); // 2 XP/card, capped at 80
  }

  return xp;
}

// ── Achievement definitions ───────────────────────────────────────────────────

export interface Achievement {
  id:          string;
  title:       string;
  description: string;
  icon:        string; // emoji
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: "first_session",   title: "Primera sesión",      description: "Completaste tu primera actividad de estudio",   icon: "🎓" },
  { id: "streak_3",        title: "3 días seguidos",     description: "Consistencia es la base del aprendizaje",        icon: "🔥" },
  { id: "streak_7",        title: "Semana sin parar",    description: "7 días de estudio consecutivos",                  icon: "⚡" },
  { id: "quiz_first",      title: "Primer quiz",         description: "Pusiste a prueba tu conocimiento",               icon: "✅" },
  { id: "quiz_5",          title: "5 quizzes",           description: "Evaluación constante, resultados consistentes",  icon: "🎯" },
  { id: "cards_50",        title: "50 flashcards",       description: "La memoria se entrena con repetición",           icon: "🧠" },
  { id: "cards_200",       title: "200 flashcards",      description: "Repaso sistemático y sostenido",                 icon: "📚" },
  { id: "upload_first",    title: "Primer material",     description: "Empezaste a construir tu biblioteca",            icon: "📁" },
  { id: "transcription_first", title: "Clase transcrita", description: "Convertiste una clase en conocimiento activo", icon: "🎙" },
  { id: "photo_first",     title: "Análisis visual",     description: "Mnemora leyó tus apuntes escritos a mano",       icon: "📷" },
  { id: "xp_500",          title: "Estudiante activo",   description: "500 XP acumulados — vas por buen camino",       icon: "⭐" },
  { id: "xp_2000",         title: "Estudio avanzado",    description: "2000 XP — dominio en desarrollo",               icon: "🏆" },
];

const ACHIEVEMENT_MAP = new Map(ACHIEVEMENTS.map(a => [a.id, a]));

// ── Core award function ───────────────────────────────────────────────────────

export interface XpAwardResult {
  xpEarned:        number;
  xpTotal:         number;
  streakDays:      number;
  newAchievements: Achievement[];
}

export async function awardXP(
  userId: string,
  event: XpEventType,
  meta: XpMeta = {}
): Promise<XpAwardResult> {
  const db = getAdmin();
  const xpEarned = computeXP(event, meta);
  const today = new Date().toISOString().slice(0, 10);

  // ── 1. Upsert user_progress and update streak ──────────────────────────────
  const { data: existing } = await db
    .from("user_progress")
    .select("xp_total, streak_days, last_activity_date")
    .eq("user_id", userId)
    .maybeSingle();

  let streak = existing?.streak_days ?? 0;
  const lastDate = existing?.last_activity_date ?? null;

  if (lastDate !== today) {
    const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
    if (lastDate === yesterday) {
      streak += 1; // consecutive day
    } else if (lastDate === null || lastDate < yesterday) {
      streak = 1;  // streak broken or first time
    }
    // if lastDate === today → no change (already counted)
  }

  const newXpTotal = (existing?.xp_total ?? 0) + xpEarned;

  await db.from("user_progress").upsert({
    user_id: userId,
    xp_total: newXpTotal,
    streak_days: streak,
    last_activity_date: today,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });

  // ── 2. Log XP event ────────────────────────────────────────────────────────
  await db.from("xp_events").insert({
    user_id: userId,
    event_type: event,
    xp_earned: xpEarned,
    metadata: meta,
  });

  // ── 3. Check achievements ──────────────────────────────────────────────────
  const newAchievements = await checkAndGrantAchievements(userId, newXpTotal, streak, event, db);

  return { xpEarned, xpTotal: newXpTotal, streakDays: streak, newAchievements };
}

async function checkAndGrantAchievements(
  userId: string,
  xpTotal: number,
  streak: number,
  event: XpEventType,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any
): Promise<Achievement[]> {
  // Fetch already-earned achievements
  const { data: earned } = await db
    .from("user_achievements")
    .select("achievement_id")
    .eq("user_id", userId);

  const earnedSet = new Set((earned ?? []).map((e: { achievement_id: string }) => e.achievement_id));

  // Count events for counters
  const { count: quizCount } = await db
    .from("xp_events")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("event_type", "quiz_complete");

  const { data: cardEvents } = await db
    .from("xp_events")
    .select("metadata")
    .eq("user_id", userId)
    .eq("event_type", "flashcard_session");

  const totalCards = (cardEvents ?? []).reduce(
    (sum: number, e: { metadata: { cards_reviewed?: number } }) => sum + (e.metadata?.cards_reviewed ?? 0), 0
  );

  const { count: anyCount } = await db
    .from("xp_events")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  const toGrant: string[] = [];

  if (!earnedSet.has("first_session") && (anyCount ?? 0) >= 1)           toGrant.push("first_session");
  if (!earnedSet.has("streak_3")      && streak >= 3)                     toGrant.push("streak_3");
  if (!earnedSet.has("streak_7")      && streak >= 7)                     toGrant.push("streak_7");
  if (!earnedSet.has("quiz_first")    && event === "quiz_complete")        toGrant.push("quiz_first");
  if (!earnedSet.has("quiz_5")        && (quizCount ?? 0) >= 5)           toGrant.push("quiz_5");
  if (!earnedSet.has("cards_50")      && totalCards >= 50)                 toGrant.push("cards_50");
  if (!earnedSet.has("cards_200")     && totalCards >= 200)                toGrant.push("cards_200");
  if (!earnedSet.has("upload_first")  && event === "upload")               toGrant.push("upload_first");
  if (!earnedSet.has("transcription_first") && event === "transcription")  toGrant.push("transcription_first");
  if (!earnedSet.has("photo_first")   && event === "photo_analysis")       toGrant.push("photo_first");
  if (!earnedSet.has("xp_500")        && xpTotal >= 500)                   toGrant.push("xp_500");
  if (!earnedSet.has("xp_2000")       && xpTotal >= 2000)                  toGrant.push("xp_2000");

  if (toGrant.length > 0) {
    await db.from("user_achievements").insert(
      toGrant.map(id => ({ user_id: userId, achievement_id: id }))
    );
  }

  return toGrant.map(id => ACHIEVEMENT_MAP.get(id)!).filter(Boolean);
}

// ── Weekly active days (for goal progress) ───────────────────────────────────

export async function getWeeklyActiveDays(userId: string): Promise<number> {
  const db = getAdmin();
  // ISO week: Monday to Sunday
  const now = new Date();
  const day = now.getDay(); // 0 = Sunday
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((day + 6) % 7));
  monday.setHours(0, 0, 0, 0);

  const { data } = await db
    .from("xp_events")
    .select("created_at")
    .eq("user_id", userId)
    .gte("created_at", monday.toISOString());

  const activeDays = new Set(
    (data ?? []).map((e: { created_at: string }) => e.created_at.slice(0, 10))
  );
  return activeDays.size;
}
