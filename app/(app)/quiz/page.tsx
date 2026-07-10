"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Brain, ChevronRight, Loader2, RotateCcw, TrendingUp, FileText } from "lucide-react";

interface Subject {
  id: string;
  name: string;
  color: string;
  lastSession: { pct: number; correct: number; total: number; created_at: string } | null;
  flashcardCount: number;
  conceptCount: number;
  documents: { id: string; name: string }[];
}

export default function QuizHubPage() {
  const router = useRouter();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<string>("");
  const [studioQuizCount, setStudioQuizCount] = useState(0);

  useEffect(() => {
    fetch("/api/quiz/hub")
      .then(r => r.ok ? r.json() : [])
      .then(setSubjects)
      .catch(() => setSubjects([]))
      .finally(() => setLoading(false));

    fetch("/api/classes")
      .then(r => r.ok ? r.json() : [])
      .then((classes: { quiz_count?: number; processing_status?: string }[]) => {
        const count = classes.filter(c => c.processing_status === "done" && (c.quiz_count ?? 0) > 0)
          .reduce((sum, c) => sum + (c.quiz_count ?? 0), 0);
        setStudioQuizCount(count);
      })
      .catch(() => {});
  }, []);

  function handleStart(subject: Subject) {
    if (subject.documents.length > 0) {
      setSelectedSubject(subject);
      setSelectedDoc("");
    } else {
      router.push(`/quiz/${subject.id}`);
    }
  }

  function handleConfirmStart() {
    if (!selectedSubject) return;
    const url = selectedDoc
      ? `/quiz/${selectedSubject.id}?documentId=${selectedDoc}`
      : `/quiz/${selectedSubject.id}`;
    router.push(url);
  }

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "50vh" }}>
      <Loader2 size={22} color="var(--mn-green)" style={{ animation: "spin 1s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{ maxWidth: 620, padding: "32px 24px" }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <Brain size={20} color="var(--mn-green)" />
          <h1 className="font-display" style={{ fontSize: 22, fontWeight: 800, color: "var(--mn-ink-1)" }}>
            Quiz
          </h1>
        </div>
        <p style={{ fontSize: 14, color: "var(--mn-ink-2)", lineHeight: 1.5 }}>
          Preguntas adaptadas a lo que más te cuesta. Cada sesión actualiza tu perfil de aprendizaje.
        </p>
      </div>

      {subjects.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 24px", color: "var(--mn-ink-3)" }}>
          <Brain size={32} style={{ marginBottom: 12, opacity: 0.4 }} />
          <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 6, color: "var(--mn-ink-2)" }}>Sin contenido procesado aún</p>
          <p style={{ fontSize: 13, marginBottom: 20 }}>Sube documentos a una materia para generar tu primer quiz.</p>
          <Link href="/materias" className="mn-btn-primary" style={{ fontSize: 13, textDecoration: "none", marginBottom: 12, display: "inline-flex" }}>
            Ir a mis materias
          </Link>
          {studioQuizCount > 0 && (
            <div style={{ marginTop: 16, padding: "14px 18px", borderRadius: "var(--mn-r-lg)", background: "var(--mn-surface)", border: "1px solid var(--mn-ink-4)", textAlign: "left" }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: "var(--mn-ink-1)", marginBottom: 4 }}>
                Tienes {studioQuizCount} preguntas de tus clases grabadas
              </p>
              <p style={{ fontSize: 12, color: "var(--mn-ink-3)", marginBottom: 10 }}>
                Los quizzes de AI Class Studio se encuentran en cada clase procesada.
              </p>
              <Link href="/mis-clases" style={{ fontSize: 12, fontWeight: 600, color: "var(--mn-green)", textDecoration: "none" }}>
                Ver mis clases →
              </Link>
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {subjects.map(s => {
            const pct = s.lastSession?.pct;
            const hasContent = s.flashcardCount > 0 || s.conceptCount > 0;
            return (
              <div
                key={s.id}
                style={{
                  background: "var(--mn-surface)",
                  borderRadius: "var(--mn-r-xl)",
                  padding: "18px 20px",
                  border: "1px solid var(--mn-ink-4)",
                  opacity: hasContent ? 1 : 0.55,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: s.color || "var(--mn-raised)", flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 15, fontWeight: 700, color: "var(--mn-ink-1)", marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {s.name}
                    </p>
                    <p style={{ fontSize: 12, color: "var(--mn-ink-3)" }}>
                      {s.flashcardCount} flashcard{s.flashcardCount !== 1 ? "s" : ""}
                      {s.conceptCount > 0 ? ` · ${s.conceptCount} concepto${s.conceptCount !== 1 ? "s" : ""}` : ""}
                    </p>
                  </div>

                  {pct !== undefined && pct !== null && (
                    <div style={{ textAlign: "right", marginRight: 12, flexShrink: 0 }}>
                      <p style={{ fontSize: 18, fontWeight: 800, color: pct >= 70 ? "var(--mn-green)" : "var(--mn-amber)", lineHeight: 1 }}>
                        {pct}%
                      </p>
                      <p style={{ fontSize: 10, color: "var(--mn-ink-3)", marginTop: 2 }}>último quiz</p>
                    </div>
                  )}

                  <button
                    onClick={() => hasContent && handleStart(s)}
                    disabled={!hasContent}
                    className={hasContent ? "mn-btn-primary" : undefined}
                    style={!hasContent ? {
                      fontSize: 13, padding: "8px 14px", borderRadius: "var(--mn-r-lg)",
                      border: "1px solid var(--mn-ink-4)", background: "var(--mn-raised)",
                      color: "var(--mn-ink-3)", cursor: "not-allowed",
                    } : { fontSize: 13, padding: "8px 16px", flexShrink: 0 }}
                  >
                    {hasContent ? "Practicar" : "Sin contenido"}
                  </button>
                </div>

                {s.lastSession && (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--mn-ink-4)", display: "flex", alignItems: "center", gap: 8 }}>
                    <RotateCcw size={11} color="var(--mn-ink-3)" />
                    <p style={{ fontSize: 12, color: "var(--mn-ink-3)" }}>
                      Última sesión: {s.lastSession.correct}/{s.lastSession.total} correctas · {new Date(s.lastSession.created_at).toLocaleDateString("es", { day: "numeric", month: "short" })}
                    </p>
                    <Link
                      href={`/quiz/${s.id}/historial`}
                      style={{ marginLeft: "auto", fontSize: 11, color: "var(--mn-ink-3)", textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}
                    >
                      Ver historial <ChevronRight size={11} />
                    </Link>
                  </div>
                )}
              </div>
            );
          })}

          {studioQuizCount > 0 && (
            <div style={{ padding: "14px 18px", borderRadius: "var(--mn-r-lg)", background: "var(--mn-raised)", border: "1px solid var(--mn-ink-4)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <FileText size={15} color="var(--mn-ink-3)" />
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "var(--mn-ink-1)" }}>
                    {studioQuizCount} preguntas de clases grabadas
                  </p>
                  <p style={{ fontSize: 11, color: "var(--mn-ink-3)" }}>Disponibles en AI Class Studio</p>
                </div>
              </div>
              <Link href="/mis-clases" style={{ fontSize: 12, fontWeight: 700, color: "var(--mn-green)", textDecoration: "none", whiteSpace: "nowrap" }}>
                Ver clases →
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Modal de selección de documento */}
      {selectedSubject && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(26,22,18,0.45)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
          onClick={e => { if (e.target === e.currentTarget) setSelectedSubject(null); }}
        >
          <div style={{ background: "var(--mn-surface)", borderRadius: 20, padding: 28, maxWidth: 400, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}>
            <p className="font-display" style={{ fontSize: 17, fontWeight: 800, color: "var(--mn-ink-1)", marginBottom: 6 }}>
              {selectedSubject.name}
            </p>
            <p style={{ fontSize: 13, color: "var(--mn-ink-2)", marginBottom: 20 }}>
              ¿Quieres practicar toda la materia o un documento específico?
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
              <button
                onClick={() => setSelectedDoc("")}
                style={{
                  padding: "12px 16px", borderRadius: "var(--mn-r-lg)", textAlign: "left", cursor: "pointer",
                  border: selectedDoc === "" ? "2px solid var(--mn-green)" : "1px solid var(--mn-ink-4)",
                  background: selectedDoc === "" ? "var(--mn-raised)" : "var(--mn-surface)",
                  display: "flex", alignItems: "center", gap: 10,
                }}
              >
                <TrendingUp size={14} color="var(--mn-green)" />
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "var(--mn-ink-1)" }}>Toda la materia</p>
                  <p style={{ fontSize: 11, color: "var(--mn-ink-3)" }}>Preguntas adaptadas a tus puntos débiles</p>
                </div>
              </button>

              {selectedSubject.documents.map(doc => (
                <button
                  key={doc.id}
                  onClick={() => setSelectedDoc(doc.id)}
                  style={{
                    padding: "12px 16px", borderRadius: "var(--mn-r-lg)", textAlign: "left", cursor: "pointer",
                    border: selectedDoc === doc.id ? "2px solid var(--mn-green)" : "1px solid var(--mn-ink-4)",
                    background: selectedDoc === doc.id ? "var(--mn-raised)" : "var(--mn-surface)",
                    display: "flex", alignItems: "center", gap: 10,
                  }}
                >
                  <FileText size={14} color="var(--mn-ink-3)" />
                  <p style={{ fontSize: 13, fontWeight: 500, color: "var(--mn-ink-1)", textAlign: "left", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {doc.name}
                  </p>
                </button>
              ))}
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => setSelectedSubject(null)}
                style={{ flex: 1, padding: "11px", borderRadius: "var(--mn-r-lg)", border: "1px solid var(--mn-ink-4)", background: "var(--mn-surface)", color: "var(--mn-ink-2)", cursor: "pointer", fontSize: 13, fontWeight: 600 }}
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmStart}
                className="mn-btn-primary"
                style={{ flex: 2, justifyContent: "center", fontSize: 13 }}
              >
                Empezar quiz <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
