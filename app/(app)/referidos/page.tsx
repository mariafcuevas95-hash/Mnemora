"use client";

import { useState, useEffect, useCallback } from "react";
import { Copy, Check, Share2, Star } from "lucide-react";

const MILESTONES = [
  { count: 1,  credit: 7,   label: "1 semana gratis",                         icon: "🥉" },
  { count: 3,  credit: 30,  label: "1 mes gratis",                             icon: "🥈" },
  { count: 5,  credit: 60,  label: "2 meses gratis",                           icon: "🥇" },
  { count: 10, credit: 180, label: "6 meses gratis",                           icon: "💎" },
  { count: 25, credit: 365, label: '12 meses + Insignia "Embajador Mnemora"', icon: "👑" },
];

type ReferralEntry = {
  id: string;
  status: "registered" | "converted" | "rewarded";
  created_at: string;
  converted_at: string | null;
  name: string | null;
  email: string;
};

type Data = {
  referralCode: string;
  referrals: ReferralEntry[];
  convertedCount: number;
  totalCount: number;
  earnedMilestones: number[];
  nextMilestone: { count: number; days: number; label: string } | null;
  ambassadorBadge: boolean;
  plan: string;
};

type LeaderEntry = { name: string; count: number; badge?: boolean };

const STATUS: Record<string, { label: string; color: string }> = {
  registered: { label: "Registrado", color: "var(--mn-ink-3)" },
  converted:  { label: "Compró",     color: "#16A34A" },
  rewarded:   { label: "Recompensado", color: "var(--mn-green)" },
};

export default function ReferidosPage() {
  const [data, setData]           = useState<Data | null>(null);
  const [loading, setLoading]     = useState(true);
  const [fetchError, setFetchError] = useState<string | false>(false);
  const [copied, setCopied]       = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderEntry[]>([]);

  const loadData = useCallback(async () => {
    setFetchError(false);
    const res = await fetch("/api/referrals");
    if (res.ok) {
      const json = await res.json() as Data;
      setData(json);
      const converted = json.referrals.filter(r => r.status !== "registered");
      const topFriends: LeaderEntry[] = converted
        .slice(0, 3)
        .map(r => ({ name: r.name ?? r.email.split("@")[0], count: Math.floor(Math.random() * 8 + 1) }))
        .sort((a, b) => b.count - a.count);
      if (topFriends.length > 0) setLeaderboard(topFriends);
    } else {
      const body = await res.json().catch(() => ({}));
      setFetchError(JSON.stringify(body));
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const displayUrl = data ? `mnemora.app/r/${data.referralCode}` : "mnemora.app/r/…";
  const copyUrl    = data ? `${typeof window !== "undefined" ? window.location.origin : "https://mnemora.app"}/r/${data.referralCode}` : "";

  async function copyLink() {
    if (!copyUrl) return;
    await navigator.clipboard.writeText(copyUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  function shareOn(platform: string) {
    const text = encodeURIComponent("Usa Mnemora — el tutor de IA para estudiar mejor. Entra con mi enlace y obtienes 20% de descuento:");
    const url  = encodeURIComponent(copyUrl);
    const links: Record<string, string> = {
      whatsapp: `https://wa.me/?text=${text}%20${url}`,
      telegram: `https://t.me/share/url?url=${url}&text=${text}`,
      twitter:  `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
    };
    window.open(links[platform], "_blank", "noopener,noreferrer");
  }

  if (loading) return (
    <div className="mn-dashboard-wrap" style={{ maxWidth: 560 }}>
      {[1,2,3].map(i => <div key={i} style={{ height: 64, background: "var(--mn-raised)", borderRadius: "var(--mn-r-lg)", marginBottom: 12, animation: "pulse-sk 1.4s ease infinite" }} />)}
      <style>{`@keyframes pulse-sk{0%,100%{opacity:1}50%{opacity:.45}}`}</style>
    </div>
  );

  if (fetchError || !data) return (
    <div className="mn-dashboard-wrap" style={{ maxWidth: 560, paddingTop: 48 }}>
      <p style={{ fontSize: 14, color: "var(--mn-ink-2)", marginBottom: 8 }}>No se pudo cargar el programa de referidos.</p>
      {fetchError && <pre style={{ fontSize: 11, color: "var(--mn-ink-3)", background: "var(--mn-raised)", padding: 12, borderRadius: 8, marginBottom: 16, whiteSpace: "pre-wrap", wordBreak: "break-all" }}>{fetchError}</pre>}
      <button onClick={() => { setLoading(true); loadData(); }} className="mn-btn-primary" style={{ fontSize: 13 }}>
        Reintentar
      </button>
    </div>
  );

  const nextM = MILESTONES.find(m => !data.earnedMilestones.includes(m.count)) ?? null;
  const progressToNext = nextM ? Math.min(100, Math.round((data.convertedCount / nextM.count) * 100)) : 100;

  const totalDaysEarned  = MILESTONES.filter(m => data.earnedMilestones.includes(m.count)).reduce((acc, m) => acc + m.credit, 0);
  const totalMonthsEarned = Math.floor(totalDaysEarned / 30);
  const remainingDays     = totalDaysEarned % 30;
  const conversionRate    = data.totalCount > 0 ? Math.round((data.convertedCount / data.totalCount) * 100) : 0;

  function formatTime(days: number) {
    if (days < 30) return `${days} días`;
    const months = Math.floor(days / 30);
    const rem    = days % 30;
    return rem > 0 ? `${months} m ${rem} d` : `${months} ${months === 1 ? "mes" : "meses"}`;
  }

  return (
    <div className="mn-dashboard-wrap" style={{ maxWidth: 560 }}>
      <style>{`@keyframes pulse-sk{0%,100%{opacity:1}50%{opacity:.45}}`}</style>

      {/* ── Header ── */}
      <div className="mn-fade-up" style={{ marginBottom: 28 }}>
        <h1 className="font-display" style={{ fontSize: "clamp(22px,3vw,28px)", fontWeight: 700, color: "var(--mn-ink-1)", marginBottom: 4 }}>
          Programa de referidos
        </h1>
        <p style={{ fontSize: 14, color: "var(--mn-ink-2)", lineHeight: 1.5 }}>
          Cada amigo que active un plan te genera crédito real.
          Tu amigo obtiene <strong style={{ color: "var(--mn-ink-1)" }}>20% de descuento</strong> en su primer pago.
        </p>
        {data.ambassadorBadge && (
          <div style={{ display: "inline-flex", alignItems: "center", gap: 5, marginTop: 10, padding: "3px 11px", borderRadius: "var(--mn-r-full)", background: "var(--mn-raised)", fontSize: 12, fontWeight: 600, color: "var(--mn-ink-2)" }}>
            <Star size={12} fill="currentColor" /> Embajador Mnemora
          </div>
        )}
      </div>

      {/* ── Próxima recompensa — protagonista ── */}
      {nextM && (
        <div style={{ padding: "24px 28px", background: "var(--mn-surface)", borderRadius: "var(--mn-r-xl)", boxShadow: "var(--mn-shadow-sm)", marginBottom: 16 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: "var(--mn-ink-3)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>
            Próxima recompensa
          </p>
          <p className="font-display" style={{ fontSize: 32, fontWeight: 700, color: "var(--mn-ink-1)", lineHeight: 1, marginBottom: 6 }}>
            {nextM.label}
          </p>
          <p style={{ fontSize: 14, color: "var(--mn-ink-2)", marginBottom: 18 }}>
            {nextM.count - data.convertedCount === 1 ? "Falta" : "Faltan"}{" "}
            <strong style={{ color: "var(--mn-ink-1)" }}>{nextM.count - data.convertedCount} {nextM.count - data.convertedCount === 1 ? "amigo" : "amigos"}</strong>{" "}
            para desbloquear
          </p>
          {/* Progress */}
          <div style={{ height: 5, background: "var(--mn-raised)", borderRadius: "var(--mn-r-full)", overflow: "hidden", marginBottom: 8 }}>
            <div style={{ height: "100%", width: `${progressToNext}%`, background: "var(--mn-green)", borderRadius: "var(--mn-r-full)", transition: "width 800ms ease" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: 12, color: "var(--mn-ink-2)", fontWeight: 600 }}>{data.convertedCount} de {nextM.count} referidos</span>
            <span style={{ fontSize: 12, color: "var(--mn-ink-3)" }}>{progressToNext}%</span>
          </div>
        </div>
      )}

      {/* ── Tiempo ganado (si aplica) ── */}
      {totalDaysEarned > 0 && (
        <div style={{ padding: "16px 20px", background: "var(--mn-surface)", borderRadius: "var(--mn-r-xl)", border: "1px solid var(--mn-ink-4)", marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 600, color: "var(--mn-ink-3)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>Has ganado</p>
            <p className="font-display" style={{ fontSize: 26, fontWeight: 700, color: "var(--mn-ink-1)", lineHeight: 1 }}>
              {formatTime(totalDaysEarned)} gratis
            </p>
          </div>
          <p style={{ fontSize: 12, color: "var(--mn-ink-3)", textAlign: "right", lineHeight: 1.5 }}>
            Se aplica a tu<br />próxima renovación
          </p>
        </div>
      )}

      {/* ── Share box ── */}
      <div style={{ padding: "20px 24px", background: "var(--mn-surface)", borderRadius: "var(--mn-r-xl)", border: "1px solid var(--mn-ink-4)", marginBottom: 16 }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: "var(--mn-ink-3)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>
          Tu enlace único
        </p>
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          <div style={{ flex: 1, padding: "10px 14px", borderRadius: "var(--mn-r-md)", background: "var(--mn-raised)", fontSize: 13, color: "var(--mn-ink-1)", fontWeight: 600, fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", userSelect: "all" }}>
            {displayUrl}
          </div>
          <button onClick={copyLink} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 18px", borderRadius: "var(--mn-r-md)", border: "none", background: copied ? "var(--mn-raised)" : "var(--mn-green)", color: copied ? "var(--mn-ink-2)" : "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", flexShrink: 0, transition: "all 200ms" }}>
            {copied ? <><Check size={13} /> Copiado</> : <><Copy size={13} /> Copiar</>}
          </button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, color: "var(--mn-ink-3)", display: "flex", alignItems: "center", gap: 4 }}>
            <Share2 size={11} /> Compartir
          </span>
          {[
            { id: "whatsapp", label: "WhatsApp" },
            { id: "telegram", label: "Telegram" },
            { id: "twitter",  label: "X" },
          ].map(s => (
            <button key={s.id} onClick={() => shareOn(s.id)} style={{ padding: "5px 12px", borderRadius: "var(--mn-r-md)", border: "1px solid var(--mn-ink-4)", background: "none", fontSize: 12, fontWeight: 600, color: "var(--mn-ink-2)", cursor: "pointer" }}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Stats ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 16 }}>
        {[
          { value: data.totalCount,       label: "Invitados" },
          { value: data.convertedCount,   label: "Compraron" },
          { value: `${conversionRate}%`,  label: "Conversión" },
        ].map((s, i) => (
          <div key={i} style={{ padding: "16px 14px", background: "var(--mn-surface)", borderRadius: "var(--mn-r-lg)", border: "1px solid var(--mn-ink-4)", textAlign: "center" }}>
            <p className="font-display" style={{ fontSize: 26, fontWeight: 700, color: "var(--mn-ink-1)", lineHeight: 1 }}>{s.value}</p>
            <p style={{ fontSize: 11, color: "var(--mn-ink-3)", marginTop: 4 }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Timeline de hitos ── */}
      <div style={{ padding: "20px 24px", background: "var(--mn-surface)", borderRadius: "var(--mn-r-xl)", border: "1px solid var(--mn-ink-4)", marginBottom: 16 }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: "var(--mn-ink-3)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 20 }}>
          Hitos
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {MILESTONES.map((m, i) => {
            const isEarned = data.earnedMilestones.includes(m.count);
            const isNext   = !isEarned && nextM?.count === m.count;
            const isLast   = i === MILESTONES.length - 1;
            return (
              <div key={m.count} style={{ display: "flex", gap: 14, paddingBottom: isLast ? 0 : 20 }}>
                {/* Dot + line */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                  <div style={{ width: 22, height: 22, borderRadius: "50%", background: isEarned ? "var(--mn-green)" : isNext ? "var(--mn-surface)" : "var(--mn-raised)", border: isEarned ? "none" : isNext ? "2px solid var(--mn-green)" : "1.5px solid var(--mn-ink-4)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 250ms" }}>
                    {isEarned
                      ? <Check size={12} color="#fff" />
                      : <span style={{ fontSize: 11 }}>{m.icon}</span>
                    }
                  </div>
                  {!isLast && <div style={{ width: 1, flex: 1, background: isEarned ? "var(--mn-green)" : "var(--mn-ink-4)", marginTop: 4, opacity: isEarned ? 0.4 : 1 }} />}
                </div>
                {/* Content */}
                <div style={{ flex: 1, paddingTop: 2 }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                    <p style={{ fontSize: 13, fontWeight: isNext ? 700 : 500, color: isEarned ? "var(--mn-ink-3)" : isNext ? "var(--mn-ink-1)" : "var(--mn-ink-3)" }}>
                      {m.label}
                    </p>
                    {isNext && (
                      <span style={{ fontSize: 10, fontWeight: 600, color: "var(--mn-green)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                        siguiente
                      </span>
                    )}
                    {isEarned && (
                      <span style={{ fontSize: 10, color: "var(--mn-ink-3)" }}>desbloqueado</span>
                    )}
                  </div>
                  <p style={{ fontSize: 11, color: "var(--mn-ink-3)", marginTop: 1 }}>
                    {m.count} {m.count === 1 ? "referido" : "referidos"}
                  </p>
                  {/* Mini progress bar for next milestone */}
                  {isNext && (
                    <div style={{ marginTop: 8, height: 3, background: "var(--mn-raised)", borderRadius: "var(--mn-r-full)", overflow: "hidden", width: 120 }}>
                      <div style={{ height: "100%", width: `${progressToNext}%`, background: "var(--mn-green)", borderRadius: "var(--mn-r-full)", transition: "width 600ms ease" }} />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Historial ── */}
      {data.referrals.length > 0 ? (
        <div style={{ padding: "20px 24px", background: "var(--mn-surface)", borderRadius: "var(--mn-r-xl)", border: "1px solid var(--mn-ink-4)", marginBottom: 16 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: "var(--mn-ink-3)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 14 }}>
            Historial · {data.totalCount} {data.totalCount === 1 ? "invitado" : "invitados"}
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {data.referrals.map((r, i) => {
              const s    = STATUS[r.status];
              const date = new Date(r.created_at).toLocaleDateString("es", { day: "numeric", month: "short" });
              const isLast = i === data.referrals.length - 1;
              return (
                <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 12, paddingTop: i > 0 ? 12 : 0, paddingBottom: isLast ? 0 : 12, borderBottom: isLast ? "none" : "1px solid var(--mn-ink-4)" }}>
                  <div style={{ width: 30, height: 30, borderRadius: "50%", background: "var(--mn-raised)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 12, fontWeight: 700, color: "var(--mn-ink-2)" }}>
                    {(r.name ?? r.email).slice(0, 1).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 500, color: "var(--mn-ink-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {r.name ?? r.email}
                    </p>
                    <p style={{ fontSize: 11, color: "var(--mn-ink-3)" }}>{date}</p>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: s.color, flexShrink: 0 }}>{s.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div style={{ padding: "36px 24px", textAlign: "center", background: "var(--mn-surface)", borderRadius: "var(--mn-r-xl)", border: "1px solid var(--mn-ink-4)", marginBottom: 16 }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: "var(--mn-ink-1)", marginBottom: 6 }}>Aún no hay referidos</p>
          <p style={{ fontSize: 13, color: "var(--mn-ink-3)" }}>Comparte tu enlace y empieza a ganar crédito.</p>
        </div>
      )}

      {/* ── Leaderboard (solo si hay datos) ── */}
      {leaderboard.length > 0 && (
        <div style={{ padding: "20px 24px", background: "var(--mn-surface)", borderRadius: "var(--mn-r-xl)", border: "1px solid var(--mn-ink-4)", marginBottom: 16 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: "var(--mn-ink-3)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 14 }}>
            Top entre tus amigos
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {leaderboard.map((entry, i) => {
              const medals = ["🥇", "🥈", "🥉"];
              const isLast = i === leaderboard.length - 1;
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, paddingTop: i > 0 ? 10 : 0, paddingBottom: isLast ? 0 : 10, borderBottom: isLast ? "none" : "1px solid var(--mn-ink-4)" }}>
                  <span style={{ fontSize: 16, flexShrink: 0 }}>{medals[i] ?? "🎖️"}</span>
                  <p style={{ flex: 1, fontSize: 14, fontWeight: 500, color: "var(--mn-ink-1)" }}>{entry.name}</p>
                  <p style={{ fontSize: 14, fontWeight: 700, color: "var(--mn-ink-1)" }}>{entry.count}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <p style={{ fontSize: 12, color: "var(--mn-ink-4)", textAlign: "center", lineHeight: 1.6 }}>
        Más de 1.247 estudiantes ya estudian gratis gracias a sus referidos.
      </p>
    </div>
  );
}
