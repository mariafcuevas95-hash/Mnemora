"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookOpen, ArrowRight, Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

function AuthShell({ children, footer }: { children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", background: "#F7F4EF", display: "flex", flexDirection: "column" }}>
      <header style={{ padding: "20px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
          <div style={{ width: 32, height: 32, background: "#1B3F2F", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <BookOpen size={16} color="#fff" />
          </div>
          <span className="font-display" style={{ fontWeight: 800, fontSize: 18, color: "#1A1612" }}>Mnemora</span>
        </Link>
        <Link href="/login" style={{ fontSize: 14, color: "#6B6259", textDecoration: "none" }}>
          ¿Ya tienes cuenta? <span style={{ color: "#1B3F2F", fontWeight: 600 }}>Inicia sesión</span>
        </Link>
      </header>
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 24px 48px" }}>
        <div style={{ width: "100%", maxWidth: 420 }}>
          {children}
          {footer}
        </div>
      </div>
    </div>
  );
}

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

export default function RegistroPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 8) { setError("La contraseña debe tener al menos 8 caracteres."); return; }
    setLoading(true);

    try {
      const db = createClient();
      const { error: signUpError } = await db.auth.signUp({
        email,
        password,
        options: {
          data: { name },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/onboarding`,
        },
      });

      if (signUpError) {
        const msg = signUpError.message ?? "";
        // Temporary debug — remove after fixing
        console.error("signUpError full:", JSON.stringify(signUpError), "status:", (signUpError as any).status, "code:", (signUpError as any).code);
        setError(
          msg.includes("already registered") || msg.includes("already exists")
            ? "Ya existe una cuenta con ese email. ¿Querés iniciar sesión?"
            : !msg || msg === "{}" || msg === "[object Object]"
            ? `Error ${(signUpError as any).status ?? ""} ${(signUpError as any).code ?? ""}`.trim() || "Error al crear cuenta. Intentá con otro email."
            : msg
        );
        setLoading(false);
        return;
      }

      const { data: { user } } = await db.auth.getUser();
      if (user) {
        await db.from("profiles").upsert({ id: user.id, email: user.email!, name });
        router.push("/onboarding");
      } else {
        router.push(`/registro/confirmar?email=${encodeURIComponent(email)}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(
        msg.includes("non ISO-8859-1")
          ? "Error de configuración: la clave de Supabase tiene caracteres inválidos. Contacta al administrador."
          : msg
      );
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setGoogleLoading(true);
    const db = createClient();
    await db.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/onboarding` },
    });
  }

  return (
    <AuthShell>
      <h1 className="font-display" style={{ fontSize: 28, fontWeight: 800, color: "#1A1612", marginBottom: 6 }}>
        Creá tu cuenta
      </h1>
      <p style={{ fontSize: 15, color: "#6B6259", marginBottom: 28 }}>
        7 días Pro gratis. Sin tarjeta de crédito.
      </p>

      {/* Google */}
      <button
        onClick={handleGoogle}
        disabled={googleLoading}
        style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
          width: "100%", padding: "12px 16px", borderRadius: 12,
          border: "1.5px solid rgba(26,22,18,0.14)", background: "#FFFFFF",
          fontSize: 15, fontWeight: 600, color: "#1A1612", cursor: "pointer",
          marginBottom: 20, opacity: googleLoading ? 0.7 : 1,
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
        {googleLoading ? "Redirigiendo..." : "Continuar con Google"}
      </button>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <div style={{ flex: 1, height: "0.5px", background: "rgba(26,22,18,0.12)" }} />
        <span style={{ fontSize: 13, color: "#9E9389" }}>o con email</span>
        <div style={{ flex: 1, height: "0.5px", background: "rgba(26,22,18,0.12)" }} />
      </div>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <label style={{ fontSize: 13, fontWeight: 600, color: "#1A1612", display: "block", marginBottom: 6 }}>
            Tu nombre
          </label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="María Fernanda"
            required
            autoComplete="name"
            style={inputStyle}
            onFocus={e => (e.target.style.borderColor = "#1B3F2F")}
            onBlur={e => (e.target.style.borderColor = "rgba(26,22,18,0.12)")}
          />
        </div>

        <div>
          <label style={{ fontSize: 13, fontWeight: 600, color: "#1A1612", display: "block", marginBottom: 6 }}>
            Email universitario
          </label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="nombre@universidad.edu"
            required
            autoComplete="email"
            style={inputStyle}
            onFocus={e => (e.target.style.borderColor = "#1B3F2F")}
            onBlur={e => (e.target.style.borderColor = "rgba(26,22,18,0.12)")}
          />
        </div>

        <div>
          <label style={{ fontSize: 13, fontWeight: 600, color: "#1A1612", display: "block", marginBottom: 6 }}>
            Contraseña
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
          disabled={loading || !name || !email || !password}
          className="mn-btn-primary"
          style={{ width: "100%", justifyContent: "center", fontSize: 15, padding: "14px", marginTop: 4, opacity: loading ? 0.7 : 1 }}
        >
          {loading ? "Creando cuenta..." : "Crear cuenta gratis"}
          {!loading && <ArrowRight size={16} />}
        </button>
      </form>

      <p style={{ fontSize: 12, color: "#9E9389", textAlign: "center", marginTop: 20, lineHeight: 1.6 }}>
        Al registrarte aceptás los{" "}
        <Link href="/terminos" style={{ color: "#1B3F2F" }}>Términos de uso</Link> y la{" "}
        <Link href="/privacidad" style={{ color: "#1B3F2F" }}>Política de privacidad</Link>.
      </p>
    </AuthShell>
  );
}
