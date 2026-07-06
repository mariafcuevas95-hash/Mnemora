import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkLimit } from "@/lib/plan-limits";
import { limitExceededResponse } from "@/lib/plan-limits";
import { z } from "zod";

const BodySchema = z.object({
  name: z.string().min(1).max(100),
  professor: z.string().max(100).optional(),
  semester_label: z.string().max(20).optional(),
});

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Backend limit check before creating
  const limitCheck = await checkLimit(user.id, "subjects");
  if (!limitCheck.allowed) return limitExceededResponse(limitCheck);

  const body = await req.json();
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Bad Request" }, { status: 400 });

  const { data: subject, error } = await supabase
    .from("subjects")
    .insert({ user_id: user.id, ...parsed.data })
    .select("id, name")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(subject, { status: 201 });
}
