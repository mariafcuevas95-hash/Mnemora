"use client";

import type { DemoFormat } from "@/lib/demo/data";

const g = (t: number, elapsed: number) => elapsed >= t;

export default function S01Apertura({ elapsed, format }: { elapsed: number; format: DemoFormat }) {
  const isMobile = format === "9:16";

  return (
    <div style={{
      height: "100%", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      background: "linear-gradient(160deg, #0F2419 0%, #1B3F2F 60%, #2D5A3D 100%)",
      padding: isMobile ? "32px 24px" : "48px",
      gap: isMobile ? 20 : 28,
    }}>
      <style>{`
        @keyframes demo-fade-up { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        @keyframes demo-pulse-ring { 0%,100%{transform:scale(1);opacity:0.3} 50%{transform:scale(1.15);opacity:0.15} }
      `}</style>

      {/* Logo mark */}
      <div style={{
        position: "relative", display: "flex", alignItems: "center", justifyContent: "center",
        opacity: g(300, elapsed) ? 1 : 0,
        animation: g(300, elapsed) ? "demo-fade-up 0.6s var(--mn-ease) both" : "none",
      }}>
        <div style={{
          position: "absolute", width: isMobile ? 80 : 100, height: isMobile ? 80 : 100,
          borderRadius: "50%", border: "1px solid rgba(74,222,128,0.25)",
          animation: "demo-pulse-ring 3s ease infinite",
        }} />
        <div style={{
          width: isMobile ? 56 : 72, height: isMobile ? 56 : 72, borderRadius: "50%",
          background: "rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center",
          border: "1px solid rgba(255,255,255,0.15)",
        }}>
          <span style={{ fontSize: isMobile ? 28 : 36 }}>🧠</span>
        </div>
      </div>

      {/* Wordmark */}
      <div style={{
        textAlign: "center",
        opacity: g(600, elapsed) ? 1 : 0,
        animation: g(600, elapsed) ? "demo-fade-up 0.6s var(--mn-ease) both" : "none",
      }}>
        <p style={{ margin: "0 0 4px", fontSize: isMobile ? 11 : 12, color: "#4ADE80", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em" }}>
          Mnemora
        </p>
        <p style={{ margin: 0, fontSize: isMobile ? 13 : 14, color: "rgba(255,255,255,0.45)", fontWeight: 400 }}>
          Tu entrenador académico
        </p>
      </div>

      {/* Main claim */}
      <div style={{
        textAlign: "center",
        opacity: g(1200, elapsed) ? 1 : 0,
        animation: g(1200, elapsed) ? "demo-fade-up 0.7s var(--mn-ease) both" : "none",
      }}>
        <h1 style={{
          margin: "0 0 12px",
          fontSize: isMobile ? 30 : 42,
          fontWeight: 900, color: "#FFFFFF", lineHeight: 1.15,
          letterSpacing: "-0.02em",
        }}>
          Deja de adivinar<br />qué estudiar.
        </h1>
        <div style={{
          opacity: g(2200, elapsed) ? 1 : 0,
          animation: g(2200, elapsed) ? "demo-fade-up 0.6s var(--mn-ease) both" : "none",
        }}>
          <h2 style={{
            margin: 0,
            fontSize: isMobile ? 30 : 42,
            fontWeight: 900, color: "#4ADE80", lineHeight: 1.15,
            letterSpacing: "-0.02em",
          }}>
            Mnemora ya lo sabe.
          </h2>
        </div>
      </div>

      {/* Memo anchor */}
      <div id="memo-anchor-apertura" style={{ position: "absolute", bottom: isMobile ? 80 : 40, right: isMobile ? 16 : 40, width: 64, height: 64 }} />
    </div>
  );
}
