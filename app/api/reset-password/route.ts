import { NextRequest, NextResponse } from "next/server";
import { getAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// POST /api/reset-password
// Called from /reset-password page with the access_token from the recovery hash.
// Uses the Supabase admin API to verify the token and update the password.
export async function POST(req: NextRequest) {
  const { access_token, password } = await req.json() as { access_token?: string; password?: string };

  if (!access_token || !password) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "La contraseña debe tener al menos 8 caracteres." }, { status: 400 });
  }

  // Use the admin client to get the user from the access_token — this verifies the JWT signature.
  const admin = getAdmin();
  const { data: userData, error: userError } = await admin.auth.getUser(access_token);
  if (userError || !userData?.user) {
    return NextResponse.json({ error: "El enlace expiró o no es válido. Solicita uno nuevo." }, { status: 401 });
  }

  const { error } = await admin.auth.admin.updateUserById(userData.user.id, { password });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
