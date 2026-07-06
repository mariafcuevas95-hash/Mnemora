/**
 * Hotmart integration helpers.
 * All functions are server-only — never import from client components.
 *
 * Architecture note: this file intentionally has no Stripe imports.
 * When Stripe is added in a future phase, create lib/stripe.ts in parallel.
 * The webhook router (app/api/webhooks/hotmart/route.ts) handles Hotmart.
 * A future app/api/webhooks/stripe/route.ts will handle Stripe.
 * Shared logic (plan activation, payment_events logging) lives in lib/plan-activation.ts.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type HotmartEventType =
  | "PURCHASE_APPROVED"
  | "PURCHASE_CANCELED"
  | "PURCHASE_REFUNDED"
  | "PURCHASE_CHARGEBACK"
  | "PURCHASE_EXPIRED"
  | "PURCHASE_DELAYED"
  | "SUBSCRIPTION_CANCELLATION";

/** Minimal shape of the Hotmart webhook body (v2.0.0) */
export interface HotmartWebhookPayload {
  id: string;
  creation_date: number;
  event: HotmartEventType;
  version: string;
  data: {
    buyer?: {
      email: string;
      name?: string;
    };
    purchase?: {
      transaction:   string;
      status:        string;
      price?: {
        value:          number;
        currency_value: string;
      };
    };
    subscription?: {
      subscriber?: {
        code: string;
      };
      status?: string;
      plan?: {
        name?: string;
      };
    };
    product?: {
      id:   number;
      name: string;
    };
  };
}

/** What our system needs after parsing a Hotmart event */
export interface ParsedHotmartEvent {
  eventType:         HotmartEventType;
  buyerEmail:        string;
  transactionId:     string;
  subscriptionCode:  string | null;
  amountUsd:         number | null;
  rawPayload:        HotmartWebhookPayload;
}

// ---------------------------------------------------------------------------
// Verification
// ---------------------------------------------------------------------------

/**
 * Verify the incoming Hotmart webhook request.
 * Hotmart sends the HOTTOK as a query parameter: ?hottok=<value>
 * We compare it against the HOTMART_HOTTOK env var (set in Hotmart dashboard).
 */
export function verifyHottok(hottok: string | null): boolean {
  const expected = process.env.HOTMART_HOTTOK;
  if (!expected) {
    // Misconfiguration — fail closed
    console.error("[hotmart] HOTMART_HOTTOK env var is not set");
    return false;
  }
  if (!hottok) return false;
  // Constant-time comparison to prevent timing attacks
  if (hottok.length !== expected.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) {
    mismatch |= expected.charCodeAt(i) ^ hottok.charCodeAt(i);
  }
  return mismatch === 0;
}

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

/**
 * Parse and validate the Hotmart webhook body.
 * Returns null if the payload is malformed or missing required fields.
 */
export function parseHotmartEvent(
  body: unknown
): ParsedHotmartEvent | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;

  const eventType = b.event as HotmartEventType | undefined;
  if (!eventType) return null;

  const data = b.data as HotmartWebhookPayload["data"] | undefined;
  if (!data) return null;

  const buyerEmail = data.buyer?.email;
  if (!buyerEmail) return null;

  const transactionId = data.purchase?.transaction;
  if (!transactionId) return null;

  return {
    eventType,
    buyerEmail:       buyerEmail.toLowerCase().trim(),
    transactionId,
    subscriptionCode: data.subscription?.subscriber?.code ?? null,
    amountUsd:        data.purchase?.price?.value ?? null,
    rawPayload:       b as unknown as HotmartWebhookPayload,
  };
}

// ---------------------------------------------------------------------------
// Event classification
// ---------------------------------------------------------------------------

/** Events that should activate or keep Pro */
export const ACTIVATION_EVENTS: HotmartEventType[] = [
  "PURCHASE_APPROVED",
];

/** Events that should downgrade to Free */
export const DEACTIVATION_EVENTS: HotmartEventType[] = [
  "PURCHASE_CANCELED",
  "PURCHASE_REFUNDED",
  "PURCHASE_CHARGEBACK",
  "PURCHASE_EXPIRED",
  "SUBSCRIPTION_CANCELLATION",
];

export function shouldActivate(event: HotmartEventType): boolean {
  return ACTIVATION_EVENTS.includes(event);
}

export function shouldDeactivate(event: HotmartEventType): boolean {
  return DEACTIVATION_EVENTS.includes(event);
}
