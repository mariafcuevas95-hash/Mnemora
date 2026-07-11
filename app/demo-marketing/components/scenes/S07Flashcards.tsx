"use client";

import { DEMO_FLASHCARDS } from "@/lib/demo/data";
import type { DemoFormat } from "@/lib/demo/data";

const g = (t: number, e: number) => e >= t;

export default function S07Flashcards({ elapsed, format }: { elapsed: number; format: DemoFormat }) {
  const isMobile = format === "9:16";

  // Card 0: shown 0–5000ms (flip at 2500ms, rate at 3800ms)
  // Card 1: shown 5000–8500ms (flip at 6800ms)
  // Done: 8500ms+

  const cardIdx  = elapsed < 5000 ? 0 : elapsed < 8500 ? 1 : 2;
  const flipped  = (cardIdx === 0 && elapsed >= 2500) || (cardIdx === 1 && elapsed >= 6800);
  const showRate = (cardIdx === 0 && elapsed >= 3800) || (cardIdx === 1 && elapsed >= 7200);
  const done     = elapsed >= 8500;
  const showXP   = elapsed >= 8800;

  const card = DEMO_FLASHCARDS[Math.min(cardIdx, DEMO_FLASHCARDS.length - 1)];

  return (
    <div style={{ height: "100%", background: "var(--mn-canvas)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <style>{`
        @keyframes demo-fade-up{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes xp-pop{0%{transform:scale(0.7);opacity:0}60%{transform:scale(1.08)}100%{transform:scale(1);opacity:1}}
      `}</style>

      {/* Header */}
      <div style={{ background: "var(--mn-surface)", borderBottom: "1px solid var(--mn-ink-4)", padding: isMobile ? "12px 16px" : "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <p style={{ margin: 0, fontSize: 11, color: "var(--mn-ink-2)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>Anatomía II · Flashcards</p>
          <h2 style={{ margin: 0, fontSize: isMobile ? 15 : 17, fontWeight: 800, color: "var(--mn-ink-1)" }}>Sesión de repaso espaciado</h2>
        </div>
        {!done && (
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--mn-ink-2)" }}>
            {cardIdx + 1} / 3
          </div>
        )}
      </div>

      <div style={{ flex: 1, padding: isMobile ? "14px 16px" : "18px 24px", display: "flex", flexDirection: "column", gap: 14, overflow: "hidden" }}>

        {!done ? (
          <>
            {/* Card */}
            <div style={{ flex: 1, perspective: 1000, minHeight: 0 }}>
              <div style={{
                width: "100%", height: "100%",
                position: "relative", transformStyle: "preserve-3d",
                transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
                transition: "transform 0.65s cubic-bezier(0.4,0,0.2,1)",
              }}>
                {/* Front */}
                <div style={{
                  position: "absolute", inset: 0, backfaceVisibility: "hidden",
                  background: "linear-gradient(135deg, #1B3F2F 0%, #2D5A3D 100%)",
                  borderRadius: "var(--mn-r-xl)",
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14,
                  padding: "24px 20px",
                }}>
                  <span style={{ fontSize: isMobile ? 32 : 40 }}>🫀</span>
                  <p style={{ margin: 0, fontSize: isMobile ? 16 : 18, fontWeight: 800, color: "#FFFFFF", textAlign: "center", lineHeight: 1.35 }}>
                    {card.front}
                  </p>
                  <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,0.5)" }}>Toca para ver la respuesta</p>
                </div>
                {/* Back */}
                <div style={{
                  position: "absolute", inset: 0, backfaceVisibility: "hidden",
                  transform: "rotateY(180deg)",
                  background: "var(--mn-surface)", borderRadius: "var(--mn-r-xl)",
                  border: "1px solid var(--mn-ink-4)",
                  display: "flex", flexDirection: "column", justifyContent: "center", gap: 12,
                  padding: "24px 20px",
                  boxShadow: "var(--mn-shadow-lg)",
                }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "var(--mn-green)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Respuesta</span>
                  <p style={{ margin: 0, fontSize: isMobile ? 14 : 15, color: "var(--mn-ink-1)", lineHeight: 1.6, fontWeight: 400 }}>
                    {card.back}
                  </p>
                  <div style={{ background: "var(--mn-canvas)", borderRadius: "var(--mn-r-md)", padding: "8px 10px" }}>
                    <p style={{ margin: 0, fontSize: 11, color: "var(--mn-ink-2)" }}>💡 Mnemora ajustó el intervalo según tu nivel de dominio.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Rating buttons */}
            {showRate && (
              <div style={{ display: "flex", gap: 8, animation: "demo-fade-up 0.35s ease both" }}>
                {[["😕","No lo sé","var(--mn-error-light)","var(--mn-error)"], ["🤔","Difícil","var(--mn-amber-light)","var(--mn-amber)"], ["✅","Bien","var(--mn-green-light)","var(--mn-green)"], ["⚡","Perfecto","#EFF6FF","var(--mn-blue)"]].map(([emoji, label, bg, color]) => (
                  <div key={label} style={{
                    flex: 1, padding: isMobile ? "9px 4px" : "10px 6px", borderRadius: "var(--mn-r-lg)",
                    background: bg, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, cursor: "pointer",
                    boxShadow: label === "Bien" ? `0 0 0 2px ${color}` : "none",
                  }}>
                    <span style={{ fontSize: isMobile ? 18 : 20 }}>{emoji}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color }}>{label}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          /* Session complete */
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: "20px 0" }}>
            <div style={{ width: 60, height: 60, borderRadius: "50%", background: "var(--mn-green-light)", display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid #BBF7D0" }}>
              <span style={{ fontSize: 28 }}>✅</span>
            </div>
            <div style={{ textAlign: "center" }}>
              <h3 style={{ margin: "0 0 6px", fontSize: isMobile ? 20 : 22, fontWeight: 900, color: "var(--mn-ink-1)" }}>Sesión completada</h3>
              <p style={{ margin: 0, fontSize: 13, color: "var(--mn-ink-2)" }}>3 conceptos reforzados · Próximo repaso: mañana</p>
            </div>
            {showXP && (
              <div style={{
                background: "linear-gradient(135deg, #1B3F2F, #2D5A3D)", borderRadius: "var(--mn-r-xl)",
                padding: "14px 24px", display: "flex", alignItems: "center", gap: 10,
                animation: "xp-pop 0.5s var(--mn-spring) both",
              }}>
                <span style={{ fontSize: 22 }}>⚡</span>
                <div>
                  <p style={{ margin: 0, fontSize: 16, fontWeight: 900, color: "#FFFFFF" }}>+50 XP ganados</p>
                  <p style={{ margin: 0, fontSize: 11, color: "#A7C4B0" }}>Total: {(2480 + 50).toLocaleString("es")} XP · Racha: 12 días</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
