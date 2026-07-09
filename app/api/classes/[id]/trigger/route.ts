import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdmin } from "@/lib/supabase/admin";

// POST /api/classes/[id]/trigger
// El cliente llama a este endpoint DESPUÉS de que el upload a Supabase Storage fue exitoso.
// Dispara el task de Trigger.dev para iniciar el pipeline asíncrono.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getAdmin();
  const { data: classRow } = await db
    .from("classes")
    .select("id, subject_id, title, source, file_url, mime_type, user_id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!classRow) return NextResponse.json({ error: "No encontrado." }, { status: 404 });
  if (!classRow.file_url) return NextResponse.json({ error: "Archivo no disponible." }, { status: 400 });

  // Obtener nombre de la materia
  const { data: subject } = await db
    .from("subjects")
    .select("name")
    .eq("id", classRow.subject_id)
    .single();

  const payload = {
    classId: classRow.id,
    userId: user.id,
    subjectId: classRow.subject_id,
    subjectName: subject?.name ?? "la materia",
    source: classRow.source as "recording" | "audio",
    fileUrl: classRow.file_url,
    mimeType: classRow.mime_type ?? "audio/mpeg",
  };

  if (process.env.TRIGGER_SECRET_KEY) {
    const { processClassTask } = await import("@/trigger/process-class.task");
    const handle = await processClassTask.trigger(payload);
    return NextResponse.json({ jobId: handle.id, status: "queued" });
  }

  // Dev: sincrónico
  const { processClassTask } = await import("@/trigger/process-class.task");
  await processClassTask.triggerAndWait(payload);
  return NextResponse.json({ status: "done" });
}
