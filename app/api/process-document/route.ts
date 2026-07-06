import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { checkLimit, limitExceededResponse } from "@/lib/plan-limits";
import { z } from "zod";

const BodySchema = z.object({
  documentId: z.string().uuid(),
  subjectId: z.string().uuid(),
  type: z.enum(["syllabus", "document"]),
  subjectName: z.string().optional(),
});

export async function POST(req: NextRequest) {
  // 1. Auth
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // 2. Rate limit: 10 documentos / hora / usuario
  if (!(await rateLimit(`process:${user.id}`, 10, 60 * 60_000))) {
    return NextResponse.json({ error: "Too Many Requests" }, { status: 429 });
  }

  // 3. Validate body first (need `type` to decide which limit to check)
  const body = await req.json();
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Bad Request" }, { status: 400 });
  const { documentId, subjectId, type, subjectName } = parsed.data;

  // 4. Plan limit check (syllabus extraction or summary generation)
  const limitFeature = type === "syllabus" ? "syllabuses" : "summaries";
  const limitCheck = await checkLimit(user.id, limitFeature);
  if (!limitCheck.allowed) return limitExceededResponse(limitCheck);

  // 5. Verificar que el documento existe y pertenece al usuario
  const { data: doc } = await supabase
    .from("documents")
    .select("file_url")
    .eq("id", documentId)
    .eq("user_id", user.id)
    .single();
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const taskPayload = {
    documentId,
    subjectId,
    userId: user.id,
    type,
    subjectName,
    fileUrl: doc.file_url,
  };

  // 6a. Producción: Trigger.dev (async, sin límite de tiempo)
  if (process.env.TRIGGER_SECRET_KEY) {
    const { processDocumentTask } = await import("@/trigger/process-document.task");
    const handle = await processDocumentTask.trigger(taskPayload);
    return NextResponse.json({ jobId: handle.id, status: "queued" });
  }

  // 6b. Dev fallback: procesamiento síncrono en la misma request
  //     (puede hacer timeout en Vercel con PDFs pesados — solo para desarrollo local)
  const { processDocumentTask } = await import("@/trigger/process-document.task");
  await processDocumentTask.triggerAndWait(taskPayload);
  return NextResponse.json({ status: "done" });
}
