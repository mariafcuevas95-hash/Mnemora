import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ACHIEVEMENTS } from "@/lib/xp";

export const dynamic = "force-dynamic";

const LEVELS = [
  { name: "Principiante",  minXp: 0    },
  { name: "Estudiante",    minXp: 300  },
  { name: "Avanzado",      minXp: 1000 },
  { name: "Experto",       minXp: 3000 },
  { name: "Maestro",       minXp: 7000 },
];

function getLevel(xp: number) {
  let lvl = LEVELS[0];
  for (const l of LEVELS) { if (xp >= l.minXp) lvl = l; }
  const idx = LEVELS.indexOf(lvl);
  const next = LEVELS[idx + 1] ?? null;
  const progressPct = next
    ? Math.round(((xp - lvl.minXp) / (next.minXp - lvl.minXp)) * 100)
    : 100;
  return { name: lvl.name, nextName: next?.name ?? null, nextXp: next?.minXp ?? null, progressPct };
}

export interface GamificationData {
  xpTotal: number;
  streakDays: number;
  level: { name: string; nextName: string | null; nextXp: number | null; progressPct: number };
  achievements: { id: string; title: string; description: string; icon: string; earned: boolean; earnedAt: string | null }[];
  recentXp: { date: string; xp: number }[];  // last 7 days
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json(null, { status: 401 });

  const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();

  const [progressRes, achievementsRes, eventsRes] = await Promise.all([
    supabase.from("user_progress").select("xp_total, streak_days").eq("user_id", user.id).maybeSingle(),
    supabase.from("user_achievements").select("achievement_id, earned_at").eq("user_id", user.id),
    supabase.from("xp_events").select("xp_earned, created_at").eq("user_id", user.id).gte("created_at", sevenDaysAgo).order("created_at"),
  ]);

  const xpTotal = progressRes.data?.xp_total ?? 0;
  const streakDays = progressRes.data?.streak_days ?? 0;

  const earnedMap = new Map(
    (achievementsRes.data ?? []).map(a => [a.achievement_id, a.earned_at as string])
  );

  const achievements = ACHIEVEMENTS.map(a => ({
    id: a.id,
    title: a.title,
    description: a.description,
    icon: a.icon,
    earned: earnedMap.has(a.id),
    earnedAt: earnedMap.get(a.id) ?? null,
  }));

  // Aggregate XP per day for chart
  const xpByDay = new Map<string, number>();
  for (const ev of (eventsRes.data ?? [])) {
    const day = ev.created_at.slice(0, 10);
    xpByDay.set(day, (xpByDay.get(day) ?? 0) + ev.xp_earned);
  }

  const recentXp: { date: string; xp: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10);
    recentXp.push({ date: d, xp: xpByDay.get(d) ?? 0 });
  }

  return NextResponse.json({
    xpTotal,
    streakDays,
    level: getLevel(xpTotal),
    achievements,
    recentXp,
  } satisfies GamificationData);
}
