"use client";

import { DEMO_CALENDAR } from "@/lib/demo/data";
import type { DemoFormat } from "@/lib/demo/data";

const EVENT_COLORS: Record<string, { bg: string; color: string }> = {
  exam:   { bg: "var(--mn-error-light)", color: "var(--mn-error)" },
  task:   { bg: "var(--mn-amber-light)", color: "var(--mn-amber)" },
  review: { bg: "var(--mn-green-light)", color: "var(--mn-green)" },
};

export default function S10Calendario({ elapsed, format }: { elapsed: number; format: DemoFormat }) {
  const isMobile = format === "9:16";

  // Days appear one by one 0–2800ms
  // Exam plan items appear 3000–5500ms
  const visibleDays  = Math.min(DEMO_CALENDAR.days.length, Math.floor(elapsed / 400) + 1);
  const showPlan     = elapsed >= 3000;
  const visiblePlan  = Math.min(DEMO_CALENDAR.examPlan.length, Math.floor((elapsed - 3000) / 600) + 1);

  return (
    <div style={{ height: "100%", background: "var(--mn-canvas)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <style>{`@keyframes demo-fade-up{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>

      <div style={{ background: "var(--mn-surface)", borderBottom: "1px solid var(--mn-ink-4)", padding: isMobile ? "12px 16px" : "14px 24px" }}>
        <p style={{ margin: "0 0 2px", fontSize: 11, color: "var(--mn-ink-2)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>Semana del 14–20 de julio</p>
        <h2 style={{ margin: 0, fontSize: isMobile ? 15 : 17, fontWeight: 800, color: "var(--mn-ink-1)" }}>Tu calendario de estudio</h2>
      </div>

      <div style={{ flex: 1, padding: isMobile ? "12px 14px" : "16px 22px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 14 }}>

        {/* Week strip */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 5 }}>
          {DEMO_CALENDAR.days.slice(0, visibleDays).map((d, i) => (
            <div key={i} style={{
              background: d.active ? "var(--mn-green)" : "var(--mn-surface)",
              borderRadius: "var(--mn-r-lg)", padding: "8px 4px", textAlign: "center",
              border: d.events.some(e => e.type === "exam") ? "2px solid var(--mn-error)" : "1px solid var(--mn-ink-4)",
              boxShadow: d.active ? "var(--mn-shadow-md)" : "none",
              animation: "demo-fade-up 0.35s ease both",
            }}>
              <p style={{ margin: "0 0 2px", fontSize: 10, fontWeight: 600, color: d.active ? "rgba(255,255,255,0.7)" : "var(--mn-ink-3)" }}>{d.day}</p>
              <p style={{ margin: "0 0 5px", fontSize: 14, fontWeight: 800, color: d.active ? "#fff" : "var(--mn-ink-1)" }}>{d.date}</p>
              {d.events.map((ev, j) => (
                <div key={j} style={{ width: 8, height: 8, borderRadius: "50%", background: EVENT_COLORS[ev.type].color, margin: "2px auto 0" }} />
              ))}
            </div>
          ))}
        </div>

        {/* Event list */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {DEMO_CALENDAR.days.slice(0, visibleDays).filter(d => d.events.length > 0).map((d, i) =>
            d.events.map((ev, j) => {
              const c = EVENT_COLORS[ev.type];
              return (
                <div key={`${i}-${j}`} style={{
                  background: "var(--mn-surface)", borderRadius: "var(--mn-r-lg)", padding: "9px 12px",
                  display: "flex", alignItems: "center", gap: 10,
                  border: "1px solid var(--mn-ink-4)", boxShadow: "var(--mn-shadow-sm)",
                  animation: "demo-fade-up 0.3s ease both",
                }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: c.color, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: "var(--mn-ink-1)" }}>{ev.label}</p>
                    <p style={{ margin: 0, fontSize: 11, color: "var(--mn-ink-2)" }}>{d.day} {d.date} jul</p>
                  </div>
                  <div style={{ background: c.bg, borderRadius: "var(--mn-r-sm)", padding: "2px 8px" }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: c.color, textTransform: "capitalize" }}>{ev.type}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Exam plan */}
        {showPlan && (
          <div style={{ animation: "demo-fade-up 0.4s ease both" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
              <span style={{ fontSize: 14 }}>📋</span>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: "var(--mn-ink-1)" }}>Plan para el Parcial 2 — 8 días</p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {DEMO_CALENDAR.examPlan.slice(0, visiblePlan).map((item, i) => (
                <div key={i} style={{
                  background: "var(--mn-surface)", borderRadius: "var(--mn-r-lg)", padding: "10px 12px",
                  display: "flex", alignItems: "center", gap: 10,
                  border: "1px solid var(--mn-ink-4)", boxShadow: "var(--mn-shadow-sm)",
                  animation: "demo-fade-up 0.35s ease both",
                }}>
                  <div style={{ width: 20, height: 20, borderRadius: "50%", border: "2px solid var(--mn-ink-4)", flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "var(--mn-ink-1)" }}>{item.task}</p>
                    <p style={{ margin: 0, fontSize: 11, color: "var(--mn-ink-2)" }}>{item.day} · {item.mins} min</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
