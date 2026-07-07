/**
 * POST /api/webhooks/hotmart
 *
 * Handles Hotmart payment lifecycle events.
 * Security: HOTTOK verified via constant-time comparison (lib/hotmart.ts).
 * All events are logged to payment_events before any profile mutation.
 * Idempotent: duplicate (transaction_id + event_type) pairs are skipped.
 *
 * Future Stripe webhook → app/api/webhooks/stripe/route.ts
 * Shared plan-activation logic → lib/plan-activation.ts (extract when needed)
 */

import { NextRequest, NextResponse } from "next/server";
import { getAdmin } from "@/lib/supabase/admin";
import {
  verifyHottok,
  parseHotmartEvent,
  shouldActivate,
  shouldDeactivate,
} from "@/lib/hotmart";
import { sendProActivatedEmail, sendPlanCancelledEmail, sendPaymentFailedEmail } from "@/lib/resend";
import { handleReferralConversion } from "@/lib/referrals";

export async function POST(req: NextRequest) {
  // 1. Verify HOTTOK — Hotmart sends it as ?hottok= query param (v2 API)
  //    Also accept the x-hotmart-hottok header for backwards compatibility.
  const hottokParam  = req.nextUrl.searchParams.get("hottok");
  const hottokHeader = req.headers.get("x-hotmart-hottok");
  const hottok = hottokParam ?? hottokHeader;

  if (!verifyHottok(hottok)) {
    console.warn("[hotmart/webhook] Invalid or missing hottok");
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 2. Parse body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad Request" }, { status: 400 });
  }

  const event = parseHotmartEvent(body);
  if (!event) {
    console.warn("[hotmart/webhook] Unparseable payload:", JSON.stringify(body).slice(0, 200));
    return NextResponse.json({ error: "Unrecognized payload" }, { status: 400 });
  }

  // 3. Identify product → plan tier
  const raw = body as Record<string, unknown>;
  const productId = (raw?.data as Record<string, unknown>)?.product
    ? String(((raw.data as Record<string, unknown>).product as Record<string, unknown>)?.id ?? "")
    : "";

  // Determine which plan this purchase corresponds to.
  // If neither env var is set, default to "pro" (backwards compatible).
  const proProductId     = process.env.HOTMART_PRO_PRODUCT_ID ?? "";
  const premiumProductId = process.env.HOTMART_PREMIUM_PRODUCT_ID ?? "";

  let targetPlan: "pro" | "premium" = "pro";
  if (premiumProductId && productId === premiumProductId) {
    targetPlan = "premium";
  } else if (proProductId && productId !== proProductId) {
    // Known Pro product ID configured but this event is for a different product — skip
    return NextResponse.json({ received: true, skipped: "wrong_product" });
  }

  const db = getAdmin();

  // 4. Idempotency check — skip if we already processed this transaction+event
  const { data: existing } = await db
    .from("payment_events")
    .select("id")
    .eq("transaction_id", event.transactionId)
    .eq("event_type", event.eventType)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  // 5. Resolve user by email via profiles table (has email column, indexed unique)
  const { data: profileRow } = await db
    .from("profiles")
    .select("id, name")
    .eq("email", event.buyerEmail)
    .maybeSingle();
  const userId   = profileRow?.id   ?? null;
  const userName = profileRow?.name ?? null;

  // 6. Log event (always, even if user not found — for manual reconciliation)
  await db.from("payment_events").insert({
    user_id:           userId,
    provider:          "hotmart",
    event_type:        event.eventType,
    transaction_id:    event.transactionId,
    subscription_code: event.subscriptionCode,
    amount_usd:        event.amountUsd,
    buyer_email:       event.buyerEmail,
    payload:           event.rawPayload as object,
  });

  if (!userId) {
    console.warn(
      `[hotmart/webhook] No user for email ${event.buyerEmail} (${event.eventType}) — logged, no profile change`
    );
    return NextResponse.json({ received: true, matched: false });
  }

  // 7. Apply plan change
  if (shouldActivate(event.eventType)) {
    const planName = event.rawPayload.data.subscription?.plan?.name ?? null;
    await activatePlan(db, userId, targetPlan, event.subscriptionCode, event.buyerEmail, userName, planName);
    // Fire-and-forget: grant referral reward if applicable
    handleReferralConversion(db, userId, targetPlan).catch(err =>
      console.error("[hotmart/webhook] referral conversion failed:", err)
    );
  } else if (shouldDeactivate(event.eventType)) {
    await deactivatePro(db, userId);
    if (process.env.RESEND_API_KEY) {
      const isChargeback = event.eventType === "PURCHASE_CHARGEBACK" || event.eventType === "PURCHASE_REFUNDED";
      if (isChargeback) {
        sendPaymentFailedEmail(event.buyerEmail, userName ?? "estudiante").catch(() => {});
      } else {
        sendPlanCancelledEmail(event.buyerEmail, userName ?? "estudiante").catch(() => {});
      }
    }
  }
  // PURCHASE_DELAYED → log only, no profile change

  return NextResponse.json({ received: true, matched: true });
}

// ---------------------------------------------------------------------------
// Plan mutations
// (Move to lib/plan-activation.ts when Stripe is added as a second provider)
// ---------------------------------------------------------------------------

async function activatePlan(
  db: ReturnType<typeof getAdmin>,
  userId: string,
  plan: "pro" | "premium",
  subscriptionCode: string | null,
  email: string,
  name: string | null,
  planName?: string | null,
) {
  // Calculate expiration: annual plans get 370 days grace, monthly get 35 days.
  // Hotmart doesn't send next_charge_date in the webhook, so we infer from plan name.
  const isAnnual = planName?.toLowerCase().includes("anu") || planName?.toLowerCase().includes("year");
  const graceDays = isAnnual ? 370 : 35;
  const expiresAt = new Date(Date.now() + graceDays * 24 * 60 * 60 * 1000).toISOString();

  const { error } = await db
    .from("profiles")
    .update({
      plan,
      trial_ends_at:             null,
      plan_expires_at:           expiresAt,
      hotmart_subscription_code: subscriptionCode,
    })
    .eq("id", userId);

  if (error) {
    console.error(`[hotmart/webhook] activatePlan(${plan}) failed for ${userId}:`, error.message);
    return;
  }

  console.info(`[hotmart/webhook] ${plan} activated — user ${userId}`);

  if (process.env.RESEND_API_KEY) {
    sendProActivatedEmail(email, name ?? "estudiante").catch(err =>
      console.error("[hotmart/webhook] sendProActivatedEmail failed:", err)
    );
  }
}

async function deactivatePro(
  db: ReturnType<typeof getAdmin>,
  userId: string,
) {
  const { error } = await db
    .from("profiles")
    .update({
      plan:                      "free",
      plan_expires_at:           new Date().toISOString(),
      hotmart_subscription_code: null,
    })
    .eq("id", userId);

  if (error) {
    console.error(`[hotmart/webhook] deactivatePro failed for ${userId}:`, error.message);
  } else {
    console.info(`[hotmart/webhook] Downgraded to Free — user ${userId}`);
  }
}
