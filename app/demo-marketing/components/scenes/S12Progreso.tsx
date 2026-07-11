"use client";

import { DEMO_STATS, DEMO_SUBJECTS } from "@/lib/demo/data";
import type { DemoFormat } from "@/lib/demo/data";

export default function S12Progreso({ elapsed, format }: { elapsed: number; format: DemoFormat }) {
  const isMobile = format === "9:16";

  const animPct = (target: number) => Math.min(target, elapsed < 300 ? 0 : Math.round(((elapsed - 300) / 2500) * target));

  const bars = [
    { label: "Anatomía II", pct: 72, color: "#2D5A3D", lightColor: "#E8F3EC" },
    { label: "Bioquímica",  pct: 63, color: "#3B7A57", lightColor: "#F0FDF4" },
    { label: "Fisiología",  pct: 58, color: "#4A7C59", lightColor: "#F0FAF3" },
    { label: "Farmacología",pct: 41, color: "#4A5568", lightColor: "#F7F8FA" },
  ];

  const showWeekly = elapsed >= 2800;
  const showInsight = elapsed >= 4000;

  return (
    <div style={{ height: "100%", background: "var(--mn-canvas)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <style>{`@keyframes demo-fade-up{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>

      <div style={{ background: "var(--mn-surface)", borderBottom: "1px solid var(--mn-ink-4)", padding: isMobile ? "12px 16px" : "14px 24px" }}>
        <p style={{ margin: "0 0 2px", fontSize: 11, color: "var(--mn-ink-2)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>Panorama general</p>
        <h2 style={{ margin: 0, fontSize: isMobile ? 15 : 17, fontWeight: 800, color: "var(--mn-ink-1)" }}>Tu progreso esta semana</h2>
      </div>

      <div style={{ flex: 1, padding: isMobile ? "12px 14px" : "16px 22px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 14 }}>

        {/* Stats row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
          {[
            { val: `+${DEMO_STATS.conceptsDominatedThisWeek}`, label: "Conceptos dominados", icon: "🧠" },
            { val: `${DEMO_STATS.studyHoursWeek}h`, label: "Horas de estudio", icon: "⏱" },
            { val: `+${DEMO_STATS.weeklyImprovement}%`, label: "Mejora semanal", icon: "📈" },
          ].map(s => (
            <div key={s.label} style={{ background: "var(--mn-surface)", borderRadius: "var(--mn-r-lg)", padding: "12px 10px", textAlign: "center", border: "1px solid var(--mn-ink-4)", boxShadow: "var(--mn-shadow-sm)" }}>
              <p style={{ margin: "0 0 3px", fontSize: 16 }}>{s.icon}</p>
              <p style={{ margin: "0 0 2px", fontSize: isMobile ? 18 : 20, fontWeight: 900, color: "var(--mn-green)", fontVariantNumeric: "tabular-nums" }}>{s.val}</p>
              <p style={{ margin: 0, fontSize: 10, color: "var(--mn-ink-2)", lineHeight: 1.3 }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Per-subject bars */}
        <div style={{ background: "var(--mn-surface)", borderRadius: "var(--mn-r-xl)", padding: "14px 16px", border: "1px solid var(--mn-ink-4)", boxShadow: "var(--mn-shadow-sm)" }}>
          <p style={{ margin: "0 0 12px", fontSize: 13, fontWeight: 800, color: "var(--mn-ink-1)" }}>Dominio por materia</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {bars.map(b => {
              const anim = animPct(b.pct);
              return (
                <div key={b.label}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "var(--mn-ink-1)" }}>{b.label}</span>
                    <span style={{ fontSize: 12, fontWeight: 800, color: b.color, fontVariantNumeric: "tabular-nums" }}>{anim}%</span>
                  </div>
                  <div style={{ height: 8, background: "var(--mn-ink-4)", borderRadius: 5, overflow: "hidden" }}>
                    <div style={{ height: "100%", background: b.color, width: `${anim}%`, borderRadius: 5, transition: "width 0.1s linear" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Weekly comparison */}
        {showWeekly && (
          <div style={{ background: "var(--mn-green-light)", borderRadius: "var(--mn-r-lg)", padding: "12px 14px", border: "1px solid #BBF7D0", animation: "demo-fade-up 0.4s ease both" }}>
            <p style={{ margin: "0 0 2px", fontSize: 13, fontWeight: 700, color: "var(--mn-green-text)" }}>📊 Mejor semana del semestre</p>
            <p style={{ margin: 0, fontSize: 12, color: "var(--mn-ink-2)" }}>{DEMO_STATS.conceptsDominatedThisWeek} conceptos dominados vs. 11 la semana pasada.</p>
          </div>
        )}

        {/* AI insight */}
        {showInsight && (
          <div style={{ background: "var(--mn-surface)", borderRadius: "var(--mn-r-lg)", padding: "12px 14px", border: "1px solid var(--mn-ink-4)", boxShadow: "var(--mn-shadow-sm)", animation: "demo-fade-up 0.4s ease both" }}>
            <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 700, color: "var(--mn-green)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Mnemora recomienda</p>
            <p style={{ margin: 0, fontSize: 13, color: "var(--mn-ink-1)", lineHeight: 1.5 }}>
              Dedica <strong>18 minutos hoy</strong> al sistema de conducción eléctrica (Anatomía II) y aumentarás tu nota estimada de 8.4 a 9.1.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
