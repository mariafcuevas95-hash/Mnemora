import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdmin } from "@/lib/supabase/admin";
import { checkLimit, limitExceededResponse } from "@/lib/plan-limits";

export const dynamic = "force-dynamic";

export interface CoverageConcept {
  id: string;
  name: string;
  learningOrder: number | null;
  confidence: number;
  masteryLevel: string;
  tier: "mastered" | "in_progress" | "not_started";
}

export interface ExamCoverageData {
  subjectId: string;
  subjectName: string;
  totalConcepts: number;
  masteredCount: number;
  inProgressCount: number;
  notStartedCount: number;
  masteredPct: number;
  coveredPct: number;      // mastered + in_progress
  notStartedPct: number;
  concepts: CoverageConcept[];
  performanceEstimate: number | null;
  nextExam: { title: string; eventDate: string; daysUntil: number } | null;
}

function daysUntil(dateStr: string): number {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr); target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ subjectId: string }> }
) {
  const { subjectId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const check = await checkLimit(user.id, "exam_coverage");
  if (!check.allowed) return limitExceededResponse(check);

  const admin = getAdmin();
  const today = new Date().toISOString().slice(0, 10);

  const [subjectRes, conceptsRes, knowledgeRes, examRes, profileRes] = await Promise.all([
    supabase.from("subjects").select("name").eq("id", subjectId).single(),
    supabase
      .from("subject_concepts")
      .select("id, name, learning_order")
      .eq("subject_id", subjectId)
      .order("learning_order", { ascending: true, nullsFirst: false }),
    admin
      .from("student_knowledge")
      .select("concept_id, confidence, mastery_level")
      .eq("user_id", user.id),
    supabase
      .from("calendar_events")
      .select("title, event_date")
      .eq("subject_id", subjectId)
      .eq("event_type", "exam")
      .gte("event_date", today)
      .order("event_date")
      .limit(1)
      .maybeSingle(),
    supabase
      .from("cognitive_profile")
      .select("performance_estimate")
      .eq("user_id", user.id)
      .eq("subject_id", subjectId)
      .maybeSingle(),
  ]);

  if (!subjectRes.data) return NextResponse.json({ error: "Subject not found" }, { status: 404 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const concepts = (conceptsRes.data ?? []) as any[];
  const knowledgeMap = new Map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (knowledgeRes.data ?? []).map((k: any) => [k.concept_id, k])
  );

  const enriched: CoverageConcept[] = concepts.map(c => {
    const k = knowledgeMap.get(c.id);
    const confidence: number = k?.confidence ?? 0;
    const masteryLevel: string = k?.mastery_level ?? "unknown";
    const tier: CoverageConcept["tier"] =
      masteryLevel === "mastered" ? "mastered"
      : k ? "in_progress"
      : "not_started";
    return {
      id: c.id,
      name: c.name,
      learningOrder: c.learning_order ?? null,
      confidence,
      masteryLevel,
      tier,
    };
  });

  const masteredCount    = enriched.filter(c => c.tier === "mastered").length;
  const inProgressCount  = enriched.filter(c => c.tier === "in_progress").length;
  const notStartedCount  = enriched.filter(c => c.tier === "not_started").length;
  const total            = enriched.length;

  const exam = examRes.data;

  return NextResponse.json({
    subjectId,
    subjectName: subjectRes.data.name,
    totalConcepts: total,
    masteredCount,
    inProgressCount,
    notStartedCount,
    masteredPct:    total > 0 ? Math.round((masteredCount / total) * 100) : 0,
    coveredPct:     total > 0 ? Math.round(((masteredCount + inProgressCount) / total) * 100) : 0,
    notStartedPct:  total > 0 ? Math.round((notStartedCount / total) * 100) : 0,
    concepts: enriched,
    performanceEstimate: profileRes.data?.performance_estimate ?? null,
    nextExam: exam ? {
      title: exam.title,
      eventDate: exam.event_date,
      daysUntil: daysUntil(exam.event_date),
    } : null,
  } satisfies ExamCoverageData);
}
