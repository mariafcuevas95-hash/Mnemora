"use client";

export default function OfflinePage() {
  return (
    <div style={{ minHeight: "100vh", background: "#F7F4EF", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, textAlign: "center" }}>
      <div>
        <div style={{ fontSize: 56, marginBottom: 20 }}>📶</div>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#1A1612", marginBottom: 10, fontFamily: "var(--font-display)" }}>
          Sin conexión
        </h1>
        <p style={{ fontSize: 15, color: "#6B6259", lineHeight: 1.6, marginBottom: 28, maxWidth: 340 }}>
          No podemos conectarnos ahora. Cuando tengas internet, Mnemora seguirá donde lo dejaste.
        </p>
        <button
          onClick={() => window.location.reload()}
          style={{ padding: "12px 28px", borderRadius: 12, background: "#1B3F2F", color: "#fff", border: "none", fontSize: 15, fontWeight: 700, cursor: "pointer" }}
        >
          Intentar de nuevo
        </button>
      </div>
    </div>
  );
}
