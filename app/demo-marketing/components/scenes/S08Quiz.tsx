"use client";

import { DEMO_QUIZ } from "@/lib/demo/data";
import type { DemoFormat } from "@/lib/demo/data";

export default function S08Quiz({ elapsed, format }: { elapsed: number; format: DemoFormat }) {
  const isMobile = format === "9:16";

  // Q0: 0–4500ms (answer at 2000ms, show feedback at 2800ms)
  // Q1: 4500–8000ms (answer at 6000ms)
  // Q2: 8000–12000ms (answer at 9500ms, feedback at 10300ms)
  // Results: 12000ms+

  const qIdx  = elapsed < 4500 ? 0 : elapsed < 8000 ? 1 : elapsed < 12000 ? 2 : 3;
  const done  = qIdx === 3;

  const answered = (qIdx === 0 && elapsed >= 2000) || (qIdx === 1 && elapsed >= 6000) || (qIdx === 2 && elapsed >= 9500);
  const showFeedback = (qIdx === 0 && elapsed >= 2800) || (qIdx === 2 && elapsed >= 10300);
  const showResults = elapsed >= 12300;

  const q = DEMO_QUIZ[Math.min(qIdx, DEMO_QUIZ.length - 1)];
  const selectedId = answered ? q.userAnswer : null;
  const isCorrect  = selectedId === q.correctId;

  return (
    <div style={{ height: "100%", background: "var(--mn-canvas)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <style>{`
        @keyframes demo-fade-up{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes result-pop{0%{transform:scale(0.8);opacity:0}60%{transform:scale(1.05)}100%{transform:scale(1);opacity:1}}
      `}</style>

      <div style={{ background: "var(--mn-surface)", borderBottom: "1px solid var(--mn-ink-4)", padding: isMobile ? "12px 16px" : "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <p style={{ margin: 0, fontSize: 11, color: "var(--mn-ink-2)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>Anatomía II · Quiz</p>
          <h2 style={{ margin: 0, fontSize: isMobile ? 15 : 17, fontWeight: 800, color: "var(--mn-ink-1)" }}>Quiz de práctica</h2>
        </div>
        {!done && (
          <div style={{ display: "flex", gap: 4 }}>
            {DEMO_QUIZ.map((_, i) => (
              <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: i < qIdx ? "var(--mn-green)" : i === qIdx ? "var(--mn-green)" : "var(--mn-ink-4)", opacity: i === qIdx ? 1 : i < qIdx ? 0.7 : 0.4, transition: "background 0.3s" }} />
            ))}
          </div>
        )}
      </div>

      <div style={{ flex: 1, padding: isMobile ? "14px 16px" : "18px 24px", display: "flex", flexDirection: "column", gap: 12, overflowY: "auto" }}>

        {!done ? (
          <>
            <div style={{ background: "var(--mn-surface)", borderRadius: "var(--mn-r-xl)", padding: "16px 18px", border: "1px solid var(--mn-ink-4)", boxShadow: "var(--mn-shadow-md)" }}>
              <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 700, color: "var(--mn-ink-3)", textTransform: "uppercase" }}>Pregunta {qIdx + 1} de {DEMO_QUIZ.length}</p>
              <p style={{ margin: 0, fontSize: isMobile ? 14 : 15, fontWeight: 700, color: "var(--mn-ink-1)", lineHeight: 1.5 }}>{q.question}</p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {q.options.map(opt => {
                const isSelected = selectedId === opt.id;
                const isCorrectOpt = opt.id === q.correctId;
                let bg = "var(--mn-surface)";
                let border = "1px solid var(--mn-ink-4)";
                let textColor = "var(--mn-ink-1)";

                if (answered) {
                  if (isCorrectOpt) { bg = "var(--mn-green-light)"; border = "1px solid #BBF7D0"; textColor = "var(--mn-green-text)"; }
                  else if (isSelected && !isCorrect) { bg = "var(--mn-error-light)"; border = "1px solid #FCA5A5"; textColor = "var(--mn-error)"; }
                }

                return (
                  <div key={opt.id} style={{
                    background: bg, border, borderRadius: "var(--mn-r-lg)", padding: "12px 14px",
                    display: "flex", alignItems: "center", gap: 10, cursor: "pointer",
                    boxShadow: isSelected ? "var(--mn-shadow-sm)" : "none",
                    transition: "background 0.3s, border-color 0.3s",
                  }}>
                    <div style={{
                      width: 22, height: 22, borderRadius: "50%", flexShrink: 0, fontWeight: 700,
                      background: answered && isCorrectOpt ? "var(--mn-green)" : answered && isSelected && !isCorrect ? "var(--mn-error)" : isSelected ? "var(--mn-green)" : "var(--mn-ink-4)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 11, color: (isSelected || (answered && isCorrectOpt)) ? "#fff" : "var(--mn-ink-2)",
                      transition: "background 0.3s",
                    }}>
                      {answered && isCorrectOpt ? "✓" : answered && isSelected && !isCorrect ? "✗" : opt.id.toUpperCase()}
                    </div>
                    <span style={{ fontSize: 13, color: textColor, fontWeight: isSelected ? 600 : 400, transition: "color 0.3s" }}>{opt.text}</span>
                  </div>
                );
              })}
            </div>

            {showFeedback && (
              <div style={{
                background: isCorrect ? "var(--mn-green-light)" : "var(--mn-error-light)",
                borderRadius: "var(--mn-r-lg)", padding: "10px 14px",
                border: `1px solid ${isCorrect ? "#BBF7D0" : "#FCA5A5"}`,
                animation: "demo-fade-up 0.35s ease both",
              }}>
                <p style={{ margin: 0, fontSize: 13, color: isCorrect ? "var(--mn-green-text)" : "var(--mn-error)", fontWeight: 600 }}>
                  {isCorrect ? "✅ ¡Correcto! " : "❌ Incorrecto. "}{q.explanation}
                </p>
              </div>
            )}
          </>
        ) : (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 14, animation: "demo-fade-up 0.4s ease both" }}>
            <div style={{
              background: "var(--mn-surface)", borderRadius: "var(--mn-r-xl)", padding: "20px",
              border: "1px solid var(--mn-ink-4)", boxShadow: "var(--mn-shadow-md)", textAlign: "center",
            }}>
              <div style={{ fontSize: isMobile ? 40 : 48, marginBottom: 8 }}>📊</div>
              <h3 style={{ margin: "0 0 4px", fontSize: isMobile ? 20 : 22, fontWeight: 900, color: "var(--mn-ink-1)" }}>Quiz completado</h3>
              <p style={{ margin: "0 0 14px", fontSize: 13, color: "var(--mn-ink-2)" }}>2 de 3 respuestas correctas</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                {[["2/3", "Correctas", "var(--mn-green)"], ["1", "Repaso pendiente", "var(--mn-amber)"], ["8.4", "Nota estimada", "var(--mn-blue)"]].map(([val, label, color]) => (
                  <div key={label} style={{ background: "var(--mn-canvas)", borderRadius: "var(--mn-r-lg)", padding: "10px 8px" }}>
                    <p style={{ margin: "0 0 2px", fontSize: 18, fontWeight: 900, color }}>{val}</p>
                    <p style={{ margin: 0, fontSize: 10, color: "var(--mn-ink-2)", lineHeight: 1.3 }}>{label}</p>
                  </div>
                ))}
              </div>
            </div>

            {showResults && (
              <div style={{ background: "var(--mn-green-light)", borderRadius: "var(--mn-r-lg)", padding: "12px 16px", border: "1px solid #BBF7D0", animation: "result-pop 0.5s var(--mn-spring) both" }}>
                <p style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 700, color: "var(--mn-green-text)" }}>🎯 Mnemora agregó la pregunta del NAV a tu plan de repaso</p>
                <p style={{ margin: 0, fontSize: 12, color: "var(--mn-ink-2)" }}>El sistema de conducción eléctrica aparecerá en tu próxima sesión de flashcards.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
