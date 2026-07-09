"use client";

import { useState, useEffect, useCallback , Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft, CheckCircle, XCircle, Loader2,
  RotateCcw, ArrowRight,
} from "lucide-react";
import type { QuizSession, QuizQuestion } from "@/app/api/quiz/[subjectId]/route";
import type { QuizAnswer } from "@/app/api/quiz/[subjectId]/submit/route";

type Phase = "loading" | "error" | "question" | "feedback" | "result";

function QuizPageInner() {
  const { subjectId } = useParams<{ subjectId: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isGuided = searchParams.get("guided") === "1";
  const documentId = searchParams.get("documentId") ?? undefined;

  const [session,    setSession]    = useState<QuizSession | null>(null);
  const [phase,      setPhase]      = useState<Phase>("loading");
  const [errorMsg,   setErrorMsg]   = useState("");
  const [current,    setCurrent]    = useState(0);
  const [selected,   setSelected]   = useState<string | null>(null);
  const [answers,    setAnswers]    = useState<QuizAnswer[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [displayPct, setDisplayPct] = useState(0);
  const [result,     setResult]     = useState<{
    correct: number; total: number; pct: number;
    xp?: { xpEarned: number; streakDays: number; newAchievements: { title: string; icon: string }[] } | null;
  } | null>(null);

  const loadSession = useCallback(() => {
    setPhase("loading"); setSession(null); setCurrent(0);
    setSelected(null); setAnswers([]); setResult(null);

    const quizUrl = documentId
      ? `/api/quiz/${subjectId}?documentId=${documentId}`
      : `/api/quiz/${subjectId}`;
    fetch(quizUrl)
      .then(async r => {
        if (!r.ok) { const json = await r.json().catch(() => ({})); throw new Error(json.error ?? "Error al generar el quiz"); }
        return r.json() as Promise<QuizSession>;
      })
      .then(data => { setSession(data); setPhase("question"); })
      .catch(e => { setErrorMsg(e.message); setPhase("error"); });
  }, [subjectId]);

  useEffect(() => { loadSession(); }, [loadSession]);

  const question: QuizQuestion | undefined = session?.questions[current];

  function handleSelect(optionId: string) {
    if (phase !== "question" || !question) return;
    setSelected(optionId); setPhase("feedback");
  }

  function handleNext() {
    if (!question || selected === null) return;
    const isCorrect = selected === question.correctId;
    const updated: QuizAnswer[] = [...answers, { conceptId: question.id, correct: isCorrect, currentConfidence: question.currentConfidence }];
    setAnswers(updated);

    const nextIdx = current + 1;
    if (session && nextIdx < session.questions.length) {
      setCurrent(nextIdx); setSelected(null); setPhase("question");
    } else {
      setSubmitting(true);
      fetch(`/api/quiz/${subjectId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: updated, documentId }),
      })
        .then(r => r.ok ? r.json() : null)
        .then(data => { setResult(data ?? { correct: updated.filter(a => a.correct).length, total: updated.length, pct: 0 }); setPhase("result"); })
        .catch(() => { setResult({ correct: updated.filter(a => a.correct).length, total: updated.length, pct: Math.round(updated.filter(a => a.correct).length / updated.length * 100) }); setPhase("result"); })
        .finally(() => setSubmitting(false));
    }
  }

  useEffect(() => {
    if (phase !== "result" || !result) return;
    const target = result.pct || Math.round((result.correct / result.total) * 100);
    const duration = 900;
    const startTime = Date.now();
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayPct(Math.round(target * eased));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [phase, result]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (phase === "question" && question) {
        const map: Record<string, string> = { "1": "a", "2": "b", "3": "c", "4": "d" };
        if (map[e.key] && question.options.find(o => o.id === map[e.key])) handleSelect(map[e.key]);
      }
      if (phase === "feedback" && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); handleNext(); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, question, selected]);

  const progress = session ? (current / session.questions.length) * 100 : 0;

  /* ─── Loading ─── */
  if (phase === "loading") return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "60vh", gap: 14 }}>
      <Loader2 size={24} color="var(--mn-green)" style={{ animation: "spin 1s linear infinite" }} />
      <p style={{ fontSize: 14, color: "var(--mn-ink-2)" }}>Generando quiz personalizado...</p>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  /* ─── Error ─── */
  if (phase === "error") return (
    <div style={{ maxWidth: 520, padding: "48px 24px", textAlign: "center" }}>
      <p className="font-display" style={{ fontSize: 18, fontWeight: 700, color: "var(--mn-ink-1)", marginBottom: 8 }}>No se pudo generar el quiz</p>
      <p style={{ fontSize: 14, color: "var(--mn-ink-2)", marginBottom: 28, lineHeight: 1.6 }}>{errorMsg}</p>
      <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
        <button onClick={loadSession} className="mn-btn-primary" style={{ fontSize: 13 }}>
          <RotateCcw size={14} /> Reintentar
        </button>
        <Link href={`/materias/${subjectId}`} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, padding: "10px 18px", borderRadius: "var(--mn-r-lg)", border: "1px solid var(--mn-ink-4)", background: "var(--mn-surface)", color: "var(--mn-ink-2)", textDecoration: "none", fontWeight: 600 }}>
          Volver
        </Link>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  /* ─── Result ─── */
  if (phase === "result" && result) {
    const pct  = result.pct || Math.round((result.correct / result.total) * 100);
    const grade = pct >= 90 ? "Excelente" : pct >= 70 ? "Muy bien" : pct >= 50 ? "Sigue practicando" : "Necesitas repasar";
    const enriched    = answers.map((ans, i) => ({ ans, q: session!.questions[i] }));
    const correct_list = enriched.filter(e => e.ans.correct);
    const wrong_list   = enriched.filter(e => !e.ans.correct);

    const nextAction = pct >= 80
      ? { label: "Modo Examen", desc: "Tu dominio es alto. Simula el examen real.", href: `/examen/${subjectId}` }
      : pct >= 50
      ? { label: "Hablar con el tutor", desc: wrong_list.length > 0 ? `Refuerza: ${wrong_list.slice(0, 2).map(e => e.q?.conceptName).filter(Boolean).join(", ")}.` : "Profundiza los conceptos con el tutor.", href: `/tutor/${subjectId}` }
      : { label: "Repasar flashcards", desc: "Repasa los conceptos con flashcards antes de volver al quiz.", href: `/flashcards/${subjectId}` };

    return (
      <div className="mn-fade-up" style={{ maxWidth: 520, padding: "40px 24px" }}>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

        {/* Score protagonista */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: "var(--mn-ink-3)", marginBottom: 4 }}>{session?.subjectName}</p>
          <p className="font-display" style={{ fontSize: 72, fontWeight: 700, color: "var(--mn-ink-1)", lineHeight: 1, marginBottom: 8, fontVariantNumeric: "tabular-nums" }}>
            {displayPct}<span style={{ fontSize: 32, color: "var(--mn-ink-3)" }}>%</span>
          </p>
          <p style={{ fontSize: 15, color: "var(--mn-ink-2)", marginBottom: 8 }}>{grade} · {result.correct} de {result.total} correctas</p>
          <p style={{ fontSize: 13, color: "var(--mn-ink-3)", lineHeight: 1.55, fontStyle: "italic", marginBottom: 8 }}>
            {pct >= 80
              ? "Impresionante. Ya dominas más de lo que pensabas."
              : pct >= 50
              ? "Bien. Tu tutor ya sabe dónde enfocarse contigo."
              : "Bien que lo hiciste. Ahora Mnemora sabe exactamente dónde trabajar contigo."}
          </p>
          <div style={{ height: 4, background: "var(--mn-raised)", borderRadius: 2, overflow: "hidden", maxWidth: 200, margin: "0 auto" }}>
            <div style={{ width: `${pct}%`, height: "100%", background: pct >= 70 ? "var(--mn-green)" : "var(--mn-amber)", borderRadius: 2, transition: "width 800ms var(--mn-ease)" }} />
          </div>
        </div>

        {/* Mnemora voice — card blanca */}
        <div className="mn-fade-up" style={{ background: "var(--mn-surface)", borderRadius: "var(--mn-r-xl)", padding: "22px 24px", marginBottom: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.05)", animationDelay: "80ms" }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: "var(--mn-ink-3)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>
            Lo que aprendí de esta sesión
          </p>
          <p style={{ fontSize: 15, fontWeight: 600, color: "var(--mn-ink-1)", lineHeight: 1.5, marginBottom: wrong_list.length > 0 ? 8 : 0 }}>
            {pct >= 80
              ? `Actualicé tu perfil — aumenté la confianza de ${correct_list.length} concepto${correct_list.length !== 1 ? "s" : ""} en tu historial.`
              : pct >= 60
              ? `Registré ${correct_list.length} concepto${correct_list.length !== 1 ? "s" : ""} reforzados y marqué ${wrong_list.length} para atención extra.`
              : "Detecté los conceptos que necesitan refuerzo y reorganicé tu plan de repasos."}
          </p>
          {wrong_list.length > 0 && (
            <p style={{ fontSize: 13, color: "var(--mn-ink-2)", lineHeight: 1.6 }}>
              {pct >= 60
                ? `Mañana verás ${wrong_list.slice(0, 2).map(e => e.q?.conceptName).filter(Boolean).join(" y ")} con mayor frecuencia en las flashcards.`
                : `Mañana refuerzo ${wrong_list.slice(0, 2).map(e => e.q?.conceptName).filter(Boolean).join(" y ")} con un enfoque diferente.`}
            </p>
          )}

          {result.xp && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--mn-ink-4)" }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--mn-ink-1)" }}>⚡ +{result.xp.xpEarned} XP</span>
              <span style={{ fontSize: 12, color: "var(--mn-ink-2)" }}>🔥 {result.xp.streakDays} día{result.xp.streakDays !== 1 ? "s" : ""} seguido{result.xp.streakDays !== 1 ? "s" : ""}</span>
            </div>
          )}
          {result.xp?.newAchievements.map(a => (
            <div key={a.title} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", background: "var(--mn-raised)", borderRadius: "var(--mn-r-md)", marginTop: 8 }}>
              <span style={{ fontSize: 14 }}>{a.icon}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--mn-ink-1)" }}>Logro: {a.title}</span>
            </div>
          ))}
        </div>

        {/* Concepts breakdown */}
        <div className="mn-fade-up" style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20, animationDelay: "140ms" }}>
          {correct_list.length > 0 && (
            <div>
              <p style={{ fontSize: 11, fontWeight: 600, color: "var(--mn-ink-3)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
                Dominados ({correct_list.length})
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {correct_list.map((e, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 14px", borderRadius: "var(--mn-r-lg)", background: "var(--mn-surface)", borderLeft: "3px solid var(--mn-green)", border: "1px solid var(--mn-ink-4)", borderLeftWidth: 3, borderLeftColor: "#16A34A" }}>
                    <CheckCircle size={13} color="#16A34A" style={{ flexShrink: 0 }} />
                    <p style={{ fontSize: 13, color: "var(--mn-ink-1)", fontWeight: 500 }}>{e.q?.conceptName ?? `Pregunta ${i + 1}`}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {wrong_list.length > 0 && (
            <div>
              <p style={{ fontSize: 11, fontWeight: 600, color: "var(--mn-ink-3)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
                Para repasar ({wrong_list.length})
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {wrong_list.map((e, i) => (
                  <div key={i} style={{ padding: "11px 14px", borderRadius: "var(--mn-r-lg)", background: "var(--mn-surface)", border: "1px solid var(--mn-ink-4)", borderLeft: "3px solid var(--mn-amber)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: e.q?.explanation ? 6 : 0 }}>
                      <XCircle size={13} color="var(--mn-amber)" style={{ flexShrink: 0 }} />
                      <p style={{ fontSize: 13, color: "var(--mn-ink-1)", fontWeight: 500 }}>{e.q?.conceptName ?? `Pregunta ${i + 1}`}</p>
                    </div>
                    {e.q?.explanation && (
                      <p style={{ fontSize: 12, color: "var(--mn-ink-2)", lineHeight: 1.5, paddingLeft: 21 }}>{e.q.explanation}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="mn-fade-up" style={{ display: "flex", flexDirection: "column", gap: 8, animationDelay: "200ms" }}>
          {isGuided ? (
            <button
              onClick={() => {
                try {
                  const raw = localStorage.getItem("mn-session");
                  if (raw) {
                    const s = JSON.parse(raw);
                    s.currentStep = Math.min(s.currentStep + 1, s.totalSteps - 1);
                    s.quizResult = { score: result.correct, total: result.total, pct };
                    localStorage.setItem("mn-session", JSON.stringify(s));
                    window.dispatchEvent(new Event("mn-session-update"));
                  }
                } catch {}
                router.push(`/tutor/${subjectId}?guided=1`);
              }}
              className="mn-btn-primary"
              style={{ width: "100%", justifyContent: "space-between", fontSize: 14, padding: "14px 18px" }}
            >
              <span>Hablar con el tutor</span>
              <ArrowRight size={16} />
            </button>
          ) : (
            <Link
              href={nextAction.href}
              className="mn-btn-primary"
              style={{ width: "100%", justifyContent: "space-between", fontSize: 14, padding: "14px 18px", textDecoration: "none" }}
            >
              <div>
                <p style={{ fontWeight: 600, marginBottom: 1 }}>{nextAction.label}</p>
                <p style={{ fontSize: 12, opacity: 0.75, fontWeight: 400 }}>{nextAction.desc}</p>
              </div>
              <ArrowRight size={16} style={{ flexShrink: 0 }} />
            </Link>
          )}
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={loadSession} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: 13, padding: "10px", borderRadius: "var(--mn-r-lg)", border: "1px solid var(--mn-ink-4)", background: "var(--mn-surface)", color: "var(--mn-ink-2)", cursor: "pointer", fontWeight: 600 }}>
              <RotateCcw size={13} /> Nuevo quiz
            </button>
            <Link href={`/materias/${subjectId}`} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: 13, padding: "10px", borderRadius: "var(--mn-r-lg)", border: "1px solid var(--mn-ink-4)", background: "var(--mn-surface)", color: "var(--mn-ink-2)", textDecoration: "none", fontWeight: 600 }}>
              Volver
            </Link>
          </div>
        </div>

        {submitting && <p style={{ fontSize: 12, color: "var(--mn-ink-3)", textAlign: "center", marginTop: 12 }}>Actualizando tu progreso...</p>}
      </div>
    );
  }

  /* ─── Question / Feedback ─── */
  if (!question) return (
    <div style={{ display: "flex", justifyContent: "center", padding: 48 }}>
      <div style={{ width: 22, height: 22, border: "2.5px solid var(--mn-ink-4)", borderTopColor: "var(--mn-ink-1)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
    </div>
  );
  const isCorrect = selected === question.correctId;
  const totalQ    = session!.questions.length;

  return (
    <div style={{ maxWidth: 580, padding: "24px 24px 40px" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <Link href={`/materias/${subjectId}`} style={{ color: "var(--mn-ink-3)", textDecoration: "none", display: "flex" }}>
          <ChevronLeft size={20} />
        </Link>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: "var(--mn-ink-3)", fontWeight: 500 }}>{current + 1} / {totalQ}</span>
            <span style={{ fontSize: 12, color: "var(--mn-ink-3)" }}>{session!.subjectName}</span>
          </div>
          <div style={{ height: 2, background: "var(--mn-ink-4)", borderRadius: 1, overflow: "hidden" }}>
            <div style={{ width: `${progress}%`, height: "100%", background: "var(--mn-green)", borderRadius: 1, transition: "width 300ms var(--mn-ease)" }} />
          </div>
        </div>
      </div>

      {/* Concept label */}
      <p style={{ fontSize: 11, fontWeight: 600, color: "var(--mn-ink-3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 14 }}>
        {question.conceptName}
      </p>

      {/* Question — protagonista */}
      <p className="font-display mn-fade-up" style={{ fontSize: "clamp(17px, 2.5vw, 20px)", fontWeight: 700, color: "var(--mn-ink-1)", lineHeight: 1.45, marginBottom: 28 }}>
        {question.question}
      </p>

      {/* Options */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
        {question.options.map((opt, i) => {
          const isSelected   = selected === opt.id;
          const isRight      = opt.id === question.correctId;
          const showFeedback = phase === "feedback";

          let borderColor  = "var(--mn-ink-4)";
          let bgColor      = "var(--mn-surface)";
          let labelColor   = "var(--mn-ink-1)";
          let borderLeft   = "none";

          if (showFeedback) {
            if (isRight)                  { borderLeft = "3px solid #16A34A"; labelColor = "var(--mn-ink-1)"; }
            else if (isSelected && !isRight) { borderLeft = "3px solid var(--mn-amber)"; bgColor = "var(--mn-raised)"; labelColor = "var(--mn-ink-2)"; }
            else                          { bgColor = "var(--mn-surface)"; labelColor = "var(--mn-ink-3)"; borderColor = "var(--mn-ink-4)"; }
          } else if (isSelected) {
            borderColor = "var(--mn-ink-2)";
          }

          return (
            <button
              key={opt.id}
              onClick={() => handleSelect(opt.id)}
              disabled={phase === "feedback"}
              style={{
                display: "flex", alignItems: "center", gap: 14,
                padding: "14px 16px", borderRadius: "var(--mn-r-lg)",
                border: `1px solid ${borderColor}`,
                borderLeft: showFeedback ? borderLeft : `1px solid ${borderColor}`,
                background: bgColor,
                cursor: phase === "feedback" ? "default" : "pointer",
                textAlign: "left", transition: "border-color 120ms, background 120ms", width: "100%",
              }}
              onMouseEnter={e => { if (phase === "question") (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--mn-ink-2)"; }}
              onMouseLeave={e => { if (phase === "question" && !isSelected) (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--mn-ink-4)"; }}
            >
              <span style={{ width: 22, height: 22, borderRadius: 6, background: "var(--mn-raised)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "var(--mn-ink-3)", flexShrink: 0 }}>
                {showFeedback
                  ? isRight          ? <CheckCircle size={14} color="#16A34A" />
                  : isSelected       ? <XCircle size={14} color="var(--mn-amber)" />
                  : <span>{i + 1}</span>
                  : i + 1
                }
              </span>
              <span style={{ fontSize: 14, fontWeight: 500, color: labelColor, lineHeight: 1.45 }}>{opt.text}</span>
            </button>
          );
        })}
      </div>

      {/* Feedback */}
      {phase === "feedback" && (
        <div className="mn-fade-up" style={{ paddingLeft: 14, borderLeft: `3px solid ${isCorrect ? "#16A34A" : "var(--mn-amber)"}`, marginBottom: 24 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: isCorrect ? "#16A34A" : "var(--mn-amber)", marginBottom: 6 }}>
            {isCorrect ? "Correcto" : "Incorrecto"}
          </p>
          <p style={{ fontSize: 13, color: "var(--mn-ink-2)", lineHeight: 1.6 }}>
            {question.explanation}
          </p>
          {!isCorrect && (
            <p style={{ fontSize: 12, color: "var(--mn-ink-3)", marginTop: 6 }}>
              Respuesta correcta: <strong style={{ color: "var(--mn-ink-2)" }}>{question.options.find(o => o.id === question.correctId)?.text}</strong>
            </p>
          )}
        </div>
      )}

      {/* Next */}
      {phase === "feedback" && (
        <button
          onClick={handleNext}
          disabled={submitting}
          className="mn-btn-primary"
          style={{ width: "100%", justifyContent: "center", fontSize: 14, padding: "13px" }}
        >
          {current + 1 < totalQ
            ? <>Siguiente <ArrowRight size={15} /></>
            : submitting
            ? <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Calculando...</>
            : <>Ver resultado <ArrowRight size={15} /></>
          }
        </button>
      )}

      {/* Keyboard hint */}
      <p style={{ fontSize: 11, color: "var(--mn-ink-4)", textAlign: "center", marginTop: 16 }}>
        {phase === "question"
          ? `Usa las teclas 1–${question.options.length} para responder`
          : "Presiona Enter para continuar"}
      </p>
    </div>
  );
}

export default function QuizPage() {
  return <Suspense><QuizPageInner /></Suspense>;
}
