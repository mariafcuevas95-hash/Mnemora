"use client";

import { DEMO_DOCUMENT } from "@/lib/demo/data";
import type { DemoFormat } from "@/lib/demo/data";

const g = (t: number, e: number) => e >= t;

export default function S04Documento({ elapsed, format }: { elapsed: number; format: DemoFormat }) {
  const isMobile = format === "9:16";
  const d = DEMO_DOCUMENT;

  // Upload phase: 0–2000ms
  // Processing stages: 2000–9000ms (1000ms per stage)
  // Result: 9000ms+
  const uploadPct = Math.min(100, elapsed < 500 ? 0 : Math.floor(((elapsed - 500) / 1500) * 100));
  const uploaded  = elapsed >= 2000;

  const stageIdx = uploaded
    ? Math.min(d.stages.length - 1, Math.floor((elapsed - 2000) / 1000))
    : -1;

  const done = elapsed >= 2000 + d.stages.length * 1000;

  return (
    <div style={{ height: "100%", background: "var(--mn-canvas)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <style>{`
        @keyframes demo-fade-up{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes demo-spin{to{transform:rotate(360deg)}}
      `}</style>

      {/* Header */}
      <div style={{ background: "var(--mn-surface)", borderBottom: "1px solid var(--mn-ink-4)", padding: isMobile ? "14px 16px" : "16px 24px" }}>
        <p style={{ margin: "0 0 2px", fontSize: 11, color: "var(--mn-ink-2)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>Anatomía II → Documentos</p>
        <h2 style={{ margin: 0, fontSize: isMobile ? 16 : 18, fontWeight: 800, color: "var(--mn-ink-1)" }}>Subir documento</h2>
      </div>

      <div style={{ flex: 1, padding: isMobile ? "16px" : "24px", display: "flex", flexDirection: "column", gap: 14, overflow: "hidden" }}>

        {/* File card */}
        <div style={{
          background: "var(--mn-surface)", borderRadius: "var(--mn-r-xl)", padding: "16px 18px",
          border: "1px solid var(--mn-ink-4)", boxShadow: "var(--mn-shadow-md)",
          display: "flex", alignItems: "center", gap: 12,
        }}>
          <div style={{ width: 44, height: 44, borderRadius: "var(--mn-r-md)", background: "#FEF2F2", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <span style={{ fontSize: 22 }}>📄</span>
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "var(--mn-ink-1)" }}>{d.name}</p>
            <p style={{ margin: 0, fontSize: 11, color: "var(--mn-ink-2)" }}>{d.size} · {d.pages} páginas</p>
          </div>
        </div>

        {/* Upload progress */}
        {!uploaded && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--mn-ink-2)" }}>Subiendo documento…</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--mn-green)" }}>{uploadPct}%</span>
            </div>
            <div style={{ height: 6, background: "var(--mn-ink-4)", borderRadius: 4, overflow: "hidden" }}>
              <div style={{ height: "100%", background: "var(--mn-green)", borderRadius: 4, width: `${uploadPct}%`, transition: "width 0.1s linear" }} />
            </div>
          </div>
        )}

        {/* Processing stages */}
        {uploaded && !done && (
          <div style={{
            background: "var(--mn-surface)", borderRadius: "var(--mn-r-xl)", padding: "16px 18px",
            border: "1px solid var(--mn-ink-4)", boxShadow: "var(--mn-shadow-md)",
            display: "flex", flexDirection: "column", gap: 10,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <div style={{ width: 16, height: 16, borderRadius: "50%", border: "2px solid var(--mn-green)", borderTopColor: "transparent", animation: "demo-spin 0.8s linear infinite", flexShrink: 0 }} />
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "var(--mn-ink-1)" }}>Mnemora está leyendo tu documento</p>
            </div>
            {d.stages.map((stage, i) => (
              <div key={stage} style={{
                display: "flex", alignItems: "center", gap: 8,
                opacity: i <= stageIdx ? 1 : 0.25,
                transition: "opacity 0.3s",
              }}>
                <div style={{
                  width: 18, height: 18, borderRadius: "50%", flexShrink: 0,
                  background: i < stageIdx ? "var(--mn-green)" : i === stageIdx ? "var(--mn-ink-4)" : "var(--mn-ink-4)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {i < stageIdx
                    ? <span style={{ fontSize: 10, color: "#fff" }}>✓</span>
                    : i === stageIdx
                    ? <div style={{ width: 6, height: 6, borderRadius: "50%", border: "1.5px solid var(--mn-green)", borderTopColor: "transparent", animation: "demo-spin 0.7s linear infinite" }} />
                    : null
                  }
                </div>
                <span style={{ fontSize: 12, color: i <= stageIdx ? "var(--mn-ink-1)" : "var(--mn-ink-3)", fontWeight: i === stageIdx ? 600 : 400 }}>
                  {stage}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Result */}
        {done && (
          <div style={{
            background: "var(--mn-surface)", borderRadius: "var(--mn-r-xl)", padding: "18px 20px",
            border: "1px solid #BBF7D0", boxShadow: "var(--mn-shadow-md)",
            animation: "demo-fade-up 0.5s ease both",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--mn-green)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: 14, color: "#fff" }}>✓</span>
              </div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: "var(--mn-ink-1)" }}>Documento procesado</p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: 10 }}>
              {[
                { val: d.result.exams, label: "Exámenes detectados", icon: "⚠️" },
                { val: d.result.concepts, label: "Conceptos identificados", icon: "🧠" },
                { val: d.result.flashcards, label: "Flashcards generadas", icon: "🃏" },
                { val: d.result.calendarEvents, label: "Eventos al calendario", icon: "📅" },
              ].map(r => (
                <div key={r.label} style={{ background: "var(--mn-canvas)", borderRadius: "var(--mn-r-lg)", padding: "10px 12px", textAlign: "center" }}>
                  <p style={{ margin: "0 0 2px", fontSize: 18 }}>{r.icon}</p>
                  <p style={{ margin: "0 0 2px", fontSize: isMobile ? 20 : 22, fontWeight: 900, color: "var(--mn-green)" }}>{r.val}</p>
                  <p style={{ margin: 0, fontSize: 10, color: "var(--mn-ink-2)", lineHeight: 1.3 }}>{r.label}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
