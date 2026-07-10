/**
 * Referral reward logic — called from Hotmart webhook after plan activation.
 * All mutations use the admin client (service role).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { sendReferralRewardEmail } from "@/lib/resend";

export const MILESTONES = [
  { count: 1,  days: 7,   label: "1 semana"  },
  { count: 3,  days: 30,  label: "1 mes"     },
  { count: 5,  days: 60,  label: "2 meses"   },
  { count: 10, days: 180, label: "6 meses"   },
  { count: 25, days: 365, label: "12 meses"  },
] as const;

/**
 * Called after a user's plan is activated.
 * - Marks their referral as converted
 * - Grants any newly unlocked milestones to the referrer
 */
export async function handleReferralConversion(
  db: SupabaseClient,
  convertedUserId: string,
  convertedUserPlan: "pro" | "premium"
): Promise<void> {
  // 1. Find referral for this user
  const { data: referral } = await db
    .from("referrals")
    .select("id, referrer_id, status")
    .eq("referred_user_id", convertedUserId)
    .maybeSingle();

  if (!referral || referral.status === "converted" || referral.status === "rewarded") return;

  // 2. Mark as converted
  await db.from("referrals").update({
    status: "converted",
    converted_at: new Date().toISOString(),
  }).eq("id", referral.id);

  const referrerId = referral.referrer_id;

  // 3. Count total converted for referrer
  const { count: totalConverted } = await db
    .from("referrals")
    .select("id", { count: "exact", head: true })
    .eq("referrer_id", referrerId)
    .in("status", ["converted", "rewarded"]);

  const newTotal = (totalConverted ?? 0);

  // 4. Find which milestones are newly unlocked
  const { data: alreadyGranted } = await db
    .from("referral_rewards")
    .select("milestone")
    .eq("user_id", referrerId);

  const granted = new Set((alreadyGranted ?? []).map(r => r.milestone));

  // 5. Get referrer profile (plan + expires_at)
  const { data: referrerProfile } = await db
    .from("profiles")
    .select("plan, plan_expires_at")
    .eq("id", referrerId)
    .single();

  if (!referrerProfile) return;

  let totalDaysToAdd = 0;
  const newMilestones: typeof MILESTONES[number][] = [];

  for (const m of MILESTONES) {
    if (newTotal >= m.count && !granted.has(m.count)) {
      newMilestones.push(m);
      totalDaysToAdd += m.days;
    }
  }

  if (newMilestones.length === 0) return;

  // 6. Extend plan_expires_at (never downgrade plan)
  const referrerPlan = referrerProfile.plan as string;
  const baseDate = referrerProfile.plan_expires_at
    ? new Date(referrerProfile.plan_expires_at)
    : new Date();
  if (baseDate < new Date()) baseDate.setTime(new Date().getTime()); // reset if already expired
  const newExpiry = new Date(baseDate.getTime() + totalDaysToAdd * 86_400_000);

  const planToKeep = referrerPlan === "premium" ? "premium"
    : convertedUserPlan === "premium" ? referrerPlan  // never upgrade referrer's plan
    : referrerPlan;

  await db.from("profiles").update({
    plan_expires_at: newExpiry.toISOString(),
    referrals_count: newTotal,
    ambassador_badge: newTotal >= 25 ? true : undefined,
  }).eq("id", referrerId);

  // 7. Insert reward records
  await db.from("referral_rewards").insert(
    newMilestones.map(m => ({
      user_id: referrerId,
      milestone: m.count,
      days_granted: m.days,
      plan_at_grant: planToKeep,
    }))
  );

  // 8. Mark referral as rewarded
  await db.from("referrals").update({ status: "rewarded" }).eq("id", referral.id);

  // 9. Notify referrer by email for each newly unlocked milestone
  const { data: referrerEmailRow } = await db
    .from("profiles")
    .select("email, name")
    .eq("id", referrerId)
    .single();
  if (referrerEmailRow?.email) {
    for (const m of newMilestones) {
      sendReferralRewardEmail(referrerEmailRow.email, referrerEmailRow.name ?? "estudiante", m.count, m.days)
        .catch(err => console.error("[referrals] sendReferralRewardEmail failed:", err));
    }
  }

  console.info(`[referrals] Referrer ${referrerId} reached ${newTotal} referrals, +${totalDaysToAdd} days, new expiry ${newExpiry.toISOString()}`);
}
