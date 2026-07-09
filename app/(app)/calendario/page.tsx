"use client";

import { useState, useEffect, useCallback } from "react";
import {
  FileText, BookOpen, Plus, X, Loader2, Sparkles,
  ChevronLeft, ChevronRight, Layers, Brain, CheckCircle,
} from "lucide-react";
import Link from "next/link";
import type { ExamPlanSession } from "@/app/api/exam-plan/route";
import type { PlanTask } from "@/app/api/daily-planner/route";
import { createClient } from "@/lib/supabase/client";

// ─── Types ────────────────────────────────────────────────────────────────────

type EventType   = "exam" | "assignment" | "project";
type EventSource = "manual" | "extracted";
type ViewMode    = "semana" | "mes" | "agenda";

type CalEvent = {
  id: string; title: string; event_date: string;
  event_type: EventType; source: EventSource;
  subject_id: string; subject_name: string;
};
type Subject = { id: string; name: string };

// ─── Constants ────────────────────────────────────────────────────────────────

const TYPE_LABEL: Record<EventType, string> = { exam: "Examen", project: "Proyecto", assignment: "Entrega" };
const TYPE_COLOR: Record<EventType, string> = {
  exam:       "var(--mn-error)",
  project:    "#7C3AED",
  assignment: "var(--mn-amber)",
};
const ES_MONTHS_LONG = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const ES_MONTHS_SHORT = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
const ES_DAYS_LONG  = ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];
const ES_DAYS_SHORT = ["D","L","M","X","J","V","S"];
const ES_DAYS_3     = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toYMD(d: Date): string { return d.toISOString().slice(0, 10); }

function daysUntil(dateStr: string): number {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.round((new Date(dateStr + "T00:00:00").getTime() - today.getTime()) / 86_400_000);
}

function getWeekMonday(ref = new Date()): Date {
  const d = new Date(ref); d.setHours(0, 0, 0, 0);
  const dow = d.getDay();
  d.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
  return d;
}

function getWeekDays(monday: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday); d.setDate(monday.getDate() + i); return d;
  });
}

function getMonthGrid(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1);
  const last  = new Date(year, month + 1, 0);
  const startDow = first.getDay() === 0 ? 6 : first.getDay() - 1; // Mon=0
  const grid: (Date | null)[] = Array(startDow).fill(null);
  for (let d = 1; d <= last.getDate(); d++) grid.push(new Date(year, month, d));
  while (grid.length % 7 !== 0) grid.push(null);
  return grid;
}

// ─── Modals ───────────────────────────────────────────────────────────────────

function ExamPlanModal({ exam, onClose }: { exam: CalEvent; onClose: () => void }) {
  const [sessions, setSessions] = useState<ExamPlanSession[] | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");

  useEffect(() => {
    fetch("/api/exam-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ examTitle: exam.title, examDate: exam.event_date, subjectId: exam.subject_id, subjectName: exam.subject_name }),
    })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => setSessions(data.sessions ?? []))
      .catch(() => setError("No se pudo generar el plan."))
      .finally(() => setLoading(false));
  }, [exam]);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(24,24,27,0.45)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ background: "var(--mn-surface)", borderRadius: "var(--mn-r-xl)", width: "100%", maxWidth: 480, maxHeight: "85vh", display: "flex", flexDirection: "column", boxShadow: "var(--mn-shadow-xl)" }}>
        <div style={{ padding: "22px 24px 18px", borderBottom: "1px solid var(--mn-ink-4)", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 600, color: "var(--mn-ink-3)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>Plan de estudio</p>
            <h3 className="font-display" style={{ fontSize: 17, fontWeight: 700, color: "var(--mn-ink-1)", marginBottom: 2 }}>{exam.title}</h3>
            <p style={{ fontSize: 13, color: "var(--mn-ink-2)" }}>{exam.subject_name}</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--mn-ink-3)" }}><X size={18} /></button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "18px 24px 24px" }}>
          {loading && <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "40px 0", gap: 12 }}><Loader2 size={22} color="var(--mn-green)" style={{ animation: "spin 1s linear infinite" }} /><p style={{ fontSize: 13, color: "var(--mn-ink-3)" }}>Armando tu plan...</p></div>}
          {error && <p style={{ fontSize: 13, color: "var(--mn-error)", textAlign: "center", padding: "32px 0" }}>{error}</p>}
          {sessions && sessions.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <p style={{ fontSize: 12, color: "var(--mn-ink-3)", marginBottom: 8 }}>{sessions.length} sesiones · ~{sessions.reduce((s, x) => s + x.durationMin, 0)} min</p>
              {sessions.map((s, i) => {
                const [,, d] = s.date.split("-").map(Number);
                const [, m]  = s.date.split("-").map(Number);
                const isToday = s.date === toYMD(new Date());
                return (
                  <div key={i} style={{ display: "flex", gap: 14, padding: "12px 16px", borderRadius: "var(--mn-r-lg)", background: "var(--mn-canvas)", border: `1px solid ${isToday ? "var(--mn-green)" : "var(--mn-ink-4)"}` }}>
                    <div style={{ textAlign: "center", minWidth: 36, flexShrink: 0 }}>
                      <span style={{ fontSize: 16, fontWeight: 700, color: "var(--mn-ink-1)", display: "block", lineHeight: 1 }}>{d}</span>
                      <span style={{ fontSize: 10, color: "var(--mn-ink-3)", textTransform: "uppercase" }}>{ES_MONTHS_SHORT[m - 1]}</span>
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: "var(--mn-ink-1)", marginBottom: 5 }}>{s.title}</p>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                        {s.focusAreas.map((a, j) => (
                          <span key={j} style={{ fontSize: 11, background: "var(--mn-raised)", color: "var(--mn-ink-2)", padding: "2px 8px", borderRadius: "var(--mn-r-sm)", fontWeight: 500 }}>{a}</span>
                        ))}
                      </div>
                    </div>
                    <span style={{ fontSize: 11, color: "var(--mn-ink-3)", flexShrink: 0 }}>{s.durationMin} min</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div style={{ padding: "12px 24px 20px", borderTop: "1px solid var(--mn-ink-4)" }}>
          <button onClick={onClose} style={{ width: "100%", padding: "11px", borderRadius: "var(--mn-r-lg)", border: "1px solid var(--mn-ink-4)", background: "var(--mn-surface)", fontSize: 13, fontWeight: 600, color: "var(--mn-ink-2)", cursor: "pointer" }}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}

function AddEventModal({ subjects, onClose, onSaved }: { subjects: Subject[]; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle]         = useState("");
  const [date, setDate]           = useState("");
  const [type, setType]           = useState<EventType>("exam");
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? "");
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState("");

  const fieldStyle = { width: "100%", padding: "10px 14px", borderRadius: "var(--mn-r-md)", border: "1px solid var(--mn-ink-4)", background: "var(--mn-canvas)", fontSize: 14, color: "var(--mn-ink-1)", outline: "none", boxSizing: "border-box" as const, fontFamily: "inherit" };

  async function handleSave() {
    if (!title || !date || !subjectId) return;
    setSaving(true); setError("");
    const db = createClient();
    const { data: { user } } = await db.auth.getUser();
    if (!user) { setError("Sesión expirada."); setSaving(false); return; }
    const { error: ins } = await db.from("calendar_events").insert({ user_id: user.id, subject_id: subjectId, title, event_date: date, event_type: type, source: "manual" });
    if (ins) { setError("No se pudo guardar."); setSaving(false); return; }
    onSaved(); onClose();
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(24,24,27,0.45)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ background: "var(--mn-surface)", borderRadius: "var(--mn-r-xl)", padding: 28, width: "100%", maxWidth: 420, boxShadow: "var(--mn-shadow-xl)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
          <h3 className="font-display" style={{ fontSize: 17, fontWeight: 700, color: "var(--mn-ink-1)" }}>Agregar evento</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--mn-ink-3)" }}><X size={18} /></button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--mn-ink-1)", display: "block", marginBottom: 6 }}>Título</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="ej. Parcial 1, Entrega TP..." style={fieldStyle}
              onFocus={e => (e.target.style.borderColor = "var(--mn-green)")} onBlur={e => (e.target.style.borderColor = "var(--mn-ink-4)")} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--mn-ink-1)", display: "block", marginBottom: 6 }}>Fecha</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} style={fieldStyle}
              onFocus={e => (e.target.style.borderColor = "var(--mn-green)")} onBlur={e => (e.target.style.borderColor = "var(--mn-ink-4)")} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--mn-ink-1)", display: "block", marginBottom: 6 }}>Materia</label>
            <select value={subjectId} onChange={e => setSubjectId(e.target.value)} style={fieldStyle}>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--mn-ink-1)", display: "block", marginBottom: 8 }}>Tipo</label>
            <div style={{ display: "flex", gap: 8 }}>
              {(["exam", "project", "assignment"] as EventType[]).map(t => (
                <button key={t} onClick={() => setType(t)} style={{ flex: 1, padding: "8px 4px", borderRadius: "var(--mn-r-md)", cursor: "pointer", fontSize: 12, fontWeight: 600, border: `1px solid ${type === t ? "var(--mn-ink-1)" : "var(--mn-ink-4)"}`, background: type === t ? "var(--mn-ink-1)" : "var(--mn-surface)", color: type === t ? "var(--mn-surface)" : "var(--mn-ink-2)" }}>
                  {TYPE_LABEL[t]}
                </button>
              ))}
            </div>
          </div>
          {error && <p style={{ fontSize: 13, color: "var(--mn-error)" }}>{error}</p>}
          <button onClick={handleSave} disabled={saving || !title || !date || !subjectId}
            className="mn-btn-primary" style={{ width: "100%", justifyContent: "center", fontSize: 14, padding: "12px", opacity: saving || !title || !date ? 0.5 : 1 }}>
            {saving ? <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> : "Guardar evento"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Sesión recomendada ───────────────────────────────────────────────────────

function taskKey(t: PlanTask) { return `${t.type}:${t.subjectId}`; }

function SessionCard({ tasks }: { tasks: PlanTask[] }) {
  const todayStr = toYMD(new Date());
  const storageKey = `mn-plan-done:${todayStr}`;

  const [done, setDone] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      return new Set(raw ? JSON.parse(raw) : []);
    } catch { return new Set(); }
  });

  function toggle(t: PlanTask) {
    setDone(prev => {
      const next = new Set(prev);
      const k = taskKey(t);
      if (next.has(k)) next.delete(k); else next.add(k);
      try { localStorage.setItem(storageKey, JSON.stringify([...next])); } catch { /* noop */ }
      return next;
    });
  }

  if (tasks.length === 0) return null;

  const completedCount = tasks.filter(t => done.has(taskKey(t))).length;
  const totalMin = tasks.reduce((s, t) => s + t.minutesEst, 0);
  const doneMin  = tasks.filter(t => done.has(taskKey(t))).reduce((s, t) => s + t.minutesEst, 0);
  const pct = Math.round((completedCount / tasks.length) * 100);
  const allDone = completedCount === tasks.length;

  return (
    <div style={{ background: "var(--mn-surface)", border: "1px solid var(--mn-ink-4)", borderRadius: "var(--mn-r-xl)", padding: "20px 22px", marginBottom: 20 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: "var(--mn-ink-1)" }}>Plan de hoy</p>
        <span style={{ fontSize: 12, fontWeight: 600, color: allDone ? "var(--mn-green)" : "var(--mn-ink-3)" }}>
          {completedCount}/{tasks.length} {allDone ? "✓ Completado" : "tareas"}
        </span>
      </div>

      {/* Progress bar */}
      <div style={{ height: 4, background: "var(--mn-raised)", borderRadius: 2, overflow: "hidden", marginBottom: 16 }}>
        <div style={{ width: `${pct}%`, height: "100%", background: allDone ? "var(--mn-green)" : "var(--mn-ink-2)", borderRadius: 2, transition: "width 300ms var(--mn-ease)" }} />
      </div>

      {/* Task checklist */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {tasks.map((t, i) => {
          const isDone = done.has(taskKey(t));
          return (
            <div
              key={i}
              style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: "var(--mn-r-lg)", background: isDone ? "var(--mn-raised)" : "var(--mn-canvas)", cursor: "pointer", transition: "background 120ms" }}
              onClick={() => toggle(t)}
            >
              <div style={{ width: 20, height: 20, borderRadius: "50%", border: `2px solid ${isDone ? "var(--mn-green)" : "var(--mn-ink-4)"}`, background: isDone ? "var(--mn-green)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 150ms" }}>
                {isDone && <CheckCircle size={12} color="#fff" />}
              </div>
              <span style={{ fontSize: 13, fontWeight: 500, color: isDone ? "var(--mn-ink-3)" : "var(--mn-ink-1)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textDecoration: isDone ? "line-through" : "none" }}>
                {t.title}
              </span>
              <span style={{ fontSize: 11, color: "var(--mn-ink-3)", flexShrink: 0 }}>{t.minutesEst} min</span>
              <Link
                href={t.ctaHref}
                onClick={e => e.stopPropagation()}
                style={{ fontSize: 11, fontWeight: 600, color: "var(--mn-green)", textDecoration: "none", flexShrink: 0, padding: "3px 8px", borderRadius: "var(--mn-r-sm)", background: "var(--mn-surface)", border: "1px solid var(--mn-ink-4)" }}
              >
                Ir →
              </Link>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--mn-ink-4)" }}>
        <p style={{ fontSize: 12, color: "var(--mn-ink-3)" }}>
          {doneMin} de {totalMin} min completados
        </p>
        {allDone && (
          <p style={{ fontSize: 12, fontWeight: 700, color: "var(--mn-green)" }}>¡Excelente sesión!</p>
        )}
      </div>
    </div>
  );
}

// ─── Esta semana ──────────────────────────────────────────────────────────────

function WeekTimeline({ events, onPlan }: { events: CalEvent[]; onPlan: (e: CalEvent) => void }) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const monday = getWeekMonday(today);
  const sunday = getWeekDays(monday)[6];
  const weekEvents = events.filter(e => {
    const d = new Date(e.event_date + "T00:00:00");
    return d >= monday && d <= sunday;
  });
  // Group by date
  const byDate = new Map<string, CalEvent[]>();
  weekEvents.forEach(e => {
    const arr = byDate.get(e.event_date) ?? [];
    arr.push(e);
    byDate.set(e.event_date, arr);
  });
  const todayStr = toYMD(today);
  const upcomingDates = Array.from(byDate.keys()).filter(d => d >= todayStr).sort().slice(0, 4);

  if (upcomingDates.length === 0) return null;

  return (
    <div style={{ background: "var(--mn-surface)", border: "1px solid var(--mn-ink-4)", borderRadius: "var(--mn-r-xl)", padding: "20px 22px", marginBottom: 20 }}>
      <p style={{ fontSize: 13, fontWeight: 700, color: "var(--mn-ink-1)", marginBottom: 16 }}>Esta semana</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {upcomingDates.map((date, i) => {
          const d    = new Date(date + "T00:00:00");
          const isToday = date === todayStr;
          const evs  = byDate.get(date) ?? [];
          return (
            <div key={date} style={{ display: "flex", gap: 16, paddingBottom: i < upcomingDates.length - 1 ? 14 : 0, marginBottom: i < upcomingDates.length - 1 ? 14 : 0, borderBottom: i < upcomingDates.length - 1 ? "1px solid var(--mn-ink-4)" : "none" }}>
              {/* Timeline dot + line */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0, gap: 0 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: isToday ? "var(--mn-green)" : "var(--mn-ink-4)", marginTop: 3 }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", gap: 8, marginBottom: 5 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: isToday ? "var(--mn-green)" : "var(--mn-ink-1)" }}>
                    {isToday ? "Hoy" : ES_DAYS_3[d.getDay()]}
                  </span>
                  <span style={{ fontSize: 12, color: "var(--mn-ink-3)" }}>{d.getDate()} {ES_MONTHS_SHORT[d.getMonth()]}</span>
                </div>
                {evs.map(ev => (
                  <div key={ev.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: TYPE_COLOR[ev.event_type], flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: "var(--mn-ink-1)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ev.subject_name}</span>
                    <span style={{ fontSize: 12, color: "var(--mn-ink-3)" }}>{TYPE_LABEL[ev.event_type]}</span>
                    {ev.event_type === "exam" && (
                      <button onClick={() => onPlan(ev)} style={{ fontSize: 11, padding: "2px 8px", borderRadius: "var(--mn-r-full)", border: "1px solid var(--mn-ink-4)", background: "none", cursor: "pointer", color: "var(--mn-ink-2)", fontWeight: 600 }}>
                        Plan
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

function Sidebar({ events, selectedDate, onSelectDate, onPlan }: {
  events: CalEvent[];
  selectedDate: string;
  onSelectDate: (d: string) => void;
  onPlan: (e: CalEvent) => void;
}) {
  const now = new Date();
  const [miniYear, setMiniYear] = useState(now.getFullYear());
  const [miniMonth, setMiniMonth] = useState(now.getMonth());

  const todayStr = toYMD(now);
  const eventDates = new Set(events.map(e => e.event_date));
  const exams = events.filter(e => e.event_type === "exam" && daysUntil(e.event_date) >= 0).slice(0, 4);

  const grid = getMonthGrid(miniYear, miniMonth);

  // Counts by type (future only)
  const future = events.filter(e => daysUntil(e.event_date) >= 0);
  const examCount   = future.filter(e => e.event_type === "exam").length;
  const projectCount= future.filter(e => e.event_type === "project").length;
  const assignCount = future.filter(e => e.event_type === "assignment").length;

  return (
    <div style={{ width: 240, flexShrink: 0, display: "flex", flexDirection: "column", gap: 14 }}>

      {/* Resumen del semestre */}
      <div style={{ background: "var(--mn-surface)", border: "1px solid var(--mn-ink-4)", borderRadius: "var(--mn-r-xl)", padding: "18px 20px" }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: "var(--mn-ink-3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 14 }}>Resumen del semestre</p>
        {[
          { icon: <FileText size={14} color="var(--mn-error)" />, label: "Exámenes",  count: examCount },
          { icon: <BookOpen  size={14} color="#7C3AED"          />, label: "Proyectos", count: projectCount },
          { icon: <Layers    size={14} color="var(--mn-amber)"  />, label: "Entregas",  count: assignCount },
        ].map(row => (
          <div key={row.label} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: "var(--mn-r-md)", background: "var(--mn-canvas)", border: "1px solid var(--mn-ink-4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {row.icon}
            </div>
            <span style={{ fontSize: 13, color: "var(--mn-ink-2)", flex: 1 }}>{row.label}</span>
            <span className="font-display" style={{ fontSize: 16, fontWeight: 700, color: "var(--mn-ink-1)" }}>{row.count}</span>
          </div>
        ))}
      </div>

      {/* Próximos exámenes */}
      {exams.length > 0 && (
        <div style={{ background: "var(--mn-surface)", border: "1px solid var(--mn-ink-4)", borderRadius: "var(--mn-r-xl)", padding: "18px 20px" }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: "var(--mn-ink-3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 14 }}>Próximos exámenes</p>
          {exams.map(e => {
            const d = daysUntil(e.event_date);
            const [, m, day] = e.event_date.split("-").map(Number);
            return (
              <div key={e.id} style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12 }}>
                <div style={{ width: 32, height: 32, borderRadius: "var(--mn-r-md)", background: "var(--mn-canvas)", border: "1px solid var(--mn-ink-4)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <FileText size={13} color="var(--mn-error)" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "var(--mn-ink-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.subject_name}</p>
                  <p style={{ fontSize: 11, color: "var(--mn-ink-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.title}</p>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: d <= 3 ? "var(--mn-error)" : d <= 7 ? "var(--mn-amber)" : "var(--mn-ink-2)" }}>
                    {d === 0 ? "Hoy" : d === 1 ? "Mañana" : `${d} días`}
                  </p>
                  <p style={{ fontSize: 11, color: "var(--mn-ink-3)" }}>{day} {ES_MONTHS_SHORT[m - 1]}</p>
                </div>
              </div>
            );
          })}
          {exams.length >= 4 && (
            <button onClick={() => {}} style={{ fontSize: 12, color: "var(--mn-green)", background: "none", border: "none", cursor: "pointer", fontWeight: 600, padding: 0, display: "flex", alignItems: "center", gap: 4 }}>
              Ver todos <ChevronRight size={12} />
            </button>
          )}
        </div>
      )}

      {/* Mini calendario */}
      <div style={{ background: "var(--mn-surface)", border: "1px solid var(--mn-ink-4)", borderRadius: "var(--mn-r-xl)", padding: "18px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <button onClick={() => { if (miniMonth === 0) { setMiniYear(y => y-1); setMiniMonth(11); } else setMiniMonth(m => m-1); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 2, color: "var(--mn-ink-3)" }}><ChevronLeft size={14} /></button>
          <p style={{ fontSize: 13, fontWeight: 700, color: "var(--mn-ink-1)" }}>{ES_MONTHS_LONG[miniMonth].slice(0, 3)} {miniYear}</p>
          <button onClick={() => { if (miniMonth === 11) { setMiniYear(y => y+1); setMiniMonth(0); } else setMiniMonth(m => m+1); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 2, color: "var(--mn-ink-3)" }}><ChevronRight size={14} /></button>
        </div>

        {/* Day labels */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginBottom: 4 }}>
          {["L","M","X","J","V","S","D"].map(d => (
            <div key={d} style={{ textAlign: "center", fontSize: 10, fontWeight: 600, color: "var(--mn-ink-3)", padding: "2px 0" }}>{d}</div>
          ))}
        </div>

        {/* Date grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
          {grid.map((date, i) => {
            if (!date) return <div key={i} />;
            const ymd       = toYMD(date);
            const isToday   = ymd === todayStr;
            const isSelected= ymd === selectedDate;
            const hasEvent  = eventDates.has(ymd);
            const evForDay  = events.filter(e => e.event_date === ymd);
            const hasExam   = evForDay.some(e => e.event_type === "exam");
            const hasProject= evForDay.some(e => e.event_type === "project");
            const hasAssign = evForDay.some(e => e.event_type === "assignment");
            return (
              <button key={i} onClick={() => onSelectDate(ymd)} style={{
                display: "flex", flexDirection: "column", alignItems: "center", padding: "3px 0",
                borderRadius: "var(--mn-r-sm)", border: "none", cursor: "pointer",
                background: isSelected ? "var(--mn-ink-1)" : isToday ? "var(--mn-canvas)" : "transparent",
              }}>
                <span style={{ fontSize: 12, fontWeight: isToday || isSelected ? 700 : 400, color: isSelected ? "#fff" : isToday ? "var(--mn-green)" : "var(--mn-ink-1)", lineHeight: 1.4 }}>{date.getDate()}</span>
                {hasEvent && (
                  <div style={{ display: "flex", gap: 2, marginTop: 2 }}>
                    {hasExam    && <div style={{ width: 4, height: 4, borderRadius: "50%", background: isSelected ? "rgba(255,255,255,0.7)" : "var(--mn-error)" }} />}
                    {hasProject && <div style={{ width: 4, height: 4, borderRadius: "50%", background: isSelected ? "rgba(255,255,255,0.7)" : "#7C3AED" }} />}
                    {hasAssign  && <div style={{ width: 4, height: 4, borderRadius: "50%", background: isSelected ? "rgba(255,255,255,0.7)" : "var(--mn-amber)" }} />}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 12px", marginTop: 12, paddingTop: 10, borderTop: "1px solid var(--mn-ink-4)" }}>
          {[
            { color: "var(--mn-green)", label: "Estudio" },
            { color: "var(--mn-error)", label: "Examen" },
            { color: "#7C3AED",         label: "Proyecto" },
            { color: "var(--mn-amber)", label: "Entrega" },
          ].map(l => (
            <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: l.color }} />
              <span style={{ fontSize: 10, color: "var(--mn-ink-3)" }}>{l.label}</span>
            </div>
          ))}
        </div>
        <p style={{ fontSize: 11, color: "var(--mn-ink-3)", marginTop: 8 }}>Toca un día para ver los detalles</p>
      </div>
    </div>
  );
}

// ─── Event row (day agenda) ───────────────────────────────────────────────────

function AgendaRow({ event, onPlan }: { event: CalEvent; onPlan: () => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "var(--mn-surface)", borderRadius: "var(--mn-r-lg)", border: "1px solid var(--mn-ink-4)" }}>
      <div style={{ width: 8, height: 8, borderRadius: "50%", background: TYPE_COLOR[event.event_type], flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: "var(--mn-ink-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{event.title}</p>
        <p style={{ fontSize: 11, color: "var(--mn-ink-3)" }}>{TYPE_LABEL[event.event_type]} · {event.subject_name}</p>
      </div>
      {event.event_type === "exam" && (
        <button onClick={onPlan} style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: "var(--mn-r-full)", background: "var(--mn-raised)", border: "none", cursor: "pointer", fontSize: 11, fontWeight: 600, color: "var(--mn-ink-2)" }}>
          <Sparkles size={10} /> Plan
        </button>
      )}
      <ChevronRight size={14} color="var(--mn-ink-4)" />
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CalendarioPage() {
  const [events,        setEvents]        = useState<CalEvent[]>([]);
  const [subjects,      setSubjects]      = useState<Subject[]>([]);
  const [planTasks,     setPlanTasks]     = useState<PlanTask[]>([]);
  const [loaded,        setLoaded]        = useState(false);
  const [viewMode,      setViewMode]      = useState<ViewMode>("semana");
  const [weekOffset,    setWeekOffset]    = useState(0);
  const [selectedDate,  setSelectedDate]  = useState(toYMD(new Date()));
  const [showAddModal,  setShowAddModal]  = useState(false);
  const [examPlanEvent, setExamPlanEvent] = useState<CalEvent | null>(null);
  // month view
  const [monthYear,  setMonthYear]  = useState(new Date().getFullYear());
  const [monthMonth, setMonthMonth] = useState(new Date().getMonth());

  const loadData = useCallback(async () => {
    const db    = createClient();
    const today = new Date().toISOString().slice(0, 10);
    const [evRes, subRes] = await Promise.all([
      db.from("calendar_events").select("id, title, event_date, event_type, source, subject_id, subjects!inner(name)").gte("event_date", today).order("event_date"),
      db.from("subjects").select("id, name").order("created_at"),
    ]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const evData: CalEvent[] = (evRes.data ?? []).map((row: any) => ({
      id: row.id, title: row.title, event_date: row.event_date, event_type: row.event_type,
      source: row.source, subject_id: row.subject_id,
      subject_name: Array.isArray(row.subjects) ? row.subjects[0]?.name : row.subjects?.name ?? "",
    }));
    setEvents(evData);
    setSubjects(subRes.data ?? []);
    setLoaded(true);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    fetch("/api/daily-planner")
      .then(r => r.ok ? r.json() : { tasks: [] })
      .then(d => setPlanTasks(d.tasks ?? []));
  }, []);

  // Derived
  const todayStr = toYMD(new Date());

  // Week view data
  const refDate = new Date(); refDate.setDate(refDate.getDate() + weekOffset * 7);
  const monday   = getWeekMonday(refDate);
  const weekDays = getWeekDays(monday);
  const sunday   = weekDays[6];
  const weekStart = toYMD(monday);
  const weekEnd   = toYMD(sunday);
  const weekEvents = events.filter(e => e.event_date >= weekStart && e.event_date <= weekEnd);

  // Selected day events
  const selectedDayEvents = events.filter(e => e.event_date === selectedDate);

  // Month view
  const monthGrid = getMonthGrid(monthYear, monthMonth);
  const monthEvents = events.filter(e => {
    const [y, m] = e.event_date.split("-").map(Number);
    return y === monthYear && m - 1 === monthMonth;
  });

  if (!loaded) return (
    <div style={{ padding: "24px 20px" }}>
      <style>{`@keyframes pulse-sk { 0%,100%{opacity:1} 50%{opacity:.45} }`}</style>
      {[1,2,3].map(i => <div key={i} style={{ height: 68, background: "var(--mn-raised)", borderRadius: "var(--mn-r-lg)", marginBottom: 10, animation: "pulse-sk 1.4s ease infinite" }} />)}
    </div>
  );

  return (
    <div style={{ padding: "24px 20px", maxWidth: 980 }}>
      <style>{`
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes pulse-sk{ 0%,100%{opacity:1} 50%{opacity:.45} }
        @media (max-width: 720px) { .cal-layout { flex-direction: column !important; } .cal-sidebar { width: 100% !important; } }
      `}</style>

      {showAddModal  && <AddEventModal subjects={subjects} onClose={() => setShowAddModal(false)} onSaved={loadData} />}
      {examPlanEvent && <ExamPlanModal exam={examPlanEvent} onClose={() => setExamPlanEvent(null)} />}

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28, gap: 16 }}>
        <div>
          <h1 className="font-display" style={{ fontSize: 22, fontWeight: 800, color: "var(--mn-ink-1)", marginBottom: 4 }}>Mi Plan</h1>
          <p style={{ fontSize: 14, color: "var(--mn-ink-2)" }}>Tu plan de estudio automático, día a día.</p>
        </div>
        <button onClick={() => setShowAddModal(true)} disabled={subjects.length === 0} className="mn-btn-primary"
          style={{ fontSize: 13, flexShrink: 0, opacity: subjects.length === 0 ? 0.4 : 1 }}>
          <Plus size={14} /> Agregar
        </button>
      </div>

      {subjects.length === 0 ? (
        <div style={{ textAlign: "center", padding: "64px 32px" }}>
          <div style={{ width: 52, height: 52, background: "var(--mn-raised)", borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
            <Layers size={22} color="var(--mn-ink-3)" />
          </div>
          <h2 className="font-display" style={{ fontSize: 18, fontWeight: 700, color: "var(--mn-ink-1)", marginBottom: 8 }}>Sin materias aún</h2>
          <p style={{ fontSize: 14, color: "var(--mn-ink-2)", maxWidth: 320, margin: "0 auto 24px", lineHeight: 1.65 }}>
            Agrega una materia y sube el programa para que Mnemora llene el plan automáticamente.
          </p>
          <a href="/onboarding" className="mn-btn-primary" style={{ fontSize: 13, display: "inline-flex", alignItems: "center", gap: 6 }}>
            Agregar primera materia
          </a>
        </div>
      ) : (
        <div className="cal-layout" style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>

          {/* ── Main column ── */}
          <div style={{ flex: 1, minWidth: 0 }}>

            {/* View tabs + week nav */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
              <div style={{ display: "flex", gap: 2, background: "var(--mn-raised)", borderRadius: "var(--mn-r-md)", padding: 3 }}>
                {(["semana", "mes", "agenda"] as ViewMode[]).map(m => (
                  <button key={m} onClick={() => setViewMode(m)} style={{
                    padding: "5px 14px", borderRadius: "var(--mn-r-sm)", border: "none", cursor: "pointer",
                    background: viewMode === m ? "var(--mn-surface)" : "transparent",
                    color: viewMode === m ? "var(--mn-ink-1)" : "var(--mn-ink-2)",
                    fontSize: 13, fontWeight: viewMode === m ? 600 : 400,
                    boxShadow: viewMode === m ? "0 1px 3px rgba(0,0,0,0.06)" : "none",
                  }}>
                    {m.charAt(0).toUpperCase() + m.slice(1)}
                  </button>
                ))}
              </div>

              {viewMode === "semana" && (
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <button onClick={() => setWeekOffset(w => w - 1)} style={{ background: "var(--mn-raised)", border: "none", borderRadius: "var(--mn-r-sm)", padding: "5px 8px", cursor: "pointer", display: "flex" }}>
                    <ChevronLeft size={14} color="var(--mn-ink-2)" />
                  </button>
                  <p style={{ fontSize: 13, color: "var(--mn-ink-2)", minWidth: 140, textAlign: "center" }}>
                    {weekDays[0].getDate()} – {sunday.getDate()} {ES_MONTHS_LONG[sunday.getMonth()].slice(0, 3)} {sunday.getFullYear()}
                  </p>
                  <button onClick={() => setWeekOffset(w => w + 1)} style={{ background: "var(--mn-raised)", border: "none", borderRadius: "var(--mn-r-sm)", padding: "5px 8px", cursor: "pointer", display: "flex" }}>
                    <ChevronRight size={14} color="var(--mn-ink-2)" />
                  </button>
                  {weekOffset !== 0 && (
                    <button onClick={() => { setWeekOffset(0); setSelectedDate(todayStr); }} style={{ fontSize: 12, color: "var(--mn-green)", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>
                      Hoy
                    </button>
                  )}
                </div>
              )}

              {viewMode === "mes" && (
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <button onClick={() => { if (monthMonth === 0) { setMonthYear(y => y-1); setMonthMonth(11); } else setMonthMonth(m => m-1); }} style={{ background: "var(--mn-raised)", border: "none", borderRadius: "var(--mn-r-sm)", padding: "5px 8px", cursor: "pointer", display: "flex" }}>
                    <ChevronLeft size={14} color="var(--mn-ink-2)" />
                  </button>
                  <p style={{ fontSize: 13, color: "var(--mn-ink-2)", minWidth: 120, textAlign: "center" }}>
                    {ES_MONTHS_LONG[monthMonth]} {monthYear}
                  </p>
                  <button onClick={() => { if (monthMonth === 11) { setMonthYear(y => y+1); setMonthMonth(0); } else setMonthMonth(m => m+1); }} style={{ background: "var(--mn-raised)", border: "none", borderRadius: "var(--mn-r-sm)", padding: "5px 8px", cursor: "pointer", display: "flex" }}>
                    <ChevronRight size={14} color="var(--mn-ink-2)" />
                  </button>
                </div>
              )}
            </div>

            {/* ── Semana view ── */}
            {viewMode === "semana" && (
              <>
                {/* Day picker header */}
                <div style={{ background: "var(--mn-surface)", border: "1px solid var(--mn-ink-4)", borderRadius: "var(--mn-r-xl)", padding: "12px 16px", marginBottom: 16 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
                    {weekDays.map((day, i) => {
                      const ymd     = toYMD(day);
                      const isToday = ymd === todayStr;
                      const isSel   = ymd === selectedDate;
                      const dayEvs  = weekEvents.filter(e => e.event_date === ymd);
                      const hasExam   = dayEvs.some(e => e.event_type === "exam");
                      const hasProject= dayEvs.some(e => e.event_type === "project");
                      const hasAssign = dayEvs.some(e => e.event_type === "assignment");
                      return (
                        <button key={i} onClick={() => setSelectedDate(ymd)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "8px 4px", borderRadius: "var(--mn-r-lg)", border: "none", cursor: "pointer", background: "transparent" }}>
                          <span style={{ fontSize: 10, fontWeight: 600, color: isToday ? "var(--mn-green)" : "var(--mn-ink-3)", textTransform: "uppercase" }}>
                            {ES_DAYS_3[day.getDay()]}
                          </span>
                          <div style={{ width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                            background: isSel ? "var(--mn-ink-1)" : "transparent",
                          }}>
                            <span style={{ fontSize: 15, fontWeight: isSel || isToday ? 700 : 400, color: isSel ? "#fff" : isToday ? "var(--mn-green)" : "var(--mn-ink-1)" }}>
                              {day.getDate()}
                            </span>
                          </div>
                          <div style={{ display: "flex", gap: 2, height: 6 }}>
                            {hasExam    && <div style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--mn-error)" }} />}
                            {hasProject && <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#7C3AED" }} />}
                            {hasAssign  && <div style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--mn-amber)" }} />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Selected day agenda */}
                <div style={{ background: "var(--mn-surface)", border: "1px solid var(--mn-ink-4)", borderRadius: "var(--mn-r-xl)", padding: "20px 20px", marginBottom: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: "var(--mn-ink-1)" }}>
                      {selectedDate === todayStr ? "Hoy" : ES_DAYS_LONG[new Date(selectedDate + "T00:00:00").getDay()]}
                    </p>
                    <p style={{ fontSize: 13, color: "var(--mn-ink-3)" }}>
                      {(() => { const d = new Date(selectedDate + "T00:00:00"); return `${d.getDate()} de ${ES_MONTHS_LONG[d.getMonth()]}`; })()}
                    </p>
                  </div>

                  {selectedDayEvents.length === 0 ? (
                    <p style={{ fontSize: 14, color: "var(--mn-ink-3)", lineHeight: 1.6 }}>Sin eventos para este día.</p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {selectedDayEvents.map(ev => (
                        <AgendaRow key={ev.id} event={ev} onPlan={() => setExamPlanEvent(ev)} />
                      ))}
                    </div>
                  )}

                  {events.length > selectedDayEvents.length && (
                    <button onClick={() => setViewMode("agenda")} style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 14, fontSize: 13, color: "var(--mn-green)", background: "none", border: "none", cursor: "pointer", fontWeight: 600, padding: 0 }}>
                      Ver agenda completa <ChevronRight size={13} />
                    </button>
                  )}
                </div>

                {/* Sesión recomendada */}
                {planTasks.length > 0 && selectedDate === todayStr && (
                  <SessionCard tasks={planTasks} />
                )}

                {/* Esta semana */}
                <WeekTimeline events={events} onPlan={setExamPlanEvent} />
              </>
            )}

            {/* ── Mes view ── */}
            {viewMode === "mes" && (
              <div style={{ background: "var(--mn-surface)", border: "1px solid var(--mn-ink-4)", borderRadius: "var(--mn-r-xl)", padding: "20px" }}>
                {/* Grid header */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginBottom: 6 }}>
                  {["L","M","X","J","V","S","D"].map(d => (
                    <div key={d} style={{ textAlign: "center", fontSize: 11, fontWeight: 600, color: "var(--mn-ink-3)", padding: "4px 0" }}>{d}</div>
                  ))}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
                  {monthGrid.map((date, i) => {
                    if (!date) return <div key={i} style={{ height: 48 }} />;
                    const ymd     = toYMD(date);
                    const isToday = ymd === todayStr;
                    const isSel   = ymd === selectedDate;
                    const dayEvs  = monthEvents.filter(e => e.event_date === ymd);
                    return (
                      <button key={i} onClick={() => setSelectedDate(ymd)} style={{ height: 48, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start", gap: 2, padding: "5px 2px", borderRadius: "var(--mn-r-sm)", border: "none", cursor: "pointer", background: isSel ? "var(--mn-ink-1)" : isToday ? "var(--mn-canvas)" : "transparent" }}>
                        <span style={{ fontSize: 13, fontWeight: isToday || isSel ? 700 : 400, color: isSel ? "#fff" : isToday ? "var(--mn-green)" : "var(--mn-ink-1)" }}>{date.getDate()}</span>
                        <div style={{ display: "flex", gap: 2 }}>
                          {dayEvs.map((ev, j) => (
                            <div key={j} style={{ width: 4, height: 4, borderRadius: "50%", background: isSel ? "rgba(255,255,255,0.7)" : TYPE_COLOR[ev.event_type] }} />
                          ))}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Selected day events */}
                {selectedDayEvents.length > 0 && (
                  <div style={{ marginTop: 20, paddingTop: 20, borderTop: "1px solid var(--mn-ink-4)" }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: "var(--mn-ink-1)", marginBottom: 10 }}>
                      {selectedDate === todayStr ? "Hoy" : (() => { const d = new Date(selectedDate + "T00:00:00"); return `${ES_DAYS_LONG[d.getDay()]}, ${d.getDate()} de ${ES_MONTHS_LONG[d.getMonth()]}`; })()}
                    </p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {selectedDayEvents.map(ev => <AgendaRow key={ev.id} event={ev} onPlan={() => setExamPlanEvent(ev)} />)}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Agenda view ── */}
            {viewMode === "agenda" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                {events.length === 0 ? (
                  <p style={{ fontSize: 14, color: "var(--mn-ink-3)", padding: "32px 0", textAlign: "center" }}>Sin eventos próximos.</p>
                ) : (
                  events.map((event, i) => {
                    const d = new Date(event.event_date + "T00:00:00");
                    const isFirst = i === 0 || events[i-1].event_date !== event.event_date;
                    return (
                      <div key={event.id}>
                        {isFirst && (
                          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 0 8px" }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: event.event_date === todayStr ? "var(--mn-green)" : "var(--mn-ink-1)" }}>
                              {event.event_date === todayStr ? "Hoy" : ES_DAYS_LONG[d.getDay()]}
                            </span>
                            <span style={{ fontSize: 12, color: "var(--mn-ink-3)" }}>
                              {d.getDate()} de {ES_MONTHS_LONG[d.getMonth()]}
                            </span>
                            <div style={{ flex: 1, height: 1, background: "var(--mn-ink-4)" }} />
                          </div>
                        )}
                        <div style={{ marginBottom: 8 }}>
                          <AgendaRow event={event} onPlan={() => setExamPlanEvent(event)} />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* ── Sidebar ── */}
          <div className="cal-sidebar" style={{ width: 240 }}>
            <Sidebar events={events} selectedDate={selectedDate} onSelectDate={setSelectedDate} onPlan={setExamPlanEvent} />
          </div>
        </div>
      )}
    </div>
  );
}
