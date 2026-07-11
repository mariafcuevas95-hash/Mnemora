"use client";

import { DEMO_ROADMAP, DEMO_SUBJECTS } from "@/lib/demo/data";
import type { DemoFormat } from "@/lib/demo/data";

const s = DEMO_SUBJECTS[0];

export default function S11Roadmap({ elapsed, format }: { elapsed: number; format: DemoFormat }) {
  const isMobile = format === "9:16";

  const visibleDominated  = Math.min(DEMO_ROADMAP.dominated.length,  Math.floor(elapsed / 350) + 1);
  const visibleInProgress = elapsed < 2000 ? 0 : Math.min(DEMO_ROADMAP.inProgress.length, Math.floor((elapsed - 2000) / 400) + 1);
  const visibleToLearn    = elapsed < 3800 ? 0 : Math.min(DEMO_ROADMAP.toLearn.length, Math.floor((elapsed - 3800) / 400) + 1);

  const progressPct = Math.min(s.mastery, elapsed < 500 ? 0 : Math.min(s.mastery, Math.floor(((elapsed - 200) / 2000) * s.mastery)));

  return (
    <div style={{ height: "100%", background: "var(--mn-canvas)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <style>{`@keyframes demo-fade-up{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>

      <div style={{ background: "var(--mn-surface)", borderBottom: "1px solid var(--mn-ink-4)", padding: isMobile ? "12px 16px" : "14px 24px" }}>
        <p style={{ margin: "0 0 2px", fontSize: 11, color: "var(--mn-ink-2)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>Anatomía II · Progreso</p>
        <h2 style={{ margin: 0, fontSize: isMobile ? 15 : 17, fontWeight: 800, color: "var(--mn-ink-1)" }}>Mapa de conocimiento</h2>
      </div>

      <div style={{ flex: 1, padding: isMobile ? "12px 14px" : "16px 22px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 14 }}>

        {/* Global progress bar */}
        <div style={{ background: "var(--mn-surface)", borderRadius: "var(--mn-r-xl)", padding: "14px 16px", border: "1px solid var(--mn-ink-4)", boxShadow: "var(--mn-shadow-sm)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--mn-ink-1)" }}>Dominio general</span>
            <span style={{ fontSize: 14, fontWeight: 900, color: "var(--mn-green)" }}>{progressPct}%</span>
          </div>
          <div style={{ height: 10, background: "var(--mn-ink-4)", borderRadius: 6, overflow: "hidden" }}>
            <div style={{ height: "100%", background: "linear-gradient(90deg, #2D5A3D, var(--mn-green))", width: `${progressPct}%`, borderRadius: 6, transition: "width 0.15s linear" }} />
          </div>
          <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
            <span style={{ fontSize: 11, color: "var(--mn-green)", fontWeight: 600 }}>✓ {s.knownConcepts} dominados</span>
            <span style={{ fontSize: 11, color: "var(--mn-amber)", fontWeight: 600 }}>⟳ {DEMO_ROADMAP.inProgress.length} en progreso</span>
            <span style={{ fontSize: 11, color: "var(--mn-error)", fontWeight: 600 }}>✗ {s.weakConcepts} débiles</span>
          </div>
        </div>

        {/* Dominated */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
            <span style={{ fontSize: 12 }}>✅</span>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 800, color: "var(--mn-green)" }}>Dominados</p>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {DEMO_ROADMAP.dominated.slice(0, visibleDominated).map((t, i) => (
              <div key={i} style={{ background: "var(--mn-green-light)", borderRadius: "var(--mn-r-full)", padding: "4px 10px", animation: "demo-fade-up 0.3s ease both" }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--mn-green-text)" }}>{t}</span>
              </div>
            ))}
          </div>
        </div>

        {/* In Progress */}
        {visibleInProgress > 0 && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
              <span style={{ fontSize: 12 }}>⟳</span>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 800, color: "var(--mn-amber)" }}>En progreso</p>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {DEMO_ROADMAP.inProgress.slice(0, visibleInProgress).map((t, i) => (
                <div key={i} style={{ background: "var(--mn-amber-light)", borderRadius: "var(--mn-r-full)", padding: "4px 10px", animation: "demo-fade-up 0.3s ease both" }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--mn-amber)" }}>{t}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* To Learn */}
        {visibleToLearn > 0 && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
              <span style={{ fontSize: 12 }}>⚠️</span>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 800, color: "var(--mn-error)" }}>Prioritarios para el parcial</p>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {DEMO_ROADMAP.toLearn.slice(0, visibleToLearn).map((t, i) => (
                <div key={i} style={{ background: "var(--mn-error-light)", borderRadius: "var(--mn-r-full)", padding: "4px 10px", animation: "demo-fade-up 0.3s ease both" }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--mn-error)" }}>{t}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
