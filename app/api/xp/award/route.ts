import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { awardXP, type XpEventType, type XpMeta } from "@/lib/xp";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { event, meta } = await req.json() as { event: XpEventType; meta?: XpMeta };
  if (!event) return NextResponse.json({ error: "Missing event" }, { status: 400 });

  const result = await awardXP(user.id, event, meta ?? {});
  return NextResponse.json(result);
}
