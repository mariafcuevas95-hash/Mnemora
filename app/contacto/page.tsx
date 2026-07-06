import Link from "next/link";
import { BookOpen, Mail, MessageCircle } from "lucide-react";

export const metadata = { title: "Contacto — Mnemora" };

export default function ContactoPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#F7F4EF" }}>
      <header style={{ padding: "16px 24px", display: "flex", alignItems: "center", gap: 8, borderBottom: "0.5px solid rgba(26,22,18,0.08)", background: "#FAFAF8" }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
          <div style={{ width: 28, height: 28, background: "#1B3F2F", borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <BookOpen size={14} color="#fff" />
          </div>
          <span style={{ fontWeight: 800, fontSize: 16, color: "#1A1612", fontFamily: "var(--font-display, sans-serif)" }}>Mnemora</span>
        </Link>
      </header>

      <main style={{ maxWidth: 600, margin: "0 auto", padding: "64px 24px 80px" }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: "#1A1612", marginBottom: 12 }}>Contacto</h1>
        <p style={{ fontSize: 15, color: "#6B6259", lineHeight: 1.65, marginBottom: 48 }}>
          ¿Tienes alguna pregunta, sugerencia o problema con tu cuenta? Estamos aquí para ayudarte.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <a
            href="mailto:hola@mnemora.app"
            style={{ display: "flex", alignItems: "center", gap: 16, padding: "20px 24px", background: "#FAFAF8", border: "1px solid rgba(26,22,18,0.08)", borderRadius: 14, textDecoration: "none" }}
          >
            <div style={{ width: 44, height: 44, background: "#E8F1EC", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Mail size={20} color="#1B3F2F" />
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: "#1A1612", marginBottom: 2 }}>Email general</p>
              <p style={{ fontSize: 13, color: "#9E9389" }}>hola@mnemora.app</p>
            </div>
          </a>

          <a
            href="mailto:soporte@mnemora.app"
            style={{ display: "flex", alignItems: "center", gap: 16, padding: "20px 24px", background: "#FAFAF8", border: "1px solid rgba(26,22,18,0.08)", borderRadius: 14, textDecoration: "none" }}
          >
            <div style={{ width: 44, height: 44, background: "#E8F1EC", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <MessageCircle size={20} color="#1B3F2F" />
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: "#1A1612", marginBottom: 2 }}>Soporte técnico</p>
              <p style={{ fontSize: 13, color: "#9E9389" }}>soporte@mnemora.app · Respuesta en 24–48 h</p>
            </div>
          </a>

          <a
            href="mailto:privacidad@mnemora.app"
            style={{ display: "flex", alignItems: "center", gap: 16, padding: "20px 24px", background: "#FAFAF8", border: "1px solid rgba(26,22,18,0.08)", borderRadius: 14, textDecoration: "none" }}
          >
            <div style={{ width: 44, height: 44, background: "#E8F1EC", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Mail size={20} color="#1B3F2F" />
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: "#1A1612", marginBottom: 2 }}>Privacidad y datos personales</p>
              <p style={{ fontSize: 13, color: "#9E9389" }}>privacidad@mnemora.app</p>
            </div>
          </a>
        </div>

        <div style={{ borderTop: "1px solid rgba(26,22,18,0.08)", paddingTop: 24, marginTop: 48, display: "flex", gap: 20, flexWrap: "wrap" }}>
          <Link href="/terminos" style={{ fontSize: 13, color: "#1B3F2F", fontWeight: 600, textDecoration: "none" }}>Términos de uso</Link>
          <Link href="/privacidad" style={{ fontSize: 13, color: "#1B3F2F", fontWeight: 600, textDecoration: "none" }}>Política de privacidad</Link>
          <Link href="/" style={{ fontSize: 13, color: "#9E9389", textDecoration: "none" }}>Volver al inicio</Link>
        </div>
      </main>
    </div>
  );
}
