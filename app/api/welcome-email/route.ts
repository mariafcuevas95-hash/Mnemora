import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdmin } from "@/lib/supabase/admin";
import { sendWelcomeEmail } from "@/lib/resend";

export const dynamic = "force-dynamic";

/**
 * POST /api/welcome-email
 * Called from /registro after email+password signup (no email confirmation flow).
 * For OAuth and email-confirmation flows, welcome email is sent via /auth/callback.
 * Guard: persistent flag in user_metadata.welcome_email_sent — survives retries and tab duplication.
 */
export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ sent: false, reason: "unauthenticated" });

  // Persistent guard: never send twice to the same user
  if (user.user_metadata?.welcome_email_sent) {
    return NextResponse.json({ sent: false, reason: "already_sent" });
  }

  // Secondary guard: account must be recent (< 10 min) to block replay from old sessions
  const createdAt = new Date(user.created_at ?? 0).getTime();
  if (Date.now() - createdAt > 10 * 60 * 1000) {
    return NextResponse.json({ sent: false, reason: "not_new" });
  }

  const name = user.user_metadata?.name ?? user.user_metadata?.full_name ?? user.email.split("@")[0];

  if (process.env.RESEND_API_KEY) {
    await sendWelcomeEmail(user.email, name).catch(() => {});
  }

  // Mark as sent — persisted in Supabase auth, survives server restarts and multiple instances
  const admin = getAdmin();
  await admin.auth.admin.updateUserById(user.id, {
    user_metadata: { ...user.user_metadata, welcome_email_sent: true },
  }).catch(() => {});

  return NextResponse.json({ sent: true });
}
