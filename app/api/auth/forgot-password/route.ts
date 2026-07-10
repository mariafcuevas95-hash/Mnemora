import { NextRequest, NextResponse } from "next/server";
import { getAdmin } from "@/lib/supabase/admin";
import { sendPasswordResetEmail } from "@/lib/resend";

export const dynamic = "force-dynamic";

// Rate limit: 3 requests per email per 15 min
const attempts = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 3;

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || now > entry.resetAt) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (entry.count >= MAX_ATTEMPTS) return false;
  entry.count++;
  return true;
}

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";

  let body: { email?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Email inválido." }, { status: 400 });
  }

  // Rate limit by both IP and email to prevent enumeration + abuse
  if (!checkRateLimit(ip) || !checkRateLimit(email)) {
    // Return 200 to avoid leaking whether the email exists
    return NextResponse.json({ ok: true });
  }

  const admin = getAdmin();

  // Generate the recovery link server-side — never send via Supabase SMTP
  const { data, error } = await admin.auth.admin.generateLink({
    type: "recovery",
    email,
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? "https://mnemora.me"}/reset-password`,
    },
  });

  // If user not found or is OAuth-only, return ok silently (no enumeration)
  if (error || !data?.properties?.action_link) {
    return NextResponse.json({ ok: true });
  }

  await sendPasswordResetEmail(email, data.properties.action_link).catch(() => {});

  return NextResponse.json({ ok: true });
}
