import { NextRequest, NextResponse } from "next/server";
import { getAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// Simple in-memory rate limiter: max 5 attempts per IP per 15 minutes.
// Note: resets on cold start — sufficient to stop brute force, not DoS.
const attempts = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = attempts.get(ip);
  if (!entry || now > entry.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (entry.count >= MAX_ATTEMPTS) return false;
  entry.count++;
  return true;
}

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";

  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: "Demasiados intentos. Espera 15 minutos e intenta de nuevo." },
      { status: 429 }
    );
  }

  let body: { access_token?: unknown; password?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  const { access_token, password } = body;

  if (typeof access_token !== "string" || !access_token) {
    return NextResponse.json({ error: "Token de recuperación faltante." }, { status: 400 });
  }
  if (typeof password !== "string" || password.length < 8) {
    return NextResponse.json(
      { error: "La contraseña debe tener al menos 8 caracteres." },
      { status: 400 }
    );
  }

  const admin = getAdmin();

  // Verify the token via Supabase — never trust a manually decoded JWT.
  const { data: userData, error: userError } = await admin.auth.getUser(access_token);
  if (userError || !userData?.user?.id) {
    return NextResponse.json(
      { error: "El enlace expiró o ya fue usado. Solicita uno nuevo desde el inicio de sesión." },
      { status: 401 }
    );
  }

  // Update password using only the verified user ID from Supabase.
  const { error: updateError } = await admin.auth.admin.updateUserById(userData.user.id, {
    password,
  });
  if (updateError) {
    return NextResponse.json(
      { error: "No se pudo actualizar la contraseña. Solicita un nuevo enlace." },
      { status: 400 }
    );
  }

  // Invalidate the recovery session globally so the access_token can't be reused.
  await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/logout?scope=global`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${access_token}`,
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      },
    }
  ).catch(() => {});

  return NextResponse.json({ ok: true });
}
