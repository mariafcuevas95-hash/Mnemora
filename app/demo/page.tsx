"use client";

import { useState, useEffect, useRef, useCallback, type ReactElement } from "react";
import Link from "next/link";

// ─── Demo data ─────────────────────────────────────────────────────────────
const SUBJECTS = [
  { name: "Biología", emoji: "🧬", mastery: 78, due: 5, color: "#1B3F2F" },
  { name: "Cálculo", emoji: "📐", mastery: 61, due: 3, color: "#2D5A3D" },
  { name: "Historia", emoji: "📜", mastery: 45, due: 8, color: "#3B7A57" },
];

const FLASHCARDS = [
  {
    front: "¿Qué es la mitosis?",
    back: "División celular que produce dos células hijas genéticamente idénticas a la célula madre.",
    subject: "Biología",
    level: "Dominado",
  },
  {
    front: "Derivada de xⁿ",
    back: "n · xⁿ⁻¹ — Regla de la potencia del cálculo diferencial.",
    subject: "Cálculo",
    level: "Aprendiendo",
  },
];

const TUTOR_MESSAGES = [
  { role: "user", text: "¿Puedes explicarme la fotosíntesis?" },
  {
    role: "ai",
    text: "¡Claro! La fotosíntesis es el proceso por el cual las plantas convierten luz solar, agua y CO₂ en glucosa y oxígeno. La ecuación simplificada es:\n\n6CO₂ + 6H₂O + luz → C₆H₁₂O₆ + 6O₂\n\n¿Quieres que profundice en alguna fase?",
  },
];

const PROGRESS_SUBJECTS = [
  { name: "Biología", pct: 78, color: "#1B3F2F" },
  { name: "Cálculo", pct: 61, color: "#2D5A3D" },
  { name: "Historia", pct: 45, color: "#3B7A57" },
];

const CALENDAR_EVENTS = [
  { date: "Lun 14", label: "Repasos: 5 conceptos", type: "review" },
  { date: "Mié 16", label: "Examen Biología", type: "exam" },
  { date: "Vie 18", label: "Entrega — Historia", type: "task" },
];

// ─── Tour steps ────────────────────────────────────────────────────────────
const STEPS = [
  { id: "dashboard", duration: 6000 },
  { id: "flashcard", duration: 8000 },
  { id: "tutor", duration: 9000 },
  { id: "progress", duration: 7000 },
  { id: "calendar", duration: 6000 },
  { id: "cta", duration: 5000 },
];
const TOTAL_MS = STEPS.reduce((s, x) => s + x.duration, 0);

// ─── Screens ───────────────────────────────────────────────────────────────

function ScreenDashboard({ elapsed }: { elapsed: number }) {
  const show = (t: number) => elapsed >= t;
  return (
    <div style={{ padding: "20px 18px", display: "flex", flexDirection: "column", gap: 14, height: "100%" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <p style={{ margin: 0, fontSize: 11, color: "#9E9389", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Buenos días</p>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#1A1612" }}>Sofia 👋</h2>
        </div>
        <div style={{
          display: "flex", alignItems: "center", gap: 5,
          background: "#FEF3C7", borderRadius: 20, padding: "6px 12px",
          opacity: show(300) ? 1 : 0, transition: "opacity 0.4s",
        }}>
          <span style={{ fontSize: 16 }}>🔥</span>
          <span style={{ fontSize: 13, fontWeight: 800, color: "#92400E" }}>12 días</span>
        </div>
      </div>

      {/* Briefing card */}
      <div style={{
        background: "linear-gradient(135deg, #1B3F2F 0%, #2D5A3D 100%)",
        borderRadius: 14, padding: "14px 16px",
        opacity: show(600) ? 1 : 0, transform: show(600) ? "translateY(0)" : "translateY(8px)",
        transition: "opacity 0.5s, transform 0.5s",
      }}>
        <p style={{ margin: "0 0 4px", fontSize: 11, color: "#A7C4B0", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Tu plan de hoy</p>
        <p style={{ margin: "0 0 10px", fontSize: 14, fontWeight: 700, color: "#FFFFFF", lineHeight: 1.4 }}>
          5 repasos pendientes en Biología — 8 min estimados
        </p>
        <div style={{ display: "inline-block", background: "rgba(255,255,255,0.15)", borderRadius: 8, padding: "5px 12px" }}>
          <span style={{ fontSize: 12, color: "#FFFFFF", fontWeight: 600 }}>Empezar repasos →</span>
        </div>
      </div>

      {/* Subjects */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {SUBJECTS.map((s, i) => (
          <div key={s.name} style={{
            background: "#FFFFFF", borderRadius: 12, padding: "11px 14px",
            display: "flex", alignItems: "center", gap: 10,
            boxShadow: "0 1px 6px rgba(0,0,0,0.06)",
            opacity: show(900 + i * 250) ? 1 : 0,
            transform: show(900 + i * 250) ? "translateX(0)" : "translateX(-12px)",
            transition: "opacity 0.4s, transform 0.4s",
          }}>
            <span style={{ fontSize: 22 }}>{s.emoji}</span>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#1A1612" }}>{s.name}</p>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                <div style={{ flex: 1, height: 4, background: "#EDE9E2", borderRadius: 4, overflow: "hidden" }}>
                  <div style={{
                    height: "100%", background: s.color, borderRadius: 4,
                    width: show(1200 + i * 250) ? `${s.mastery}%` : "0%",
                    transition: "width 0.8s ease",
                  }} />
                </div>
                <span style={{ fontSize: 11, color: "#9E9389", fontWeight: 600 }}>{s.mastery}%</span>
              </div>
            </div>
            <div style={{ background: "#FEF3C7", borderRadius: 8, padding: "3px 8px" }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#92400E" }}>{s.due} hoy</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ScreenFlashcard({ elapsed }: { elapsed: number }) {
  const flipped = elapsed >= 3500;
  const card = FLASHCARDS[0];
  return (
    <div style={{ padding: "20px 18px", display: "flex", flexDirection: "column", gap: 16, height: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <p style={{ margin: 0, fontSize: 11, color: "#9E9389", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>Repaso espaciado</p>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "#1A1612" }}>Biología 🧬</h2>
        </div>
        <div style={{ fontSize: 12, color: "#9E9389", fontWeight: 600 }}>3 / 5</div>
      </div>

      {/* Card flip */}
      <div style={{ perspective: 1000, flex: 1, cursor: "pointer" }}>
        <div style={{
          position: "relative", width: "100%", height: "100%",
          transformStyle: "preserve-3d",
          transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
          transition: "transform 0.7s cubic-bezier(0.4,0,0.2,1)",
        }}>
          {/* Front */}
          <div style={{
            position: "absolute", inset: 0, backfaceVisibility: "hidden",
            background: "linear-gradient(135deg, #1B3F2F 0%, #2D5A3D 100%)",
            borderRadius: 18, display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", padding: "24px 20px", gap: 12,
          }}>
            <span style={{ fontSize: 36 }}>🧬</span>
            <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#FFFFFF", textAlign: "center", lineHeight: 1.3 }}>
              {card.front}
            </p>
            <p style={{ margin: 0, fontSize: 12, color: "#A7C4B0" }}>Toca para ver la respuesta</p>
          </div>
          {/* Back */}
          <div style={{
            position: "absolute", inset: 0, backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
            background: "#FFFFFF", borderRadius: 18, padding: "24px 20px",
            display: "flex", flexDirection: "column", justifyContent: "center", gap: 12,
            boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
          }}>
            <p style={{ margin: 0, fontSize: 11, color: "#1B3F2F", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>Respuesta</p>
            <p style={{ margin: 0, fontSize: 15, color: "#1A1612", lineHeight: 1.6, fontWeight: 500 }}>
              {card.back}
            </p>
          </div>
        </div>
      </div>

      {/* Rating buttons — appear after flip */}
      {flipped && (
        <div style={{
          display: "flex", gap: 8,
          opacity: elapsed >= 4200 ? 1 : 0, transition: "opacity 0.4s",
        }}>
          {[["😕", "Difícil", "#FEE2E2", "#DC2626"], ["🤔", "Regular", "#FEF3C7", "#D97706"], ["✅", "Fácil", "#D1FAE5", "#059669"]].map(([emoji, label, bg, color]) => (
            <button key={label} style={{
              flex: 1, padding: "10px 4px", borderRadius: 12, border: "none",
              background: bg, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, cursor: "pointer",
            }}>
              <span style={{ fontSize: 18 }}>{emoji}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color }}>{label}</span>
            </button>
          ))}
        </div>
      )}

      {/* XP badge */}
      {elapsed >= 5500 && (
        <div style={{
          background: "linear-gradient(135deg, #1B3F2F, #2D5A3D)", borderRadius: 12,
          padding: "10px 14px", display: "flex", alignItems: "center", gap: 8,
          animation: "slideUp 0.4s ease",
        }}>
          <span style={{ fontSize: 20 }}>⚡</span>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#FFFFFF" }}>+15 XP — ¡Bien hecho! Siguiente repaso en 3 días.</p>
        </div>
      )}
    </div>
  );
}

function ScreenTutor({ elapsed }: { elapsed: number }) {
  const aiText = TUTOR_MESSAGES[1].text;
  const charsToShow = Math.min(
    aiText.length,
    Math.floor(Math.max(0, elapsed - 2500) / 18)
  );
  return (
    <div style={{ padding: "0", display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Header */}
      <div style={{
        padding: "16px 18px", background: "linear-gradient(135deg, #1B3F2F, #2D5A3D)",
        display: "flex", alignItems: "center", gap: 10,
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: "50%",
          background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <span style={{ fontSize: 18 }}>🧠</span>
        </div>
        <div>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: "#FFFFFF" }}>Tutor Mnemora</p>
          <p style={{ margin: 0, fontSize: 11, color: "#A7C4B0" }}>Especializado en tu temario</p>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 4 }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#4ADE80" }} />
          <span style={{ fontSize: 11, color: "#A7C4B0" }}>En línea</span>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, padding: "16px 16px", display: "flex", flexDirection: "column", gap: 12, overflow: "hidden" }}>
        {/* User message */}
        <div style={{
          display: "flex", justifyContent: "flex-end",
          opacity: elapsed >= 400 ? 1 : 0, transition: "opacity 0.4s",
        }}>
          <div style={{
            background: "#1B3F2F", borderRadius: "16px 16px 4px 16px",
            padding: "10px 14px", maxWidth: "75%",
          }}>
            <p style={{ margin: 0, fontSize: 13, color: "#FFFFFF", lineHeight: 1.5 }}>
              {TUTOR_MESSAGES[0].text}
            </p>
          </div>
        </div>

        {/* AI typing indicator */}
        {elapsed >= 1200 && elapsed < 2500 && (
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#F7F4EF", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 16 }}>🧠</span>
            </div>
            <div style={{ background: "#F7F4EF", borderRadius: "16px 16px 16px 4px", padding: "10px 14px" }}>
              <div style={{ display: "flex", gap: 4 }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{
                    width: 7, height: 7, borderRadius: "50%", background: "#9E9389",
                    animation: `bounce 1s ease ${i * 0.2}s infinite`,
                  }} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* AI response streaming */}
        {elapsed >= 2500 && (
          <div style={{
            display: "flex", gap: 6, alignItems: "flex-start",
            opacity: 1, animation: "slideUp 0.3s ease",
          }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#F7F4EF", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <span style={{ fontSize: 16 }}>🧠</span>
            </div>
            <div style={{ background: "#F7F4EF", borderRadius: "16px 16px 16px 4px", padding: "10px 14px", maxWidth: "80%" }}>
              <p style={{ margin: 0, fontSize: 12, color: "#1A1612", lineHeight: 1.6, whiteSpace: "pre-line" }}>
                {aiText.slice(0, charsToShow)}
                {charsToShow < aiText.length && <span style={{ borderRight: "2px solid #1B3F2F", animation: "blink 0.8s step-end infinite" }}>&nbsp;</span>}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Input bar */}
      <div style={{ padding: "10px 14px", borderTop: "1px solid #EDE9E2", display: "flex", gap: 8, alignItems: "center" }}>
        <div style={{ flex: 1, background: "#F7F4EF", borderRadius: 20, padding: "9px 14px" }}>
          <p style={{ margin: 0, fontSize: 12, color: "#9E9389" }}>Pregunta algo sobre tu materia…</p>
        </div>
        <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#1B3F2F", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: 14 }}>↑</span>
        </div>
      </div>
    </div>
  );
}

function ScreenProgress({ elapsed }: { elapsed: number }) {
  const show = (t: number) => elapsed >= t;
  return (
    <div style={{ padding: "20px 18px", display: "flex", flexDirection: "column", gap: 16, height: "100%" }}>
      <div>
        <p style={{ margin: 0, fontSize: 11, color: "#9E9389", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>Tu progreso</p>
        <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "#1A1612" }}>Esta semana 📈</h2>
      </div>

      {/* Stats row */}
      <div style={{ display: "flex", gap: 8 }}>
        {[["128", "Conceptos\naprendidos", "🧠"], ["12", "Días de\nracha", "🔥"], ["3.2h", "Tiempo\nestudioado", "⏱"]].map(([val, label, icon], i) => (
          <div key={val} style={{
            flex: 1, background: "#FFFFFF", borderRadius: 12, padding: "12px 8px",
            textAlign: "center", boxShadow: "0 1px 6px rgba(0,0,0,0.06)",
            opacity: show(300 + i * 200) ? 1 : 0, transform: show(300 + i * 200) ? "scale(1)" : "scale(0.85)",
            transition: "opacity 0.4s, transform 0.4s",
          }}>
            <p style={{ margin: "0 0 4px", fontSize: 18 }}>{icon}</p>
            <p style={{ margin: 0, fontSize: 18, fontWeight: 900, color: "#1A1612" }}>{val}</p>
            <p style={{ margin: 0, fontSize: 10, color: "#9E9389", whiteSpace: "pre-line", lineHeight: 1.3 }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Mastery bars */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#1A1612" }}>Dominio por materia</p>
        {PROGRESS_SUBJECTS.map((s, i) => (
          <div key={s.name} style={{ opacity: show(800 + i * 200) ? 1 : 0, transition: "opacity 0.4s" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#1A1612" }}>{s.name}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: s.color }}>{s.pct}%</span>
            </div>
            <div style={{ height: 8, background: "#EDE9E2", borderRadius: 8, overflow: "hidden" }}>
              <div style={{
                height: "100%", background: `linear-gradient(90deg, ${s.color}, ${s.color}99)`,
                borderRadius: 8,
                width: show(1000 + i * 200) ? `${s.pct}%` : "0%",
                transition: "width 1s ease",
              }} />
            </div>
          </div>
        ))}
      </div>

      {/* Prediction card */}
      <div style={{
        background: "#F0FDF4", borderRadius: 12, padding: "12px 14px",
        border: "1px solid #BBF7D0",
        opacity: show(2000) ? 1 : 0, transform: show(2000) ? "translateY(0)" : "translateY(8px)",
        transition: "opacity 0.5s, transform 0.5s",
      }}>
        <p style={{ margin: "0 0 2px", fontSize: 11, color: "#065F46", fontWeight: 700, textTransform: "uppercase" }}>Predicción IA</p>
        <p style={{ margin: 0, fontSize: 13, color: "#065F46", lineHeight: 1.5 }}>
          A este ritmo, aprobarás Biología con <strong>87/100</strong> en el examen del 16.
        </p>
      </div>
    </div>
  );
}

function ScreenCalendar({ elapsed }: { elapsed: number }) {
  const show = (t: number) => elapsed >= t;
  const days = ["L", "M", "X", "J", "V", "S", "D"];
  const activeDay = 1;
  return (
    <div style={{ padding: "20px 18px", display: "flex", flexDirection: "column", gap: 14, height: "100%" }}>
      <div>
        <p style={{ margin: 0, fontSize: 11, color: "#9E9389", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>Planificador</p>
        <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "#1A1612" }}>Semana del 14 al 20 📅</h2>
      </div>

      {/* Day pills */}
      <div style={{ display: "flex", gap: 4 }}>
        {days.map((d, i) => (
          <div key={d} style={{
            flex: 1, padding: "8px 2px", borderRadius: 10, textAlign: "center",
            background: i === activeDay ? "#1B3F2F" : i === 4 ? "#FEF3C7" : "#F7F4EF",
            opacity: show(300 + i * 80) ? 1 : 0, transition: "opacity 0.3s",
          }}>
            <p style={{ margin: 0, fontSize: 10, fontWeight: 600, color: i === activeDay ? "#A7C4B0" : "#9E9389" }}>{d}</p>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: i === activeDay ? "#FFFFFF" : i === 4 ? "#92400E" : "#1A1612" }}>{13 + i}</p>
          </div>
        ))}
      </div>

      {/* Events */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {CALENDAR_EVENTS.map((ev, i) => (
          <div key={ev.label} style={{
            background: "#FFFFFF", borderRadius: 12, padding: "11px 14px",
            display: "flex", alignItems: "center", gap: 12,
            boxShadow: "0 1px 6px rgba(0,0,0,0.06)",
            borderLeft: `4px solid ${ev.type === "exam" ? "#DC2626" : ev.type === "review" ? "#1B3F2F" : "#D97706"}`,
            opacity: show(700 + i * 250) ? 1 : 0,
            transform: show(700 + i * 250) ? "translateX(0)" : "translateX(-10px)",
            transition: "opacity 0.4s, transform 0.4s",
          }}>
            <div>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: "#9E9389" }}>{ev.date}</p>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#1A1612" }}>{ev.label}</p>
            </div>
            {ev.type === "exam" && (
              <div style={{ marginLeft: "auto", background: "#FEE2E2", borderRadius: 6, padding: "2px 8px" }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#DC2626" }}>En 2 días</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* AI plan banner */}
      <div style={{
        marginTop: "auto",
        background: "linear-gradient(135deg, #1B3F2F, #2D5A3D)", borderRadius: 12, padding: "12px 14px",
        opacity: show(2000) ? 1 : 0, transition: "opacity 0.5s",
      }}>
        <p style={{ margin: 0, fontSize: 12, color: "#FFFFFF", lineHeight: 1.5 }}>
          🤖 <strong>Mnemora ajustó tu plan:</strong> agregó 2 repasos extra antes del examen del miércoles.
        </p>
      </div>
    </div>
  );
}

function ScreenCTA({ elapsed }: { elapsed: number }) {
  const show = (t: number) => elapsed >= t;
  return (
    <div style={{
      height: "100%", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", padding: "32px 24px",
      background: "linear-gradient(160deg, #1B3F2F 0%, #0F2419 100%)",
      textAlign: "center", gap: 16,
    }}>
      <div style={{
        width: 64, height: 64, borderRadius: "50%",
        background: "rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center",
        opacity: show(200) ? 1 : 0, transform: show(200) ? "scale(1)" : "scale(0.7)",
        transition: "opacity 0.5s, transform 0.5s",
      }}>
        <span style={{ fontSize: 32 }}>🧠</span>
      </div>
      <div style={{ opacity: show(600) ? 1 : 0, transition: "opacity 0.5s" }}>
        <h2 style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 900, color: "#FFFFFF", lineHeight: 1.3 }}>
          Tu tutor estudia<br />mientras duermes.
        </h2>
        <p style={{ margin: 0, fontSize: 14, color: "#A7C4B0", lineHeight: 1.6 }}>
          Sube tus apuntes. Mnemora genera flashcards,<br />mapas mentales y tu plan de examen.
        </p>
      </div>
      <div style={{
        display: "flex", flexDirection: "column", gap: 8, width: "100%",
        opacity: show(1200) ? 1 : 0, transform: show(1200) ? "translateY(0)" : "translateY(12px)",
        transition: "opacity 0.5s, transform 0.5s",
      }}>
        <div style={{
          background: "#FFFFFF", borderRadius: 14, padding: "14px", fontWeight: 800,
          fontSize: 15, color: "#1B3F2F", cursor: "pointer",
        }}>
          Empieza gratis →
        </div>
        <p style={{ margin: 0, fontSize: 11, color: "#6B8F78" }}>Sin tarjeta de crédito · Cancela cuando quieras</p>
      </div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────

export default function DemoPage() {
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0); // ms within current step
  const [stepIdx, setStepIdx] = useState(0);
  const [totalElapsed, setTotalElapsed] = useState(0);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);
  const stepStartRef = useRef<number>(0);

  const reset = useCallback(() => {
    setPlaying(false);
    setElapsed(0);
    setStepIdx(0);
    setTotalElapsed(0);
    startRef.current = null;
    stepStartRef.current = 0;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  }, []);

  const tick = useCallback((ts: number) => {
    if (!startRef.current) startRef.current = ts;
    const total = ts - startRef.current;
    setTotalElapsed(total);

    if (total >= TOTAL_MS) {
      reset();
      return;
    }

    let acc = 0;
    let si = 0;
    for (let i = 0; i < STEPS.length; i++) {
      if (total < acc + STEPS[i].duration) { si = i; break; }
      acc += STEPS[i].duration;
    }

    if (si !== stepStartRef.current || si === 0) {
      // detect step change
    }

    setStepIdx(si);
    const stepOffset = STEPS.slice(0, si).reduce((s, x) => s + x.duration, 0);
    setElapsed(total - stepOffset);

    rafRef.current = requestAnimationFrame(tick);
  }, [reset]);

  const play = () => {
    setPlaying(true);
    setElapsed(0);
    setStepIdx(0);
    setTotalElapsed(0);
    startRef.current = null;
    rafRef.current = requestAnimationFrame(tick);
  };

  useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); }, []);

  const progressPct = (totalElapsed / TOTAL_MS) * 100;

  const screens: Record<string, ReactElement> = {
    dashboard: <ScreenDashboard elapsed={elapsed} />,
    flashcard: <ScreenFlashcard elapsed={elapsed} />,
    tutor: <ScreenTutor elapsed={elapsed} />,
    progress: <ScreenProgress elapsed={elapsed} />,
    calendar: <ScreenCalendar elapsed={elapsed} />,
    cta: <ScreenCTA elapsed={elapsed} />,
  };

  const stepLabels: Record<string, string> = {
    dashboard: "Dashboard",
    flashcard: "Repasos",
    tutor: "Tutor IA",
    progress: "Progreso",
    calendar: "Calendario",
    cta: "",
  };

  const currentStep = STEPS[stepIdx]?.id ?? "dashboard";

  return (
    <>
      <style>{`
        body { margin: 0; background: #0F1A14; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
        @keyframes bounce { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-5px)} }
        @keyframes slideUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        * { box-sizing: border-box; }
      `}</style>

      <div style={{
        minHeight: "100vh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", padding: "32px 16px",
        background: "radial-gradient(ellipse at 50% 0%, #1B3F2F22 0%, #0F1A14 60%)",
      }}>
        {/* Headline */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <p style={{ margin: "0 0 6px", fontSize: 12, color: "#4ADE80", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>
            Mnemora — Demo
          </p>
          <h1 style={{ margin: "0 0 8px", fontSize: 28, fontWeight: 900, color: "#FFFFFF", lineHeight: 1.2 }}>
            Tu tutor académico<br />trabaja mientras duermes.
          </h1>
          <p style={{ margin: 0, fontSize: 14, color: "#6B8F78" }}>
            Recorrido de 40 segundos · optimizado para grabar ads
          </p>
        </div>

        {/* Phone frame */}
        <div style={{
          position: "relative",
          width: 320, height: 620,
          background: "#1A1612",
          borderRadius: 44,
          boxShadow: "0 0 0 2px #2A2420, 0 0 0 4px #1A1612, 0 32px 80px rgba(0,0,0,0.6), inset 0 0 0 1px rgba(255,255,255,0.08)",
          overflow: "hidden",
        }}>
          {/* Notch */}
          <div style={{
            position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)",
            width: 120, height: 30, background: "#1A1612",
            borderRadius: "0 0 20px 20px", zIndex: 10,
          }} />

          {/* Screen */}
          <div style={{
            position: "absolute", inset: 0,
            background: "#F7F4EF",
            borderRadius: 44,
            overflow: "hidden",
            paddingTop: 30,
          }}>
            {/* Progress bar */}
            {playing && (
              <div style={{ position: "absolute", top: 30, left: 0, right: 0, height: 3, zIndex: 20, background: "#EDE9E2" }}>
                <div style={{
                  height: "100%", background: "linear-gradient(90deg, #1B3F2F, #4ADE80)",
                  width: `${progressPct}%`, transition: "width 0.1s linear",
                }} />
              </div>
            )}

            {/* Step label pill */}
            {playing && stepLabels[currentStep] && (
              <div style={{
                position: "absolute", top: 38, left: "50%", transform: "translateX(-50%)",
                background: "rgba(27,63,47,0.9)", borderRadius: 20, padding: "3px 12px", zIndex: 20,
                backdropFilter: "blur(4px)",
              }}>
                <span style={{ fontSize: 11, color: "#A7C4B0", fontWeight: 600 }}>{stepLabels[currentStep]}</span>
              </div>
            )}

            {/* Screen content */}
            <div style={{
              position: "absolute", inset: 0, paddingTop: 30,
              overflow: "hidden",
            }}>
              {playing ? screens[currentStep] : (
                <div style={{
                  height: "100%", display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center", gap: 12, padding: 24,
                }}>
                  <span style={{ fontSize: 48 }}>🧠</span>
                  <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#1A1612", textAlign: "center" }}>
                    Presiona reproducir<br />para ver la demo
                  </p>
                  <p style={{ margin: 0, fontSize: 12, color: "#9E9389", textAlign: "center" }}>
                    Recorrido de 40 segundos
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Bottom bar */}
          <div style={{
            position: "absolute", bottom: 8, left: "50%", transform: "translateX(-50%)",
            width: 100, height: 4, background: "rgba(255,255,255,0.25)", borderRadius: 4,
          }} />
        </div>

        {/* Controls */}
        <div style={{ marginTop: 28, display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <button
            onClick={playing ? reset : play}
            style={{
              display: "flex", alignItems: "center", gap: 10,
              background: playing ? "rgba(255,255,255,0.08)" : "linear-gradient(135deg, #1B3F2F, #2D5A3D)",
              border: playing ? "1px solid rgba(255,255,255,0.15)" : "none",
              borderRadius: 50, padding: "14px 28px", cursor: "pointer",
              color: "#FFFFFF", fontSize: 15, fontWeight: 700,
              boxShadow: playing ? "none" : "0 8px 32px rgba(27,63,47,0.4)",
              transition: "all 0.3s",
            }}
          >
            <span style={{ fontSize: 18 }}>{playing ? "⏹" : "▶"}</span>
            {playing ? "Detener recorrido" : "Reproducir recorrido"}
          </button>

          {/* Step dots */}
          {playing && (
            <div style={{ display: "flex", gap: 6 }}>
              {STEPS.map((s, i) => (
                <div key={s.id} style={{
                  width: i === stepIdx ? 20 : 6, height: 6,
                  borderRadius: 6, transition: "width 0.3s, background 0.3s",
                  background: i === stepIdx ? "#4ADE80" : i < stepIdx ? "#2D5A3D" : "rgba(255,255,255,0.15)",
                }} />
              ))}
            </div>
          )}

          <Link
            href="/registro"
            style={{
              fontSize: 13, color: "#4ADE80", textDecoration: "none", fontWeight: 600,
              opacity: 0.8,
            }}
          >
            Crear cuenta gratis →
          </Link>
        </div>
      </div>
    </>
  );
}
