import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getAdmin } from "@/lib/supabase/admin";

export default async function ReferralRedirect({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const db = getAdmin();

  // Look up referrer by code
  const { data: profile } = await db
    .from("profiles")
    .select("id")
    .eq("referral_code", code.toUpperCase())
    .single();

  if (profile?.id) {
    const cookieStore = await cookies();
    // Set referral cookie for 30 days
    cookieStore.set("mnemora_ref", profile.id, {
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
      httpOnly: true,
      sameSite: "lax",
    });
  }

  redirect("/registro");
}
