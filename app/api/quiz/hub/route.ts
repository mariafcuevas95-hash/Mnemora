import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json([], { status: 401 });

  const [subjectsRes, sessionsRes, flashcountsRes, conceptcountsRes] = await Promise.all([
    supabase.from("subjects").select("id, name, color").eq("user_id", user.id).order("name"),
    supabase
      .from("quiz_sessions")
      .select("subject_id, pct, correct, total, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("flashcards")
      .select("subject_id")
      .eq("user_id", user.id),
    supabase
      .from("student_knowledge")
      .select("subject_concepts!inner(subject_id)")
      .eq("user_id", user.id),
  ]);

  const subjects = subjectsRes.data ?? [];
  const sessions = sessionsRes.data ?? [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const flashcards = (flashcountsRes.data ?? []) as any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const concepts = (conceptcountsRes.data ?? []) as any[];

  // Last session per subject
  const lastSessionMap = new Map<string, typeof sessions[0]>();
  for (const s of sessions) {
    if (!lastSessionMap.has(s.subject_id)) {
      lastSessionMap.set(s.subject_id, s);
    }
  }

  // Counts
  const flashMap = new Map<string, number>();
  for (const f of flashcards) {
    flashMap.set(f.subject_id, (flashMap.get(f.subject_id) ?? 0) + 1);
  }
  const conceptMap = new Map<string, number>();
  for (const c of concepts) {
    const sid = c.subject_concepts?.subject_id;
    if (sid) conceptMap.set(sid, (conceptMap.get(sid) ?? 0) + 1);
  }

  // Documents per subject (for quiz filtering)
  const { data: docs } = await supabase
    .from("documents")
    .select("id, name, subject_id")
    .eq("user_id", user.id)
    .order("created_at");

  const docsMap = new Map<string, { id: string; name: string }[]>();
  for (const d of (docs ?? [])) {
    if (!docsMap.has(d.subject_id)) docsMap.set(d.subject_id, []);
    docsMap.get(d.subject_id)!.push({ id: d.id, name: d.name });
  }

  const result = subjects.map(s => ({
    id: s.id,
    name: s.name,
    color: s.color,
    lastSession: lastSessionMap.get(s.id) ?? null,
    flashcardCount: flashMap.get(s.id) ?? 0,
    conceptCount: conceptMap.get(s.id) ?? 0,
    documents: docsMap.get(s.id) ?? [],
  }));

  return NextResponse.json(result);
}
