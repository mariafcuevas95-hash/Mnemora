import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdmin } from "@/lib/supabase/admin";

// GET /api/classes/[id] — detalle completo de una clase
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getAdmin();
  const { data: classRow, error } = await db
    .from("classes")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !classRow) return NextResponse.json({ error: "No encontrado." }, { status: 404 });

  // Cargar flashcards y quiz en paralelo
  const [{ data: flashcards }, { data: quiz }, { data: subject }] = await Promise.all([
    db.from("flashcards").select("id, front, back").eq("class_id", id).order("created_at"),
    db.from("class_quiz").select("id, question, options, correct_answer, explanation, question_type").eq("class_id", id),
    classRow.subject_id
      ? db.from("subjects").select("id, name").eq("id", classRow.subject_id).single()
      : Promise.resolve({ data: null }),
  ]);

  return NextResponse.json({
    class: {
      ...classRow,
      subject_name: subject?.name ?? null,
    },
    flashcards: flashcards ?? [],
    quiz: quiz ?? [],
  });
}

// DELETE /api/classes/[id] — borra clase, quiz, flashcards y archivo de Storage
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getAdmin();
  const { data: classRow } = await db
    .from("classes")
    .select("id, file_url")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!classRow) return NextResponse.json({ error: "No encontrado." }, { status: 404 });

  // Borrar en paralelo: flashcards, quiz (cascade en DB), archivo Storage
  await Promise.all([
    db.from("flashcards").delete().eq("class_id", id),
    classRow.file_url
      ? db.storage.from("classes").remove([classRow.file_url])
      : Promise.resolve(),
  ]);

  await db.from("classes").delete().eq("id", id);

  return NextResponse.json({ ok: true });
}
