"use client";

import { DEMO_SUBJECTS } from "@/lib/demo/data";
import type { DemoFormat } from "@/lib/demo/data";

const g = (t: number, e: number) => e >= t;
const s = DEMO_SUBJECTS[0];

const TABS = ["Documentos", "Flashcards", "Resumen", "Tutor", "Progreso"];

export default function S03Materia({ elapsed, format }: { elapsed: number; format: DemoFormat }) {
  const isMobile = format === "9:16";

  // Active tab progresses through them
  const activeTab = elapsed < 2000 ? 0 : elapsed < 3500 ? 1 : elapsed < 5000 ? 2 : elapsed < 6500 ? 3 : 4;

  const docs = [
    { name: "Programa — Anatomía II.pdf", pages: 14, date: "10 jul" },
    { name: "Diapositivas — Clase 3.pdf", pages: 32, date: "8 jul" },
  ];

  return (
    <div style={{ height: "100%", background: "var(--mn-canvas)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <style>{`@keyframes demo-fade-up{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* Header */}
      <div style={{ background: "var(--mn-surface)", borderBottom: "1px solid var(--mn-ink-4)", padding: isMobile ? "14px 16px 0" : "16px 24px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: "var(--mn-r-md)", background: s.colorLight, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 20 }}>{s.emoji}</span>
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: isMobile ? 16 : 18, fontWeight: 800, color: "var(--mn-ink-1)" }}>{s.name}</h2>
            <p style={{ margin: 0, fontSize: 12, color: "var(--mn-ink-2)" }}>{s.professor} · Parcial en {s.nextExam.daysUntil} días</p>
          </div>
          {!isMobile && (
            <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
              <div style={{ background: "var(--mn-green-light)", borderRadius: "var(--mn-r-sm)", padding: "4px 10px" }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--mn-green)" }}>Cobertura {s.coverage}%</span>
              </div>
              <div style={{ background: "var(--mn-amber-light)", borderRadius: "var(--mn-r-sm)", padding: "4px 10px" }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--mn-amber)" }}>Nota estimada {s.estimatedGrade}/10</span>
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 0, overflowX: "auto" }}>
          {TABS.map((tab, i) => (
            <div key={tab} style={{
              padding: isMobile ? "8px 12px" : "9px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer",
              color: activeTab === i ? "var(--mn-green)" : "var(--mn-ink-2)",
              borderBottom: activeTab === i ? "2px solid var(--mn-green)" : "2px solid transparent",
              whiteSpace: "nowrap",
              transition: "color 0.3s, border-color 0.3s",
            }}>{tab}</div>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, padding: isMobile ? "12px 16px" : "16px 24px", overflowY: "auto" }}>

        {/* Documentos tab */}
        {activeTab === 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "var(--mn-ink-1)" }}>{s.documents} documentos</p>
              <div style={{ background: "var(--mn-green)", borderRadius: "var(--mn-r-md)", padding: "6px 12px", display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 12 }}>+</span>
                <span style={{ fontSize: 12, color: "#fff", fontWeight: 700 }}>Subir documento</span>
              </div>
            </div>
            {docs.map((d, i) => (
              <div key={d.name} style={{
                background: "var(--mn-surface)", borderRadius: "var(--mn-r-lg)", padding: "12px 14px",
                display: "flex", alignItems: "center", gap: 10,
                boxShadow: "var(--mn-shadow-sm)", border: "1px solid var(--mn-ink-4)",
                opacity: g(400 + i * 200, elapsed) ? 1 : 0,
                animation: g(400 + i * 200, elapsed) ? "demo-fade-up 0.4s ease both" : "none",
              }}>
                <span style={{ fontSize: 24 }}>📄</span>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "var(--mn-ink-1)" }}>{d.name}</p>
                  <p style={{ margin: 0, fontSize: 11, color: "var(--mn-ink-2)" }}>{d.pages} páginas · {d.date}</p>
                </div>
                <div style={{ background: "var(--mn-green-light)", borderRadius: "var(--mn-r-sm)", padding: "3px 8px" }}>
                  <span style={{ fontSize: 11, color: "var(--mn-green)", fontWeight: 700 }}>Procesado</span>
                </div>
              </div>
            ))}
            <div style={{
              background: "var(--mn-green-light)", borderRadius: "var(--mn-r-lg)", padding: "12px 14px",
              border: "1px dashed var(--mn-green)", textAlign: "center",
              opacity: g(900, elapsed) ? 1 : 0, transition: "opacity 0.4s",
            }}>
              <p style={{ margin: 0, fontSize: 12, color: "var(--mn-green-text)", fontWeight: 600 }}>
                📎 Arrastra un PDF, audio o programa de materia aquí
              </p>
            </div>
          </div>
        )}

        {/* Flashcards tab */}
        {activeTab === 1 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "var(--mn-ink-1)" }}>{s.flashcards} flashcards generadas por IA</p>
            </div>
            <div style={{ background: "linear-gradient(135deg, #1B3F2F, #2D5A3D)", borderRadius: "var(--mn-r-xl)", padding: "20px", textAlign: "center" }}>
              <p style={{ margin: "0 0 6px", fontSize: 11, color: "#A7C4B0", textTransform: "uppercase", letterSpacing: "0.06em" }}>Sistema cardiovascular</p>
              <p style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 700, color: "#fff" }}>¿Cuál es la función del nodo sinoauricular?</p>
              <div style={{ background: "rgba(255,255,255,0.12)", borderRadius: "var(--mn-r-md)", padding: "6px 12px", display: "inline-block" }}>
                <span style={{ fontSize: 12, color: "#fff" }}>Toca para ver la respuesta</span>
              </div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {[["😕","Difícil","var(--mn-error-light)","var(--mn-error)"], ["🤔","Regular","var(--mn-amber-light)","var(--mn-amber)"], ["✅","Bien","var(--mn-green-light)","var(--mn-green)"]].map(([e, l, bg, c]) => (
                <div key={l} style={{ flex: 1, padding: "10px", borderRadius: "var(--mn-r-lg)", background: bg, textAlign: "center", cursor: "pointer" }}>
                  <p style={{ margin: "0 0 2px", fontSize: 18 }}>{e}</p>
                  <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: c }}>{l}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Other tabs — simplified */}
        {activeTab === 2 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ background: "var(--mn-surface)", borderRadius: "var(--mn-r-lg)", padding: "14px 16px", boxShadow: "var(--mn-shadow-sm)", border: "1px solid var(--mn-ink-4)" }}>
              <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 800, color: "var(--mn-ink-1)" }}>Sistema de Conducción Cardíaca</p>
              <p style={{ margin: "0 0 6px", fontSize: 13, color: "var(--mn-ink-2)", lineHeight: 1.6 }}>El corazón posee un sistema de conducción eléctrica propio. El <strong style={{ color: "var(--mn-green)" }}>nodo sinoauricular (NSA)</strong> actúa como marcapasos natural generando impulsos de 60-100 lpm…</p>
              <div style={{ background: "var(--mn-green-light)", borderRadius: "var(--mn-r-sm)", padding: "6px 10px" }}>
                <p style={{ margin: 0, fontSize: 12, color: "var(--mn-green-text)" }}>🎯 Este tema representa el 18% de tu próximo examen</p>
              </div>
            </div>
          </div>
        )}

        {(activeTab === 3 || activeTab === 4) && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ background: "var(--mn-surface)", borderRadius: "var(--mn-r-lg)", padding: "14px 16px", boxShadow: "var(--mn-shadow-sm)", border: "1px solid var(--mn-ink-4)", textAlign: "center" }}>
              <span style={{ fontSize: 32 }}>{activeTab === 3 ? "🧠" : "📊"}</span>
              <p style={{ margin: "8px 0 0", fontSize: 13, fontWeight: 700, color: "var(--mn-ink-1)" }}>
                {activeTab === 3 ? "Tutor especializado en Anatomía II" : `Progreso: ${s.mastery}% dominado`}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
