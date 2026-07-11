"use client";

import { DEMO_PROFILE, DEMO_SUBJECTS, DEMO_STATS } from "@/lib/demo/data";
import type { DemoFormat } from "@/lib/demo/data";

const g = (t: number, e: number) => e >= t;

export default function S02Dashboard({ elapsed, format }: { elapsed: number; format: DemoFormat }) {
  const isMobile = format === "9:16";
  const isSquare = format === "1:1";

  const mainSubject = DEMO_SUBJECTS[0];

  return (
    <div style={{ height: "100%", background: "var(--mn-canvas)", display: "flex", flexDirection: "column", overflow: "hidden", fontSize: isMobile ? 13 : 14 }}>
      <style>{`
        @keyframes demo-fade-up { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes demo-slide-in { from{opacity:0;transform:translateX(-10px)} to{opacity:1;transform:translateX(0)} }
        @keyframes demo-bar-grow { from{width:0} to{width:var(--target-w)} }
      `}</style>

      {/* Top bar */}
      <div style={{
        padding: isMobile ? "14px 16px 10px" : "16px 24px 12px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        borderBottom: "1px solid var(--mn-ink-4)",
        background: "var(--mn-surface)",
      }}>
        <div>
          <p style={{ margin: 0, fontSize: 11, color: "var(--mn-ink-3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Lunes 14 de julio</p>
          <h2 style={{ margin: 0, fontSize: isMobile ? 18 : 22, fontWeight: 800, color: "var(--mn-ink-1)" }}>
            Buenas tardes, {DEMO_PROFILE.firstName} 👋
          </h2>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 5,
            background: "var(--mn-amber-light)", borderRadius: "var(--mn-r-full)", padding: "5px 10px",
            opacity: g(500, elapsed) ? 1 : 0, transition: "opacity 0.4s",
          }}>
            <span style={{ fontSize: 15 }}>🔥</span>
            <span style={{ fontSize: 12, fontWeight: 800, color: "var(--mn-amber)" }}>{DEMO_STATS.streakDays} días</span>
          </div>
          {!isMobile && (
            <div style={{
              display: "flex", alignItems: "center", gap: 5,
              background: "var(--mn-green-light)", borderRadius: "var(--mn-r-full)", padding: "5px 10px",
              opacity: g(700, elapsed) ? 1 : 0, transition: "opacity 0.4s",
            }}>
              <span style={{ fontSize: 12 }}>⚡</span>
              <span style={{ fontSize: 12, fontWeight: 800, color: "var(--mn-green)" }}>{DEMO_STATS.xp.toLocaleString("es")} XP</span>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: isMobile ? "12px 16px" : "16px 24px", display: "flex", flexDirection: "column", gap: 12 }}>

        {/* "Mientras no estabas" briefing card */}
        <div style={{
          background: "linear-gradient(135deg, #1B3F2F 0%, #2D5A3D 100%)",
          borderRadius: "var(--mn-r-xl)", padding: isMobile ? "14px 16px" : "18px 20px",
          opacity: g(800, elapsed) ? 1 : 0,
          animation: g(800, elapsed) ? "demo-fade-up 0.5s var(--mn-ease) both" : "none",
        }}>
          <p style={{ margin: "0 0 3px", fontSize: 10, color: "#A7C4B0", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Mientras no estabas…
          </p>
          <p style={{ margin: "0 0 8px", fontSize: isMobile ? 14 : 15, fontWeight: 700, color: "#FFFFFF", lineHeight: 1.4 }}>
            Detecté {DEMO_STATS.weakConcepts} conceptos que estás a punto de olvidar.<br />
            Preparé una sesión de <strong style={{ color: "#4ADE80" }}>{DEMO_STATS.recommendedMinutes} minutos</strong>.
          </p>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              background: "rgba(255,255,255,0.15)", borderRadius: "var(--mn-r-lg)", padding: "8px 14px",
              cursor: "pointer",
              boxShadow: g(3500, elapsed) ? "0 0 0 3px rgba(74,222,128,0.4)" : "none",
              transition: "box-shadow 0.3s",
            }}>
              <span style={{ fontSize: 14 }}>▶</span>
              <span style={{ fontSize: 13, color: "#FFFFFF", fontWeight: 700 }}>Comenzar sesión</span>
            </div>
            <span style={{ fontSize: 12, color: "#A7C4B0" }}>· {mainSubject.nextExam.daysUntil} días para {mainSubject.name}</span>
          </div>
        </div>

        {/* Stats row */}
        {!isMobile && (
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10,
            opacity: g(1800, elapsed) ? 1 : 0,
            animation: g(1800, elapsed) ? "demo-fade-up 0.5s var(--mn-ease) both" : "none",
          }}>
            {[
              { val: DEMO_STATS.totalFlashcards, label: "Flashcards", icon: "🃏" },
              { val: DEMO_STATS.processedClasses, label: "Clases procesadas", icon: "🎙️" },
              { val: DEMO_STATS.uploadedDocuments, label: "Documentos", icon: "📄" },
              { val: `${DEMO_STATS.coveragePct}%`, label: "Cobertura examen", icon: "🎯" },
            ].map(s => (
              <div key={s.label} style={{ background: "var(--mn-surface)", borderRadius: "var(--mn-r-lg)", padding: "12px 14px", boxShadow: "var(--mn-shadow-sm)", border: "1px solid var(--mn-ink-4)" }}>
                <span style={{ fontSize: 18 }}>{s.icon}</span>
                <p style={{ margin: "6px 0 1px", fontSize: isMobile ? 18 : 20, fontWeight: 900, color: "var(--mn-ink-1)" }}>{s.val}</p>
                <p style={{ margin: 0, fontSize: 11, color: "var(--mn-ink-2)" }}>{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Subjects list */}
        <p style={{
          margin: "4px 0 2px", fontSize: 12, fontWeight: 700, color: "var(--mn-ink-2)", textTransform: "uppercase", letterSpacing: "0.05em",
          opacity: g(2200, elapsed) ? 1 : 0, transition: "opacity 0.3s",
        }}>
          Mis materias
        </p>
        {DEMO_SUBJECTS.slice(0, isSquare ? 2 : 4).map((s, i) => (
          <div key={s.id} style={{
            background: "var(--mn-surface)", borderRadius: "var(--mn-r-lg)",
            padding: isMobile ? "12px 14px" : "13px 16px",
            display: "flex", alignItems: "center", gap: 12,
            boxShadow: "var(--mn-shadow-sm)", border: "1px solid var(--mn-ink-4)",
            opacity: g(2500 + i * 280, elapsed) ? 1 : 0,
            animation: g(2500 + i * 280, elapsed) ? "demo-slide-in 0.4s var(--mn-ease) both" : "none",
          }}>
            <div style={{ width: 36, height: 36, borderRadius: "var(--mn-r-md)", background: s.colorLight, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <span style={{ fontSize: 18 }}>{s.emoji}</span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "var(--mn-ink-1)" }}>{s.name}</p>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                <div style={{ flex: 1, height: 4, background: "var(--mn-ink-4)", borderRadius: 4, overflow: "hidden" }}>
                  <div style={{
                    height: "100%", background: s.colorBg, borderRadius: 4,
                    width: g(3200 + i * 280, elapsed) ? `${s.mastery}%` : "0%",
                    transition: "width 0.9s var(--mn-ease)",
                  }} />
                </div>
                <span style={{ fontSize: 11, color: "var(--mn-ink-2)", fontWeight: 600, flexShrink: 0 }}>{s.mastery}%</span>
              </div>
            </div>
            {s.dueToday > 0 && (
              <div style={{ background: "var(--mn-amber-light)", borderRadius: "var(--mn-r-sm)", padding: "3px 8px", flexShrink: 0 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--mn-amber)" }}>{s.dueToday} hoy</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Memo anchor — lateral */}
      <div id="memo-anchor-dashboard" style={{ position: "absolute", bottom: 80, right: 0, width: 56, height: 56 }} />
    </div>
  );
}
