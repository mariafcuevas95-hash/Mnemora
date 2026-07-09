"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Logo } from "@/components/logo";

function BienvenidoContent() {
  const params = useSearchParams();
  const email = params.get("email") ?? "";
  const q = email ? `?email=${encodeURIComponent(email)}` : "";

  return (
    <div style={{ minHeight: "100vh", background: "#F7F4EF", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 24px" }}>
      <div style={{ width: "100%", maxWidth: 440, textAlign: "center" }}>

        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 40 }}>
          <Logo size={36} />
          <span className="font-display" style={{ fontWeight: 800, fontSize: 20, color: "#1A1612" }}>Mnemora</span>
        </div>

        {/* Confetti icon */}
        <div style={{ fontSize: 52, marginBottom: 20, lineHeight: 1 }}>🎉</div>

        <h1 className="font-display" style={{ fontSize: "clamp(26px, 5vw, 34px)", fontWeight: 800, color: "#1A1612", letterSpacing: "-0.02em", marginBottom: 12, lineHeight: 1.15 }}>
          Pago confirmado
        </h1>

        <p style={{ fontSize: 17, color: "#3D352E", marginBottom: 8, lineHeight: 1.6 }}>
          Bienvenido a Mnemora.
        </p>
        <p style={{ fontSize: 16, color: "#6B6259", marginBottom: 32, lineHeight: 1.6 }}>
          Tu acceso ya está reservado. Ahora solo falta crear tu cuenta para comenzar.
        </p>

        {/* Email notice */}
        <div style={{ background: "#EAF2EC", border: "1px solid #B6D9C0", borderRadius: 12, padding: "14px 18px", marginBottom: 32, textAlign: "left" }}>
          <p style={{ fontSize: 14, color: "#1B3F2F", fontWeight: 600, marginBottom: 4 }}>
            ⚠️ Importante
          </p>
          <p style={{ fontSize: 14, color: "#2D5540", lineHeight: 1.6 }}>
            Utiliza el mismo correo electrónico con el que realizaste la compra
            {email && <> (<strong>{email}</strong>)</>} para que tu plan quede activado automáticamente.
          </p>
        </div>

        {/* CTAs */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Link
            href={`/registro${q}`}
            style={{
              display: "block", padding: "16px 24px", borderRadius: 14,
              background: "#1B3F2F", color: "#fff",
              fontSize: 16, fontWeight: 700, textDecoration: "none",
              textAlign: "center",
            }}
          >
            Crear mi cuenta →
          </Link>
          <Link
            href={`/login${q}`}
            style={{
              display: "block", padding: "16px 24px", borderRadius: 14,
              background: "#FFFFFF", color: "#1A1612",
              border: "1.5px solid rgba(26,22,18,0.14)",
              fontSize: 16, fontWeight: 600, textDecoration: "none",
              textAlign: "center",
            }}
          >
            Ya tengo cuenta — Iniciar sesión
          </Link>
        </div>

        <p style={{ marginTop: 28, fontSize: 13, color: "#9E9389" }}>
          ¿Problemas? Escribinos a{" "}
          <a href="mailto:hello@mnemora.me" style={{ color: "#1B3F2F", fontWeight: 600 }}>hello@mnemora.me</a>
        </p>
      </div>
    </div>
  );
}

export default function BienvenidoPage() {
  return (
    <Suspense>
      <BienvenidoContent />
    </Suspense>
  );
}
