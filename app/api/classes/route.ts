import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdmin } from "@/lib/supabase/admin";
import { checkLimit, limitExceededResponse } from "@/lib/plan-limits";
import { rateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const ALLOWED_AUDIO_TYPES = [
  "audio/mpeg", "audio/mp3", "audio/mp4", "audio/m4a", "audio/x-m4a",
  "audio/wav", "audio/wave", "audio/aac", "audio/flac", "audio/ogg",
  "audio/webm",
];
const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500 MB
const CLASSES_PER_MONTH = 20;

const CreateSchema = z.object({
  subjectId: z.string().uuid(),
  title: z.string().min(1).max(200),
  source: z.enum(["recording", "audio"]),
  mimeType: z.string(),
  fileSize: z.number().positive(),
});

// GET /api/classes — lista las clases del usuario
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const subjectId = searchParams.get("subjectId");
  const status = searchParams.get("status");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50"), 100);

  const db = getAdmin();
  let query = db
    .from("classes")
    .select("id, title, source, subject_id, processing_status, processing_stage, flashcards_count, quiz_count, concepts_count, tasks_count, events_count, summary, duration_seconds, created_at, updated_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (subjectId) query = query.eq("subject_id", subjectId);
  if (status) query = query.eq("processing_status", status);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Enriquecer con nombre de materia
  const subjectIds = [...new Set((data ?? []).map(c => c.subject_id).filter(Boolean))];
  let subjectsMap: Record<string, string> = {};
  if (subjectIds.length > 0) {
    const { data: subjects } = await db.from("subjects").select("id, name").in("id", subjectIds);
    subjectsMap = Object.fromEntries((subjects ?? []).map(s => [s.id, s.name]));
  }

  const classes = (data ?? []).map(c => ({
    ...c,
    subject_name: c.subject_id ? (subjectsMap[c.subject_id] ?? null) : null,
  }));

  return NextResponse.json({ classes });
}

// POST /api/classes — crea una clase y retorna URL firmada para upload
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Rate limit: 10 uploads por hora
  if (!(await rateLimit(`class-upload:${user.id}`, 10, 60 * 60_000))) {
    return NextResponse.json({ error: "Demasiadas solicitudes. Intenta más tarde." }, { status: 429 });
  }

  // Plan gate
  const check = await checkLimit(user.id, "ai_class_studio");
  if (!check.allowed) return limitExceededResponse(check);

  // Límite mensual de clases (20/mes en Premium)
  const db = getAdmin();
  const ym = new Date().toISOString().slice(0, 7);
  const { data: usage } = await db
    .from("usage_monthly")
    .select("classes_count")
    .eq("user_id", user.id)
    .eq("year_month", ym)
    .maybeSingle();

  const classesUsed = usage?.classes_count ?? 0;
  if (classesUsed >= CLASSES_PER_MONTH) {
    return NextResponse.json({
      error: "limit_exceeded",
      feature: "ai_class_studio",
      used: classesUsed,
      limit: CLASSES_PER_MONTH,
      message: `Alcanzaste el límite de ${CLASSES_PER_MONTH} clases este mes. Se renueva el próximo mes.`,
    }, { status: 403 });
  }

  const body = await req.json();
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos", details: parsed.error.issues }, { status: 400 });

  const { subjectId, title, source, mimeType, fileSize } = parsed.data;

  if (!ALLOWED_AUDIO_TYPES.includes(mimeType)) {
    return NextResponse.json({ error: "Formato de audio no soportado. Usa MP3, M4A, WAV, AAC, FLAC u OGG." }, { status: 400 });
  }
  if (fileSize > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "El archivo no puede superar 500 MB." }, { status: 400 });
  }

  // Verificar que la materia pertenece al usuario
  const { data: subject } = await db.from("subjects").select("id, name").eq("id", subjectId).eq("user_id", user.id).single();
  if (!subject) return NextResponse.json({ error: "Materia no encontrada." }, { status: 404 });

  // Crear registro de clase
  const ext = mimeType.split("/")[1]?.replace("x-m4a", "m4a").replace("mpeg", "mp3") ?? "mp3";
  const filePath = `${user.id}/${subjectId}/${Date.now()}.${ext}`;

  const { data: classRow, error: insertErr } = await db.from("classes").insert({
    user_id: user.id,
    subject_id: subjectId,
    title,
    source,
    mime_type: mimeType,
    file_url: filePath,
    processing_status: "uploading",
    processing_stage: "Esperando subida...",
  }).select("id").single();

  if (insertErr || !classRow) {
    return NextResponse.json({ error: "Error al crear la clase." }, { status: 500 });
  }

  // URL firmada para upload directo desde el cliente
  const { data: signedData, error: signedErr } = await db.storage
    .from("classes")
    .createSignedUploadUrl(filePath);

  if (signedErr || !signedData) {
    await db.from("classes").delete().eq("id", classRow.id);
    return NextResponse.json({ error: "Error al generar URL de subida." }, { status: 500 });
  }

  return NextResponse.json({
    classId: classRow.id,
    uploadUrl: signedData.signedUrl,
    uploadPath: filePath,
    subjectName: subject.name,
  });
}
