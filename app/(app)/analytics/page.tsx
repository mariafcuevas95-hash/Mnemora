"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { AnalyticsData, DayActivity, SubjectAnalytics } from "@/app/api/analytics/route";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function xpColor(xp: number): string {
  if (xp === 0) return "var(--mn-raised)";
  if (xp < 20)  return "#BBF7D0";
  if (xp < 60)  return "#4ADE80";
  return "var(--mn-green)";
}

function gradeLabel(est: number | null): string {
  if (est === null) return "—";
  return `${est.toFixed(1)} / 10`;
}

function speedLabel(speed: number | null): string {
  if (speed === null) return "—";
  if (speed > 0.7) return "Rápido";
  if (speed > 0.4) return "Moderado";
  return "Lento";
}

const WEEK_DAYS = ["L", "M", "X", "J", "V", "S", "D"];

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div style={{ background: "var(--mn-surface)", border: "1px solid var(--mn-ink-4)", borderRadius: "var(--mn-r-xl)", padding: "18px 20px", flex: "1 1 120px" }}>
      <p style={{ fontSize: 11, fontWeight: 700, color: "var(--mn-ink-3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>{label}</p>
      <p className="font-display" style={{ fontSize: 28, fontWeight: 800, color: "var(--mn-ink-1)", lineHeight: 1 }}>{value}</p>
      {sub && <p style={{ fontSize: 12, color: "var(--mn-ink-3)", marginTop: 4 }}>{sub}</p>}
    </div>
  );
}

function ActivityHeatmap({ activity }: { activity: DayActivity[] }) {
  const weeks: (DayActivity | null)[][] = [[], [], [], []];
  const sorted = [...activity].sort((a, b) => a.date.localeCompare(b.date));
  for (let w = 0; w < 4; w++) {
    for (let d = 0; d < 7; d++) {
      weeks[w][d] = sorted[w * 7 + d] ?? null;
    }
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 4 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, marginRight: 4 }}>
          {WEEK_DAYS.map(d => (
            <div key={d} style={{ width: 16, height: 16, fontSize: 10, color: "var(--mn-ink-3)", display: "flex", alignItems: "center", justifyContent: "center" }}>{d}</div>
          ))}
        </div>
        {weeks.map((week, wi) => (
          <div key={wi} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {week.map((day, di) => (
              <div
                key={di}
                title={day ? `${day.date}: ${day.xp} XP` : ""}
                style={{ width: 16, height: 16, borderRadius: 3, background: day ? xpColor(day.xp) : "var(--mn-raised)" }}
              />
            ))}
          </div>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10 }}>
        <span style={{ fontSize: 11, color: "var(--mn-ink-3)" }}>Menos</span>
        {[0, 10, 40, 80].map(xp => (
          <div key={xp} style={{ width: 12, height: 12, borderRadius: 2, background: xpColor(xp) }} />
        ))}
        <span style={{ fontSize: 11, color: "var(--mn-ink-3)" }}>Más</span>
      </div>
    </div>
  );
}

function XpBar({ label, total, max }: { label: string; total: number; max: number }) {
  const pct = max > 0 ? (total / max) * 100 : 0;
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
        <span style={{ fontSize: 13, color: "var(--mn-ink-2)" }}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--mn-ink-1)" }}>{total} XP</span>
      </div>
      <div style={{ height: 5, background: "var(--mn-raised)", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: "var(--mn-green)", borderRadius: 3, transition: "width 600ms ease" }} />
      </div>
    </div>
  );
}

function SubjectCard({ s }: { s: SubjectAnalytics }) {
  const inProgressCount = s.practicedCount + s.learningCount;
  const inProgressPct   = s.totalCount > 0 ? Math.round((inProgressCount / s.totalCount) * 100) : 0;

  return (
    <div style={{ background: "var(--mn-surface)", border: "1px solid var(--mn-ink-4)", borderRadius: "var(--mn-r-xl)", padding: "18px 20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: "var(--mn-ink-1)", flex: 1, marginRight: 12 }}>{s.name}</p>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <p className="font-display" style={{ fontSize: 16, fontWeight: 700, color: "var(--mn-ink-1)" }}>{gradeLabel(s.performanceEstimate)}</p>
          <p style={{ fontSize: 11, color: "var(--mn-ink-3)" }}>proyectada</p>
        </div>
      </div>
      <div style={{ height: 6, background: "var(--mn-raised)", borderRadius: 4, overflow: "hidden", display: "flex", marginBottom: 10 }}>
        <div style={{ width: `${s.masteredPct}%`, background: "var(--mn-green)" }} title={`Dominados: ${s.masteredCount}`} />
        <div style={{ width: `${inProgressPct}%`, background: "var(--mn-amber)" }} title="En progreso" />
      </div>
      <div style={{ display: "flex", gap: 16, fontSize: 12, color: "var(--mn-ink-2)" }}>
        <span><span style={{ fontWeight: 700, color: "var(--mn-ink-1)" }}>{s.masteredCount}</span> dominados</span>
        <span><span style={{ fontWeight: 700, color: "var(--mn-ink-2)" }}>{inProgressCount}</span> en progreso</span>
        <span style={{ color: "var(--mn-ink-3)" }}>{s.unknownCount} sin iniciar</span>
      </div>
      {(s.learningSpeed !== null || s.preferredStyle !== null) && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--mn-ink-4)", display: "flex", gap: 16, fontSize: 12, color: "var(--mn-ink-3)" }}>
          {s.learningSpeed !== null && <span>Velocidad: <b style={{ color: "var(--mn-ink-2)" }}>{speedLabel(s.learningSpeed)}</b></span>}
          {s.preferredStyle && <span>Estilo: <b style={{ color: "var(--mn-ink-2)" }}>{s.preferredStyle}</b></span>}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [data, setData]     = useState<AnalyticsData | null>(null);
  const [locked, setLocked] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/analytics")
      .then(r => { if (r.status === 403) { setLocked(true); return null; } return r.json(); })
      .then(d => { if (d) setData(d); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ padding: "48px 24px", textAlign: "center" }}>
      <p style={{ color: "var(--mn-ink-3)", fontSize: 14 }}>Cargando analytics…</p>
    </div>
  );

  if (locked) return (
    <div style={{ padding: "48px 24px", maxWidth: 480, margin: "0 auto", textAlign: "center" }}>
      <p style={{ fontSize: 15, fontWeight: 700, color: "var(--mn-ink-1)", marginBottom: 8 }}>Analytics avanzados</p>
      <p style={{ fontSize: 14, color: "var(--mn-ink-2)", marginBottom: 24, lineHeight: 1.65 }}>
        Heatmap de actividad, velocidad de aprendizaje, nota proyectada por materia y logros. Disponible en Premium.
      </p>
      <Link href="/upgrade" className="mn-btn-primary" style={{ display: "inline-flex", fontSize: 14, textDecoration: "none" }}>
        Ver planes
      </Link>
    </div>
  );

  if (!data) return null;

  const maxXp = data.xpByType[0]?.total ?? 1;

  return (
    <div style={{ padding: "24px 20px", maxWidth: 700, margin: "0 auto" }}>
      <div style={{ marginBottom: 28 }}>
        <h1 className="font-display" style={{ fontSize: 22, fontWeight: 800, color: "var(--mn-ink-1)", marginBottom: 2 }}>Estadísticas</h1>
        <p style={{ fontSize: 13, color: "var(--mn-ink-3)" }}>Últimos 28 días</p>
      </div>

      {/* Stat cards */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
        <StatCard label="XP total"           value={data.xpTotal.toLocaleString()} />
        <StatCard label="Racha"              value={data.streakDays}           sub="días seguidos" />
        <StatCard label="Días activo"        value={data.totalSessions}        sub="últimos 28 días" />
        <StatCard label="Conceptos dominados" value={data.totalConceptsMastered} sub={`de ${data.totalConceptsKnown} practicados`} />
      </div>

      {/* Activity + XP por tipo */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16, marginBottom: 24 }}>
        <div style={{ background: "var(--mn-surface)", border: "1px solid var(--mn-ink-4)", borderRadius: "var(--mn-r-xl)", padding: "20px 22px" }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "var(--mn-ink-1)", marginBottom: 16 }}>Actividad diaria</p>
          <ActivityHeatmap activity={data.activity} />
        </div>

        <div style={{ background: "var(--mn-surface)", border: "1px solid var(--mn-ink-4)", borderRadius: "var(--mn-r-xl)", padding: "20px 22px" }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "var(--mn-ink-1)", marginBottom: 16 }}>XP por actividad</p>
          {data.xpByType.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--mn-ink-3)" }}>Sin actividad en este período</p>
          ) : (
            data.xpByType.map(x => <XpBar key={x.type} label={x.label} total={x.total} max={maxXp} />)
          )}
        </div>
      </div>

      {/* Por materia */}
      {data.subjects.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: "var(--mn-ink-1)", marginBottom: 14 }}>Por materia</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
            {data.subjects.map(s => <SubjectCard key={s.id} s={s} />)}
          </div>
        </div>
      )}

      {/* Logros */}
      <div>
        <p style={{ fontSize: 15, fontWeight: 700, color: "var(--mn-ink-1)", marginBottom: 14 }}>Logros desbloqueados</p>
        {data.achievements.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--mn-ink-3)" }}>Aún no tienes logros. Sigue estudiando para desbloquear el primero.</p>
        ) : (
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {data.achievements.map(a => (
              <div key={a.id} title={a.description} style={{ background: "var(--mn-surface)", border: "1px solid var(--mn-ink-4)", borderRadius: "var(--mn-r-xl)", padding: "12px 16px", display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 22 }}>{a.icon}</span>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "var(--mn-ink-1)" }}>{a.title}</p>
                  <p style={{ fontSize: 11, color: "var(--mn-ink-3)" }}>
                    {new Date(a.earnedAt).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
