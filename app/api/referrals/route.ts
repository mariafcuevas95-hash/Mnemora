import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export const MILESTONES = [
  { count: 1,  days: 7,   label: "1 semana",   months_display: "1 sem" },
  { count: 3,  days: 30,  label: "1 mes",      months_display: "1 mes" },
  { count: 5,  days: 60,  label: "2 meses",    months_display: "2 meses" },
  { count: 10, days: 180, label: "6 meses",    months_display: "6 meses" },
  { count: 25, days: 365, label: "12 meses",   months_display: "12 meses" },
] as const;

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getAdmin();

  const [profileRes, referralsRes, rewardsRes] = await Promise.all([
    db.from("profiles")
      .select("referral_code, referrals_count, free_months_earned, ambassador_badge, plan, plan_expires_at")
      .eq("id", user.id)
      .single(),
    db.from("referrals")
      .select("id, status, created_at, converted_at, profiles!referred_user_id(name, email)")
      .eq("referrer_id", user.id)
      .order("created_at", { ascending: false }),
    db.from("referral_rewards")
      .select("milestone, days_granted, granted_at")
      .eq("user_id", user.id)
      .order("milestone"),
  ]);

  if (profileRes.error) console.error("[referrals] profile error:", JSON.stringify(profileRes.error));
  if (referralsRes.error) console.error("[referrals] referrals error:", JSON.stringify(referralsRes.error));
  if (rewardsRes.error) console.error("[referrals] rewards error:", JSON.stringify(rewardsRes.error));

  const profile = profileRes.data;
  if (!profile) return NextResponse.json({ error: "Not found", detail: profileRes.error }, { status: 404 });

  // Ensure referral_code exists (backfill edge case)
  let referralCode = profile.referral_code;
  if (!referralCode) {
    const { data: updated } = await db
      .from("profiles")
      .update({ referral_code: await generateCode(db) })
      .eq("id", user.id)
      .select("referral_code")
      .single();
    referralCode = updated?.referral_code ?? null;
  }

  const referrals = (referralsRes.data ?? []).map((r) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p = r.profiles as any;
    return {
      id: r.id,
      status: r.status,
      created_at: r.created_at,
      converted_at: r.converted_at,
      name: p?.name ?? null,
      email: maskEmail(p?.email ?? ""),
    };
  });

  const convertedCount = referrals.filter(r => r.status === "converted" || r.status === "rewarded").length;
  const earnedMilestones = new Set((rewardsRes.data ?? []).map(r => r.milestone));

  const nextMilestone = MILESTONES.find(m => m.count > convertedCount) ?? null;

  return NextResponse.json({
    referralCode,
    referrals,
    convertedCount,
    totalCount: referrals.length,
    earnedMilestones: Array.from(earnedMilestones),
    nextMilestone,
    rewards: rewardsRes.data ?? [],
    ambassadorBadge: profile.ambassador_badge,
    plan: profile.plan,
    planExpiresAt: profile.plan_expires_at,
  });
}

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;
  return `${local.slice(0, 2)}***@${domain}`;
}

async function generateCode(db: ReturnType<typeof import("@/lib/supabase/admin").getAdmin>): Promise<string> {
  const { data } = await db.rpc("generate_referral_code");
  return (data as string) ?? Math.random().toString(36).slice(2, 10).toUpperCase();
}
