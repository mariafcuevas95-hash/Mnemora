import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const BodySchema = z.object({
  flashcardId: z.string().uuid(),
  quality: z.number().int().min(0).max(5),
});

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = BodySchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Bad Request" }, { status: 400 });
  const { flashcardId, quality } = parsed.data;

  // Verificar ownership y obtener datos necesarios
  const { data: fc } = await supabase
    .from("flashcards")
    .select("front, subject_id")
    .eq("id", flashcardId)
    .eq("user_id", user.id)
    .single();
  if (!fc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Upsert concept usando el texto del frente de la flashcard como nombre del concepto.
  // Esto crea el knowledge graph desde el uso real, sin depender del syllabus.
  const conceptName = fc.front.replace(/^[¿¡]/, "").replace(/[?!]$/, "").trim().slice(0, 120);

  const { data: concept } = await supabase
    .from("subject_concepts")
    .upsert(
      { subject_id: fc.subject_id, name: conceptName },
      { onConflict: "subject_id,name", ignoreDuplicates: false }
    )
    .select("id")
    .single();

  if (!concept) return NextResponse.json({ error: "Concept upsert failed" }, { status: 500 });

  // Actualizar SM-2 en Postgres
  await supabase.rpc("sm2_update", {
    p_user_id: user.id,
    p_concept_id: concept.id,
    p_quality: quality,
  });

  // Leer next_review resultante para mostrarlo en la UI
  const { data: knowledge } = await supabase
    .from("student_knowledge")
    .select("next_review, confidence, mastery_level")
    .eq("user_id", user.id)
    .eq("concept_id", concept.id)
    .single();

  return NextResponse.json({ nextReview: knowledge?.next_review, mastery: knowledge?.mastery_level });
}
