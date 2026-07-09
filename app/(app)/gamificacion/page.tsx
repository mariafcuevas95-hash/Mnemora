"use client";

import { useEffect, useState } from "react";
import { Flame, Star, Trophy, Loader2, Zap } from "lucide-react";
import type { GamificationData } from "@/app/api/gamificacion/route";

function XpBar({ days }: { days: { date: string; xp: number }[] }) {
  const max = Math.max(...days.map(d => d.xp), 1);
  const labels = ["L", "M", "M", "J", "V", "S", "D"];
  const today = new Date().toISOString().slice(0, 10);

  // Align labels to actual days of week
  const dayLabels = days.map(d => {
    const dow = new Date(d.date + "T12:00:00").getDay(); // 0=Sun
    return ["D", "L", "M", "M", "J", "V", "S"][dow];
  });

  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 64 }}>
      {days.map((d, i) => {
        const h = Math.round((d.xp / max) * 52);
        const isToday = d.date === today;
        return (
          <div key={d.date} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <div style={{ width: "100%", height: 52, display: "flex", alignItems: "flex-end" }}>
              <div style={{
                width: "100%",
                height: d.xp > 0 ? Math.max(4, h) : 2,
                background: isToday ? "var(--mn-green)" : d.xp > 0 ? "#1B3F2F60" : "var(--mn-raised)",
                borderRadius: 3,
                transition: "height 400ms ease",
              }} />
            </div>
            <span style={{ fontSize: 9, color: isToday ? "var(--mn-green)" : "var(--mn-ink-4)", fontWeight: isToday ? 700 : 400 }}>
              {dayLabels[i]}
            </span>
          </div>
        );
      })}
      {/* Suppress unused labels warning */}
      <span style={{ display: "none" }}>{labels.join("")}</span>
    </div>
  );
}

export default function GamificacionPage() {
  const [data, setData] = useState<GamificationData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/gamificacion")
      .then(r => r.ok ? r.json() : null)
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "50vh", gap: 10 }}>
      <Loader2 size={18} color="var(--mn-green)" style={{ animation: "spin 1s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (!data) return null;

  const earned = data.achievements.filter(a => a.earned);
  const locked = data.achievements.filter(a => !a.earned);
  const weekXp  = data.recentXp.reduce((s, d) => s + d.xp, 0);

  return (
    <div style={{ maxWidth: 640, padding: "28px 20px" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 className="font-display" style={{ fontSize: 22, fontWeight: 800, color: "var(--mn-ink-1)", marginBottom: 4 }}>
          Mi progreso
        </h1>
        <p style={{ fontSize: 13, color: "var(--mn-ink-3)" }}>
          {earned.length} logro{earned.length !== 1 ? "s" : ""} desbloqueado{earned.length !== 1 ? "s" : ""} de {data.achievements.length}
        </p>
      </div>

      {/* XP + nivel + racha */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
        {/* Nivel */}
        <div style={{ background: "var(--mn-surface)", borderRadius: "var(--mn-r-xl)", border: "1px solid var(--mn-ink-4)", padding: "18px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <Star size={15} color="var(--mn-green)" />
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--mn-ink-3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Nivel</span>
          </div>
          <p className="font-display" style={{ fontSize: 20, fontWeight: 800, color: "var(--mn-ink-1)", marginBottom: 2 }}>{data.level.name}</p>
          <p style={{ fontSize: 12, color: "var(--mn-ink-3)", marginBottom: 10 }}>
            {data.level.nextName ? `→ ${data.level.nextName}` : "Nivel máximo"}
          </p>
          <div style={{ height: 5, background: "var(--mn-raised)", borderRadius: "var(--mn-r-full)", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${data.level.progressPct}%`, background: "var(--mn-green)", borderRadius: "var(--mn-r-full)", transition: "width 600ms ease" }} />
          </div>
          {data.level.nextXp && (
            <p style={{ fontSize: 11, color: "var(--mn-ink-4)", marginTop: 6 }}>
              {data.xpTotal} / {data.level.nextXp} XP
            </p>
          )}
        </div>

        {/* Racha */}
        <div style={{ background: "var(--mn-surface)", borderRadius: "var(--mn-r-xl)", border: "1px solid var(--mn-ink-4)", padding: "18px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <Flame size={15} color={data.streakDays >= 3 ? "#F97316" : "var(--mn-ink-3)"} />
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--mn-ink-3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Racha</span>
          </div>
          <p className="font-display" style={{ fontSize: 32, fontWeight: 800, color: data.streakDays >= 3 ? "#F97316" : "var(--mn-ink-1)", lineHeight: 1 }}>
            {data.streakDays}
          </p>
          <p style={{ fontSize: 12, color: "var(--mn-ink-3)", marginTop: 4 }}>
            día{data.streakDays !== 1 ? "s" : ""} consecutivo{data.streakDays !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* XP esta semana + gráfico */}
      <div style={{ background: "var(--mn-surface)", borderRadius: "var(--mn-r-xl)", border: "1px solid var(--mn-ink-4)", padding: "18px 20px", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Zap size={15} color="var(--mn-green)" />
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--mn-ink-3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>XP esta semana</span>
          </div>
          <span className="font-display" style={{ fontSize: 18, fontWeight: 800, color: "var(--mn-green)" }}>+{weekXp}</span>
        </div>
        <XpBar days={data.recentXp} />
        <p style={{ fontSize: 11, color: "var(--mn-ink-4)", marginTop: 10, textAlign: "right" }}>
          {data.xpTotal} XP total
        </p>
      </div>

      {/* Logros desbloqueados */}
      {earned.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "var(--mn-ink-3)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>
            Desbloqueados ({earned.length})
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {earned.map(a => (
              <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", background: "var(--mn-surface)", border: "1px solid var(--mn-ink-4)", borderRadius: "var(--mn-r-lg)" }}>
                <div style={{ width: 38, height: 38, borderRadius: "var(--mn-r-lg)", background: "var(--mn-raised)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 20 }}>
                  {a.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: "var(--mn-ink-1)", marginBottom: 2 }}>{a.title}</p>
                  <p style={{ fontSize: 12, color: "var(--mn-ink-3)" }}>{a.description}</p>
                </div>
                {a.earnedAt && (
                  <p style={{ fontSize: 11, color: "var(--mn-ink-4)", flexShrink: 0 }}>
                    {new Date(a.earnedAt).toLocaleDateString("es", { day: "numeric", month: "short" })}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Logros bloqueados */}
      {locked.length > 0 && (
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, color: "var(--mn-ink-3)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>
            Por desbloquear ({locked.length})
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {locked.map(a => (
              <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: "var(--mn-raised)", border: "1px solid var(--mn-ink-4)", borderRadius: "var(--mn-r-lg)", opacity: 0.6 }}>
                <div style={{ width: 32, height: 32, borderRadius: "var(--mn-r-md)", background: "var(--mn-ink-4)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Trophy size={14} color="var(--mn-ink-3)" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: "var(--mn-ink-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.title}</p>
                  <p style={{ fontSize: 11, color: "var(--mn-ink-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Estado vacío */}
      {data.xpTotal === 0 && (
        <div style={{ textAlign: "center", padding: "40px 24px" }}>
          <p style={{ fontSize: 32, marginBottom: 12 }}>🎓</p>
          <p style={{ fontSize: 15, fontWeight: 600, color: "var(--mn-ink-1)", marginBottom: 6 }}>Comienza a estudiar para ganar XP</p>
          <p style={{ fontSize: 13, color: "var(--mn-ink-3)", lineHeight: 1.6 }}>
            Completa quizzes, repasa flashcards y sube documentos para acumular XP y desbloquear logros.
          </p>
        </div>
      )}
    </div>
  );
}
