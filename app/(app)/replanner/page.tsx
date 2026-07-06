"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle, RefreshCw } from "lucide-react";
import type { ReplannerResult, DayPlan } from "@/app/api/replanner/route";

const PRIORITY_DOT: Record<string, string> = {
  alta:  "var(--mn-amber)",
  media: "var(--mn-green)",
  baja:  "var(--mn-ink-4)",
};

function DayCard({ day }: { day: DayPlan }) {
  const isEmpty = day.tasks.length === 0;
  return (
    <div style={{ background: "var(--mn-surface)", border: "1px solid var(--mn-ink-4)", borderRadius: "var(--mn-r-xl)", padding: "16px 18px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: "var(--mn-ink-1)", textTransform: "capitalize" }}>{day.label}</p>
        {!isEmpty && <p style={{ fontSize: 11, color: "var(--mn-ink-3)" }}>{day.totalMin} min</p>}
      </div>
      {isEmpty ? (
        <p style={{ fontSize: 12, color: "var(--mn-ink-3)" }}>Descanso</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {day.tasks.map((t, i) => (
            <div key={i} style={{ background: "var(--mn-canvas)", borderRadius: "var(--mn-r-lg)", padding: "8px 10px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: PRIORITY_DOT[t.priority] ?? "var(--mn-ink-4)", flexShrink: 0 }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--mn-ink-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.subjectName}</span>
                <span style={{ fontSize: 11, color: "var(--mn-ink-3)", marginLeft: "auto", flexShrink: 0 }}>{t.durationMin} min</span>
              </div>
              <p style={{ fontSize: 12, color: "var(--mn-ink-2)", lineHeight: 1.4, paddingLeft: 12 }}>{t.activity}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ReplannerPage() {
  const [hoursPerDay, setHoursPerDay] = useState(2);
  const [loading, setLoading]         = useState(false);
  const [locked, setLocked]           = useState(false);
  const [error, setError]             = useState("");
  const [result, setResult]           = useState<ReplannerResult | null>(null);
  const [accepted, setAccepted]       = useState(false);

  async function handleReplan() {
    setLoading(true); setError(""); setResult(null); setAccepted(false);
    try {
      const r = await fetch("/api/replanner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weeklyHoursPerDay: hoursPerDay }),
      });
      if (r.status === 403) { setLocked(true); return; }
      if (!r.ok) { setError("Error generando el plan. Intenta de nuevo."); return; }
      setResult(await r.json());
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  if (locked) return (
    <div style={{ padding: "48px 24px", maxWidth: 480, margin: "0 auto", textAlign: "center" }}>
      <p style={{ fontSize: 15, fontWeight: 700, color: "var(--mn-ink-1)", marginBottom: 8 }}>Replanificador inteligente</p>
      <p style={{ fontSize: 14, color: "var(--mn-ink-2)", marginBottom: 24, lineHeight: 1.65 }}>
        La IA analiza tus exámenes, conceptos débiles y disponibilidad para generar un plan semanal personalizado. Disponible en Premium.
      </p>
      <Link href="/upgrade" className="mn-btn-primary" style={{ display: "inline-flex", fontSize: 14, textDecoration: "none" }}>
        Ver planes
      </Link>
    </div>
  );

  return (
    <div style={{ padding: "24px 20px", maxWidth: 720, margin: "0 auto" }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <div style={{ marginBottom: 28 }}>
        <h1 className="font-display" style={{ fontSize: 22, fontWeight: 800, color: "var(--mn-ink-1)", marginBottom: 4 }}>Replanificador</h1>
        <p style={{ fontSize: 13, color: "var(--mn-ink-3)" }}>
          La IA analiza tu cobertura, exámenes próximos y conceptos débiles para proponer un plan semanal.
        </p>
      </div>

      {/* Qué va a analizar */}
      {!result && (
        <div style={{ background: "var(--mn-surface)", border: "1px solid var(--mn-ink-4)", borderRadius: "var(--mn-r-xl)", padding: "16px 20px", maxWidth: 440, marginBottom: 16 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: "var(--mn-ink-3)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>Mnemora va a analizar</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[
              "Tus exámenes próximos en el calendario",
              "Conceptos con dominio bajo en cada materia",
              "Tu progreso actual en flashcards",
              "Las horas disponibles que configures",
            ].map((item, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                <div style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--mn-green)", flexShrink: 0, marginTop: 6 }} />
                <p style={{ fontSize: 13, color: "var(--mn-ink-2)", lineHeight: 1.5 }}>{item}</p>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 12, color: "var(--mn-ink-3)", marginTop: 12 }}>El plan propuesto no modifica nada hasta que lo aceptes.</p>
        </div>
      )}

      {/* Config */}
      {!result && (
        <div style={{ background: "var(--mn-surface)", border: "1px solid var(--mn-ink-4)", borderRadius: "var(--mn-r-xl)", padding: "22px 24px", maxWidth: 440, marginBottom: 24, boxShadow: "var(--mn-shadow-sm)" }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "var(--mn-ink-1)", marginBottom: 16 }}>Configuración</p>
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 13, color: "var(--mn-ink-2)", display: "block", marginBottom: 10 }}>
              ¿Cuántas horas puedes estudiar por día?
            </label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {[1, 1.5, 2, 3, 4].map(h => (
                <button
                  key={h}
                  onClick={() => setHoursPerDay(h)}
                  style={{
                    padding: "8px 14px", borderRadius: "var(--mn-r-lg)",
                    border: `1.5px solid ${hoursPerDay === h ? "var(--mn-ink-1)" : "var(--mn-ink-4)"}`,
                    background: hoursPerDay === h ? "var(--mn-ink-1)" : "var(--mn-surface)",
                    color: hoursPerDay === h ? "#fff" : "var(--mn-ink-2)",
                    fontSize: 13, fontWeight: 600, cursor: "pointer",
                  }}
                >
                  {h}h
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={handleReplan}
            disabled={loading}
            className="mn-btn-primary"
            style={{ width: "100%", justifyContent: "center", fontSize: 14, opacity: loading ? 0.7 : 1, cursor: loading ? "not-allowed" : "pointer" }}
          >
            {loading ? (
              <>
                <span style={{ display: "inline-block", width: 15, height: 15, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                Analizando tu semestre…
              </>
            ) : (
              <><RefreshCw size={14} /> Replanificar semestre</>
            )}
          </button>
        </div>
      )}

      {error && (
        <div style={{ padding: "12px 16px", borderRadius: "var(--mn-r-lg)", borderLeft: "3px solid var(--mn-amber)", background: "var(--mn-surface)", border: "1px solid var(--mn-ink-4)", marginBottom: 20, fontSize: 13, color: "var(--mn-ink-2)" }}>
          {error}
        </div>
      )}

      {/* Resultado */}
      {result && !accepted && (
        <>
          {/* Diagnóstico */}
          <div style={{ padding: "16px 20px", background: "var(--mn-surface)", border: "1px solid var(--mn-ink-4)", borderLeft: "3px solid var(--mn-green)", borderRadius: "var(--mn-r-xl)", marginBottom: 16 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "var(--mn-ink-3)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>Diagnóstico</p>
            <p style={{ fontSize: 14, color: "var(--mn-ink-1)", lineHeight: 1.65 }}>{result.diagnosis}</p>
          </div>

          {/* Cambios */}
          {result.changes.length > 0 && (
            <div style={{ background: "var(--mn-surface)", border: "1px solid var(--mn-ink-4)", borderRadius: "var(--mn-r-xl)", padding: "16px 20px", marginBottom: 20 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "var(--mn-ink-3)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>Cambios propuestos</p>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {result.changes.map((c, i) => (
                  <li key={i} style={{ fontSize: 13, color: "var(--mn-ink-2)", marginBottom: 6, lineHeight: 1.55 }}>{c}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Plan semanal */}
          <p style={{ fontSize: 14, fontWeight: 700, color: "var(--mn-ink-1)", marginBottom: 12 }}>Plan para la próxima semana</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10, marginBottom: 24 }}>
            {result.plan.map(day => <DayCard key={day.date} day={day} />)}
          </div>

          {/* Acciones */}
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={() => setAccepted(true)}
              className="mn-btn-primary"
              style={{ fontSize: 14, display: "flex", alignItems: "center", gap: 6 }}
            >
              <CheckCircle size={15} /> Aceptar plan
            </button>
            <button
              onClick={() => { setResult(null); setAccepted(false); }}
              style={{ padding: "12px 20px", background: "var(--mn-surface)", color: "var(--mn-ink-2)", borderRadius: "var(--mn-r-lg)", border: "1px solid var(--mn-ink-4)", cursor: "pointer", fontSize: 14, fontWeight: 600 }}
            >
              Rehacer
            </button>
          </div>
        </>
      )}

      {/* Aceptado */}
      {result && accepted && (
        <div style={{ textAlign: "center", padding: "40px 0" }}>
          <div style={{ width: 52, height: 52, borderRadius: "50%", background: "var(--mn-canvas)", border: "1px solid var(--mn-ink-4)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <CheckCircle size={24} color="var(--mn-green)" />
          </div>
          <p className="font-display" style={{ fontSize: 18, fontWeight: 800, color: "var(--mn-ink-1)", marginBottom: 8 }}>Plan aceptado</p>
          <p style={{ fontSize: 14, color: "var(--mn-ink-2)", marginBottom: 28, lineHeight: 1.65 }}>
            Tienes un plan para esta semana. Puedes verlo en el dashboard o replanificar cuando quieras.
          </p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            <Link href="/dashboard" className="mn-btn-primary" style={{ fontSize: 14, textDecoration: "none" }}>
              Ir al dashboard
            </Link>
            <button
              onClick={() => { setResult(null); setAccepted(false); }}
              style={{ padding: "12px 20px", background: "var(--mn-surface)", color: "var(--mn-ink-2)", borderRadius: "var(--mn-r-lg)", border: "1px solid var(--mn-ink-4)", cursor: "pointer", fontSize: 14, fontWeight: 600 }}
            >
              Replanificar de nuevo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
