"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ChevronRight, FileText, Layers, HelpCircle, BookOpen, Mic,
  CheckCircle, Calendar, AlertCircle, Star, Trash2, ChevronDown, ChevronUp,
} from "lucide-react";

type ClassDetail = {
  id: string;
  title: string;
  source: string;
  subject_id: string | null;
  subject_name: string | null;
  processing_status: string;
  transcript: string | null;
  summary: string[] | null;
  smart_notes: string | null;
  open_questions: string[] | null;
  detected_suggestions: DetectedSuggestion[] | null;
  flashcards_count: number;
  quiz_count: number;
  concepts_count: number;
  tasks_count: number;
  events_count: number;
  created_at: string;
};

type Flashcard = { id: string; front: string; back: string };
type QuizQuestion = { id: string; question: string; options: string[]; correct_answer: string; explanation: string };
type DetectedSuggestion = { title: string; due_date: string; event_type: "exam" | "assignment"; due_hint: string; approved: boolean };

type TabId = "resumen" | "apuntes" | "flashcards" | "quiz" | "transcript";

function cleanTitle(title: string): string {
  return title
    .replace(/\s*\[[^\]]+\]/g, "")
    .replace(/\s*\([A-ZÁÉÍÓÚÑ\s]{4,}\)/g, "")
    .replace(/\s*\|\s*CURSO:\s*/g, " — ")
    .trim();
}

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith("**") && p.endsWith("**")
      ? <strong key={i} style={{ fontWeight: 700, color: "var(--mn-ink-1)" }}>{p.slice(2, -2)}</strong>
      : p
  );
}

function renderMarkdown(md: string) {
  const lines = md.split("\n");
  const nodes: React.ReactNode[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line) { i++; continue; }
    if (line.startsWith("#### ")) {
      nodes.push(<p key={i} style={{ fontSize: 12, fontWeight: 700, color: "var(--mn-ink-3)", margin: "12px 0 4px", textTransform: "uppercase", letterSpacing: "0.05em" }}>{line.slice(5)}</p>);
      i++; continue;
    }
    if (line.startsWith("### ")) {
      nodes.push(<h4 key={i} style={{ fontSize: 13, fontWeight: 700, color: "var(--mn-ink-2)", margin: "14px 0 6px" }}>{renderInline(line.slice(4))}</h4>);
      i++; continue;
    }
    if (line.startsWith("## ")) {
      nodes.push(<h3 key={i} style={{ fontSize: 15, fontWeight: 700, color: "var(--mn-ink-1)", margin: "20px 0 8px", paddingBottom: 6, borderBottom: "1px solid var(--mn-ink-4)" }}>{renderInline(line.slice(3))}</h3>);
      i++; continue;
    }
    if (/^[-•*]\s/.test(line)) {
      const bullets: string[] = [];
      while (i < lines.length && /^[-•*]\s/.test(lines[i].trim())) {
        bullets.push(lines[i].trim().replace(/^[-•*]\s/, ""));
        i++;
      }
      nodes.push(
        <ul key={i} style={{ margin: "0 0 10px", paddingLeft: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 5 }}>
          {bullets.map((b, bi) => (
            <li key={bi} style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 13, color: "var(--mn-ink-1)", lineHeight: 1.65 }}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--mn-ink-3)", flexShrink: 0, marginTop: 8 }} />
              <span>{renderInline(b)}</span>
            </li>
          ))}
        </ul>
      );
      continue;
    }
    nodes.push(<p key={i} style={{ fontSize: 13, color: "var(--mn-ink-1)", lineHeight: 1.7, marginBottom: 6 }}>{renderInline(line)}</p>);
    i++;
  }
  return nodes;
}

export default function ClaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [cls, setCls] = useState<ClassDetail | null>(null);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [quiz, setQuiz] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabId>("resumen");

  // Flashcard state
  const [flippedCard, setFlippedCard] = useState<string | null>(null);
  const [starredCards, setStarredCards] = useState<Set<string>>(new Set());

  // Quiz state
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  // Delete
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Suggestions
  const [suggestions, setSuggestions] = useState<DetectedSuggestion[]>([]);
  const [approvingIdx, setApprovingIdx] = useState<number | null>(null);

  // Transcript expand
  const [transcriptExpanded, setTranscriptExpanded] = useState(false);

  useEffect(() => {
    fetch(`/api/classes/${id}`)
      .then(r => r.json())
      .then(data => {
        setCls(data.class);
        setFlashcards(data.flashcards ?? []);
        setQuiz(data.quiz ?? []);
        setSuggestions(data.class?.detected_suggestions ?? []);
        setLoading(false);
      });
  }, [id]);

  async function approveSuggestion(index: number) {
    if (!cls?.subject_id) return;
    setApprovingIdx(index);
    const res = await fetch(`/api/classes/${id}/approve-suggestion`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ index, subjectId: cls.subject_id }),
    });
    if (res.ok) {
      setSuggestions(prev => prev.map((s, i) => i === index ? { ...s, approved: true } : s));
    }
    setApprovingIdx(null);
  }

  async function handleDelete() {
    setDeleting(true);
    await fetch(`/api/classes/${id}`, { method: "DELETE" });
    router.push("/mis-clases");
  }

  const quizScore = quizSubmitted
    ? quiz.filter(q => quizAnswers[q.id] === q.correct_answer).length
    : 0;

  if (loading) return (
    <div className="mn-dashboard-wrap" style={{ maxWidth: 720 }}>
      {[200, 320, 260, 180].map((w, i) => (
        <div key={i} style={{ height: 18, width: w, background: "var(--mn-raised)", borderRadius: "var(--mn-r-sm)", marginBottom: 12, animation: "pulse-sk 1.4s ease infinite" }} />
      ))}
      <style>{`@keyframes pulse-sk{0%,100%{opacity:1}50%{opacity:.45}}`}</style>
    </div>
  );

  if (!cls) return (
    <div className="mn-dashboard-wrap" style={{ textAlign: "center", paddingTop: 48 }}>
      <p style={{ fontSize: 14, color: "var(--mn-ink-2)" }}>Clase no encontrada.</p>
      <Link href="/mis-clases" style={{ fontSize: 13, color: "var(--mn-green)", fontWeight: 600 }}>← Volver</Link>
    </div>
  );

  const pendingSuggestions = suggestions.filter(s => !s.approved);

  return (
    <div className="mn-dashboard-wrap" style={{ maxWidth: 720 }}>
      <style>{`@keyframes pulse-sk{0%,100%{opacity:1}50%{opacity:.45}}`}</style>

      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 16 }}>
        <Link href="/mis-clases" style={{ fontSize: 12, color: "var(--mn-ink-3)", textDecoration: "none" }}>Mis clases</Link>
        <ChevronRight size={12} color="var(--mn-ink-4)" />
        <span style={{ fontSize: 12, color: "var(--mn-ink-2)" }}>{cleanTitle(cls.title)}</span>
      </div>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 8 }}>
          <div>
            <h1 className="font-display" style={{ fontSize: 22, fontWeight: 800, color: "var(--mn-ink-1)", marginBottom: 4 }}>{cleanTitle(cls.title)}</h1>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              {cls.subject_name && (
                <Link href={`/materias/${cls.subject_id}`} style={{ fontSize: 12, color: "var(--mn-green)", fontWeight: 600, textDecoration: "none" }}>{cls.subject_name}</Link>
              )}
              <span style={{ fontSize: 12, color: "var(--mn-ink-3)" }}>
                {new Date(cls.created_at).toLocaleDateString("es", { day: "numeric", month: "long", year: "numeric" })}
              </span>
              <span style={{ fontSize: 11, color: "var(--mn-ink-4)", display: "flex", alignItems: "center", gap: 3 }}>
                <Mic size={10} /> {cls.source === "recording" ? "Grabación" : "Audio subido"}
              </span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
            {!confirmDelete ? (
              <button onClick={() => setConfirmDelete(true)} style={{ width: 34, height: 34, borderRadius: "var(--mn-r-md)", border: "1px solid var(--mn-ink-4)", background: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--mn-ink-3)" }}>
                <Trash2 size={15} />
              </button>
            ) : (
              <>
                <button onClick={handleDelete} disabled={deleting} style={{ padding: "6px 12px", borderRadius: "var(--mn-r-md)", border: "1px solid var(--mn-error)", background: "none", fontSize: 12, color: "var(--mn-error)", cursor: "pointer", fontWeight: 600 }}>
                  {deleting ? "Borrando…" : "Confirmar"}
                </button>
                <button onClick={() => setConfirmDelete(false)} style={{ padding: "6px 10px", borderRadius: "var(--mn-r-md)", border: "1px solid var(--mn-ink-4)", background: "none", fontSize: 12, color: "var(--mn-ink-3)", cursor: "pointer" }}>
                  Cancelar
                </button>
              </>
            )}
          </div>
        </div>

        {/* Stats rápidos */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {cls.flashcards_count > 0 && <div style={{ padding: "5px 12px", borderRadius: "var(--mn-r-full)", background: "var(--mn-raised)", border: "1px solid var(--mn-ink-4)", fontSize: 12, color: "var(--mn-ink-2)", display: "flex", alignItems: "center", gap: 5 }}><Layers size={11} /> {cls.flashcards_count} flashcards</div>}
          {cls.quiz_count > 0 && <div style={{ padding: "5px 12px", borderRadius: "var(--mn-r-full)", background: "var(--mn-raised)", border: "1px solid var(--mn-ink-4)", fontSize: 12, color: "var(--mn-ink-2)", display: "flex", alignItems: "center", gap: 5 }}><HelpCircle size={11} /> {cls.quiz_count} quiz</div>}
          {cls.concepts_count > 0 && <div style={{ padding: "5px 12px", borderRadius: "var(--mn-r-full)", background: "var(--mn-raised)", border: "1px solid var(--mn-ink-4)", fontSize: 12, color: "var(--mn-ink-2)", display: "flex", alignItems: "center", gap: 5 }}><BookOpen size={11} /> {cls.concepts_count} conceptos</div>}
        </div>
      </div>

      {/* Sugerencias pendientes */}
      {pendingSuggestions.length > 0 && (
        <div style={{ marginBottom: 20, padding: "14px 16px", borderRadius: "var(--mn-r-lg)", background: "var(--mn-amber-soft, #FEF3C7)", border: "1px solid rgba(217,119,6,0.2)" }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "var(--mn-amber)", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
            <AlertCircle size={14} /> {pendingSuggestions.length} fecha{pendingSuggestions.length !== 1 ? "s" : ""} detectada{pendingSuggestions.length !== 1 ? "s" : ""} en la clase
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {suggestions.map((s, i) => !s.approved && (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: "var(--mn-r-md)", background: "rgba(255,255,255,0.6)" }}>
                <Calendar size={13} color="var(--mn-amber)" />
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "var(--mn-ink-1)" }}>{s.title}</p>
                  <p style={{ fontSize: 11, color: "var(--mn-ink-3)" }}>{s.event_type === "exam" ? "Examen" : "Tarea"} · {new Date(s.due_date + "T12:00:00").toLocaleDateString("es", { day: "numeric", month: "long" })}</p>
                </div>
                <button
                  onClick={() => approveSuggestion(i)}
                  disabled={approvingIdx === i}
                  style={{ padding: "5px 12px", borderRadius: "var(--mn-r-md)", border: "none", background: "var(--mn-green)", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", opacity: approvingIdx === i ? 0.6 : 1 }}
                >
                  {approvingIdx === i ? "..." : "Agregar al calendario"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: 0, marginBottom: 24, borderBottom: "1px solid var(--mn-ink-4)", overflowX: "auto" }}>
        {([
          { id: "resumen", label: "Resumen", icon: <FileText size={13} /> },
          { id: "apuntes", label: "Apuntes", icon: <BookOpen size={13} /> },
          { id: "flashcards", label: `Flashcards (${cls.flashcards_count})`, icon: <Layers size={13} /> },
          { id: "quiz", label: `Quiz (${cls.quiz_count})`, icon: <HelpCircle size={13} /> },
          { id: "transcript", label: "Transcripción", icon: <Mic size={13} /> },
        ] as { id: TabId; label: string; icon: React.ReactNode }[]).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: "10px 14px", border: "none", borderBottom: tab === t.id ? "2px solid var(--mn-green)" : "2px solid transparent", background: "none", fontSize: 13, fontWeight: tab === t.id ? 600 : 400, color: tab === t.id ? "var(--mn-ink-1)" : "var(--mn-ink-3)", cursor: "pointer", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 5, marginBottom: -1 }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Tab: Resumen */}
      {tab === "resumen" && (
        <div>
          {cls.summary && cls.summary.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {cls.summary.map((point, i) => (
                <div key={i} style={{ display: "flex", gap: 12, padding: "12px 16px", background: "var(--mn-surface)", borderRadius: "var(--mn-r-lg)", border: "1px solid var(--mn-ink-4)" }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: "var(--mn-green)", minWidth: 20, marginTop: 1 }}>{i + 1}</span>
                  <p style={{ fontSize: 14, color: "var(--mn-ink-1)", lineHeight: 1.65 }}>{point}</p>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: 13, color: "var(--mn-ink-3)", textAlign: "center", paddingTop: 32 }}>No hay resumen disponible para esta clase.</p>
          )}

          {cls.open_questions && cls.open_questions.length > 0 && (
            <div style={{ marginTop: 28 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--mn-ink-1)", marginBottom: 12 }}>Preguntas para estudiar</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {cls.open_questions.map((q, i) => (
                  <div key={i} style={{ padding: "12px 16px", background: "var(--mn-surface)", borderRadius: "var(--mn-r-lg)", border: "1px solid var(--mn-ink-4)" }}>
                    <p style={{ fontSize: 13, color: "var(--mn-ink-1)", lineHeight: 1.65 }}>{q}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: Apuntes */}
      {tab === "apuntes" && (
        <div>
          {cls.smart_notes ? (
            <div style={{ background: "var(--mn-surface)", borderRadius: "var(--mn-r-xl)", border: "1px solid var(--mn-ink-4)", padding: "20px 24px" }}>
              {renderMarkdown(cls.smart_notes)}
            </div>
          ) : (
            <p style={{ fontSize: 13, color: "var(--mn-ink-3)", textAlign: "center", paddingTop: 32 }}>No hay apuntes disponibles.</p>
          )}
        </div>
      )}

      {/* Tab: Flashcards */}
      {tab === "flashcards" && (
        <div>
          {flashcards.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--mn-ink-3)", textAlign: "center", paddingTop: 32 }}>No se generaron flashcards para esta clase.</p>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {flashcards.map(card => {
                const isFlipped = flippedCard === card.id;
                const isStarred = starredCards.has(card.id);
                return (
                  <div key={card.id} style={{ background: "var(--mn-surface)", borderRadius: "var(--mn-r-lg)", border: `1px solid ${isFlipped ? "var(--mn-green)" : "var(--mn-ink-4)"}`, overflow: "hidden", transition: "border-color 150ms" }}>
                    <div style={{ padding: "14px 16px 0" }}>
                      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
                        <button onClick={() => setStarredCards(prev => { const n = new Set(prev); n.has(card.id) ? n.delete(card.id) : n.add(card.id); return n; })} style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}>
                          <Star size={13} color={isStarred ? "#F59E0B" : "var(--mn-ink-4)"} fill={isStarred ? "#F59E0B" : "none"} />
                        </button>
                      </div>
                      {isFlipped ? (
                        <div>
                          <p style={{ fontSize: 13, color: "var(--mn-ink-1)", lineHeight: 1.6, marginBottom: 12 }}>{card.back}</p>
                          <button onClick={() => setFlippedCard(null)} style={{ padding: "6px 14px", borderRadius: "var(--mn-r-md)", border: "1px solid var(--mn-ink-4)", background: "none", fontSize: 12, color: "var(--mn-ink-2)", cursor: "pointer", marginBottom: 12 }}>
                            Volver
                          </button>
                        </div>
                      ) : (
                        <div onClick={() => setFlippedCard(card.id)} style={{ cursor: "pointer", paddingBottom: 14 }}>
                          <p style={{ fontSize: 14, fontWeight: 600, color: "var(--mn-ink-1)", lineHeight: 1.45, marginBottom: 6 }}>{card.front}</p>
                          <span style={{ fontSize: 12, color: "var(--mn-ink-3)" }}>Toca para ver la respuesta</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {cls.subject_id && flashcards.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <Link href={`/flashcards/${cls.subject_id}`} className="mn-btn-primary" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, textDecoration: "none" }}>
                <Layers size={14} /> Practicar todas las flashcards de la materia
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Tab: Quiz */}
      {tab === "quiz" && (
        <div>
          {quiz.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--mn-ink-3)", textAlign: "center", paddingTop: 32 }}>No se generó quiz para esta clase.</p>
          ) : (
            <div>
              {quizSubmitted && (
                <div style={{ marginBottom: 20, padding: "14px 18px", borderRadius: "var(--mn-r-lg)", background: quizScore >= quiz.length * 0.7 ? "var(--mn-raised)" : "var(--mn-raised)", border: "1px solid var(--mn-ink-4)", display: "flex", alignItems: "center", gap: 12 }}>
                  <CheckCircle size={20} color={quizScore >= quiz.length * 0.7 ? "#16A34A" : "var(--mn-amber)"} />
                  <div>
                    <p style={{ fontSize: 15, fontWeight: 700, color: "var(--mn-ink-1)" }}>{quizScore}/{quiz.length} correctas</p>
                    <p style={{ fontSize: 12, color: "var(--mn-ink-3)" }}>{quizScore >= quiz.length * 0.7 ? "¡Buen resultado! Dominas el material de esta clase." : "Repasa los apuntes e intenta de nuevo."}</p>
                  </div>
                  <button onClick={() => { setQuizAnswers({}); setQuizSubmitted(false); }} style={{ marginLeft: "auto", padding: "6px 14px", borderRadius: "var(--mn-r-md)", border: "1px solid var(--mn-ink-4)", background: "none", fontSize: 12, color: "var(--mn-ink-2)", cursor: "pointer" }}>
                    Reintentar
                  </button>
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {quiz.map((q, qi) => {
                  const answer = quizAnswers[q.id];
                  const isCorrect = answer === q.correct_answer;
                  return (
                    <div key={q.id} style={{ padding: "16px 18px", background: "var(--mn-surface)", borderRadius: "var(--mn-r-lg)", border: `1px solid ${quizSubmitted && answer ? (isCorrect ? "rgba(22,163,74,0.3)" : "rgba(220,38,38,0.3)") : "var(--mn-ink-4)"}` }}>
                      <p style={{ fontSize: 14, fontWeight: 600, color: "var(--mn-ink-1)", marginBottom: 12 }}>{qi + 1}. {q.question}</p>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {(q.options ?? []).map((opt, oi) => {
                          const optLetter = opt.charAt(0);
                          const isSelected = answer === optLetter;
                          const isAnswer = q.correct_answer === optLetter;
                          let bg = "var(--mn-surface)";
                          let border = "var(--mn-ink-4)";
                          let color = "var(--mn-ink-1)";
                          if (quizSubmitted) {
                            if (isAnswer) { bg = "rgba(22,163,74,0.1)"; border = "rgba(22,163,74,0.4)"; color = "#16A34A"; }
                            else if (isSelected && !isAnswer) { bg = "rgba(220,38,38,0.08)"; border = "rgba(220,38,38,0.3)"; color = "var(--mn-error)"; }
                          } else if (isSelected) {
                            bg = "var(--mn-raised)"; border = "var(--mn-green)";
                          }
                          return (
                            <button key={oi} onClick={() => !quizSubmitted && setQuizAnswers(prev => ({ ...prev, [q.id]: optLetter }))}
                              style={{ padding: "9px 14px", borderRadius: "var(--mn-r-md)", border: `1px solid ${border}`, background: bg, fontSize: 13, color, cursor: quizSubmitted ? "default" : "pointer", textAlign: "left", transition: "all 150ms" }}>
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                      {quizSubmitted && q.explanation && (
                        <p style={{ fontSize: 12, color: "var(--mn-ink-3)", marginTop: 10, padding: "8px 12px", background: "var(--mn-raised)", borderRadius: "var(--mn-r-sm)" }}>
                          💡 {q.explanation}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              {!quizSubmitted && (
                <div style={{ marginTop: 16 }}>
                  <button onClick={() => setQuizSubmitted(true)} disabled={Object.keys(quizAnswers).length < quiz.length}
                    className="mn-btn-primary"
                    style={{ fontSize: 13, opacity: Object.keys(quizAnswers).length < quiz.length ? 0.5 : 1 }}>
                    Enviar respuestas ({Object.keys(quizAnswers).length}/{quiz.length})
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tab: Transcripción */}
      {tab === "transcript" && (
        <div>
          {cls.transcript ? (
            <div style={{ background: "var(--mn-surface)", borderRadius: "var(--mn-r-xl)", border: "1px solid var(--mn-ink-4)", padding: "20px 24px" }}>
              <p style={{ fontSize: 13, color: "var(--mn-ink-1)", lineHeight: 1.8, whiteSpace: "pre-wrap" }}>
                {transcriptExpanded ? cls.transcript : cls.transcript.slice(0, 1200)}
                {!transcriptExpanded && cls.transcript.length > 1200 && "…"}
              </p>
              {cls.transcript.length > 1200 && (
                <button onClick={() => setTranscriptExpanded(e => !e)} style={{ marginTop: 12, background: "none", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "var(--mn-green)", padding: 0, display: "flex", alignItems: "center", gap: 5 }}>
                  {transcriptExpanded ? <><ChevronUp size={14} /> Ver menos</> : <><ChevronDown size={14} /> Ver transcripción completa</>}
                </button>
              )}
            </div>
          ) : (
            <p style={{ fontSize: 13, color: "var(--mn-ink-3)", textAlign: "center", paddingTop: 32 }}>No hay transcripción disponible.</p>
          )}
        </div>
      )}
    </div>
  );
}
