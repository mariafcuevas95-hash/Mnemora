"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Zap, Brain, Layers, Target, AlertCircle,
  CheckCircle, ChevronLeft, Clock, Map, TrendingUp, Sparkles, ArrowRight,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { ExamCoachResponse } from "@/app/api/exam-coach/[subjectId]/route";
import { PaywallModal } from "@/components/paywall-modal";
import type { Feature } from "@/lib/plans";
import type { PlanId } from "@/lib/plans";
import type { ExamCoverageData } from "@/app/api/exam-coverage/[subjectId]/route";

type Subject = { id: string; name: string };
type KnowledgeRow = {
  concept_id: string;
  confidence: number;
  mastery_level: "unknown" | "learning" | "practiced" | "mastered";
  next_review: string | null;
  subject_concepts: { name: string; learning_order: number | null };
};
type ExamEvent = { id: string; title: string; event_date: string };

const MASTERY_LABEL: Record<string, string> = {
  unknown:   "Nuevo",
  learning:  "Aprendiendo",
  practiced: "En repaso",
  mastered:  "Dominado",
};

function daysUntil(d: string) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const t = new Date(d); t.setHours(0, 0, 0, 0);
  return Math.round((t.getTime() - today.getTime()) / 86_400_000);
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });
}

function studyHoursNeeded(lowConfidenceCount: number, daysLeft: number): string {
  if (daysLeft <= 0) return "¡Hoy es el examen!";
  const hours = Math.max(1, Math.round(lowConfidenceCount * 0.5));
  const perDay = Math.ceil(hours / daysLeft);
  return `~${perDay}h/día durante ${daysLeft} días`;
}

export default function ExamenPage() {
  const { subjectId } = useParams<{ subjectId: string }>();
  const [subject, setSubject] = useState<Subject | null>(null);
  const [knowledge, setKnowledge] = useState<KnowledgeRow[]>([]);
  const [exam, setExam] = useState<ExamEvent | null>(null);
  const [totalConcepts, setTotalConcepts] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [examCoach, setExamCoach] = useState<ExamCoachResponse | null>(null);
  const [coachLoading, setCoachLoading] = useState(true);
  const [paywall, setPaywall] = useState<{ feature: Feature; message: string; planRequired: PlanId } | null>(null);
  const [coverage, setCoverage] = useState<ExamCoverageData | null>(null);
  const [coverageLocked, setCoverageLocked] = useState(false);

  useEffect(() => {
    const CACHE_KEY = `mn-exam-coach-${subjectId}`;
    const CACHE_TTL = 2 * 60 * 60 * 1000;
    try {
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed: ExamCoachResponse = JSON.parse(cached);
        if (Date.now() - new Date(parsed.generatedAt).getTime() < CACHE_TTL) {
          setExamCoach(parsed);
          setCoachLoading(false);
          return;
        }
      }
    } catch {}

    fetch(`/api/exam-coach/${subjectId}`)
      .then(async r => {
        if (r.status === 403) {
          const body = await r.json().catch(() => ({}));
          setPaywall({ feature: "exam_mode", message: body.message ?? "El modo de preparación intensiva para exámenes es exclusivo de Premium.", planRequired: "premium" });
          return null;
        }
        return r.ok ? r.json() : null;
      })
      .then((data: ExamCoachResponse | null) => {
        if (data) {
          setExamCoach(data);
          try { sessionStorage.setItem(CACHE_KEY, JSON.stringify(data)); } catch {}
        }
      })
      .catch(() => {})
      .finally(() => setCoachLoading(false));
  }, [subjectId]);

  useEffect(() => {
    fetch(`/api/exam-coverage/${subjectId}`)
      .then(async r => {
        if (r.status === 403) { setCoverageLocked(true); return null; }
        return r.ok ? r.json() : null;
      })
      .then(d => { if (d) setCoverage(d); })
      .catch(() => {});
  }, [subjectId]);

  useEffect(() => {
    const db = createClient();
    const today = new Date().toISOString().slice(0, 10);
    (async () => {
      const { data: { user } } = await db.auth.getUser();
      const [subRes, kRes, examRes, countRes] = await Promise.all([
        db.from("subjects").select("id, name").eq("id", subjectId).single(),
        user
          ? db.from("student_knowledge")
              .select("concept_id, confidence, mastery_level, next_review, subject_concepts!inner(name, learning_order)")
              .eq("user_id", user.id)
              .eq("subject_concepts.subject_id", subjectId)
              .order("confidence", { ascending: true })
          : Promise.resolve({ data: [] as KnowledgeRow[] }),
        db.from("calendar_events")
          .select("id, title, event_date")
          .eq("subject_id", subjectId)
          .eq("event_type", "exam")
          .gte("event_date", today)
          .order("event_date")
          .limit(1)
          .maybeSingle(),
        db.from("subject_concepts")
          .select("id", { count: "exact", head: true })
          .eq("subject_id", subjectId),
      ]);
      setSubject(subRes.data);
      setKnowledge((kRes.data ?? []) as KnowledgeRow[]);
      setExam(examRes.data);
      setTotalConcepts(countRes.count ?? 0);
      setLoaded(true);
    })();
  }, [subjectId]);

  if (!loaded) return (
    <div style={{ padding: "24px 20px", maxWidth: 680 }}>
      <style>{`@keyframes pulse-skeleton { 0%,100%{opacity:1} 50%{opacity:0.5} }`}</style>
      {[1, 2, 3].map(i => (
        <div key={i} style={{ height: 80, background: "var(--mn-raised)", borderRadius: "var(--mn-r-xl)", marginBottom: 14, animation: "pulse-skeleton 1.4s ease infinite" }} />
      ))}
    </div>
  );

  if (!subject) return (
    <div style={{ padding: "48px 24px", maxWidth: 480, textAlign: "center" }}>
      <p style={{ fontSize: 15, fontWeight: 700, color: "var(--mn-ink-1)", marginBottom: 8 }}>Materia no encontrada</p>
      <p style={{ fontSize: 13, color: "var(--mn-ink-2)", marginBottom: 20 }}>Es posible que esta materia no exista o no tengas acceso.</p>
      <Link href="/dashboard" className="mn-btn-primary" style={{ display: "inline-flex", fontSize: 13, textDecoration: "none" }}>
        Ir al inicio
      </Link>
    </div>
  );

  const days = exam ? daysUntil(exam.event_date) : null;
  const mastered   = knowledge.filter(k => k.mastery_level === "mastered").length;
  const critical   = knowledge.filter(k => k.confidence < 0.4 && k.mastery_level !== "mastered");
  const needsWork  = knowledge.filter(k => k.confidence >= 0.4 && k.confidence < 0.7 && k.mastery_level !== "mastered");
  const known      = knowledge.filter(k => k.mastery_level === "mastered");
  const covered    = knowledge.filter(k => k.confidence > 0).length;
  const coveragePct = totalConcepts > 0 ? Math.round((covered / totalConcepts) * 100) : 0;
  const masteryPct  = knowledge.length > 0 ? Math.round((mastered / knowledge.length) * 100) : 0;
  const urgency: "critical" | "high" | "normal" =
    days !== null && days <= 3 ? "critical" : days !== null && days <= 7 ? "high" : "normal";

  const urgencyBorderColor =
    urgency === "critical" ? "var(--mn-error)"
    : urgency === "high"   ? "var(--mn-amber)"
    : "var(--mn-ink-4)";

  return (
    <>
      <style>{`@keyframes pulse-skeleton { 0%,100%{opacity:1} 50%{opacity:0.5} }`}</style>
      <div style={{ padding: "24px 20px", maxWidth: 680 }}>

        {/* Nav */}
        <Link href={`/materias/${subjectId}`} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 13, color: "var(--mn-ink-3)", textDecoration: "none", marginBottom: 20 }}>
          <ChevronLeft size={15} /> {subject.name}
        </Link>

        {/* Header */}
        <div style={{
          padding: "20px 22px", borderRadius: "var(--mn-r-xl)", marginBottom: 24,
          background: "var(--mn-surface)", border: "1px solid var(--mn-ink-4)",
          borderLeft: `3px solid ${urgencyBorderColor}`,
          boxShadow: "var(--mn-shadow-sm)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <Zap size={16} color="var(--mn-ink-2)" />
            <h1 className="font-display" style={{ fontSize: 20, fontWeight: 800, color: "var(--mn-ink-1)" }}>
              Modo intensivo · {subject.name}
            </h1>
          </div>
          {exam ? (
            <p style={{ fontSize: 14, color: "var(--mn-ink-2)", fontWeight: 600 }}>
              {exam.title} · {formatDate(exam.event_date)}
              {days !== null && (
                <span style={{ marginLeft: 8, fontSize: 13, color: "var(--mn-ink-3)", fontWeight: 400 }}>
                  ({days === 0 ? "¡Hoy!" : days === 1 ? "mañana" : `en ${days} días`})
                </span>
              )}
            </p>
          ) : (
            <p style={{ fontSize: 14, color: "var(--mn-ink-3)" }}>Sin examen próximo · modo de práctica intensiva</p>
          )}
          {days !== null && days > 0 && critical.length > 0 && (
            <p style={{ fontSize: 13, color: "var(--mn-ink-3)", marginTop: 6 }}>
              <strong style={{ color: "var(--mn-ink-2)" }}>{studyHoursNeeded(critical.length, days)}</strong> para cubrir los conceptos críticos
            </p>
          )}
        </div>

        {/* Métricas */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 24 }}>
          <div style={{ background: "var(--mn-surface)", border: "1px solid var(--mn-ink-4)", borderRadius: "var(--mn-r-xl)", padding: "16px", textAlign: "center" }}>
            <Map size={16} color="var(--mn-ink-3)" style={{ marginBottom: 6 }} />
            <p className="font-display" style={{ fontSize: 26, fontWeight: 800, color: "var(--mn-ink-1)", lineHeight: 1 }}>{coveragePct}%</p>
            <p style={{ fontSize: 11, color: "var(--mn-ink-3)", marginTop: 4 }}>del temario cubierto</p>
          </div>
          <div style={{ background: "var(--mn-surface)", border: "1px solid var(--mn-ink-4)", borderRadius: "var(--mn-r-xl)", padding: "16px", textAlign: "center" }}>
            <Target size={16} color="var(--mn-ink-3)" style={{ marginBottom: 6 }} />
            <p className="font-display" style={{ fontSize: 26, fontWeight: 800, color: "var(--mn-ink-1)", lineHeight: 1 }}>{masteryPct}%</p>
            <p style={{ fontSize: 11, color: "var(--mn-ink-3)", marginTop: 4 }}>conceptos dominados</p>
          </div>
          <div style={{ background: "var(--mn-surface)", border: "1px solid var(--mn-ink-4)", borderRadius: "var(--mn-r-xl)", padding: "16px", textAlign: "center" }}>
            {critical.length > 0
              ? <AlertCircle size={16} color="var(--mn-error)" style={{ marginBottom: 6 }} />
              : <CheckCircle size={16} color="var(--mn-green)" style={{ marginBottom: 6 }} />}
            <p className="font-display" style={{ fontSize: 26, fontWeight: 800, color: critical.length > 0 ? "var(--mn-error)" : "var(--mn-green)", lineHeight: 1 }}>
              {critical.length > 0 ? critical.length : "✓"}
            </p>
            <p style={{ fontSize: 11, color: "var(--mn-ink-3)", marginTop: 4 }}>
              {critical.length > 0 ? "críticos" : "todo bajo control"}
            </p>
          </div>
        </div>

        {/* Cobertura inteligente */}
        {coverage ? (
          <ExamCoverageWidget data={coverage} subjectId={subjectId} />
        ) : coverageLocked ? (
          <div style={{ padding: "16px 20px", background: "var(--mn-surface)", borderRadius: "var(--mn-r-xl)", border: "1px solid var(--mn-ink-4)", borderLeft: "3px solid var(--mn-amber)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 24 }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: "var(--mn-ink-1)", marginBottom: 2 }}>Cobertura inteligente — Premium</p>
              <p style={{ fontSize: 12, color: "var(--mn-ink-3)" }}>Qué temas entran, cuáles faltan y qué practicar primero.</p>
            </div>
            <Link href="/upgrade" className="mn-btn-primary" style={{ flexShrink: 0, fontSize: 12, textDecoration: "none", display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap" }}>
              Ver planes <ArrowRight size={12} />
            </Link>
          </div>
        ) : null}

        {/* Plan de ataque */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {critical.length > 0 && (
            <div style={{ background: "var(--mn-surface)", border: "1px solid var(--mn-ink-4)", borderLeft: "3px solid var(--mn-error)", borderRadius: "var(--mn-r-xl)", padding: "18px 20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <AlertCircle size={14} color="var(--mn-error)" />
                <p style={{ fontSize: 14, fontWeight: 700, color: "var(--mn-ink-1)" }}>
                  Prioridad 1 — Conceptos críticos ({critical.length})
                </p>
              </div>
              <p style={{ fontSize: 13, color: "var(--mn-ink-3)", marginBottom: 14 }}>
                Confianza baja. Estos representan el mayor riesgo para el examen.
              </p>
              <ConceptList items={critical} />
              <Link href={`/flashcards/${subjectId}`} className="mn-btn-primary" style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 14, fontSize: 13, textDecoration: "none" }}>
                <Layers size={14} /> Practicar críticos ahora
              </Link>
            </div>
          )}

          {needsWork.length > 0 && (
            <div style={{ background: "var(--mn-surface)", border: "1px solid var(--mn-ink-4)", borderLeft: "3px solid var(--mn-amber)", borderRadius: "var(--mn-r-xl)", padding: "18px 20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <TrendingUp size={14} color="var(--mn-amber)" />
                <p style={{ fontSize: 14, fontWeight: 700, color: "var(--mn-ink-1)" }}>
                  Prioridad 2 — Reforzar ({needsWork.length})
                </p>
              </div>
              <p style={{ fontSize: 13, color: "var(--mn-ink-3)", marginBottom: 14 }}>
                Estás a mitad de camino. Un par de repasos los consolida.
              </p>
              <ConceptList items={needsWork} />
            </div>
          )}

          {known.length > 0 && (
            <div style={{ background: "var(--mn-surface)", border: "1px solid var(--mn-ink-4)", borderLeft: "3px solid var(--mn-green)", borderRadius: "var(--mn-r-xl)", padding: "16px 20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <CheckCircle size={14} color="var(--mn-green)" />
                <p style={{ fontSize: 14, fontWeight: 700, color: "var(--mn-ink-1)" }}>
                  Ya dominados ({known.length})
                </p>
              </div>
              <p style={{ fontSize: 13, color: "var(--mn-ink-3)" }}>
                {known.slice(0, 3).map(k => k.subject_concepts?.name).filter(Boolean).join(", ")}
                {known.length > 3 ? ` y ${known.length - 3} más` : ""}
              </p>
            </div>
          )}

          {/* AI Exam Coach — dark premium card, intencional */}
          {(coachLoading || examCoach) && (
            <div style={{ background: "#1C1108", border: "none", borderRadius: "var(--mn-r-xl)", padding: "20px 22px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <div style={{ width: 28, height: 28, background: "rgba(251,191,36,0.15)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Sparkles size={14} color="#FBBF24" />
                </div>
                <p className="font-display" style={{ fontSize: 14, fontWeight: 800, color: "#FFFFFF" }}>AI Exam Coach</p>
                {examCoach && (
                  <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 10, fontWeight: 700, marginLeft: 4,
                    color: examCoach.readiness === "ready" ? "#6EE7B7" : examCoach.readiness === "on_track" ? "#FCD34D" : "#FCA5A5",
                  }}>
                    {examCoach.readiness === "ready" ? "Listo para el examen" : examCoach.readiness === "on_track" ? "En camino" : examCoach.readiness === "needs_work" ? "Necesita trabajo" : "Situación crítica"}
                  </span>
                )}
              </div>

              {coachLoading ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {[1, 2].map(i => <div key={i} style={{ height: 44, background: "rgba(255,255,255,0.06)", borderRadius: 8, animation: "pulse-skeleton 1.4s ease infinite" }} />)}
                </div>
              ) : examCoach ? (
                <>
                  <p style={{ fontSize: 13, color: "rgba(255,255,255,0.75)", lineHeight: 1.6, marginBottom: 16 }}>
                    {examCoach.assessment}
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
                    {examCoach.dailyPlan.map((day, i) => (
                      <Link
                        key={i}
                        href={day.actionHref}
                        style={{
                          display: "flex", alignItems: "flex-start", gap: 12,
                          padding: "12px 14px", borderRadius: 10,
                          background: i === 0 ? "rgba(251,191,36,0.12)" : "rgba(255,255,255,0.05)",
                          border: i === 0 ? "0.5px solid rgba(251,191,36,0.3)" : "0.5px solid rgba(255,255,255,0.08)",
                          textDecoration: "none",
                        }}
                      >
                        <span style={{ fontSize: 10, fontWeight: 800, padding: "2px 7px", borderRadius: 5, flexShrink: 0, marginTop: 1,
                          background: i === 0 ? "#FBBF24" : "rgba(255,255,255,0.15)",
                          color: i === 0 ? "#1C1108" : "rgba(255,255,255,0.7)",
                        }}>
                          {day.label}
                        </span>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: 12, fontWeight: 700, color: i === 0 ? "#FCD34D" : "rgba(255,255,255,0.85)", marginBottom: 2 }}>{day.focus}</p>
                          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", lineHeight: 1.4 }}>{day.action}</p>
                        </div>
                        <ArrowRight size={13} color="rgba(255,255,255,0.3)" style={{ flexShrink: 0, marginTop: 2 }} />
                      </Link>
                    ))}
                  </div>
                  <p style={{ fontSize: 12, color: "#FBBF24", fontStyle: "italic", lineHeight: 1.5 }}>
                    "{examCoach.keyMessage}"
                  </p>
                </>
              ) : null}
            </div>
          )}

          {/* Acciones principales */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Link href={`/flashcards/${subjectId}`} className="mn-btn-primary" style={{ display: "flex", alignItems: "center", gap: 8, padding: "14px 18px", textDecoration: "none", borderRadius: "var(--mn-r-xl)", justifyContent: "flex-start" }}>
              <Layers size={16} />
              <div>
                <p style={{ fontSize: 13, fontWeight: 700 }}>Practicar flashcards</p>
                <p style={{ fontSize: 11, opacity: 0.7 }}>Repetición espaciada</p>
              </div>
            </Link>
            <Link href={`/tutor/${subjectId}`} style={{ display: "flex", alignItems: "center", gap: 8, padding: "14px 18px", borderRadius: "var(--mn-r-xl)", border: "1px solid var(--mn-ink-4)", background: "var(--mn-surface)", textDecoration: "none" }}>
              <Brain size={16} color="var(--mn-ink-2)" />
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: "var(--mn-ink-1)" }}>Preguntar al tutor</p>
                <p style={{ fontSize: 11, color: "var(--mn-ink-3)" }}>
                  {days !== null && days <= 3 ? "El tutor sabe que el examen es pronto" : "Conceptos críticos primero"}
                </p>
              </div>
            </Link>
          </div>

          {/* Mensaje motivacional */}
          <div style={{ padding: "14px 18px", background: "var(--mn-surface)", borderRadius: "var(--mn-r-xl)", border: "1px solid var(--mn-ink-4)", borderLeft: `3px solid ${urgency === "critical" ? "var(--mn-amber)" : "var(--mn-ink-4)"}`, display: "flex", alignItems: "flex-start", gap: 10 }}>
            <Clock size={14} color="var(--mn-ink-3)" style={{ marginTop: 1, flexShrink: 0 }} />
            <p style={{ fontSize: 13, color: "var(--mn-ink-2)", lineHeight: 1.6 }}>
              {urgency === "critical" && days === 0
                ? "¡Hoy es el día! Repasa los conceptos más importantes, duerme bien y confía en lo que estudiaste."
                : urgency === "critical"
                ? `Quedan ${days} días. Enfócate primero en los conceptos críticos — son los que más impacto tienen en la nota.`
                : urgency === "high"
                ? `Tienes ${days} días. Si estudias los conceptos críticos hoy y mañana, llegas bien al examen.`
                : "Tienes tiempo para prepararte bien. Sigue tu roadmap y no dejes los conceptos críticos para el final."
              }
            </p>
          </div>
        </div>
      </div>

      {paywall && (
        <PaywallModal
          feature={paywall.feature}
          message={paywall.message}
          planRequired={paywall.planRequired}
          onClose={() => setPaywall(null)}
        />
      )}
    </>
  );
}

function ConceptList({ items }: { items: KnowledgeRow[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {items.slice(0, 6).map(k => (
        <div key={k.concept_id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: "var(--mn-r-lg)", background: "var(--mn-canvas)" }}>
          <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: "var(--mn-r-sm)", background: "var(--mn-raised)", color: "var(--mn-ink-3)", fontWeight: 700, flexShrink: 0 }}>
            {MASTERY_LABEL[k.mastery_level] ?? "Nuevo"}
          </span>
          <p style={{ flex: 1, fontSize: 13, color: "var(--mn-ink-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {k.subject_concepts?.name}
          </p>
          <span style={{ fontSize: 12, fontWeight: 700, flexShrink: 0, color: k.confidence < 0.4 ? "var(--mn-error)" : "var(--mn-amber)" }}>
            {Math.round(k.confidence * 100)}%
          </span>
        </div>
      ))}
      {items.length > 6 && (
        <p style={{ fontSize: 12, color: "var(--mn-ink-3)", paddingLeft: 4 }}>+{items.length - 6} más</p>
      )}
    </div>
  );
}

function ExamCoverageWidget({ data, subjectId }: { data: ExamCoverageData; subjectId: string }) {
  const [showNotStarted, setShowNotStarted] = useState(false);
  const notStarted = data.concepts.filter(c => c.tier === "not_started");
  const inProgress = data.concepts.filter(c => c.tier === "in_progress");
  const critical   = data.concepts.filter(c => c.tier !== "mastered" && c.confidence < 0.4 && c.tier !== "not_started");

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <p className="font-display" style={{ fontSize: 15, fontWeight: 800, color: "var(--mn-ink-1)" }}>Cobertura del examen</p>
        {data.nextExam && (
          <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 8, background: "var(--mn-raised)", color: data.nextExam.daysUntil <= 3 ? "var(--mn-error)" : "var(--mn-amber)", fontWeight: 700 }}>
            {data.nextExam.daysUntil === 0 ? "¡Hoy!" : data.nextExam.daysUntil === 1 ? "Mañana" : `${data.nextExam.daysUntil}d`}
          </span>
        )}
      </div>

      <div style={{ background: "var(--mn-surface)", border: "1px solid var(--mn-ink-4)", borderRadius: "var(--mn-r-xl)", padding: "18px 20px", marginBottom: 10 }}>
        <div style={{ height: 8, background: "var(--mn-raised)", borderRadius: 4, overflow: "hidden", display: "flex", marginBottom: 12 }}>
          <div style={{ width: `${data.masteredPct}%`, background: "var(--mn-green)", transition: "width 600ms ease" }} />
          <div style={{ width: `${data.coveredPct - data.masteredPct}%`, background: "#FBBF24", transition: "width 600ms ease" }} />
        </div>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: "var(--mn-green)" }} />
            <span style={{ fontSize: 12, color: "var(--mn-ink-3)" }}><strong style={{ color: "var(--mn-ink-1)" }}>{data.masteredCount}</strong> dominados ({data.masteredPct}%)</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: "#FBBF24" }} />
            <span style={{ fontSize: 12, color: "var(--mn-ink-3)" }}><strong style={{ color: "var(--mn-ink-1)" }}>{data.inProgressCount}</strong> en progreso</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: "var(--mn-ink-4)" }} />
            <span style={{ fontSize: 12, color: "var(--mn-ink-3)" }}><strong style={{ color: "var(--mn-ink-1)" }}>{data.notStartedCount}</strong> sin iniciar</span>
          </div>
        </div>
        {data.performanceEstimate !== null && (
          <p style={{ fontSize: 12, color: "var(--mn-ink-3)", marginTop: 10, borderTop: "1px solid var(--mn-ink-4)", paddingTop: 10 }}>
            Nota proyectada: <strong style={{ color: data.performanceEstimate >= 7 ? "var(--mn-green)" : data.performanceEstimate >= 5.5 ? "var(--mn-amber)" : "var(--mn-error)" }}>
              {data.performanceEstimate.toFixed(1)}
            </strong>
          </p>
        )}
      </div>

      {notStarted.length > 0 && (
        <div style={{ background: "var(--mn-surface)", border: "1px solid var(--mn-ink-4)", borderLeft: "3px solid var(--mn-ink-4)", borderRadius: "var(--mn-r-xl)", padding: "14px 18px", marginBottom: 10 }}>
          <button
            onClick={() => setShowNotStarted(v => !v)}
            style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", cursor: "pointer", padding: 0, width: "100%", textAlign: "left" }}
          >
            <p style={{ fontSize: 13, fontWeight: 700, color: "var(--mn-ink-1)", flex: 1 }}>
              Temas sin iniciar ({notStarted.length})
            </p>
            <span style={{ fontSize: 11, color: "var(--mn-ink-3)" }}>{showNotStarted ? "▲" : "▼"}</span>
          </button>
          {!showNotStarted && (
            <p style={{ fontSize: 12, color: "var(--mn-ink-3)", marginTop: 4 }}>
              {notStarted.slice(0, 3).map(c => c.name).join(", ")}{notStarted.length > 3 ? ` y ${notStarted.length - 3} más` : ""}
            </p>
          )}
          {showNotStarted && (
            <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: 10 }}>
              {notStarted.map(c => (
                <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: "var(--mn-r-lg)", background: "var(--mn-canvas)" }}>
                  <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: "var(--mn-r-sm)", background: "var(--mn-raised)", color: "var(--mn-ink-3)", fontWeight: 700, flexShrink: 0 }}>Sin iniciar</span>
                  <p style={{ flex: 1, fontSize: 13, color: "var(--mn-ink-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {c.learningOrder != null && <span style={{ fontSize: 11, color: "var(--mn-ink-3)", marginRight: 4 }}>#{c.learningOrder}</span>}
                    {c.name}
                  </p>
                </div>
              ))}
            </div>
          )}
          <Link href={`/tutor/${subjectId}`} style={{ display: "inline-flex", alignItems: "center", gap: 5, marginTop: 12, fontSize: 12, fontWeight: 700, color: "var(--mn-green)", textDecoration: "none" }}>
            Empezar con el tutor <ArrowRight size={12} />
          </Link>
        </div>
      )}

      {(critical.length > 0 || inProgress.length > 0) && (
        <div style={{ display: "flex", gap: 8 }}>
          {critical.length > 0 && (
            <Link href={`/flashcards/${subjectId}`} className="mn-btn-primary" style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px", borderRadius: "var(--mn-r-lg)", textDecoration: "none", fontSize: 12, fontWeight: 700 }}>
              Practicar críticos ({critical.length})
            </Link>
          )}
          <Link href={`/quiz/${subjectId}`} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px", borderRadius: "var(--mn-r-lg)", border: "1px solid var(--mn-ink-4)", background: "var(--mn-surface)", color: "var(--mn-ink-2)", textDecoration: "none", fontSize: 12, fontWeight: 600 }}>
            Quiz de diagnóstico
          </Link>
        </div>
      )}
    </div>
  );
}
