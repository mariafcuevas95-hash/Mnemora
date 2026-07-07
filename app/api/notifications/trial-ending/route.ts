import { NextRequest, NextResponse } from "next/server";
import { getAdmin } from "@/lib/supabase/admin";
import { sendTrialEndingEmail } from "@/lib/resend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Called by Vercel Cron daily at 12:00 UTC
// Sends a warning email to users whose trial ends in exactly 2 days
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getAdmin();

  // Find users whose trial_ends_at is between 1.5 and 2.5 days from now
  const now = new Date();
  const from = new Date(now.getTime() + 1.5 * 86_400_000).toISOString();
  const to   = new Date(now.getTime() + 2.5 * 86_400_000).toISOString();

  const { data: profiles, error } = await db
    .from("profiles")
    .select("id, email, name, trial_ends_at")
    .eq("plan", "free")
    .gte("trial_ends_at", from)
    .lte("trial_ends_at", to);

  if (error) {
    console.error("[trial-ending] DB error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let sent = 0;
  for (const p of profiles ?? []) {
    if (!p.email) continue;
    try {
      await sendTrialEndingEmail(p.email, p.name ?? "estudiante");
      sent++;
    } catch (err) {
      console.error(`[trial-ending] Failed for ${p.email}:`, err);
    }
  }

  return NextResponse.json({ sent, total: profiles?.length ?? 0 });
}
