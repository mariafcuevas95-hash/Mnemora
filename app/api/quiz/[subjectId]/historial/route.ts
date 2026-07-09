import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ subjectId: string }> }
) {
  const { subjectId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json(null, { status: 401 });

  const [subjectRes, sessionsRes] = await Promise.all([
    supabase.from("subjects").select("name").eq("id", subjectId).single(),
    supabase
      .from("quiz_sessions")
      .select("id, pct, correct, total, created_at, document_id")
      .eq("user_id", user.id)
      .eq("subject_id", subjectId)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const sessions = sessionsRes.data ?? [];

  // Enrich with document names
  const docIds = [...new Set(sessions.filter(s => s.document_id).map(s => s.document_id!))];
  let docMap = new Map<string, string>();
  if (docIds.length > 0) {
    const { data: docs } = await supabase
      .from("documents")
      .select("id, name")
      .in("id", docIds);
    docMap = new Map((docs ?? []).map(d => [d.id, d.name]));
  }

  const enriched = sessions.map(s => ({
    ...s,
    documentName: s.document_id ? (docMap.get(s.document_id) ?? null) : null,
  }));

  const totalSessions = enriched.length;
  const avgPct = totalSessions > 0 ? Math.round(enriched.reduce((sum, s) => sum + s.pct, 0) / totalSessions) : 0;
  const bestPct = totalSessions > 0 ? Math.max(...enriched.map(s => s.pct)) : 0;

  return NextResponse.json({
    subjectName: subjectRes.data?.name ?? "",
    sessions: enriched,
    totalSessions,
    avgPct,
    bestPct,
  });
}
