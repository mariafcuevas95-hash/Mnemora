"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { BookOpen, Mail } from "lucide-react";

export default function ConfirmarPage() {
  const email = useSearchParams().get("email") ?? "tu email";

  return (
    <div style={{ minHeight: "100vh", background: "#F7F4EF", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none", marginBottom: 48 }}>
        <div style={{ width: 32, height: 32, background: "#1B3F2F", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <BookOpen size={16} color="#fff" />
        </div>
        <span className="font-display" style={{ fontWeight: 800, fontSize: 18, color: "#1A1612" }}>Mnemora</span>
      </Link>

      <div style={{ textAlign: "center", maxWidth: 420 }}>
        <div style={{ width: 72, height: 72, background: "#E8F1EC", borderRadius: 20, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
          <Mail size={32} color="#1B3F2F" />
        </div>
        <h1 className="font-display" style={{ fontSize: 26, fontWeight: 800, color: "#1A1612", marginBottom: 12 }}>
          Revisá tu email
        </h1>
        <p style={{ fontSize: 15, color: "#6B6259", lineHeight: 1.65, marginBottom: 32 }}>
          Enviamos un link de confirmación a <strong style={{ color: "#1A1612" }}>{email}</strong>.
          Haz clic en el link para activar tu cuenta y empezar.
        </p>
        <p style={{ fontSize: 13, color: "#9E9389" }}>
          ¿No lo encuentras? Revisa la carpeta de spam o{" "}
          <Link href="/registro" style={{ color: "#1B3F2F", fontWeight: 600 }}>vuelve a registrarte</Link>.
        </p>
      </div>
    </div>
  );
}
