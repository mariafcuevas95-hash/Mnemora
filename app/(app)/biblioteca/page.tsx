"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Search, FileText, Layers, BookOpen, Camera, Mic, Loader2, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type SubjectLib = {
  id: string;
  name: string;
  docCount: number;
  flashcardCount: number;
  conceptCount: number;
  photoCount: number;
  transcriptionCount: number;
  lastActivity: string | null;
};

function sourceIcon(source: string | null) {
  if (source === "multimodal") return <Camera size={11} />;
  if (source === "transcription") return <Mic size={11} />;
  return <FileText size={11} />;
}

export default function BibliotecaPage() {
  const [subjects, setSubjects] = useState<SubjectLib[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    const db = createClient();
    db.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setLoading(false); return; }

      const [subRes, docRes, fcRes, cRes] = await Promise.all([
        db.from("subjects").select("id, name").eq("user_id", user.id).order("name"),
        db.from("documents").select("id, subject_id, source, created_at").eq("user_id", user.id),
        db.from("flashcards").select("id, subject_id, source, created_at").eq("user_id", user.id),
        db.from("subject_concepts").select("id, subject_id").in("subject_id",
          (await db.from("subjects").select("id").eq("user_id", user.id)).data?.map(s => s.id) ?? []
        ),
      ]);

      const subs = subRes.data ?? [];
      const docs = docRes.data ?? [];
      const fcs  = fcRes.data ?? [];
      const cons = cRes.data ?? [];

      const result: SubjectLib[] = subs.map(s => {
        const sDocs = docs.filter(d => d.subject_id === s.id);
        const sFcs  = fcs.filter(f => f.subject_id === s.id);
        const sCons = cons.filter(c => c.subject_id === s.id);

        const allDates = [
          ...sDocs.map(d => d.created_at),
          ...sFcs.map(f => f.created_at),
        ].sort().reverse();

        return {
          id: s.id,
          name: s.name,
          docCount:          sDocs.filter(d => !d.source || d.source === null).length,
          photoCount:        sDocs.filter(d => d.source === "multimodal").length + sFcs.filter(f => f.source === "multimodal").length,
          transcriptionCount: sDocs.filter(d => d.source === "transcription").length + sFcs.filter(f => f.source === "transcription").length,
          flashcardCount:    sFcs.length,
          conceptCount:      sCons.length,
          lastActivity:      allDates[0] ?? null,
        };
      });

      setSubjects(result);
      setLoading(false);
    });
  }, []);

  const filtered = useMemo(() => {
    if (!q.trim()) return subjects;
    const lq = q.toLowerCase();
    return subjects.filter(s => s.name.toLowerCase().includes(lq));
  }, [subjects, q]);

  const totalDocs  = subjects.reduce((s, x) => s + x.docCount, 0);
  const totalFc    = subjects.reduce((s, x) => s + x.flashcardCount, 0);
  const totalCon   = subjects.reduce((s, x) => s + x.conceptCount, 0);

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "50vh", gap: 10 }}>
      <Loader2 size={18} color="var(--mn-green)" style={{ animation: "spin 1s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{ maxWidth: 680, padding: "28px 20px" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 className="font-display" style={{ fontSize: 22, fontWeight: 800, color: "var(--mn-ink-1)", marginBottom: 4 }}>
          Biblioteca
        </h1>
        <p style={{ fontSize: 13, color: "var(--mn-ink-3)" }}>
          Todo tu material de estudio en un solo lugar
        </p>
      </div>

      {/* Resumen global */}
      {subjects.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 24 }}>
          {[
            { icon: <FileText size={14} color="var(--mn-ink-2)" />, value: totalDocs,  label: "Documentos" },
            { icon: <Layers  size={14} color="var(--mn-ink-2)" />, value: totalFc,    label: "Flashcards" },
            { icon: <BookOpen size={14} color="var(--mn-ink-2)" />, value: totalCon,   label: "Conceptos" },
          ].map((s, i) => (
            <div key={i} style={{ background: "var(--mn-surface)", borderRadius: "var(--mn-r-xl)", border: "1px solid var(--mn-ink-4)", padding: "14px 16px", textAlign: "center" }}>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 6 }}>{s.icon}</div>
              <p className="font-display" style={{ fontSize: 22, fontWeight: 800, color: "var(--mn-ink-1)", lineHeight: 1 }}>{s.value}</p>
              <p style={{ fontSize: 11, color: "var(--mn-ink-3)", marginTop: 3 }}>{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Búsqueda */}
      {subjects.length > 1 && (
        <div style={{ position: "relative", marginBottom: 20 }}>
          <Search size={14} color="var(--mn-ink-3)" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
          <input
            type="text"
            placeholder="Buscar materia…"
            value={q}
            onChange={e => setQ(e.target.value)}
            style={{ width: "100%", padding: "10px 12px 10px 34px", borderRadius: "var(--mn-r-lg)", border: "1px solid var(--mn-ink-4)", background: "var(--mn-surface)", fontSize: 13, color: "var(--mn-ink-1)", outline: "none", boxSizing: "border-box" }}
          />
        </div>
      )}

      {/* Lista de materias */}
      {filtered.length === 0 && subjects.length > 0 ? (
        <p style={{ fontSize: 13, color: "var(--mn-ink-3)", textAlign: "center", paddingTop: 32 }}>Sin resultados para "{q}"</p>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "56px 24px" }}>
          <div style={{ width: 48, height: 48, borderRadius: "50%", background: "var(--mn-raised)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <BookOpen size={22} color="var(--mn-ink-3)" />
          </div>
          <p style={{ fontSize: 15, fontWeight: 600, color: "var(--mn-ink-1)", marginBottom: 6 }}>Sin materias aún</p>
          <p style={{ fontSize: 13, color: "var(--mn-ink-3)", marginBottom: 20 }}>
            Crea tu primera materia y sube tus apuntes para construir tu biblioteca.
          </p>
          <Link href="/materias" className="mn-btn-primary" style={{ fontSize: 13, textDecoration: "none", display: "inline-block", padding: "10px 20px" }}>
            Ir a Materias
          </Link>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map(s => {
            const hasContent = s.docCount + s.flashcardCount + s.photoCount + s.transcriptionCount > 0;
            return (
              <Link
                key={s.id}
                href={`/biblioteca/${s.id}`}
                style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 18px", background: "var(--mn-surface)", borderRadius: "var(--mn-r-xl)", border: "1px solid var(--mn-ink-4)", textDecoration: "none", transition: "border-color 150ms" }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--mn-ink-2)")}
                onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--mn-ink-4)")}
              >
                <div style={{ width: 38, height: 38, borderRadius: "var(--mn-r-lg)", background: "var(--mn-raised)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <BookOpen size={16} color="var(--mn-ink-2)" />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: "var(--mn-ink-1)", marginBottom: 5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {s.name}
                  </p>
                  {hasContent ? (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {s.docCount > 0 && (
                        <span style={{ fontSize: 11, color: "var(--mn-ink-3)", display: "inline-flex", alignItems: "center", gap: 3 }}>
                          {sourceIcon(null)} {s.docCount} doc{s.docCount !== 1 ? "s" : ""}
                        </span>
                      )}
                      {s.photoCount > 0 && (
                        <span style={{ fontSize: 11, color: "var(--mn-ink-3)", display: "inline-flex", alignItems: "center", gap: 3 }}>
                          {sourceIcon("multimodal")} {s.photoCount} foto{s.photoCount !== 1 ? "s" : ""}
                        </span>
                      )}
                      {s.transcriptionCount > 0 && (
                        <span style={{ fontSize: 11, color: "var(--mn-ink-3)", display: "inline-flex", alignItems: "center", gap: 3 }}>
                          {sourceIcon("transcription")} {s.transcriptionCount} clase{s.transcriptionCount !== 1 ? "s" : ""}
                        </span>
                      )}
                      {s.flashcardCount > 0 && (
                        <span style={{ fontSize: 11, color: "var(--mn-ink-3)", display: "inline-flex", alignItems: "center", gap: 3 }}>
                          <Layers size={11} /> {s.flashcardCount} flashcard{s.flashcardCount !== 1 ? "s" : ""}
                        </span>
                      )}
                      {s.conceptCount > 0 && (
                        <span style={{ fontSize: 11, color: "var(--mn-ink-3)", display: "inline-flex", alignItems: "center", gap: 3 }}>
                          <BookOpen size={11} /> {s.conceptCount} concepto{s.conceptCount !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                  ) : (
                    <p style={{ fontSize: 12, color: "var(--mn-ink-4)" }}>Sin material aún</p>
                  )}
                </div>

                <ChevronRight size={15} color="var(--mn-ink-4)" style={{ flexShrink: 0 }} />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
