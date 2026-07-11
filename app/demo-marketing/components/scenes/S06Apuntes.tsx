"use client";

import { DEMO_CLASS_STUDIO } from "@/lib/demo/data";
import type { DemoFormat } from "@/lib/demo/data";

const g = (t: number, e: number) => e >= t;

const NOTE_COLORS: Record<string, { bg: string; accent: string; label: string }> = {
  title:   { bg: "transparent", accent: "var(--mn-green)", label: "" },
  concept: { bg: "var(--mn-canvas)", accent: "var(--mn-green)", label: "Concepto" },
  formula: { bg: "#EFF6FF", accent: "var(--mn-blue)", label: "Fórmula" },
  task:    { bg: "var(--mn-amber-light)", accent: "var(--mn-amber)", label: "Tarea" },
  exam:    { bg: "var(--mn-error-light)", accent: "var(--mn-error)", label: "Examen" },
};

export default function S06Apuntes({ elapsed, format }: { elapsed: number; format: DemoFormat }) {
  const isMobile = format === "9:16";
  const notes = DEMO_CLASS_STUDIO.notes;

  // Show summary tab after 5000ms
  const showSummary = elapsed >= 5000;

  // Notes appear one by one, 700ms apart
  const visibleNotes = Math.min(notes.length, Math.floor(elapsed / 700) + 1);

  return (
    <div style={{ height: "100%", background: "var(--mn-canvas)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <style>{`@keyframes demo-fade-up{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* Header */}
      <div style={{ background: "var(--mn-surface)", borderBottom: "1px solid var(--mn-ink-4)", padding: isMobile ? "12px 16px 0" : "14px 24px 0" }}>
        <p style={{ margin: "0 0 2px", fontSize: 11, color: "var(--mn-ink-2)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Sistema cardiovascular — Clase 4
        </p>
        <div style={{ display: "flex", gap: 0, marginTop: 8 }}>
          {["Apuntes", "Resumen ejecutivo"].map((tab, i) => (
            <div key={tab} style={{
              padding: isMobile ? "8px 12px" : "9px 16px", fontSize: 13, fontWeight: 600,
              color: (showSummary ? i === 1 : i === 0) ? "var(--mn-green)" : "var(--mn-ink-2)",
              borderBottom: (showSummary ? i === 1 : i === 0) ? "2px solid var(--mn-green)" : "2px solid transparent",
              cursor: "pointer", transition: "color 0.3s, border-color 0.3s",
            }}>{tab}</div>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, padding: isMobile ? "12px 16px" : "16px 24px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>

        {!showSummary && notes.slice(0, visibleNotes).map((note, i) => {
          const style = NOTE_COLORS[note.type];
          const isTitle = note.type === "title";
          return (
            <div key={i} style={{
              background: style.bg, borderRadius: isTitle ? 0 : "var(--mn-r-md)",
              padding: isTitle ? "4px 0" : "9px 12px",
              borderLeft: !isTitle ? `3px solid ${style.accent}` : "none",
              animation: `demo-fade-up 0.35s ease both`,
            }}>
              {!isTitle && style.label && (
                <span style={{ fontSize: 10, fontWeight: 700, color: style.accent, textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 2 }}>
                  {style.label}
                </span>
              )}
              <p style={{
                margin: 0,
                fontSize: isTitle ? (isMobile ? 15 : 16) : 13,
                fontWeight: isTitle ? 800 : 500,
                color: isTitle ? "var(--mn-ink-1)" : "var(--mn-ink-1)",
                lineHeight: 1.5,
              }}>
                {note.text}
              </p>
            </div>
          );
        })}

        {showSummary && (
          <div style={{ animation: "demo-fade-up 0.4s ease both", display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ background: "var(--mn-surface)", borderRadius: "var(--mn-r-xl)", padding: "16px 18px", border: "1px solid var(--mn-ink-4)", boxShadow: "var(--mn-shadow-md)" }}>
              <p style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 700, color: "var(--mn-green)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Resumen ejecutivo · IA</p>
              <p style={{ margin: "0 0 10px", fontSize: isMobile ? 13 : 14, fontWeight: 800, color: "var(--mn-ink-1)" }}>Sistema de Conducción Cardíaca</p>
              <p style={{ margin: "0 0 10px", fontSize: 13, color: "var(--mn-ink-2)", lineHeight: 1.6 }}>
                El corazón genera y conduce sus propios impulsos eléctricos. El <strong style={{ color: "var(--mn-ink-1)" }}>NSA</strong> (marcapasos) inicia el latido a 60-100 lpm, lo transmite al <strong style={{ color: "var(--mn-ink-1)" }}>NAV</strong>, que lo retarda ~120ms para el llenado ventricular, y finalmente las <strong style={{ color: "var(--mn-ink-1)" }}>fibras de Purkinje</strong> distribuyen el impulso a los ventrículos.
              </p>
              <div style={{ background: "var(--mn-amber-light)", borderRadius: "var(--mn-r-md)", padding: "8px 10px", marginBottom: 8 }}>
                <p style={{ margin: 0, fontSize: 12, color: "var(--mn-amber)", fontWeight: 600 }}>
                  📋 Tarea pendiente: leer capítulo 8 · Entrega: viernes 18
                </p>
              </div>
              <div style={{ background: "var(--mn-error-light)", borderRadius: "var(--mn-r-md)", padding: "8px 10px" }}>
                <p style={{ margin: 0, fontSize: 12, color: "var(--mn-error)", fontWeight: 600 }}>
                  ⚠️ Parcial 2 mencionado: sábado 19 de julio
                </p>
              </div>
            </div>
            <div style={{ background: "var(--mn-green-light)", borderRadius: "var(--mn-r-lg)", padding: "10px 14px", border: "1px solid #BBF7D0" }}>
              <p style={{ margin: 0, fontSize: 12, color: "var(--mn-green-text)", fontWeight: 600 }}>
                🎯 Este tema representa el 22% del contenido del Parcial 2. Mnemora lo marcó como prioridad.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
