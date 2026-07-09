import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdmin } from "@/lib/supabase/admin";
import { checkLimit, limitExceededResponse } from "@/lib/plan-limits";
import { awardXP } from "@/lib/xp";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

const GEMINI_MODEL = "gemini-2.5-flash";

interface MultimodalRequest {
  imageBase64: string;
  mimeType: string;
  subjectId: string;
  subjectName: string;
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allowed = await rateLimit(`multimodal:${user.id}`, 10, 60 * 60 * 1000); // 10/hr
  if (!allowed) return NextResponse.json({ error: "Demasiadas solicitudes. Intenta más tarde." }, { status: 429 });

  const check = await checkLimit(user.id, "multimodal");
  if (!check.allowed) return limitExceededResponse(check);

  const body = await req.json() as MultimodalRequest;
  const { imageBase64, mimeType, subjectId, subjectName } = body;

  if (!imageBase64 || !subjectId) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: "Gemini not configured" }, { status: 503 });
  }

  const prompt = `You are an expert educational content creator analyzing an image of handwritten notes, a whiteboard, or a student exercise for the subject "${subjectName}".

Your task:
1. Extract all meaningful academic content (concepts, definitions, formulas, steps, examples).
2. Generate 5–10 flashcards from the extracted content.

Rules for flashcards:
- Front: a clear question or concept name (max 15 words)
- Back: a concise answer or explanation (max 40 words)
- Avoid trivial or redundant cards
- Respond ONLY with valid JSON — no markdown fences, no commentary

Required JSON format:
{
  "extractedText": "brief summary of what was in the image (2-3 sentences)",
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
            { inline_data: { mime_type: mimeType, data: imageBase64 } },
          ],
        }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 2048 },
      }),
    }
  );

  if (!geminiRes.ok) {
    const err = await geminiRes.text();
    console.error("Gemini error:", err);
    return NextResponse.json({ error: "Gemini API error" }, { status: 502 });
  }

  const geminiData = await geminiRes.json() as {
    candidates?: { content: { parts: { text: string }[] } }[];
  };

  const raw = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

  let parsed: { extractedText: string; concepts: string[]; flashcards: { front: string; back: string }[] };
  try {
    parsed = JSON.parse(raw);
  } catch {
    // Try to extract JSON from the text
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return NextResponse.json({ error: "Could not parse Gemini response" }, { status: 502 });
    parsed = JSON.parse(match[0]);
  }

  const { extractedText, concepts, flashcards } = parsed;
  if (!flashcards?.length) {
    return NextResponse.json({ error: "No flashcards generated" }, { status: 422 });
  }

  // Insert flashcards into DB
  const admin = getAdmin();
  const rows = flashcards.map(fc => ({
    subject_id: subjectId,
    user_id: user.id,
    front: fc.front,
    back: fc.back,
    source: "multimodal",
  }));

  const { data: inserted, error: insertErr } = await admin
    .from("flashcards")
    .insert(rows)
    .select("id, front, back");

  if (insertErr) {
    console.error("Insert error:", insertErr);
    return NextResponse.json({ error: "Failed to save flashcards" }, { status: 500 });
  }

  const xp = await awardXP(user.id, "photo_analysis", { subject_id: subjectId }).catch(() => null);

  // Increment flashcard usage counter (fire-and-forget — Premium so limit is -1 but count stays accurate)
  const yearMonth = new Date().toISOString().slice(0, 7);
  admin.rpc("increment_usage", {
    p_user_id: user.id, p_year_month: yearMonth,
    p_field: "flashcards_count", p_by: inserted?.length ?? 0,
  }).then(() => null, () => null);

  return NextResponse.json({
    extractedText,
    concepts: concepts ?? [],
    flashcards: inserted ?? [],
    count: inserted?.length ?? 0,
    xp,
  });
}
