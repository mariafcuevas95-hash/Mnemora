import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * POST /api/claim-pending-purchase
 * Called after login/signup to activate any purchase made before the account existed.
 * Checks payment_events for approved purchases with the user's email but no user_id.
 */
export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ claimed: false });

  const db = getAdmin();

  // Find the most recent approved purchase for this email without a user attached
  const { data: event } = await db
    .from("payment_events")
    .select("id, event_type, payload")
    .eq("buyer_email", user.email)
    .is("user_id", null)
    .in("event_type", ["PURCHASE_APPROVED", "PURCHASE_COMPLETE"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!event) return NextResponse.json({ claimed: false });

  // Determine plan from payload
  const payload = event.payload as Record<string, unknown>;
  const data = payload?.data as Record<string, unknown> | undefined;
  const productId = String((data?.product as Record<string, unknown>)?.id ?? "");

  const proProductId     = process.env.HOTMART_PRO_PRODUCT_ID ?? "";
  const premiumProductId = process.env.HOTMART_PREMIUM_PRODUCT_ID ?? "";
  let plan: "pro" | "premium" = "pro";
  if (premiumProductId && productId === premiumProductId) plan = "premium";

  const planName = (data?.subscription as Record<string, unknown>)?.plan as Record<string, unknown> | undefined;
  const planNameStr = String(planName?.name ?? "");
  const isAnnual = planNameStr.toLowerCase().includes("anu") || planNameStr.toLowerCase().includes("year");
  const graceDays = isAnnual ? 370 : 35;
  const expiresAt = new Date(Date.now() + graceDays * 24 * 60 * 60 * 1000).toISOString();

  // Activate plan
  await db.from("profiles").update({
    plan,
    trial_ends_at:   null,
    plan_expires_at: expiresAt,
  }).eq("id", user.id);

  // Tie the payment event to this user
  await db.from("payment_events").update({ user_id: user.id }).eq("id", event.id);

  console.info(`[claim-pending-purchase] Activated ${plan} for ${user.email} from event ${event.id}`);
  return NextResponse.json({ claimed: true, plan });
}
