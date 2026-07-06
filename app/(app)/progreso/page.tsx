"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  TrendingUp, Brain, Target, BookOpen, CheckCircle, Clock,
  ArrowRight, Layers, Map, Calendar, ChevronDown, ChevronUp,
  TrendingDown, Minus,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { PredictionData } from "@/app/api/performance-prediction/[subjectId]/route";

type Subject = { id: string; name: string };

type KnowledgeRow = {
  concept_id: string;
  confidence: number;
  mastery_level: "unknown" | "learning" | "practiced" | "mastered";
  next_review: string | null;
  error_patterns: string[];
  subject_concepts: {
    name: string;
    subject_id: string;
    learning_order: number | null;
    subjects: { id: string; name: string };
  };
};

type CognitiveProfileRow = {
  subject_id: string;
  learning_speed: number | null;
  retention_strength: number | null;
  preferred_style: string | null;
  performance_estimate: number | null;
  error_patterns: string[] | null;
};

type ExamRow = {
  subject_id: string;
  title: string;
  event_date: string;
};

type ConceptCount = { subject_id: string; count: number };

type SubjectAnalysis = {
  id: string;
  name: string;
  totalConcepts: number;
  knownConcepts: number;
  masteredConcepts: number;
  avgConfidence: number;
  predictedGrade: number;
  approvalProb: "alta" | "media" | "baja" | "sin datos";
  coveragePct: number;
  nextExam: ExamRow | null;
  daysToExam: number | null;
  roadmap: KnowledgeRow[];
  cogProfile: CognitiveProfileRow | null;
};

/* MASTERY — sobrio: solo border-left, sin bg de color fuerte */
const MASTERY = {
  unknown:   { color: "var(--mn-ink-3)",  label: "Nuevo" },
  learning:  { color: "var(--mn-amber)",  label: "Aprendiendo" },
  practiced: { color: "var(--mn-blue)",   label: "En repaso" },
  mastered:  { color: "#16A34A",          label: "Dominado" },
};

function daysUntil(dateStr: string): number {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr); target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("es", { day: "numeric", month: "short" });
}

function formatNextReview(dateStr: string | null): string {
  if (!dateStr) return "Sin fecha";
  const days = Math.round((new Date(dateStr).getTime() - Date.now()) / 86_400_000);
  if (days < 0) return "Pendiente";
  if (days === 0) return "Hoy";
  if (days === 1) return "Mañana";
  return `en ${days} días`;
}

function studyPriority(k: KnowledgeRow): number {
  const urgency = k.next_review && new Date(k.next_review) <= new Date() ? 2 : 1;
  return (1 - k.confidence) * urgency;
}

function gradeLabel(grade: number): string {
  if (grade >= 9)  return "Sobresaliente";
  if (grade >= 7)  return "Notable";
  if (grade >= 6)  return "Bien";
  if (grade >= 5)  return "Aprobado";
  return "En riesgo";
}

function approvalProb(prob: SubjectAnalysis["approvalProb"]) {
  if (prob === "alta")  return { color: "#16A34A",           label: "Probabilidad alta" };
  if (prob === "media") return { color: "var(--mn-amber)",   label: "Probabilidad media" };
  if (prob === "baja")  return { color: "var(--mn-error)",   label: "Probabilidad baja" };
  return                       { color: "var(--mn-ink-3)",   label: "Sin datos aún" };
}

/* ─── Skeleton ─── */
function Skeleton() {
  return (
    <div className="mn-dashboard-wrap">
      {[1,2,3].map(i => (
        <div key={i} style={{ height: 72, background: "var(--mn-raised)", borderRadius: "var(--mn-r-lg)", marginBottom: 12, animation: "pulse-sk 1.4s ease infinite" }} />
      ))}
      <style>{`@keyframes pulse-sk{0%,100%{opacity:1}50%{opacity:.45}}`}</style>
    </div>
  );
}

function ProgresoPageInner() {
  const searchParams = useSearchParams();
  const [subjects, setSubjects]     = useState<Subject[]>([]);
  const [analyses, setAnalyses]     = useState<SubjectAnalysis[]>([]);
  const [knowledge, setKnowledge]   = useState<KnowledgeRow[]>([]);
  const [loaded, setLoaded]         = useState(false);
  const [activeSubject, setActive]  = useState<string>(searchParams.get("subject") ?? "all");
  const [expandedRoadmap, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    const db = createClient();
    db.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const uid   = data.user.id;
      const today = new Date().toISOString().slice(0, 10);

      const [subRes, kRes, profRes, examRes, conceptCountRes] = await Promise.all([
        db.from("subjects").select("id, name").order("created_at"),
        db.from("student_knowledge")
          .select("concept_id, confidence, mastery_level, next_review, error_patterns, subject_concepts!inner(name, subject_id, learning_order, subjects!inner(id, name))")
          .eq("user_id", uid)
          .order("confidence", { ascending: true }),
        db.from("cognitive_profile")
          .select("subject_id, learning_speed, retention_strength, preferred_style, performance_estimate, error_patterns")
          .eq("user_id", uid),
        db.from("calendar_events")
          .select("subject_id, title, event_date")
          .eq("event_type", "exam")
          .gte("event_date", today)
          .order("event_date"),
        db.from("subject_concepts").select("subject_id").then(r => {
          const counts: Record<string, number> = {};
          for (const row of r.data ?? []) counts[row.subject_id] = (counts[row.subject_id] ?? 0) + 1;
          return Object.entries(counts).map(([subject_id, count]) => ({ subject_id, count })) as ConceptCount[];
        }),
      ]);

      const subs: Subject[]             = subRes.data ?? [];
      const rows                        = (kRes.data ?? []) as unknown as KnowledgeRow[];
      const profiles: CognitiveProfileRow[] = (profRes.data ?? []) as unknown as CognitiveProfileRow[];
      const exams: ExamRow[]            = (examRes.data ?? []) as unknown as ExamRow[];
      const conceptCounts: ConceptCount[] = conceptCountRes;

      setSubjects(subs);
      setKnowledge(rows);

      const built: SubjectAnalysis[] = subs.map(sub => {
        const subRows        = rows.filter(k => k.subject_concepts?.subjects?.id === sub.id);
        const totalConcepts  = conceptCounts.find(c => c.subject_id === sub.id)?.count ?? subRows.length;
        const knownConcepts  = subRows.filter(k => k.confidence > 0).length;
        const masteredConcepts = subRows.filter(k => k.mastery_level === "mastered").length;
        const avgConfidence  = subRows.length > 0 ? subRows.reduce((acc, k) => acc + k.confidence, 0) / subRows.length : 0;
        const profData       = profiles.find(p => p.subject_id === sub.id) ?? null;
        const rawGrade       = profData?.performance_estimate != null ? profData.performance_estimate : avgConfidence * 10;
        const predictedGrade = Math.round(rawGrade * 10) / 10;
        const prob: SubjectAnalysis["approvalProb"] =
          subRows.length === 0 ? "sin datos"
          : predictedGrade >= 7 ? "alta"
          : predictedGrade >= 5.5 ? "media" : "baja";
        const coveragePct = totalConcepts > 0 ? Math.round((knownConcepts / totalConcepts) * 100) : 0;
        const nextExam    = exams.find(e => e.subject_id === sub.id) ?? null;
        const daysToExam  = nextExam ? daysUntil(nextExam.event_date) : null;
        const roadmap     = [...subRows].sort((a, b) => studyPriority(b) - studyPriority(a));
        return { id: sub.id, name: sub.name, totalConcepts, knownConcepts, masteredConcepts, avgConfidence, predictedGrade, approvalProb: prob, coveragePct, nextExam, daysToExam, roadmap, cogProfile: profData };
      });

      setAnalyses(built);
      setLoaded(true);
    });
  }, []);

  if (!loaded) return <Skeleton />;

  const totalAll      = knowledge.length;
  const masteredAll   = knowledge.filter(k => k.mastery_level === "mastered").length;
  const pendingAll    = knowledge.filter(k => k.next_review && new Date(k.next_review) <= new Date()).length;
  const masteryPctAll = totalAll > 0 ? Math.round((masteredAll / totalAll) * 100) : 0;
  const activeAnalysis = activeSubject === "all" ? null : analyses.find(a => a.id === activeSubject);

  return (
    <div className="mn-dashboard-wrap">
      <style>{`
        @keyframes pulse-sk{0%,100%{opacity:1}50%{opacity:.45}}
        .mn-chip-filter { padding: 5px 13px; border-radius: var(--mn-r-full); font-size: 13px; font-weight: 600; border: 1px solid var(--mn-ink-4); cursor: pointer; transition: background 150ms, color 150ms; }
        .mn-chip-filter.active { background: var(--mn-ink-1); color: #fff; border-color: var(--mn-ink-1); }
        .mn-chip-filter:not(.active) { background: var(--mn-surface); color: var(--mn-ink-2); }
      `}</style>

      {/* Header */}
      <div className="mn-fade-up" style={{ marginBottom: 28 }}>
        <h1 className="font-display" style={{ fontSize: "clamp(22px,3vw,28px)", fontWeight: 700, color: "var(--mn-ink-1)", marginBottom: 4 }}>
          Mi progreso
        </h1>
        <p style={{ fontSize: 14, color: "var(--mn-ink-2)" }}>
          Análisis de conocimiento · Semestre 2026-I
        </p>
      </div>

      {totalAll === 0 ? (
        /* Empty state */
        <div style={{ padding: "48px 28px", textAlign: "center", background: "var(--mn-surface)", borderRadius: "var(--mn-r-xl)", boxShadow: "var(--mn-shadow-sm)" }}>
          <div style={{ width: 52, height: 52, background: "var(--mn-raised)", borderRadius: "var(--mn-r-lg)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
            <Brain size={24} color="var(--mn-ink-2)" />
          </div>
          <h2 className="font-display" style={{ fontSize: 18, fontWeight: 700, color: "var(--mn-ink-1)", marginBottom: 8 }}>
            Todavía no hay datos de progreso
          </h2>
          <p style={{ fontSize: 14, color: "var(--mn-ink-2)", maxWidth: 340, margin: "0 auto 24px", lineHeight: 1.65 }}>
            Practica flashcards o chatea con el tutor y Mnemora irá construyendo tu perfil de aprendizaje.
          </p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/flashcards" className="mn-btn-primary" style={{ fontSize: 13, display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none" }}>
              <Layers size={14} /> Practicar flashcards
            </Link>
            <Link href="/tutor" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 18px", borderRadius: "var(--mn-r-lg)", border: "1px solid var(--mn-ink-4)", background: "var(--mn-surface)", fontSize: 13, fontWeight: 600, color: "var(--mn-ink-1)", textDecoration: "none" }}>
              <Brain size={14} /> Hablar con el tutor
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* Filtro */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 24 }}>
            <button className={`mn-chip-filter ${activeSubject === "all" ? "active" : ""}`} onClick={() => setActive("all")}>
              Todas
            </button>
            {subjects.map(s => (
              <button key={s.id} className={`mn-chip-filter ${activeSubject === s.id ? "active" : ""}`} onClick={() => setActive(s.id)}>
                {s.name}
              </button>
            ))}
          </div>

          {activeAnalysis ? (
            <SubjectView analysis={activeAnalysis} expandedRoadmap={expandedRoadmap} setExpandedRoadmap={setExpanded} />
          ) : (
            <>
              {/* Stats globales */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 24 }}>
                {[
                  { value: totalAll,      label: "Conceptos",      icon: <BookOpen size={14} color="var(--mn-ink-3)" /> },
                  { value: masteredAll,   label: "Dominados",      icon: <CheckCircle size={14} color="#16A34A" /> },
                  { value: knowledge.filter(k => k.mastery_level === "learning").length, label: "Aprendiendo", icon: <TrendingUp size={14} color="var(--mn-blue)" /> },
                  { value: pendingAll,    label: "Pendientes hoy", icon: <Clock size={14} color="var(--mn-amber)" /> },
                ].map(s => (
                  <div key={s.label} style={{ padding: "16px 14px", background: "var(--mn-surface)", borderRadius: "var(--mn-r-lg)", border: "1px solid var(--mn-ink-4)", textAlign: "center" }}>
                    <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>{s.icon}</div>
                    <p className="font-display" style={{ fontSize: 26, fontWeight: 700, color: "var(--mn-ink-1)", lineHeight: 1 }}>{s.value}</p>
                    <p style={{ fontSize: 11, color: "var(--mn-ink-3)", marginTop: 4 }}>{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Dominio global */}
              <div style={{ padding: "20px 24px", background: "var(--mn-surface)", borderRadius: "var(--mn-r-xl)", marginBottom: 24, boxShadow: "var(--mn-shadow-sm)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "var(--mn-ink-2)" }}>Dominio global del semestre</p>
                  <span className="font-display" style={{ fontSize: 28, fontWeight: 700, color: "var(--mn-ink-1)" }}>{masteryPctAll}%</span>
                </div>
                <div style={{ height: 6, background: "var(--mn-raised)", borderRadius: "var(--mn-r-full)", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${masteryPctAll}%`, background: "var(--mn-green)", borderRadius: "var(--mn-r-full)", transition: "width 600ms ease" }} />
                </div>
                <p style={{ fontSize: 12, color: "var(--mn-ink-3)", marginTop: 10 }}>
                  {masteryPctAll < 30 ? "Estás empezando. Selecciona una materia para ver tu roadmap." :
                   masteryPctAll < 60 ? "Buen avance. Selecciona una materia para ver la predicción." :
                   masteryPctAll < 85 ? "Casi dominaste el material." :
                   "Dominio casi completo del semestre."}
                </p>
              </div>

              {/* Cards por materia */}
              <p style={{ fontSize: 11, fontWeight: 600, color: "var(--mn-ink-3)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>
                Por materia
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {analyses.map(a => <SubjectSummaryCard key={a.id} analysis={a} onSelect={() => setActive(a.id)} />)}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

/* ─── Tarjeta resumen ─── */
function SubjectSummaryCard({ analysis: a, onSelect }: { analysis: SubjectAnalysis; onSelect: () => void }) {
  const ap          = approvalProb(a.approvalProb);
  const examUrgent  = a.daysToExam !== null && a.daysToExam <= 7;
  const topPriority = a.roadmap[0];

  return (
    <div style={{ padding: "18px 22px", background: "var(--mn-surface)", borderRadius: "var(--mn-r-xl)", border: "1px solid var(--mn-ink-4)", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
      <div style={{ flex: 1, minWidth: 200 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <p className="font-display" style={{ fontSize: 15, fontWeight: 700, color: "var(--mn-ink-1)" }}>{a.name}</p>
          {examUrgent && (
            <span style={{ padding: "2px 9px", borderRadius: "var(--mn-r-full)", background: "var(--mn-raised)", fontSize: 11, fontWeight: 600, color: "var(--mn-amber)" }}>
              Examen en {a.daysToExam}d
            </span>
          )}
        </div>

        {/* Barra de cobertura */}
        <div style={{ marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ fontSize: 12, color: "var(--mn-ink-3)" }}>Cobertura del temario</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--mn-ink-1)" }}>{a.coveragePct}%</span>
          </div>
          <div style={{ height: 4, background: "var(--mn-raised)", borderRadius: "var(--mn-r-full)", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${a.coveragePct}%`, background: "var(--mn-green)", borderRadius: "var(--mn-r-full)", transition: "width 600ms ease" }} />
          </div>
        </div>

        {topPriority && (
          <p style={{ fontSize: 12, color: "var(--mn-ink-3)" }}>
            Prioridad: <span style={{ color: "var(--mn-ink-1)", fontWeight: 600 }}>{topPriority.subject_concepts?.name}</span>
          </p>
        )}
      </div>

      {/* Predicción */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
        {a.roadmap.length > 0 && (
          <div style={{ textAlign: "right" }}>
            <p style={{ fontSize: 11, color: "var(--mn-ink-3)", marginBottom: 2 }}>Nota proyectada</p>
            <p className="font-display" style={{ fontSize: 28, fontWeight: 700, color: "var(--mn-ink-1)", lineHeight: 1 }}>
              {a.predictedGrade.toFixed(1)}
            </p>
            <p style={{ fontSize: 11, color: ap.color, fontWeight: 600, marginTop: 3 }}>{ap.label}</p>
          </div>
        )}
        <button onClick={onSelect} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 600, color: "var(--mn-green)", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
          Ver análisis <ArrowRight size={12} />
        </button>
      </div>
    </div>
  );
}

/* ─── Vista detallada de materia ─── */
function SubjectView({ analysis: a, expandedRoadmap, setExpandedRoadmap }: {
  analysis: SubjectAnalysis;
  expandedRoadmap: string | null;
  setExpandedRoadmap: (id: string | null) => void;
}) {
  const ap             = approvalProb(a.approvalProb);
  const roadmapExpanded = expandedRoadmap === a.id;
  const displayRoadmap  = roadmapExpanded ? a.roadmap : a.roadmap.slice(0, 5);
  const examUrgent      = a.daysToExam !== null && a.daysToExam <= 7;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Alerta examen */}
      {a.nextExam && (
        <div style={{ paddingLeft: 14, borderLeft: `3px solid ${examUrgent ? "var(--mn-amber)" : "var(--mn-ink-4)"}`, padding: "12px 16px 12px 14px", borderLeftWidth: 3, borderLeftStyle: "solid", borderLeftColor: examUrgent ? "var(--mn-amber)" : "var(--mn-ink-4)" }}>
          <p style={{ fontSize: 13, color: "var(--mn-ink-1)" }}>
            <span style={{ fontWeight: 600 }}>{a.nextExam.title}</span>
            {" · "}
            {a.daysToExam === 0 ? "¡Hoy!" : a.daysToExam === 1 ? "Mañana" : `en ${a.daysToExam} días`}
            {" · "}{formatDate(a.nextExam.event_date)}
          </p>
          {examUrgent && (
            <Link href={`/examen/${a.id}`} style={{ fontSize: 12, fontWeight: 600, color: "var(--mn-amber)", textDecoration: "none" }}>
              Modo intensivo →
            </Link>
          )}
        </div>
      )}

      {/* Predicción principal — score grande como protagonista */}
      <div style={{ padding: "24px 28px", background: "var(--mn-surface)", borderRadius: "var(--mn-r-xl)", boxShadow: "var(--mn-shadow-sm)", display: "flex", alignItems: "flex-start", gap: 24, flexWrap: "wrap" }}>
        <div>
          <p style={{ fontSize: 11, fontWeight: 600, color: "var(--mn-ink-3)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>Nota proyectada</p>
          {a.roadmap.length > 0 ? (
            <>
              <p className="font-display" style={{ fontSize: 64, fontWeight: 700, color: "var(--mn-ink-1)", lineHeight: 1, marginBottom: 4 }}>
                {a.predictedGrade.toFixed(1)}
              </p>
              <p style={{ fontSize: 14, color: "var(--mn-ink-2)", marginBottom: 8 }}>{gradeLabel(a.predictedGrade)}</p>
              <span style={{ fontSize: 12, fontWeight: 600, color: ap.color }}>{ap.label}</span>
            </>
          ) : (
            <p style={{ fontSize: 15, color: "var(--mn-ink-3)" }}>Estudia para generar predicción</p>
          )}
        </div>

        {/* Separador vertical */}
        <div style={{ width: 1, background: "var(--mn-ink-4)", alignSelf: "stretch", minHeight: 80 }} />

        {/* Cobertura */}
        <div style={{ flex: 1, minWidth: 160 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: "var(--mn-ink-3)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>Cobertura del temario</p>
          <p className="font-display" style={{ fontSize: 36, fontWeight: 700, color: "var(--mn-ink-1)", lineHeight: 1, marginBottom: 4 }}>
            {a.masteredConcepts > 0 ? Math.round((a.masteredConcepts / a.totalConcepts) * 100) : a.coveragePct}%
          </p>
          <p style={{ fontSize: 12, color: "var(--mn-ink-3)", marginBottom: 10 }}>
            {a.masteredConcepts} dominados · {a.knownConcepts - a.masteredConcepts} en progreso · {a.totalConcepts - a.knownConcepts} sin iniciar
          </p>
          {/* Stacked bar */}
          <div style={{ height: 5, background: "var(--mn-raised)", borderRadius: "var(--mn-r-full)", overflow: "hidden", display: "flex" }}>
            <div style={{ height: "100%", width: `${a.totalConcepts > 0 ? Math.round((a.masteredConcepts / a.totalConcepts) * 100) : 0}%`, background: "#16A34A" }} />
            <div style={{ height: "100%", width: `${a.totalConcepts > 0 ? Math.round(((a.knownConcepts - a.masteredConcepts) / a.totalConcepts) * 100) : 0}%`, background: "var(--mn-amber)" }} />
          </div>
        </div>
      </div>

      {/* Predicción Premium */}
      <PerformancePredictionCard subjectId={a.id} />

      {/* Roadmap */}
      <div style={{ padding: "20px 24px", background: "var(--mn-surface)", borderRadius: "var(--mn-r-xl)", boxShadow: "var(--mn-shadow-sm)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <p className="font-display" style={{ fontSize: 15, fontWeight: 700, color: "var(--mn-ink-1)" }}>Qué estudiar ahora</p>
          <span style={{ fontSize: 12, color: "var(--mn-ink-3)" }}>Por prioridad</span>
        </div>

        {a.roadmap.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--mn-ink-3)" }}>Practica flashcards para que Mnemora construya tu roadmap.</p>
        ) : (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {displayRoadmap.map((k, i) => {
                const m       = MASTERY[k.mastery_level] ?? MASTERY.unknown;
                const isPending = k.next_review ? new Date(k.next_review) <= new Date() : false;
                return (
                  <div key={k.concept_id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: "var(--mn-r-md)", background: i === 0 ? "var(--mn-raised)" : "var(--mn-canvas)", border: i === 0 ? "1px solid var(--mn-ink-4)" : "none" }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: i === 0 ? "var(--mn-ink-1)" : "var(--mn-ink-3)", minWidth: 18, textAlign: "center" }}>{i + 1}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: i === 0 ? 600 : 400, color: "var(--mn-ink-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {k.subject_concepts?.name}
                      </p>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 2 }}>
                        <span style={{ fontSize: 11, color: m.color, fontWeight: 600 }}>{m.label}</span>
                        {isPending && <span style={{ fontSize: 11, color: "var(--mn-amber)" }}>· Pendiente hoy</span>}
                      </div>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: k.confidence < 0.4 ? "var(--mn-error)" : k.confidence < 0.7 ? "var(--mn-amber)" : "#16A34A", flexShrink: 0 }}>
                      {Math.round(k.confidence * 100)}%
                    </span>
                  </div>
                );
              })}
            </div>

            {a.roadmap.length > 5 && (
              <button onClick={() => setExpandedRoadmap(roadmapExpanded ? null : a.id)} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 600, color: "var(--mn-ink-2)", background: "none", border: "none", cursor: "pointer", marginTop: 12, padding: 0 }}>
                {roadmapExpanded ? <><ChevronUp size={13} /> Mostrar menos</> : <><ChevronDown size={13} /> Ver {a.roadmap.length - 5} conceptos más</>}
              </button>
            )}

            <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--mn-ink-4)" }}>
              <Link href={`/flashcards/${a.id}`} className="mn-btn-primary" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, textDecoration: "none" }}>
                <Layers size={14} /> Practicar por prioridad
              </Link>
            </div>
          </>
        )}
      </div>

      {/* Débiles + Dominados */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div style={{ padding: "18px 20px", background: "var(--mn-surface)", borderRadius: "var(--mn-r-xl)", border: "1px solid var(--mn-ink-4)" }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: "var(--mn-amber)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>A reforzar</p>
          {a.roadmap.filter(k => k.mastery_level !== "mastered").slice(0, 5).length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--mn-ink-3)" }}>Sin conceptos débiles.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {a.roadmap.filter(k => k.mastery_level !== "mastered").slice(0, 5).map(k => (
                <div key={k.concept_id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "var(--mn-error)", minWidth: 36, textAlign: "center" }}>
                    {Math.round(k.confidence * 100)}%
                  </span>
                  <p style={{ fontSize: 13, color: "var(--mn-ink-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {k.subject_concepts?.name}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ padding: "18px 20px", background: "var(--mn-surface)", borderRadius: "var(--mn-r-xl)", border: "1px solid var(--mn-ink-4)" }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: "#16A34A", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>Dominados ({a.masteredConcepts})</p>
          {a.masteredConcepts === 0 ? (
            <p style={{ fontSize: 13, color: "var(--mn-ink-3)" }}>Todavía no hay conceptos dominados.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {a.roadmap.filter(k => k.mastery_level === "mastered").slice(0, 5).map(k => (
                <div key={k.concept_id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#16A34A", minWidth: 36, textAlign: "center" }}>
                    {Math.round(k.confidence * 100)}%
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, color: "var(--mn-ink-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {k.subject_concepts?.name}
                    </p>
                    <p style={{ fontSize: 11, color: "var(--mn-ink-3)" }}>Repaso {formatNextReview(k.next_review)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Performance Prediction Card (Premium) ─── */
function PerformancePredictionCard({ subjectId }: { subjectId: string }) {
  const [data, setData]         = useState<PredictionData | null>(null);
  const [locked, setLocked]     = useState(false);
  const [loading, setLoading]   = useState(true);
  const [fetchError, setFetchError] = useState(false);

  useEffect(() => {
    fetch(`/api/performance-prediction/${subjectId}`)
      .then(r => { if (r.status === 403) { setLocked(true); return null; } if (!r.ok) { setFetchError(true); return null; } return r.json(); })
      .then(d => { if (d) setData(d); })
      .catch(() => setFetchError(true))
      .finally(() => setLoading(false));
  }, [subjectId]);

  if (loading) return (
    <div style={{ padding: "20px 24px", background: "var(--mn-surface)", borderRadius: "var(--mn-r-xl)", boxShadow: "var(--mn-shadow-sm)" }}>
      {[120, 90, 110].map((w, i) => (
        <div key={i} style={{ height: 12, width: w, background: "var(--mn-raised)", borderRadius: "var(--mn-r-sm)", marginBottom: 12, animation: "pulse-sk 1.4s ease infinite" }} />
      ))}
    </div>
  );

  if (locked) return (
    <div style={{ padding: "20px 24px", background: "var(--mn-surface)", borderRadius: "var(--mn-r-xl)", border: "1px solid var(--mn-ink-4)", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: "var(--mn-ink-1)", marginBottom: 4 }}>Predicción de nota detallada</p>
        <p style={{ fontSize: 13, color: "var(--mn-ink-3)", lineHeight: 1.5 }}>
          Análisis de factores, probabilidad de aprobar y recomendaciones personalizadas. Disponible en Premium.
        </p>
      </div>
      <Link href="/upgrade" className="mn-btn-primary" style={{ fontSize: 13, textDecoration: "none", whiteSpace: "nowrap" }}>
        Ver planes
      </Link>
    </div>
  );

  if (fetchError || !data) return (
    <div style={{ padding: "16px 20px", background: "var(--mn-surface)", borderRadius: "var(--mn-r-xl)", border: "1px solid var(--mn-ink-4)" }}>
      <p style={{ fontSize: 13, color: "var(--mn-ink-3)" }}>No se pudo cargar la predicción. Recarga la página para reintentar.</p>
    </div>
  );

  const ap = approvalProb(data.approvalProb);
  const impactColor = (impact: PredictionData["factors"][number]["impact"]) =>
    impact === "positive" ? "#16A34A" : impact === "negative" ? "var(--mn-error)" : "var(--mn-amber)";
  const impactIcon  = (impact: PredictionData["factors"][number]["impact"]) =>
    impact === "positive" ? <TrendingUp size={11} /> : impact === "negative" ? <TrendingDown size={11} /> : <Minus size={11} />;

  return (
    <div style={{ padding: "20px 24px", background: "var(--mn-surface)", borderRadius: "var(--mn-r-xl)", boxShadow: "var(--mn-shadow-sm)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <Target size={14} color="var(--mn-ink-2)" />
        <p className="font-display" style={{ fontSize: 14, fontWeight: 700, color: "var(--mn-ink-1)", flex: 1 }}>Predicción de nota</p>
        {data.dataQuality === "low" && (
          <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: "var(--mn-r-full)", background: "var(--mn-raised)", color: "var(--mn-amber)", fontWeight: 600 }}>Datos limitados</span>
        )}
      </div>

      {/* Grade + prob */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        <div style={{ flex: 1, padding: "12px 16px", background: "var(--mn-raised)", borderRadius: "var(--mn-r-lg)" }}>
          <p style={{ fontSize: 11, color: "var(--mn-ink-3)", marginBottom: 4 }}>NOTA PROYECTADA</p>
          <p className="font-display" style={{ fontSize: 32, fontWeight: 700, color: "var(--mn-ink-1)", lineHeight: 1, marginBottom: 2 }}>
            {data.predictedGrade.toFixed(1)}
          </p>
          <p style={{ fontSize: 12, color: "var(--mn-ink-2)" }}>{data.gradeLabel}</p>
        </div>
        <div style={{ flex: 1, padding: "12px 16px", background: "var(--mn-raised)", borderRadius: "var(--mn-r-lg)" }}>
          <p style={{ fontSize: 11, color: "var(--mn-ink-3)", marginBottom: 4 }}>PROBABILIDAD</p>
          <p className="font-display" style={{ fontSize: 32, fontWeight: 700, color: ap.color, lineHeight: 1, marginBottom: 2 }}>
            {data.approvalProbPct}%
          </p>
          <p style={{ fontSize: 12, color: ap.color, fontWeight: 600 }}>{ap.label}</p>
        </div>
      </div>

      {/* Explanation */}
      <p style={{ fontSize: 13, color: "var(--mn-ink-2)", lineHeight: 1.65, marginBottom: 16, paddingLeft: 12, borderLeft: "3px solid var(--mn-ink-4)" }}>
        {data.explanation}
      </p>

      {/* Factors */}
      <p style={{ fontSize: 11, fontWeight: 600, color: "var(--mn-ink-3)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>Factores que influyen</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
        {data.factors.map((f, i) => (
          <div key={i} style={{ padding: "8px 12px", background: "var(--mn-canvas)", borderRadius: "var(--mn-r-md)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
              <span style={{ color: impactColor(f.impact), display: "flex" }}>{impactIcon(f.impact)}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--mn-ink-1)", flex: 1 }}>{f.label}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: impactColor(f.impact) }}>{f.value}</span>
            </div>
            <p style={{ fontSize: 12, color: "var(--mn-ink-3)", lineHeight: 1.4, paddingLeft: 17 }}>{f.detail}</p>
          </div>
        ))}
      </div>

      {/* Recommendations */}
      {data.recommendations.length > 0 && (
        <>
          <p style={{ fontSize: 11, fontWeight: 600, color: "var(--mn-ink-3)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>Cómo mejorar la nota</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {data.recommendations.map((r, i) => (
              <div key={i} style={{ padding: "12px 14px", background: "var(--mn-canvas)", borderRadius: "var(--mn-r-lg)", borderLeft: `3px solid ${r.urgency === "alta" ? "var(--mn-amber)" : "var(--mn-ink-4)"}` }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: "var(--mn-ink-1)", marginBottom: 3 }}>{r.action}</p>
                <p style={{ fontSize: 12, color: "var(--mn-ink-2)", marginBottom: 10, lineHeight: 1.5 }}>{r.reason}</p>
                <Link href={r.cta.href} style={{ fontSize: 12, fontWeight: 600, color: "var(--mn-green)", textDecoration: "none" }}>
                  {r.cta.label} →
                </Link>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function ProgresoPage() {
  return (
    <Suspense>
      <ProgresoPageInner />
    </Suspense>
  );
}
