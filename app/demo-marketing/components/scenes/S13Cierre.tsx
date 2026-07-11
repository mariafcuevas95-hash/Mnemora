"use client";

import type { DemoFormat } from "@/lib/demo/data";

export default function S13Cierre({ elapsed, format }: { elapsed: number; format: DemoFormat }) {
  const isMobile = format === "9:16";

  const showTagline  = elapsed >= 1200;
  const showCta      = elapsed >= 2800;
  const showFeatures = elapsed >= 4000;

  const features = [
    { icon: "🧠", text: "Tutor con memoria de tus errores" },
    { icon: "🃏", text: "Flashcards generadas por IA" },
    { icon: "📅", text: "Calendario de estudio automático" },
    { icon: "📊", text: "Mapa de conocimiento en tiempo real" },
    { icon: "🎙️", text: "AI Class Studio para tus clases" },
    { icon: "⚡", text: "Repaso espaciado inteligente" },
  ];

  return (
    <div style={{
      height: "100%",
      background: "linear-gradient(160deg, #0D2218 0%, #1B3F2F 45%, #2D5A3D 100%)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: isMobile ? "28px 22px" : "32px 28px",
      overflow: "hidden",
      position: "relative",
    }}>
      <style>{`
        @keyframes demo-fade-up{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        @keyframes logo-glow{0%,100%{filter:drop-shadow(0 0 8px rgba(74,188,120,0.3))}50%{filter:drop-shadow(0 0 18px rgba(74,188,120,0.6))}}
        @keyframes cta-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.03)}}
      `}</style>

      {/* Subtle radial glow */}
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 70% 50% at 50% 40%, rgba(74,188,120,0.08) 0%, transparent 70%)", pointerEvents: "none" }} />

      {/* Logo */}
      <div style={{ textAlign: "center", marginBottom: isMobile ? 20 : 28, animation: "logo-glow 3s ease infinite" }}>
        <div style={{ width: isMobile ? 52 : 64, height: isMobile ? 52 : 64, borderRadius: "var(--mn-r-xl)", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px" }}>
          <span style={{ fontSize: isMobile ? 28 : 36 }}>🧠</span>
        </div>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: "rgba(255,255,255,0.5)", letterSpacing: "0.18em", textTransform: "uppercase" }}>MNEMORA</p>
      </div>

      {/* Main headline */}
      <div style={{ textAlign: "center", marginBottom: isMobile ? 10 : 14 }}>
        <h1 style={{ margin: 0, fontSize: isMobile ? 24 : 32, fontWeight: 900, color: "#FFFFFF", lineHeight: 1.2, textWrap: "balance" }}>
          Tú concéntrate en aprender.
        </h1>
        {showTagline && (
          <h1 style={{ margin: "4px 0 0", fontSize: isMobile ? 24 : 32, fontWeight: 900, color: "var(--mn-green)", lineHeight: 1.2, textWrap: "balance", animation: "demo-fade-up 0.5s ease both" }}>
            Mnemora organiza el resto.
          </h1>
        )}
      </div>

      {/* Feature pills */}
      {showFeatures && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center", maxWidth: 380, marginBottom: isMobile ? 20 : 24, animation: "demo-fade-up 0.5s ease both" }}>
          {features.map((f, i) => (
            <div key={i} style={{ background: "rgba(255,255,255,0.07)", borderRadius: "var(--mn-r-full)", padding: "5px 12px", border: "1px solid rgba(255,255,255,0.12)", display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ fontSize: 12 }}>{f.icon}</span>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.8)", fontWeight: 500 }}>{f.text}</span>
            </div>
          ))}
        </div>
      )}

      {/* CTA */}
      {showCta && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, animation: "demo-fade-up 0.5s ease both" }}>
          <div style={{
            background: "var(--mn-green)", borderRadius: "var(--mn-r-xl)",
            padding: isMobile ? "12px 28px" : "14px 36px",
            cursor: "pointer",
            animation: "cta-pulse 2.5s ease infinite",
            boxShadow: "0 4px 24px rgba(74,188,120,0.35)",
          }}>
            <span style={{ fontSize: isMobile ? 15 : 16, fontWeight: 800, color: "#FFFFFF" }}>Empieza gratis →</span>
          </div>
          <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,0.4)" }}>mnemora.me · Sin tarjeta de crédito</p>
        </div>
      )}
    </div>
  );
}
