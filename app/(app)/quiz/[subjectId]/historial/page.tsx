"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, CheckCircle, XCircle, TrendingUp, Loader2 } from "lucide-react";

interface Session {
  id: string;
  pct: number;
  correct: number;
  total: number;
  created_at: string;
  document_id: string | null;
  documentName?: string;
}

interface HistorialData {
  subjectName: string;
  sessions: Session[];
  avgPct: number;
  bestPct: number;
  totalSessions: number;
}

export default function QuizHistorialPage() {
  const { subjectId } = useParams<{ subjectId: string }>();
  const [data, setData] = useState<HistorialData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/quiz/${subjectId}/historial`)
      .then(r => r.ok ? r.json() : null)
      .then(setData)
      .catch(() => null)
      .finally(() => setLoading(false));
  }, [subjectId]);

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "50vh" }}>
      <Loader2 size={20} color="var(--mn-green)" style={{ animation: "spin 1s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (!data) return (
    <div style={{ padding: "48px 24px", textAlign: "center", color: "var(--mn-ink-3)" }}>
      <p>No se pudo cargar el historial.</p>
    </div>
  );

  return (
    <div style={{ maxWidth: 580, padding: "28px 24px" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
        <Link href="/quiz" style={{ color: "var(--mn-ink-3)", display: "flex", textDecoration: "none" }}>
          <ChevronLeft size={20} />
        </Link>
        <div>
          <h1 className="font-display" style={{ fontSize: 18, fontWeight: 800, color: "var(--mn-ink-1)" }}>
            Historial de quiz
          </h1>
          <p style={{ fontSize: 12, color: "var(--mn-ink-3)" }}>{data.subjectName}</p>
        </div>
      </div>

      {/* Stats */}
      {data.totalSessions > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 24 }}>
          {[
            { label: "Sesiones", value: data.totalSessions },
            { label: "Promedio", value: `${data.avgPct}%` },
            { label: "Mejor", value: `${data.bestPct}%` },
          ].map(({ label, value }) => (
            <div key={label} style={{ background: "var(--mn-surface)", borderRadius: "var(--mn-r-lg)", padding: "14px 16px", border: "1px solid var(--mn-ink-4)", textAlign: "center" }}>
              <p style={{ fontSize: 22, fontWeight: 800, color: "var(--mn-ink-1)", fontVariantNumeric: "tabular-nums" }}>{value}</p>
              <p style={{ fontSize: 11, color: "var(--mn-ink-3)", marginTop: 2 }}>{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Trend mini chart */}
      {data.sessions.length >= 2 && (
        <div style={{ background: "var(--mn-surface)", borderRadius: "var(--mn-r-xl)", padding: "16px 20px", border: "1px solid var(--mn-ink-4)", marginBottom: 20 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: "var(--mn-ink-3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>
            Evolución
          </p>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 48 }}>
            {data.sessions.slice().reverse().slice(-15).map((s, i) => (
              <div
                key={i}
                title={`${s.pct}%`}
                style={{
                  flex: 1,
                  height: `${Math.max(4, s.pct)}%`,
                  background: s.pct >= 70 ? "var(--mn-green)" : "var(--mn-amber)",
                  borderRadius: 3,
                  opacity: 0.8,
                  minWidth: 6,
                }}
              />
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
            <p style={{ fontSize: 10, color: "var(--mn-ink-4)" }}>Más antiguo</p>
            <p style={{ fontSize: 10, color: "var(--mn-ink-4)" }}>Más reciente</p>
          </div>
        </div>
      )}

      {/* Sessions list */}
      {data.sessions.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 0", color: "var(--mn-ink-3)" }}>
          <TrendingUp size={28} style={{ marginBottom: 10, opacity: 0.35 }} />
          <p style={{ fontSize: 14, fontWeight: 600, color: "var(--mn-ink-2)", marginBottom: 4 }}>Sin sesiones aún</p>
          <p style={{ fontSize: 13, marginBottom: 20 }}>Haz tu primer quiz para ver el historial.</p>
          <Link href={`/quiz/${subjectId}`} className="mn-btn-primary" style={{ fontSize: 13, textDecoration: "none" }}>
            Hacer quiz
          </Link>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: "var(--mn-ink-3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
            Sesiones recientes
          </p>
          {data.sessions.map(s => (
            <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "13px 16px", background: "var(--mn-surface)", borderRadius: "var(--mn-r-lg)", border: "1px solid var(--mn-ink-4)" }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: s.pct >= 70 ? "#DCFCE7" : "#FEF3C7", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {s.pct >= 70
                  ? <CheckCircle size={18} color="#16A34A" />
                  : <XCircle size={18} color="#D97706" />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                  <p style={{ fontSize: 20, fontWeight: 800, color: "var(--mn-ink-1)", fontVariantNumeric: "tabular-nums" }}>{s.pct}%</p>
                  <p style={{ fontSize: 12, color: "var(--mn-ink-3)" }}>{s.correct}/{s.total} correctas</p>
                </div>
                <p style={{ fontSize: 11, color: "var(--mn-ink-3)", marginTop: 1 }}>
                  {new Date(s.created_at).toLocaleDateString("es", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  {s.documentName && ` · ${s.documentName}`}
                </p>
              </div>
              <div style={{ height: 32, width: 3, borderRadius: 2, background: s.pct >= 70 ? "#16A34A" : "#D97706", flexShrink: 0 }} />
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: 24 }}>
        <Link href={`/quiz/${subjectId}`} className="mn-btn-primary" style={{ fontSize: 14, textDecoration: "none", justifyContent: "center", width: "100%" }}>
          Nuevo quiz
        </Link>
      </div>
    </div>
  );
}
