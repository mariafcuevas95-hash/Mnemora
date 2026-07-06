import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Handles OAuth redirects and email confirmation links.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      // Ensure profile exists (first OAuth login won't have one yet)
      const { data: existing } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", data.user.id)
        .maybeSingle();

      const isNewUser = !existing;

      await supabase.from("profiles").upsert(
        {
          id: data.user.id,
          email: data.user.email!,
          name: data.user.user_metadata?.full_name ?? data.user.user_metadata?.name ?? null,
        },
        { onConflict: "id", ignoreDuplicates: true }
      );

      // If new user, check for referral cookie and register it
      if (isNewUser) {
        const refCookie = cookieStore.get("mnemora_ref");
        const referrerId = refCookie?.value;
        if (referrerId && referrerId !== data.user.id) {
          // Anti-fraud: one referral per person, no self-referral
          const { getAdmin } = await import("@/lib/supabase/admin");
          const adminDb = getAdmin();
          const { error: refErr } = await adminDb.from("referrals").insert({
            referrer_id: referrerId,
            referred_user_id: data.user.id,
            status: "registered",
          });
          if (!refErr) {
            cookieStore.delete("mnemora_ref");
          }
        }
      }

      // Check if user has subjects yet — if not, go to onboarding
      const { count } = await supabase
        .from("subjects")
        .select("id", { count: "exact", head: true })
        .eq("user_id", data.user.id);

      const destination = (count ?? 0) === 0 ? "/onboarding" : next;
      return NextResponse.redirect(`${origin}${destination}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
