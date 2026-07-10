"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { createClient } from "@/lib/supabase/client";

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
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Supabase JS processes the hash fragment (#access_token=...&type=recovery)
    // and fires PASSWORD_RECOVERY in onAuthStateChange.
    const db = createClient();
    const { data: { subscription } } = db.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setReady(true);
      }
    });

    // Also handle the case where the session is already active (page reload)
    db.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    setLoading(true);
    setError("");
    const db = createClient();
    const { error: updateError } = await db.auth.updateUser({ password });
    if (updateError) {
      setError(updateError.message ?? "Error al actualizar la contraseña.");
      setLoading(false);
      return;
    }
    router.replace("/dashboard");
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

          {!ready ? (
            <p style={{ fontSize: 14, color: "#9E9389", textAlign: "center" }}>Verificando enlace...</p>
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
