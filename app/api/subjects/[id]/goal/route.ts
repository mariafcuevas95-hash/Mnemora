import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkLimit, limitExceededResponse } from "@/lib/plan-limits";

export const runtime = "nodejs";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const check = await checkLimit(user.id, "academic_goals");
  if (!check.allowed) return limitExceededResponse(check);

  const { goal_type, goal_value } = await req.json() as {
    goal_type: string | null;
    goal_value: string | null;
  };

  const { error } = await supabase
    .from("subjects")
    .update({ goal_type: goal_type ?? null, goal_value: goal_value ?? null })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
