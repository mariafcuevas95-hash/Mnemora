import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdmin } from "@/lib/supabase/admin";
import { awardXP } from "@/lib/xp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export interface QuizAnswer {
  conceptId: string;
  correct: boolean;
  currentConfidence: number;
}

export interface QuizSubmitBody {
  answers: QuizAnswer[];
}

export interface QuizResult {
  correct: number;
  total: number;
  pct: number;
  updatedConcepts: number;
}

// SM-2 delta: correct answer → confidence up, wrong → down
function sm2Delta(correct: boolean, confidence: number): number {
  if (correct) {
    // boost more if confidence was low
    if (confidence < 0.3) return 0.20;
    if (confidence < 0.6) return 0.12;
    return 0.06;
  } else {
    // penalize more if confidence was high (false confidence)
    if (confidence > 0.7) return -0.25;
    if (confidence > 0.4) return -0.15;
    return -0.08;
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ subjectId: string }> }
) {
  const { subjectId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body: QuizSubmitBody = await req.json();
  const { answers } = body;
  if (!Array.isArray(answers) || answers.length === 0) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const admin = getAdmin();
  let updatedConcepts = 0;

  await Promise.all(answers.map(async (ans) => {
    const delta = sm2Delta(ans.correct, ans.currentConfidence);
    const newConfidence = Math.min(1, Math.max(0, ans.currentConfidence + delta));

    const masteryLevel =
      newConfidence >= 0.85 ? "mastered"
      : newConfidence >= 0.6  ? "practiced"
      : newConfidence >= 0.2  ? "learning"
      : "unknown";

    // next_review: correct → longer interval, wrong → sooner
    const daysUntilReview = ans.correct
      ? (newConfidence >= 0.85 ? 7 : newConfidence >= 0.6 ? 3 : 1)
      : 0; // review today

    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + daysUntilReview);

    const { error } = await admin
      .from("student_knowledge")
      .update({
        confidence: newConfidence,
        mastery_level: masteryLevel,
        next_review: nextReview.toISOString(),
        last_reviewed_at: new Date().toISOString(),
      })
      .eq("user_id", user.id)
      .eq("concept_id", ans.conceptId);

    if (!error) updatedConcepts++;
  }));

  const correct = answers.filter(a => a.correct).length;
  const pct = Math.round((correct / answers.length) * 100);

  // Update cognitive_profile.performance_estimate using all subject knowledge
  const { data: allKnowledge } = await admin
    .from("student_knowledge")
    .select("confidence, subject_concepts!inner(subject_id)")
    .eq("user_id", user.id)
    .eq("subject_concepts.subject_id", subjectId);

  if (allKnowledge && allKnowledge.length > 0) {
    const avgConf = allKnowledge.reduce((s: number, k: { confidence: number }) => s + k.confidence, 0) / allKnowledge.length;
    const performanceEstimate = Math.round(avgConf * 100) / 10; // 0-10 scale
    await admin
      .from("cognitive_profile")
      .upsert(
        { user_id: user.id, subject_id: subjectId, performance_estimate: performanceEstimate },
        { onConflict: "user_id,subject_id" }
      );
  }

  const xp = await awardXP(user.id, "quiz_complete", {
    score_pct: pct,
    subject_id: subjectId,
  }).catch(() => null);

  const result: QuizResult = { correct, total: answers.length, pct, updatedConcepts };
  return NextResponse.json({ ...result, xp });
}
