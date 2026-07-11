"use client";

import { DEMO_CLASS_STUDIO } from "@/lib/demo/data";
import type { DemoFormat } from "@/lib/demo/data";

const g = (t: number, e: number) => e >= t;
const c = DEMO_CLASS_STUDIO;

export default function S05ClassStudio({ elapsed, format }: { elapsed: number; format: DemoFormat }) {
  const isMobile = format === "9:16";

  // Phase 0–2000: class list / create
  // Phase 2000–6000: recording 00:00→00:08 (accelerated) → "Clase grabada · 48 min"
  // Phase 6000–13500: processing stages (7 stages × ~1000ms)
  // Phase 13500–15000: result

  const isRecording = elapsed >= 2000 && elapsed < 6000;
  const isProcessing = elapsed >= 6000 && elapsed < 13500;
  const isDone = elapsed >= 13500;

  // Recording timer: 8 seconds of "real" time compressed into 4000ms of demo time
  const recSeconds = isRecording ? Math.min(8, Math.floor(((elapsed - 2000) / 4000) * 8)) : isDone ? 8 : 0;
  const recMins = String(Math.floor(recSeconds / 60)).padStart(2, "0");
  const recSecs = String(recSeconds % 60).padStart(2, "0");

  const stageIdx = isProcessing
    ? Math.min(c.stages.length - 1, Math.floor((elapsed - 6000) / 1071))
    : isDone ? c.stages.length - 1 : -1;

  return (
    <div style={{ height: "100%", background: "var(--mn-canvas)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <style>{`
        @keyframes demo-fade-up{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes demo-spin{to{transform:rotate(360deg)}}
        @keyframes rec-pulse{0%,100%{opacity:1}50%{opacity:0.3}}
      `}</style>

      {/* Header */}
      <div style={{ background: "var(--mn-surface)", borderBottom: "1px solid var(--mn-ink-4)", padding: isMobile ? "14px 16px" : "16px 24px" }}>
        <p style={{ margin: "0 0 2px", fontSize: 11, color: "var(--mn-ink-2)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>AI Class Studio</p>
        <h2 style={{ margin: 0, fontSize: isMobile ? 16 : 18, fontWeight: 800, color: "var(--mn-ink-1)" }}>Mis clases</h2>
      </div>

      <div style={{ flex: 1, padding: isMobile ? "14px 16px" : "18px 24px", display: "flex", flexDirection: "column", gap: 12, overflow: "hidden" }}>

        {/* New class card */}
        <div style={{
          background: "var(--mn-surface)", borderRadius: "var(--mn-r-xl)", padding: "14px 16px",
          border: "1px solid var(--mn-ink-4)", boxShadow: "var(--mn-shadow-sm)",
          opacity: g(400, elapsed) ? 1 : 0, animation: g(400, elapsed) ? "demo-fade-up 0.5s ease both" : "none",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: "var(--mn-r-md)", background: "var(--mn-green-light)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 18 }}>🎙️</span>
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "var(--mn-ink-1)" }}>{c.title}</p>
              <p style={{ margin: 0, fontSize: 11, color: "var(--mn-ink-2)" }}>{c.subject}</p>
            </div>
            <div style={{
              background: g(1200, elapsed) ? "var(--mn-green)" : "var(--mn-ink-4)",
              borderRadius: "var(--mn-r-md)", padding: "7px 14px",
              transition: "background 0.4s",
            }}>
              <span style={{ fontSize: 12, color: g(1200, elapsed) ? "#fff" : "var(--mn-ink-2)", fontWeight: 700 }}>
                {isRecording ? "Grabando…" : "Grabar clase"}
              </span>
            </div>
          </div>
        </div>

        {/* Recording indicator */}
        {isRecording && (
          <div style={{
            background: "linear-gradient(135deg, #1B0A0A, #2D1515)", borderRadius: "var(--mn-r-xl)", padding: "20px",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
            animation: "demo-fade-up 0.4s ease both",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#EF4444", animation: "rec-pulse 1s ease infinite" }} />
              <span style={{ fontSize: 13, color: "#FCA5A5", fontWeight: 700 }}>REC</span>
            </div>
            <div style={{ fontSize: isMobile ? 40 : 52, fontWeight: 900, color: "#FFFFFF", fontVariantNumeric: "tabular-nums", letterSpacing: "0.04em" }}>
              {recMins}:{recSecs}
            </div>
            <p style={{ margin: 0, fontSize: 12, color: "#FCA5A5" }}>Grabando audio de la clase…</p>
          </div>
        )}

        {/* "Clase grabada" badge */}
        {!isRecording && elapsed >= 6000 && (
          <div style={{
            background: "var(--mn-green-light)", borderRadius: "var(--mn-r-lg)", padding: "10px 14px",
            border: "1px solid #BBF7D0",
            display: "flex", alignItems: "center", gap: 8,
            animation: "demo-fade-up 0.4s ease both",
          }}>
            <span style={{ fontSize: 16 }}>✅</span>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "var(--mn-green)" }}>
              Clase grabada · {c.recordedDuration}
            </p>
          </div>
        )}

        {/* Processing stages */}
        {isProcessing && (
          <div style={{
            background: "var(--mn-surface)", borderRadius: "var(--mn-r-xl)", padding: "16px 18px",
            border: "1px solid var(--mn-ink-4)", boxShadow: "var(--mn-shadow-md)",
            display: "flex", flexDirection: "column", gap: 9,
            animation: "demo-fade-up 0.4s ease both",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <div style={{ width: 16, height: 16, borderRadius: "50%", border: "2px solid var(--mn-green)", borderTopColor: "transparent", animation: "demo-spin 0.8s linear infinite", flexShrink: 0 }} />
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "var(--mn-ink-1)" }}>Procesando la clase…</p>
            </div>
            {c.stages.map((stage, i) => (
              <div key={stage} style={{ display: "flex", alignItems: "center", gap: 8, opacity: i <= stageIdx ? 1 : 0.25, transition: "opacity 0.3s" }}>
                <div style={{ width: 18, height: 18, borderRadius: "50%", flexShrink: 0, background: i < stageIdx ? "var(--mn-green)" : "var(--mn-ink-4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {i < stageIdx
                    ? <span style={{ fontSize: 10, color: "#fff" }}>✓</span>
                    : i === stageIdx
                    ? <div style={{ width: 6, height: 6, borderRadius: "50%", border: "1.5px solid var(--mn-green)", borderTopColor: "transparent", animation: "demo-spin 0.7s linear infinite" }} />
                    : null}
                </div>
                <span style={{ fontSize: 12, color: i <= stageIdx ? "var(--mn-ink-1)" : "var(--mn-ink-3)", fontWeight: i === stageIdx ? 600 : 400 }}>{stage}</span>
              </div>
            ))}
          </div>
        )}

        {/* Result */}
        {isDone && (
          <div style={{
            background: "var(--mn-surface)", borderRadius: "var(--mn-r-xl)", padding: "16px 18px",
            border: "1px solid #BBF7D0", boxShadow: "var(--mn-shadow-md)",
            animation: "demo-fade-up 0.5s ease both",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <div style={{ width: 26, height: 26, borderRadius: "50%", background: "var(--mn-green)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: 13, color: "#fff" }}>✓</span>
              </div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: "var(--mn-ink-1)" }}>Clase procesada exitosamente</p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(3, 1fr)" : "repeat(6, 1fr)", gap: 8 }}>
              {[
                { val: c.result.summary, label: "Resumen", icon: "📝" },
                { val: c.result.notes, label: "Apuntes", icon: "✏️" },
                { val: c.result.flashcards, label: "Flashcards", icon: "🃏" },
                { val: c.result.quizQuestions, label: "Quiz", icon: "❓" },
                { val: c.result.tasks, label: "Tareas", icon: "📋" },
                { val: c.result.examMentions, label: "Examen", icon: "⚠️" },
              ].map(r => (
                <div key={r.label} style={{ background: "var(--mn-canvas)", borderRadius: "var(--mn-r-md)", padding: "8px 6px", textAlign: "center" }}>
                  <p style={{ margin: "0 0 2px", fontSize: 16 }}>{r.icon}</p>
                  <p style={{ margin: "0 0 1px", fontSize: isMobile ? 18 : 20, fontWeight: 900, color: "var(--mn-green)" }}>{r.val}</p>
                  <p style={{ margin: 0, fontSize: 10, color: "var(--mn-ink-2)" }}>{r.label}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Memo anchor */}
      <div id="memo-anchor-class-studio" style={{ position: "absolute", top: isMobile ? 80 : 60, right: isMobile ? 12 : 24, width: 48, height: 48 }} />
    </div>
  );
}
