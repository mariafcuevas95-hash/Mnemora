import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdmin } from "@/lib/supabase/admin";
import { checkLimit, limitExceededResponse } from "@/lib/plan-limits";

export const dynamic = "force-dynamic";

export type RoadmapStage = "mastered" | "in_progress" | "not_started";

export interface RoadmapConcept {
  id: string;
  name: string;
  parentId: string | null;
  learningOrder: number | null;
  stage: RoadmapStage;
  masteryLevel: string;
  confidence: number;     // 0-1
  hasPracticed: boolean;  // false if not yet in student_knowledge
}

export interface RoadmapData {
  subjectId: string;
  subjectName: string;
  concepts: RoadmapConcept[];
  totalCount: number;
  masteredCount: number;
  inProgressCount: number;
  notStartedCount: number;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ subjectId: string }> }
) {
  const { subjectId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const check = await checkLimit(user.id, "learning_roadmap");
  if (!check.allowed) return limitExceededResponse(check);

  const admin = getAdmin();

  const [subjectRes, conceptsRes, knowledgeRes] = await Promise.all([
    supabase.from("subjects").select("name").eq("id", subjectId).single(),
    supabase
      .from("subject_concepts")
      .select("id, name, parent_id, learning_order")
      .eq("subject_id", subjectId)
      .order("learning_order", { ascending: true, nullsFirst: false }),
    admin
      .from("student_knowledge")
      .select("concept_id, confidence, mastery_level")
      .eq("user_id", user.id),
  ]);

  if (!subjectRes.data) return NextResponse.json({ error: "Subject not found" }, { status: 404 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const concepts = (conceptsRes.data ?? []) as any[];
  const knowledgeMap = new Map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (knowledgeRes.data ?? []).map((k: any) => [k.concept_id, k])
  );

  const result: RoadmapConcept[] = concepts.map(c => {
    const k = knowledgeMap.get(c.id);
    const confidence: number = k?.confidence ?? 0;
    const masteryLevel: string = k?.mastery_level ?? "unknown";
    const hasPracticed = !!k;

    const stage: RoadmapStage =
      masteryLevel === "mastered" ? "mastered"
      : hasPracticed && confidence > 0 ? "in_progress"
      : "not_started";

    return {
      id: c.id,
      name: c.name,
      parentId: c.parent_id ?? null,
      learningOrder: c.learning_order ?? null,
      stage,
      masteryLevel,
      confidence,
      hasPracticed,
    };
  });

  const masteredCount    = result.filter(c => c.stage === "mastered").length;
  const inProgressCount  = result.filter(c => c.stage === "in_progress").length;
  const notStartedCount  = result.filter(c => c.stage === "not_started").length;

  return NextResponse.json({
    subjectId,
    subjectName: subjectRes.data.name,
    concepts: result,
    totalCount: result.length,
    masteredCount,
    inProgressCount,
    notStartedCount,
  } satisfies RoadmapData);
}
