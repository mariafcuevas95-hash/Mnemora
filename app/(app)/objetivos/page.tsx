"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Target, ChevronRight, BookOpen, Loader2, Plus } from "lucide-react";
import type { GoalProgress } from "@/app/api/objetivos/route";

const GOAL_LABELS: Record<string, string> = {
  pass:        "Aprobar",
  grade:       "Nota objetivo",
  exam:        "Preparar examen",
  scholarship: "Mantener beca",
  hours:       "Horas semanales",
};

const GOAL_COLORS: Record<string, string> = {
  pass:        "#1B3F2F",
  grade:       "#7C3AED",
  exam:        "#B45309",
  scholarship: "#0369A1",
  hours:       "#BE185D",
};

function progressColor(pct: number): string {
  if (pct >= 80) return "#16A34A";
  if (pct >= 50) return "var(--mn-amber)";
  return "var(--mn-error)";
}

function GoalCard({ g }: { g: GoalProgress }) {
  const color = g.goalType ? GOAL_COLORS[g.goalType] : "var(--mn-ink-3)";
  const pctColor = progressColor(g.progress);

  function subtitle(): string {
    if (!g.goalType) return "Sin objetivo definido";
    if (g.goalType === "grade") return `Meta: ${g.goalValue}/10`;
    if (g.goalType === "hours") return `Meta: ${g.goalValue}h/semana · ${g.weeklyActiveDays ?? 0} día${g.weeklyActiveDays !== 1 ? "s" : ""} activo${g.weeklyActiveDays !== 1 ? "s" : ""} esta semana`;
    if (g.goalType === "exam" && g.daysUntilExam !== null) {
      if (g.daysUntilExam === 0) return "Examen hoy";
      if (g.daysUntilExam === 1) return "Examen mañana";
      return `${g.nextExamTitle ?? "Examen"} · en ${g.daysUntilExam} días`;
    }
    if ((g.goalType === "pass" || g.goalType === "scholarship") && g.masteryPct !== null) {
      return `${g.masteryPct}% de conceptos dominados`;
    }
    return "Sin datos de progreso aún";
  }

  return (
    <div style={{ background: "var(--mn-surface)", borderRadius: "var(--mn-r-xl)", border: "1px solid var(--mn-ink-4)", padding: "18px 20px", boxShadow: "var(--mn-shadow-sm)" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: "var(--mn-ink-1)", marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {g.subjectName}
          </p>
          {g.goalType ? (
            <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 9px", borderRadius: "var(--mn-r-full)", background: color + "18", color, letterSpacing: "0.04em", textTransform: "uppercase" }}>
              {GOAL_LABELS[g.goalType]}
            </span>
          ) : (
            <Link href={`/materias/${g.subjectId}`} style={{ fontSize: 12, color: "var(--mn-ink-3)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}>
              <Plus size={11} /> Definir objetivo
            </Link>
          )}
        </div>
        <Link href={`/materias/${g.subjectId}`} style={{ color: "var(--mn-ink-4)", display: "flex", flexShrink: 0 }}>
          <ChevronRight size={16} />
        </Link>
      </div>

      {/* Progress bar */}
      {g.goalType && (
        <>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
            <p style={{ fontSize: 12, color: "var(--mn-ink-3)" }}>{subtitle()}</p>
            <p style={{ fontSize: 13, fontWeight: 700, color: pctColor }}>{g.progress}%</p>
          </div>
          <div style={{ height: 6, background: "var(--mn-raised)", borderRadius: "var(--mn-r-full)", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${g.progress}%`, background: pctColor, borderRadius: "var(--mn-r-full)", transition: "width 600ms cubic-bezier(0.4,0,0.2,1)" }} />
          </div>

          {/* Extra info */}
          {g.conceptCount > 0 && (
            <p style={{ fontSize: 11, color: "var(--mn-ink-4)", marginTop: 8 }}>
              {g.conceptCount} concepto{g.conceptCount !== 1 ? "s" : ""} en seguimiento
            </p>
          )}
        </>
      )}
    </div>
  );
}

export default function ObjetivosPage() {
  const [goals, setGoals] = useState<GoalProgress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/objetivos")
      .then(r => r.ok ? r.json() : [])
      .then(data => { setGoals(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "50vh", gap: 10 }}>
      <Loader2 size={18} color="var(--mn-green)" style={{ animation: "spin 1s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const withGoal    = goals.filter(g => g.goalType);
  const withoutGoal = goals.filter(g => !g.goalType);

  const avgProgress = withGoal.length > 0
    ? Math.round(withGoal.reduce((s, g) => s + g.progress, 0) / withGoal.length)
    : null;

  return (
    <div style={{ maxWidth: 640, padding: "28px 20px" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 className="font-display" style={{ fontSize: 22, fontWeight: 800, color: "var(--mn-ink-1)", marginBottom: 4 }}>
          Mis objetivos
        </h1>
        <p style={{ fontSize: 13, color: "var(--mn-ink-3)" }}>
          {withGoal.length > 0
            ? `${withGoal.length} materia${withGoal.length !== 1 ? "s" : ""} con objetivo definido`
            : "Define un objetivo en cada materia para ver tu progreso aquí"}
        </p>
      </div>

      {/* Resumen general */}
      {withGoal.length > 0 && avgProgress !== null && (
        <div style={{ background: "var(--mn-surface)", borderRadius: "var(--mn-r-xl)", border: "1px solid var(--mn-ink-4)", padding: "18px 22px", marginBottom: 24, display: "flex", alignItems: "center", gap: 18 }}>
          <div style={{ width: 52, height: 52, borderRadius: "50%", background: progressColor(avgProgress) + "18", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Target size={22} color={progressColor(avgProgress)} />
          </div>
          <div>
            <p style={{ fontSize: 13, color: "var(--mn-ink-3)", marginBottom: 2 }}>Progreso promedio</p>
            <p className="font-display" style={{ fontSize: 28, fontWeight: 800, color: progressColor(avgProgress), lineHeight: 1 }}>{avgProgress}%</p>
          </div>
          <div style={{ marginLeft: "auto", textAlign: "right" }}>
            <p style={{ fontSize: 12, color: "var(--mn-ink-3)" }}>
              {withGoal.filter(g => g.progress >= 80).length} completado{withGoal.filter(g => g.progress >= 80).length !== 1 ? "s" : ""}
            </p>
            <p style={{ fontSize: 12, color: "var(--mn-ink-3)" }}>
              {withGoal.filter(g => g.progress < 50).length} requieren atención
            </p>
          </div>
        </div>
      )}

      {/* Materias con objetivo */}
      {withGoal.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "var(--mn-ink-3)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>Con objetivo</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {withGoal.sort((a, b) => a.progress - b.progress).map(g => (
              <GoalCard key={g.subjectId} g={g} />
            ))}
          </div>
        </div>
      )}

      {/* Materias sin objetivo */}
      {withoutGoal.length > 0 && (
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, color: "var(--mn-ink-3)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>Sin objetivo</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {withoutGoal.map(g => (
              <GoalCard key={g.subjectId} g={g} />
            ))}
          </div>
        </div>
      )}

      {/* Estado vacío */}
      {goals.length === 0 && (
        <div style={{ textAlign: "center", padding: "56px 24px" }}>
          <div style={{ width: 48, height: 48, borderRadius: "50%", background: "var(--mn-raised)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <BookOpen size={22} color="var(--mn-ink-3)" />
          </div>
          <p style={{ fontSize: 15, fontWeight: 600, color: "var(--mn-ink-1)", marginBottom: 6 }}>Aún no tienes materias</p>
          <p style={{ fontSize: 13, color: "var(--mn-ink-3)", marginBottom: 20, lineHeight: 1.6 }}>
            Crea tu primera materia y define un objetivo para hacer seguimiento de tu progreso.
          </p>
          <Link href="/materias" className="mn-btn-primary" style={{ fontSize: 13, display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none" }}>
            <Plus size={14} /> Ir a Materias
          </Link>
        </div>
      )}
    </div>
  );
}
