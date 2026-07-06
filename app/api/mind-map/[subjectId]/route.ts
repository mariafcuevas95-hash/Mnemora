import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkLimit, limitExceededResponse } from "@/lib/plan-limits";

export const dynamic = "force-dynamic";

export type MasteryLevel = "unknown" | "learning" | "practiced" | "mastered";

export interface MindMapNode {
  id: string;
  name: string;
  parentId: string | null;
  learningOrder: number | null;
  masteryLevel: MasteryLevel;
  confidence: number;
  nextReview: string | null;  // ISO date — for overdue badge
}

export interface MindMapData {
  subjectId: string;
  subjectName: string;
  nodes: MindMapNode[];
  isAdvanced: boolean; // true if user has advanced_mind_maps (Premium)
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ subjectId: string }> }
) {
  const { subjectId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const check = await checkLimit(user.id, "mind_maps");
  if (!check.allowed) return limitExceededResponse(check);

  // Check if user also has advanced_mind_maps (Premium)
  const advancedCheck = await checkLimit(user.id, "advanced_mind_maps");

  const [subjectRes, conceptsRes, knowledgeRes] = await Promise.all([
    supabase.from("subjects").select("name").eq("id", subjectId).single(),
    supabase
      .from("subject_concepts")
      .select("id, name, parent_id, learning_order")
      .eq("subject_id", subjectId)
      .order("learning_order", { ascending: true, nullsFirst: false }),
    supabase
      .from("student_knowledge")
      .select("concept_id, confidence, mastery_level, next_review")
      .eq("user_id", user.id),
  ]);

  if (!subjectRes.data) return NextResponse.json({ error: "Subject not found" }, { status: 404 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const concepts = (conceptsRes.data ?? []) as any[];
  const knowledgeMap = new Map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (knowledgeRes.data ?? []).map((k: any) => [k.concept_id, k])
  );

  // Limit to 30 nodes for Pro basic map — prioritize by learning_order, then low confidence
  const allNodes: MindMapNode[] = concepts.map(c => {
    const k = knowledgeMap.get(c.id);
    return {
      id: c.id,
      name: c.name,
      parentId: c.parent_id ?? null,
      learningOrder: c.learning_order ?? null,
      masteryLevel: (k?.mastery_level as MasteryLevel) ?? "unknown",
      confidence: k?.confidence ?? 0,
      nextReview: k?.next_review ?? null,
    };
  });

  let nodes: MindMapNode[];
  if (advancedCheck.allowed) {
    // Premium: return all nodes
    nodes = allNodes;
  } else {
    // Pro basic: cap at 30 nodes (15 roots + 15 children)
    const roots = allNodes.filter(n => !n.parentId).slice(0, 15);
    const rootIds = new Set(roots.map(n => n.id));
    const children = allNodes.filter(n => n.parentId && rootIds.has(n.parentId)).slice(0, 15);
    nodes = [...roots, ...children];
  }

  return NextResponse.json({
    subjectId,
    subjectName: subjectRes.data.name,
    nodes,
    isAdvanced: advancedCheck.allowed,
  } satisfies MindMapData);
}
