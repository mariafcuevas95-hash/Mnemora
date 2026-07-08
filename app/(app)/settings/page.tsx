"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, LogOut, Check, Loader2, Bell, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { PLANS } from "@/lib/plans";
import type { PlanId } from "@/lib/plans";

type Profile = {
  id: string;
  name: string;
  email: string;
  plan: PlanId;
  trial_ends_at: string | null;
  notifications_email: boolean;
};

/* ─── Section wrapper ─── */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 32 }}>
      <p style={{ fontSize: 11, fontWeight: 600, color: "var(--mn-ink-3)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>
        {title}
      </p>
      {children}
    </section>
  );
}

/* ─── Row ─── */
function Row({ label, sub, right, border = true }: { label: string; sub?: string; right: React.ReactNode; border?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, paddingBottom: border ? 18 : 0, marginBottom: border ? 18 : 0, borderBottom: border ? "1px solid var(--mn-ink-4)" : "none" }}>
      <div>
        <p style={{ fontSize: 14, fontWeight: 500, color: "var(--mn-ink-1)" }}>{label}</p>
        {sub && <p style={{ fontSize: 12, color: "var(--mn-ink-3)", marginTop: 2, lineHeight: 1.5 }}>{sub}</p>}
      </div>
      <div style={{ flexShrink: 0 }}>{right}</div>
    </div>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const [profile, setProfile]   = useState<Profile | null>(null);
  const [loading, setLoading]   = useState(true);
  const [name, setName]         = useState("");
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const [saveError, setSaveError] = useState("");
  const [togglingNotif, setTogglingNotif] = useState(false);
  const [fetchError, setFetchError] = useState(false);

  useEffect(() => {
    const db = createClient();
    (async () => {
      try {
        const { data: { user } } = await db.auth.getUser();
        if (!user) { router.replace("/login"); return; }
        const { data, error } = await db.from("profiles")
          .select("id, name, plan, trial_ends_at, notifications_email")
          .eq("id", user.id).single();
        if (error && !data) { setFetchError(true); setLoading(false); return; }
        const p: Profile = {
          id:                  user.id,
          name:                data?.name ?? "",
          email:               user.email ?? "",
          plan:                data?.plan ?? "free",
          trial_ends_at:       data?.trial_ends_at ?? null,
          notifications_email: data?.notifications_email ?? false,
        };
        setProfile(p); setName(p.name); setLoading(false);
      } catch {
        setFetchError(true); setLoading(false);
      }
    })();
  }, [router]);

  async function saveName() {
    if (!profile || name.trim() === profile.name) return;
    setSaving(true); setSaveError("");
    try {
      const db = createClient();
      const { error } = await db.from("profiles").update({ name: name.trim() }).eq("id", profile.id);
      if (error) {
        setSaveError("No se pudo guardar. Intenta de nuevo.");
      } else {
        setProfile(p => p ? { ...p, name: name.trim() } : p);
        setSaved(true); setTimeout(() => setSaved(false), 2500);
      }
    } catch {
      setSaveError("Error de conexión. Intenta de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleNotifications() {
    if (!profile || togglingNotif) return;
    const next = !profile.notifications_email;
    setTogglingNotif(true);
    setProfile(p => p ? { ...p, notifications_email: next } : p);
    const db = createClient();
    const { error } = await db.from("profiles").update({ notifications_email: next }).eq("id", profile.id);
    if (error) setProfile(p => p ? { ...p, notifications_email: !next } : p);
    setTogglingNotif(false);
  }

  async function handleLogout() {
    const db = createClient();
    await db.auth.signOut();
    router.replace("/login");
  }

  if (loading) return (
    <div className="mn-dashboard-wrap" style={{ maxWidth: 560 }}>
      {[1,2,3].map(i => <div key={i} style={{ height: 64, background: "var(--mn-raised)", borderRadius: "var(--mn-r-lg)", marginBottom: 12, animation: "pulse-sk 1.4s ease infinite" }} />)}
      <style>{`@keyframes pulse-sk{0%,100%{opacity:1}50%{opacity:.45}}`}</style>
    </div>
  );

  if (fetchError || !profile) return (
    <div className="mn-dashboard-wrap" style={{ maxWidth: 560, paddingTop: 48 }}>
      <p style={{ fontSize: 14, color: "var(--mn-ink-2)", marginBottom: 16 }}>No se pudo cargar tu perfil. Verifica tu conexión.</p>
      <button onClick={() => { setFetchError(false); setLoading(true); router.refresh(); }} className="mn-btn-primary" style={{ fontSize: 13 }}>
        Reintentar
      </button>
    </div>
  );

  const plan = PLANS[profile.plan];
  const isTrialActive = profile.trial_ends_at && new Date(profile.trial_ends_at) > new Date();
  const trialDays = isTrialActive
    ? Math.ceil((new Date(profile.trial_ends_at!).getTime() - Date.now()) / 86_400_000)
    : 0;

  const planLabel =
    profile.plan === "free"
      ? isTrialActive ? `Pro (prueba · ${trialDays} días)` : "Free"
      : plan.name;

  const initials = (profile.name || profile.email).slice(0, 2).toUpperCase();

  return (
    <div className="mn-dashboard-wrap" style={{ maxWidth: 560 }}>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes pulse-sk{0%,100%{opacity:1}50%{opacity:.45}}
      `}</style>

      {/* ── Profile card ── */}
      <div className="mn-fade-up" style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 36, padding: "24px 28px", background: "var(--mn-surface)", borderRadius: "var(--mn-r-xl)", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
        <div style={{ width: 52, height: 52, borderRadius: "50%", background: "var(--mn-green)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <span className="font-display" style={{ fontSize: 18, fontWeight: 700, color: "#FFFFFF" }}>{initials}</span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p className="font-display" style={{ fontSize: 17, fontWeight: 700, color: "var(--mn-ink-1)", marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {profile.name || "Sin nombre"}
          </p>
          <p style={{ fontSize: 13, color: "var(--mn-ink-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{profile.email}</p>
        </div>
        <span style={{ padding: "3px 11px", borderRadius: "var(--mn-r-full)", background: "var(--mn-raised)", fontSize: 12, fontWeight: 600, color: "var(--mn-ink-2)", flexShrink: 0 }}>
          {planLabel}
        </span>
      </div>

      {/* ── Cuenta ── */}
      <Section title="Cuenta">
        <div style={{ background: "var(--mn-surface)", borderRadius: "var(--mn-r-xl)", padding: "20px 24px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          {/* Nombre */}
          <div style={{ marginBottom: 18, paddingBottom: 18, borderBottom: "1px solid var(--mn-ink-4)" }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--mn-ink-2)", display: "block", marginBottom: 8 }}>Nombre</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                value={name}
                onChange={e => { setName(e.target.value); setSaved(false); }}
                onKeyDown={e => e.key === "Enter" && saveName()}
                style={{ flex: 1, padding: "10px 14px", borderRadius: "var(--mn-r-md)", border: "1px solid var(--mn-ink-4)", background: "var(--mn-canvas)", fontSize: 14, color: "var(--mn-ink-1)", outline: "none", fontFamily: "inherit" }}
                onFocus={e => (e.target.style.borderColor = "var(--mn-green)")}
                onBlur={e  => (e.target.style.borderColor = "var(--mn-ink-4)")}
              />
              <button
                onClick={saveName}
                disabled={saving || name.trim() === profile.name || !name.trim()}
                style={{ padding: "10px 16px", borderRadius: "var(--mn-r-md)", border: "none", background: saved ? "var(--mn-raised)" : "var(--mn-green)", color: saved ? "var(--mn-ink-2)" : "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 5, opacity: (saving || name.trim() === profile.name) ? 0.45 : 1, transition: "all 200ms", minWidth: 90 }}
              >
                {saving
                  ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
                  : saved
                  ? <><Check size={13} /> Guardado</>
                  : "Guardar"}
              </button>
            </div>
            {saveError && <p style={{ fontSize: 12, color: "var(--mn-error)", marginTop: 6 }}>{saveError}</p>}
          </div>

          {/* Email — read only */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--mn-ink-2)", display: "flex", alignItems: "center", gap: 5, marginBottom: 8 }}>
              <Mail size={11} /> Email
            </label>
            <p style={{ fontSize: 14, color: "var(--mn-ink-2)", padding: "10px 14px", background: "var(--mn-raised)", borderRadius: "var(--mn-r-md)" }}>
              {profile.email}
            </p>
          </div>
        </div>
      </Section>

      {/* ── Notificaciones ── */}
      <Section title="Notificaciones">
        <div style={{ background: "var(--mn-surface)", borderRadius: "var(--mn-r-xl)", padding: "20px 24px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <Row
            label="Recordatorio diario por email"
            sub="Repasos pendientes, exámenes y plan del día — todos los días a las 8 AM."
            border={false}
            right={
              <button
                onClick={toggleNotifications}
                disabled={togglingNotif}
                aria-label={profile.notifications_email ? "Desactivar notificaciones" : "Activar notificaciones"}
                style={{ width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer", background: profile.notifications_email ? "var(--mn-green)" : "var(--mn-ink-4)", position: "relative", transition: "background 200ms", opacity: togglingNotif ? 0.5 : 1 }}
              >
                <span style={{ position: "absolute", top: 3, left: profile.notifications_email ? 23 : 3, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left 200ms", boxShadow: "0 1px 3px rgba(0,0,0,0.15)" }} />
              </button>
            }
          />
        </div>
      </Section>

      {/* ── Suscripción ── */}
      <Section title="Suscripción">
        <div style={{ background: "var(--mn-surface)", borderRadius: "var(--mn-r-xl)", padding: "20px 24px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <Row
            label={planLabel}
            sub={profile.plan === "free" && !isTrialActive ? "Sin costo · funciones limitadas" : `$${plan.price_usd}/mes`}
            border={profile.plan !== "free"}
            right={
              profile.plan === "free" ? (
                <Link href="/upgrade" className="mn-btn-primary" style={{ fontSize: 13, padding: "8px 16px", textDecoration: "none" }}>
                  Mejorar <ArrowRight size={13} />
                </Link>
              ) : null
            }
          />
          {profile.plan !== "free" && (
            <p style={{ fontSize: 12, color: "var(--mn-ink-3)", lineHeight: 1.6 }}>
              Para cancelar o gestionar la suscripción, hazlo desde tu cuenta de Hotmart.
            </p>
          )}
        </div>
      </Section>

      {/* ── Referidos ── */}
      <ReferralSection />

      {/* ── App ── */}
      <Section title="App">
        <div style={{ background: "var(--mn-surface)", borderRadius: "var(--mn-r-xl)", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <button
            onClick={() => { localStorage.removeItem("mnemora_pwa_seen"); window.location.href = "/instalar?next=/settings"; }}
            style={{ width: "100%", padding: "16px 24px", display: "flex", alignItems: "center", gap: 12, background: "none", border: "none", cursor: "pointer", textAlign: "left", transition: "background 100ms" }}
            onMouseEnter={e => (e.currentTarget.style.background = "var(--mn-raised)")}
            onMouseLeave={e => (e.currentTarget.style.background = "none")}
          >
            <span style={{ fontSize: 16 }}>📲</span>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: "var(--mn-ink-1)" }}>Instalar Mnemora</p>
              <p style={{ fontSize: 12, color: "var(--mn-ink-3)" }}>Agregar a la pantalla de inicio</p>
            </div>
            <ArrowRight size={15} color="var(--mn-ink-3)" />
          </button>
        </div>
      </Section>

      {/* ── Sesión ── */}
      <Section title="Sesión">
        <div style={{ background: "var(--mn-surface)", borderRadius: "var(--mn-r-xl)", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <button
            onClick={handleLogout}
            style={{ width: "100%", padding: "16px 24px", display: "flex", alignItems: "center", gap: 12, background: "none", border: "none", cursor: "pointer", textAlign: "left", transition: "background 100ms" }}
            onMouseEnter={e => (e.currentTarget.style.background = "var(--mn-raised)")}
            onMouseLeave={e => (e.currentTarget.style.background = "none")}
          >
            <LogOut size={15} color="var(--mn-error)" />
            <span style={{ fontSize: 14, fontWeight: 600, color: "var(--mn-error)" }}>Cerrar sesión</span>
          </button>
        </div>
      </Section>

      <p style={{ fontSize: 11, color: "var(--mn-ink-4)", textAlign: "center", marginTop: 8 }}>
        Mnemora · {new Date().getFullYear()}
      </p>
    </div>
  );
}

/* ─── Referral section ─── */
function ReferralSection() {
  const [data, setData] = useState<{
    referralCode: string | null;
    convertedCount: number;
    ambassadorBadge: boolean;
    rewards: { milestone: number; days_granted: number }[];
  } | null>(null);

  useEffect(() => {
    fetch("/api/referrals").then(r => r.ok ? r.json() : null).then(d => { if (d) setData(d); }).catch(() => {});
  }, []);

  const totalDays   = (data?.rewards ?? []).reduce((acc, r) => acc + r.days_granted, 0);
  const totalMonths = Math.round(totalDays / 30);

  return (
    <section style={{ marginBottom: 32 }}>
      <p style={{ fontSize: 11, fontWeight: 600, color: "var(--mn-ink-3)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>
        Referidos
      </p>
      <div style={{ background: "var(--mn-surface)", borderRadius: "var(--mn-r-xl)", padding: "20px 24px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 18 }}>
          <div>
            <p className="font-display" style={{ fontSize: 22, fontWeight: 700, color: "var(--mn-ink-1)" }}>{data?.convertedCount ?? 0}</p>
            <p style={{ fontSize: 11, color: "var(--mn-ink-3)" }}>Referidos</p>
          </div>
          <div>
            <p className="font-display" style={{ fontSize: 22, fontWeight: 700, color: "var(--mn-ink-1)" }}>
              {totalMonths > 0 ? `${totalMonths}m` : "—"}
            </p>
            <p style={{ fontSize: 11, color: "var(--mn-ink-3)" }}>Meses gratis</p>
          </div>
          <div>
            <p style={{ fontSize: 22 }}>{data?.ambassadorBadge ? "👑" : "—"}</p>
            <p style={{ fontSize: 11, color: "var(--mn-ink-3)" }}>Insignia</p>
          </div>
        </div>

        {data?.referralCode && (
          <div style={{ padding: "10px 14px", background: "var(--mn-raised)", borderRadius: "var(--mn-r-md)", marginBottom: 14 }}>
            <p style={{ fontSize: 11, color: "var(--mn-ink-3)", marginBottom: 2 }}>Tu código</p>
            <p style={{ fontSize: 14, fontWeight: 700, color: "var(--mn-ink-1)", fontFamily: "monospace" }}>{data.referralCode}</p>
          </div>
        )}

        <Link href="/referidos" style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 13, fontWeight: 600, color: "var(--mn-green)", textDecoration: "none" }}>
          Ver programa de referidos <ArrowRight size={13} />
        </Link>
      </div>
    </section>
  );
}
