import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendWelcomeEmail } from "@/lib/resend";

export const dynamic = "force-dynamic";

/**
 * POST /api/welcome-email
 * Called from /registro after email+password signup (no email confirmation flow).
 * For OAuth and email-confirmation flows, welcome email is sent via /auth/callback.
 * Guard: only sends if profile was created in the last 5 minutes (new signup).
 */
export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ sent: false, reason: "unauthenticated" });

  // Only send if the account was just created (within 5 minutes)
  const createdAt = new Date(user.created_at ?? 0).getTime();
  const ageMs = Date.now() - createdAt;
  if (ageMs > 5 * 60 * 1000) {
    return NextResponse.json({ sent: false, reason: "not_new" });
  }

  const name = user.user_metadata?.name ?? user.user_metadata?.full_name ?? user.email.split("@")[0];

  if (process.env.RESEND_API_KEY) {
    sendWelcomeEmail(user.email, name).catch(() => {});
  }

  return NextResponse.json({ sent: true });
}
