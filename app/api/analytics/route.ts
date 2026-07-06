import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdmin } from "@/lib/supabase/admin";
import { checkLimit, limitExceededResponse } from "@/lib/plan-limits";
import { ACHIEVEMENTS } from "@/lib/xp";

export const dynamic = "force-dynamic";

export interface DayActivity {
  date: string;   // YYYY-MM-DD
  xp: number;
  sessions: number;
}

export interface SubjectAnalytics {
  id: string;
  name: string;
  masteredCount: number;
  practicedCount: number;
  learningCount: number;
  unknownCount: number;
  totalCount: number;
  masteredPct: number;
  coveredPct: number;
  performanceEstimate: number | null;
  learningSpeed: number | null;
  preferredStyle: string | null;
}

export interface XpByType {
  type: string;
  label: string;
  total: number;
}

export interface AchievementRecord {
  id: string;
  title: string;
  description: string;
  icon: string;
  earnedAt: string;
}

export interface AnalyticsData {
  xpTotal: number;
  streakDays: number;
  totalSessions: number;
  totalConceptsKnown: number;
  totalConceptsMastered: number;
  activity: DayActivity[];        // last 28 days
  xpByType: XpByType[];
  subjects: SubjectAnalytics[];
  achievements: AchievementRecord[];
  generatedAt: string;
}

const XP_TYPE_LABELS: Record<string, string> = {
  quiz_complete:      "Quiz",
  flashcard_session:  "Flashcards",
  exam_mode:          "Modo Examen",
  upload:             "Subir material",
  transcription:      "Transcripción",
  photo_analysis:     "Análisis de foto",
  daily_planner:      "Planificador",
};

export async function GET(_req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const check = await checkLimit(user.id, "advanced_analytics");
  if (!check.allowed) return limitExceededResponse(check);

  const admin = getAdmin();
  const since28 = new Date(Date.now() - 28 * 86_400_000).toISOString();

  const [
    progressRes, xpEventsRes, allKnowledgeRes,
    subjectsRes, cogProfilesRes, achievementsRes,
  ] = await Promise.all([
    admin.from("user_progress").select("xp_total, streak_days").eq("user_id", user.id).maybeSingle(),
    admin.from("xp_events").select("event_type, xp_earned, created_at").eq("user_id", user.id).gte("created_at", since28).order("created_at"),
    admin.from("student_knowledge")
      .select("mastery_level, confidence, subject_concepts!inner(subject_id)")
      .eq("user_id", user.id),
    supabase.from("subjects").select("id, name").order("created_at"),
    admin.from("cognitive_profile").select("subject_id, performance_estimate, learning_speed, preferred_style").eq("user_id", user.id),
    admin.from("user_achievements").select("achievement_id, earned_at").eq("user_id", user.id).order("earned_at", { ascending: false }),
  ]);

  // ── Activity heatmap (last 28 days) ──────────────────────────────────────
  const eventRows = (xpEventsRes.data ?? []) as { event_type: string; xp_earned: number; created_at: string }[];
  const activityMap = new Map<string, DayActivity>();

  // Pre-fill last 28 days with zeros
  for (let i = 27; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10);
    activityMap.set(d, { date: d, xp: 0, sessions: 0 });
  }
  for (const e of eventRows) {
    const d = e.created_at.slice(0, 10);
    const cur = activityMap.get(d);
    if (cur) { cur.xp += e.xp_earned; cur.sessions++; }
  }

  // ── XP by event type ────────────────────────────────────────────────────
  const xpTypeMap = new Map<string, number>();
  for (const e of eventRows) {
    xpTypeMap.set(e.event_type, (xpTypeMap.get(e.event_type) ?? 0) + e.xp_earned);
  }
  const xpByType: XpByType[] = [...xpTypeMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([type, total]) => ({ type, label: XP_TYPE_LABELS[type] ?? type, total }));

  // ── Per-subject knowledge breakdown ─────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allKnowledge = (allKnowledgeRes.data ?? []) as any[];
  const subjects = (subjectsRes.data ?? []) as { id: string; name: string }[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cogProfiles = (cogProfilesRes.data ?? []) as any[];
  const cogMap = new Map(cogProfiles.map(p => [p.subject_id, p]));

  const subjectAnalytics: SubjectAnalytics[] = subjects.map(s => {
    const rows = allKnowledge.filter((k: { subject_concepts: { subject_id: string } }) => k.subject_concepts?.subject_id === s.id);
    const mastered  = rows.filter((k: { mastery_level: string }) => k.mastery_level === "mastered").length;
    const practiced = rows.filter((k: { mastery_level: string }) => k.mastery_level === "practiced").length;
    const learning  = rows.filter((k: { mastery_level: string }) => k.mastery_level === "learning").length;
    const unknown   = rows.filter((k: { mastery_level: string }) => k.mastery_level === "unknown").length;
    const total     = rows.length;
    const cog       = cogMap.get(s.id);
    return {
      id: s.id, name: s.name,
      masteredCount: mastered, practicedCount: practiced,
      learningCount: learning, unknownCount: unknown,
      totalCount: total,
      masteredPct:  total > 0 ? Math.round((mastered / total) * 100) : 0,
      coveredPct:   total > 0 ? Math.round(((mastered + practiced) / total) * 100) : 0,
      performanceEstimate: cog?.performance_estimate ?? null,
      learningSpeed:       cog?.learning_speed ?? null,
      preferredStyle:      cog?.preferred_style ?? null,
    };
  }).filter(s => s.totalCount > 0);

  // ── Achievements ─────────────────────────────────────────────────────────
  const earnedRows = (achievementsRes.data ?? []) as { achievement_id: string; earned_at: string }[];
  const earnedAchievements: AchievementRecord[] = earnedRows.map(r => {
    const def = ACHIEVEMENTS.find(a => a.id === r.achievement_id);
    return def ? { id: def.id, title: def.title, description: def.description, icon: def.icon, earnedAt: r.earned_at } : null;
  }).filter(Boolean) as AchievementRecord[];

  // ── Totals ────────────────────────────────────────────────────────────────
  const totalConceptsKnown   = allKnowledge.filter((k: { mastery_level: string }) => k.mastery_level !== "unknown").length;
  const totalConceptsMastered = allKnowledge.filter((k: { mastery_level: string }) => k.mastery_level === "mastered").length;
  const distinctSessionDays  = new Set(eventRows.map(e => e.created_at.slice(0, 10))).size;

  return NextResponse.json({
    xpTotal:               progressRes.data?.xp_total ?? 0,
    streakDays:            progressRes.data?.streak_days ?? 0,
    totalSessions:         distinctSessionDays,
    totalConceptsKnown,
    totalConceptsMastered,
    activity:              [...activityMap.values()],
    xpByType,
    subjects:              subjectAnalytics,
    achievements:          earnedAchievements,
    generatedAt:           new Date().toISOString(),
  } satisfies AnalyticsData);
}
