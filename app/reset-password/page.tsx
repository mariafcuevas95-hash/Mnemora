"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/logo";

const inputStyle = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 10,
  border: "1.5px solid rgba(26,22,18,0.12)",
  background: "#EDE9E2",
  fontSize: 15,
  color: "#1A1612",
  outline: "none",
  boxSizing: "border-box" as const,
};

function ResetPasswordInner() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes("type=recovery") || hash.includes("access_token")) {
      const params = new URLSearchParams(hash.replace(/^#/, ""));
      const token = params.get("access_token");
      if (token) {
        setAccessToken(token);
        return;
      }
    }
    setError("Accede desde el enlace en tu email de recuperación.");
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    setLoading(true);
    setError("");
    const res = await fetch("/api/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ access_token: accessToken, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Error al actualizar la contraseña. Solicita un nuevo enlace.");
      setLoading(false);
      return;
    }
    setDone(true);
    setTimeout(() => router.replace("/login"), 1500);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#F7F4EF", display: "flex", flexDirection: "column" }}>
      <header style={{ padding: "20px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
          <Logo size={32} />
          <span className="font-display" style={{ fontWeight: 800, fontSize: 18, color: "#1A1612" }}>Mnemora</span>
        </Link>
      </header>

      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 24px 48px" }}>
        <div style={{ width: "100%", maxWidth: 420 }}>
          <h1 className="font-display" style={{ fontSize: 28, fontWeight: 800, color: "#1A1612", marginBottom: 6 }}>
            Nueva contraseña
          </h1>
          <p style={{ fontSize: 15, color: "#6B6259", marginBottom: 28 }}>
            Elige una contraseña segura para tu cuenta.
          </p>

          {!accessToken && !error ? (
            <p style={{ fontSize: 14, color: "#9E9389", textAlign: "center" }}>Verificando enlace…</p>
          ) : done ? (
            <div style={{ padding: "16px 20px", borderRadius: 12, background: "#D1FAE5", border: "0.5px solid #6EE7B7", textAlign: "center" }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: "#065F46" }}>¡Contraseña actualizada!</p>
              <p style={{ fontSize: 13, color: "#047857", marginTop: 4 }}>Redirigiendo al inicio de sesión…</p>
            </div>
          ) : error && !accessToken ? (
            <div style={{ padding: "10px 14px", borderRadius: 10, background: "#FEE2E2", border: "0.5px solid #FCA5A5" }}>
              <p style={{ fontSize: 13, color: "#DC2626" }}>{error}</p>
              <Link href="/login" style={{ fontSize: 13, color: "#1B3F2F", fontWeight: 600 }}>Volver al inicio de sesión →</Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: "#1A1612", display: "block", marginBottom: 6 }}>
                  Nueva contraseña
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    required
                    autoComplete="new-password"
                    style={{ ...inputStyle, paddingRight: 44 }}
                    onFocus={e => (e.target.style.borderColor = "#1B3F2F")}
                    onBlur={e => (e.target.style.borderColor = "rgba(26,22,18,0.12)")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#9E9389" }}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {error && (
                <div style={{ padding: "10px 14px", borderRadius: 10, background: "#FEE2E2", border: "0.5px solid #FCA5A5" }}>
                  <p style={{ fontSize: 13, color: "#DC2626" }}>{error}</p>
                  <Link href="/login" style={{ fontSize: 13, color: "#1B3F2F", fontWeight: 600 }}>Volver al inicio de sesión →</Link>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !password}
                className="mn-btn-primary"
                style={{ width: "100%", justifyContent: "center", fontSize: 15, padding: "14px", marginTop: 4, opacity: loading ? 0.7 : 1 }}
              >
                {loading ? "Guardando..." : "Guardar contraseña"}
                {!loading && <ArrowRight size={16} />}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return <Suspense><ResetPasswordInner /></Suspense>;
}
