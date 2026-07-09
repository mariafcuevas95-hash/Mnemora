import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdmin } from "@/lib/supabase/admin";
import { z } from "zod";

const Schema = z.object({
  index: z.number().int().min(0),
  subjectId: z.string().uuid(),
});

// POST /api/classes/[id]/approve-suggestion
// Aprueba una sugerencia detectada (tarea o examen) y la inserta en calendar_events.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  const { index, subjectId } = parsed.data;

  const db = getAdmin();
  const { data: classRow } = await db
    .from("classes")
    .select("detected_suggestions")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!classRow) return NextResponse.json({ error: "No encontrado." }, { status: 404 });

  const suggestions = (classRow.detected_suggestions as DetectedSuggestion[]) ?? [];
  const suggestion = suggestions[index];
  if (!suggestion) return NextResponse.json({ error: "Sugerencia no encontrada." }, { status: 404 });
  if (suggestion.approved) return NextResponse.json({ ok: true, already: true });

  // Insertar en calendar_events
  await db.from("calendar_events").insert({
    subject_id: subjectId,
    user_id: user.id,
    title: suggestion.title,
    event_date: suggestion.due_date,
    event_type: suggestion.event_type,
    source: "class_suggestion",
  });

  // Marcar la sugerencia como aprobada
  suggestions[index] = { ...suggestion, approved: true };
  await db.from("classes").update({ detected_suggestions: suggestions }).eq("id", id);

  return NextResponse.json({ ok: true });
}

interface DetectedSuggestion {
  title: string;
  due_date: string;
  event_type: "exam" | "assignment";
  due_hint: string;
  approved: boolean;
}
