"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Layers, BookOpen } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Subject = { id: string; name: string; professor?: string };
type KnowledgeStat = { subject_id: string; due: number; total: number };

export default function FlashcardsIndexPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [stats, setStats] = useState<Map<string, KnowledgeStat>>(new Map());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const db = createClient();
    (async () => {
      const { data: { user } } = await db.auth.getUser();
      const [subjRes, dueRes, totalRes] = await Promise.all([
        db.from("subjects").select("id, name, professor").order("created_at"),
        user
          ? db.from("student_knowledge")
              .select("subject_concepts!inner(subject_id)")
              .eq("user_id", user.id)
              .lte("next_review", new Date().toISOString())
          : Promise.resolve({ data: [] }),
        user
          ? db.from("student_knowledge")
              .select("subject_concepts!inner(subject_id)")
              .eq("user_id", user.id)
          : Promise.resolve({ data: [] }),
      ]);

      const subjectList: Subject[] = subjRes.data ?? [];
      setSubjects(subjectList);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const dueBySubject = new Map<string, number>();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const row of (dueRes.data ?? []) as any[]) {
        const sid = row.subject_concepts?.subject_id;
        if (sid) dueBySubject.set(sid, (dueBySubject.get(sid) ?? 0) + 1);
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const totalBySubject = new Map<string, number>();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const row of (totalRes.data ?? []) as any[]) {
        const sid = row.subject_concepts?.subject_id;
        if (sid) totalBySubject.set(sid, (totalBySubject.get(sid) ?? 0) + 1);
      }

      const statsMap = new Map<string, KnowledgeStat>();
      for (const s of subjectList) {
        statsMap.set(s.id, { subject_id: s.id, due: dueBySubject.get(s.id) ?? 0, total: totalBySubject.get(s.id) ?? 0 });
      }
      setStats(statsMap);
      setLoaded(true);
    })();
  }, []);

  return (
    <div style={{ maxWidth: 560, padding: "32px 24px" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 className="font-display" style={{ fontSize: 22, fontWeight: 800, color: "var(--mn-ink-1)", marginBottom: 4 }}>Flashcards</h1>
        <p style={{ fontSize: 14, color: "var(--mn-ink-2)" }}>
          Elige una materia para practicar con repetición espaciada.
        </p>
      </div>

      {!loaded ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <style>{`@keyframes pulse-skeleton{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>
          {[1, 2, 3].map(i => <div key={i} style={{ height: 68, background: "var(--mn-raised)", borderRadius: "var(--mn-r-lg)", animation: "pulse-skeleton 1.4s ease infinite" }} />)}
        </div>
      ) : subjects.length === 0 ? (
        <div className="mn-card" style={{ padding: 32, textAlign: "center" }}>
          <BookOpen size={28} color="var(--mn-ink-4)" style={{ marginBottom: 12 }} />
          <p className="font-display" style={{ fontSize: 15, fontWeight: 800, color: "var(--mn-ink-1)", marginBottom: 8 }}>Sin materias todavía</p>
          <p style={{ fontSize: 13, color: "var(--mn-ink-2)", marginBottom: 16 }}>Agrega una materia y sube un documento para generar flashcards.</p>
          <Link href="/onboarding" className="mn-btn-primary" style={{ fontSize: 13 }}>Agregar materia →</Link>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {subjects.map(s => {
            const stat = stats.get(s.id);
            const hasDue = (stat?.due ?? 0) > 0;
            return (
              <Link
                key={s.id}
                href={`/flashcards/${s.id}`}
                className="mn-card"
                style={{ padding: "16px 20px", textDecoration: "none", display: "flex", alignItems: "center", gap: 14 }}
              >
                <div style={{ width: 36, height: 36, background: "var(--mn-canvas)", border: "1px solid var(--mn-ink-4)", borderRadius: "var(--mn-r-md)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Layers size={16} color={hasDue ? "var(--mn-amber)" : "var(--mn-ink-3)"} />
                </div>
                <div style={{ flex: 1, overflow: "hidden" }}>
                  <p className="font-display" style={{ fontSize: 14, fontWeight: 800, color: "var(--mn-ink-1)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.name}</p>
                  <p style={{ fontSize: 12, color: "var(--mn-ink-3)" }}>
                    {stat?.total ? `${stat.total} tarjeta${stat.total !== 1 ? "s" : ""}` : "Sin tarjetas aún"}
                    {hasDue ? ` · ${stat!.due} pendiente${stat!.due !== 1 ? "s" : ""}` : ""}
                  </p>
                </div>
                {hasDue && (
                  <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 8px", background: "var(--mn-raised)", color: "var(--mn-ink-2)", borderRadius: "var(--mn-r-sm)", border: "1px solid var(--mn-ink-4)" }}>
                    {stat!.due} hoy
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
