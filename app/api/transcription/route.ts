import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdmin } from "@/lib/supabase/admin";
import { checkLimit, limitExceededResponse } from "@/lib/plan-limits";
import { awardXP } from "@/lib/xp";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 120;

const GEMINI_MODEL = "gemini-2.5-flash";

interface TranscriptionRequest {
  audioBase64: string;
  mimeType: string;
  subjectId: string;
  subjectName: string;
  durationHint?: string; // e.g. "45 min"
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allowed = await rateLimit(`transcription:${user.id}`, 5, 60 * 60 * 1000); // 5/hr
  if (!allowed) return NextResponse.json({ error: "Demasiadas solicitudes. Intenta más tarde." }, { status: 429 });

  const check = await checkLimit(user.id, "transcription");
  if (!check.allowed) return limitExceededResponse(check);

  const body = await req.json() as TranscriptionRequest;
  const { audioBase64, mimeType, subjectId, subjectName, durationHint } = body;

  if (!audioBase64 || !subjectId) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: "Gemini not configured" }, { status: 503 });
  }

  const durationNote = durationHint ? ` (approximately ${durationHint})` : "";
  const prompt = `You are an expert academic note-taker. You will receive a class audio recording${durationNote} for the subject "${subjectName}".

Your tasks:
1. Transcribe the audio faithfully, correcting only obvious speech artifacts.
2. Extract the key academic concepts mentioned.
3. Write a concise study summary (3–5 sentences) covering the main topics.
4. Generate 5–10 flashcards from the most important content.

Rules for flashcards:
- Front: a clear question or concept name (max 15 words)
- Back: a concise answer or explanation (max 40 words)
- Respond ONLY with valid JSON — no markdown fences, no commentary

Required JSON format:
{
  "transcription": "full transcription text here",
  "summary": "3-5 sentence study summary",
  "concepts": ["concept1", "concept2", ...],
  "flashcards": [
    { "front": "...", "back": "..." }
  ]
}`;

  const geminiRes = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            { inline_data: { mime_type: mimeType, data: audioBase64 } },
          ],
        }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 4096 },
      }),
    }
  );

  if (!geminiRes.ok) {
    const err = await geminiRes.text();
    console.error("Gemini transcription error:", err);
    return NextResponse.json({ error: "Gemini API error" }, { status: 502 });
  }

  const geminiData = await geminiRes.json() as {
    candidates?: { content: { parts: { text: string }[] } }[];
  };

  const raw = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

  let parsed: {
    transcription: string;
    summary: string;
    concepts: string[];
    flashcards: { front: string; back: string }[];
  };

  try {
    parsed = JSON.parse(raw);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return NextResponse.json({ error: "Could not parse Gemini response" }, { status: 502 });
    parsed = JSON.parse(match[0]);
  }

  const { transcription, summary, concepts, flashcards } = parsed;
  if (!flashcards?.length) {
    return NextResponse.json({ error: "No flashcards generated" }, { status: 422 });
  }

  const admin = getAdmin();

  // Save transcription as a document record so it's visible in the Documentos tab
  const { data: docRecord } = await admin
    .from("documents")
    .insert({
      subject_id: subjectId,
      user_id: user.id,
      name: `Transcripción de clase · ${new Date().toLocaleDateString("es-AR", { day: "numeric", month: "short" })}`,
      file_url: null,
      processing_status: "done",
      summary,
      source: "transcription",
      raw_text: transcription.slice(0, 10000),
    })
    .select("id")
    .single();

  // Insert flashcards
  const rows = flashcards.map(fc => ({
    subject_id: subjectId,
    user_id: user.id,
    front: fc.front,
    back: fc.back,
    source: "transcription",
    document_id: docRecord?.id ?? null,
  }));

  const { data: inserted, error: insertErr } = await admin
    .from("flashcards")
    .insert(rows)
    .select("id, front, back");

  if (insertErr) {
    console.error("Insert error:", insertErr);
    return NextResponse.json({ error: "Failed to save flashcards" }, { status: 500 });
  }

  const xp = await awardXP(user.id, "transcription", { subject_id: subjectId }).catch(() => null);

  // Increment flashcard usage counter (fire-and-forget)
  const yearMonth = new Date().toISOString().slice(0, 7);
  admin.rpc("increment_usage", {
    p_user_id: user.id, p_year_month: yearMonth,
    p_field: "flashcards_count", p_by: inserted?.length ?? 0,
  }).then(() => null, () => null);

  return NextResponse.json({
    transcription,
    summary,
    concepts: concepts ?? [],
    flashcards: inserted ?? [],
    count: inserted?.length ?? 0,
    documentId: docRecord?.id ?? null,
    xp,
  });
}
