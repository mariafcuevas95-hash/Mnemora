"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft, CheckCircle, BookOpen, Circle,
  MessageCircle, Zap, ArrowRight,
} from "lucide-react";
import type { RoadmapData, RoadmapConcept } from "@/app/api/roadmap/[subjectId]/route";

const STAGE_CONFIG = {
  mastered: {
    label: "Dominados",
    barColor: "var(--mn-green)",
    barBg: "#6EE7B7",
  },
  in_progress: {
    label: "En progreso",
    barColor: "var(--mn-amber)",
    barBg: "var(--mn-amber)",
  },
  not_started: {
    label: "Por aprender",
    barColor: "var(--mn-ink-4)",
    barBg: "var(--mn-ink-4)",
  },
};

function ConceptRow({ concept, subjectId }: { concept: RoadmapConcept; subjectId: string }) {
  const [open, setOpen] = useState(false);
  const cfg = STAGE_CONFIG[concept.stage];
  const pct = Math.round(concept.confidence * 100);

  return (
    <div style={{ borderRadius: 10, border: `1px solid ${open ? "var(--mn-green)" : "var(--mn-ink-4)"}`, overflow: "hidden", transition: "border-color 120ms" }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: 12,
          padding: "11px 14px", background: "var(--mn-surface)",
          border: "none", cursor: "pointer", textAlign: "left",
        }}
      >
        {concept.stage === "mastered"
          ? <CheckCircle size={15} color="var(--mn-green)" style={{ flexShrink: 0 }} />
          : concept.stage === "in_progress"
          ? <BookOpen size={15} color="var(--mn-amber)" style={{ flexShrink: 0 }} />
          : <Circle size={15} color="var(--mn-ink-4)" style={{ flexShrink: 0 }} />
        }

        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: "var(--mn-ink-1)", lineHeight: 1.4 }}>
            {concept.learningOrder != null && (
              <span style={{ fontSize: 11, color: "var(--mn-ink-3)", marginRight: 6 }}>#{concept.learningOrder}</span>
            )}
            {concept.name}
          </p>
        </div>

        {concept.hasPracticed ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <div style={{ width: 60, height: 4, background: "var(--mn-raised)", borderRadius: 2, overflow: "hidden" }}>
              <div style={{ width: `${pct}%`, height: "100%", background: cfg.barColor, borderRadius: 2 }} />
            </div>
            <span style={{ fontSize: 11, color: "var(--mn-ink-3)", fontWeight: 600, minWidth: 28 }}>{pct}%</span>
          </div>
        ) : (
          <span style={{ fontSize: 11, padding: "2px 7px", borderRadius: 6, background: "var(--mn-raised)", color: "var(--mn-ink-3)", fontWeight: 600, flexShrink: 0 }}>
            Sin iniciar
          </span>
        )}
      </button>

      {open && (
        <div style={{ display: "flex", gap: 8, padding: "10px 14px", background: "var(--mn-canvas)", borderTop: "1px solid var(--mn-ink-4)" }}>
          <Link
            href={`/tutor/${subjectId}`}
            className="mn-btn-primary"
            style={{ fontSize: 12, padding: "7px 12px", textDecoration: "none", display: "flex", alignItems: "center", gap: 5 }}
          >
            <MessageCircle size={12} /> Tutor
          </Link>
          <Link
            href={`/flashcards/${subjectId}`}
            style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 12px", borderRadius: 8, border: "1px solid var(--mn-ink-4)", background: "var(--mn-surface)", color: "var(--mn-ink-2)", textDecoration: "none", fontSize: 12, fontWeight: 600 }}
          >
            <Zap size={12} /> Flashcards
          </Link>
          <Link
            href={`/quiz/${subjectId}`}
            style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 12px", borderRadius: 8, border: "1px solid var(--mn-ink-4)", background: "var(--mn-surface)", color: "var(--mn-ink-2)", textDecoration: "none", fontSize: 12, fontWeight: 600 }}
          >
            Quiz
          </Link>
        </div>
      )}
    </div>
  );
}

function StageSection({ stage, concepts, subjectId }: {
  stage: "mastered" | "in_progress" | "not_started";
  concepts: RoadmapConcept[];
  subjectId: string;
}) {
  const [expanded, setExpanded] = useState(stage !== "mastered");
  const cfg = STAGE_CONFIG[stage];
  if (concepts.length === 0) return null;

  return (
    <div style={{ marginBottom: 20 }}>
      <button
        onClick={() => setExpanded(v => !v)}
        style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, background: "none", border: "none", cursor: "pointer", padding: 0 }}
      >
        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--mn-ink-1)" }}>{cfg.label}</span>
        <span style={{ fontSize: 12, padding: "2px 8px", borderRadius: 8, background: "var(--mn-raised)", color: "var(--mn-ink-2)", fontWeight: 700 }}>
          {concepts.length}
        </span>
        <span style={{ fontSize: 11, color: "var(--mn-ink-3)", marginLeft: 4 }}>{expanded ? "▲" : "▼"}</span>
      </button>

      {expanded && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {concepts.map(c => (
            <ConceptRow key={c.id} concept={c} subjectId={subjectId} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function RoadmapPage() {
  const { subjectId } = useParams<{ subjectId: string }>();
  const [data, setData] = useState<RoadmapData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/roadmap/${subjectId}`)
      .then(async r => {
        if (!r.ok) {
          const body = await r.json().catch(() => ({}));
          setError(body.message ?? body.error ?? "No se pudo cargar el roadmap.");
          return null;
        }
        return r.json();
      })
      .then(d => { if (d) setData(d); })
      .finally(() => setLoading(false));
  }, [subjectId]);

  if (loading) return (
    <div style={{ padding: "48px 24px", textAlign: "center" }}>
      <p style={{ fontSize: 14, color: "var(--mn-ink-3)" }}>Cargando roadmap…</p>
    </div>
  );

  if (error) return (
    <div style={{ padding: "48px 24px", maxWidth: 480, textAlign: "center" }}>
      <p style={{ fontSize: 15, fontWeight: 700, color: "var(--mn-ink-1)", marginBottom: 8 }}>No disponible</p>
      <p style={{ fontSize: 13, color: "var(--mn-ink-2)", marginBottom: 20 }}>{error}</p>
      <Link href="/upgrade" className="mn-btn-primary" style={{ display: "inline-flex", fontSize: 13 }}>
        Ver planes <ArrowRight size={14} />
      </Link>
    </div>
  );

  if (!data || data.totalCount === 0) return (
    <div style={{ padding: "48px 24px", maxWidth: 480, textAlign: "center" }}>
      <p style={{ fontSize: 14, color: "var(--mn-ink-3)" }}>Aún no hay conceptos detectados para esta materia.</p>
      <p style={{ fontSize: 13, color: "var(--mn-ink-3)", marginTop: 6 }}>Sube un documento o el programa de la materia para construir tu roadmap.</p>
      <Link href={`/materias/${subjectId}`} style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 16, fontSize: 13, color: "var(--mn-green)", fontWeight: 700, textDecoration: "none" }}>
        <ChevronLeft size={14} /> Ir a la materia
      </Link>
    </div>
  );

  const masteredPct = Math.round((data.masteredCount / data.totalCount) * 100);
  const startedPct  = Math.round(((data.masteredCount + data.inProgressCount) / data.totalCount) * 100);

  const mastered   = data.concepts.filter(c => c.stage === "mastered");
  const inProgress = data.concepts.filter(c => c.stage === "in_progress");
  const notStarted = data.concepts.filter(c => c.stage === "not_started");

  const nextUp = inProgress[0] ?? notStarted[0] ?? null;

  return (
    <div style={{ padding: "28px 24px", maxWidth: 680 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
        <Link href={`/materias/${subjectId}`} style={{ color: "var(--mn-ink-3)", textDecoration: "none", display: "flex" }}>
          <ChevronLeft size={20} />
        </Link>
        <div>
          <h1 className="font-display" style={{ fontSize: 20, fontWeight: 800, color: "var(--mn-ink-1)", lineHeight: 1.2 }}>
            {data.subjectName}
          </h1>
          <p style={{ fontSize: 12, color: "var(--mn-ink-3)" }}>
            {data.totalCount} conceptos · {data.masteredCount} dominados · {data.notStartedCount} por empezar
          </p>
        </div>
      </div>

      {/* Progress card */}
      <div style={{ background: "var(--mn-surface)", borderRadius: "var(--mn-r-xl)", padding: "20px 22px", border: "1px solid var(--mn-ink-4)", marginBottom: 16, boxShadow: "var(--mn-shadow-sm)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--mn-ink-1)" }}>Progreso general</span>
          <span className="font-display" style={{ fontSize: 20, fontWeight: 700, color: "var(--mn-ink-1)" }}>{masteredPct}%</span>
        </div>
        <div style={{ height: 8, background: "var(--mn-raised)", borderRadius: 4, overflow: "hidden", position: "relative" }}>
          <div style={{ position: "absolute", left: 0, top: 0, width: `${startedPct}%`, height: "100%", background: "#6EE7B7", borderRadius: 4 }} />
          <div style={{ position: "absolute", left: 0, top: 0, width: `${masteredPct}%`, height: "100%", background: "var(--mn-green)", borderRadius: 4, transition: "width 600ms ease" }} />
        </div>
        <div style={{ display: "flex", gap: 16, marginTop: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--mn-green)" }} />
            <span style={{ fontSize: 11, color: "var(--mn-ink-3)" }}>{data.masteredCount} dominados</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#6EE7B7" }} />
            <span style={{ fontSize: 11, color: "var(--mn-ink-3)" }}>{data.inProgressCount} en progreso</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--mn-ink-4)" }} />
            <span style={{ fontSize: 11, color: "var(--mn-ink-3)" }}>{data.notStartedCount} sin empezar</span>
          </div>
        </div>
      </div>

      {/* Next recommended */}
      {nextUp && (
        <div style={{ padding: "16px 20px", background: "var(--mn-surface)", borderRadius: "var(--mn-r-xl)", border: "1px solid var(--mn-ink-4)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 24 }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 600, color: "var(--mn-ink-3)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>Siguiente recomendado</p>
            <p style={{ fontSize: 14, fontWeight: 600, color: "var(--mn-ink-1)" }}>{nextUp.name}</p>
          </div>
          <Link
            href={`/tutor/${subjectId}`}
            className="mn-btn-primary"
            style={{ fontSize: 13, textDecoration: "none", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 6 }}
          >
            Estudiar <ArrowRight size={13} />
          </Link>
        </div>
      )}

      {/* Stages */}
      <StageSection stage="in_progress" concepts={inProgress} subjectId={subjectId} />
      <StageSection stage="not_started" concepts={notStarted} subjectId={subjectId} />
      <StageSection stage="mastered"   concepts={mastered}   subjectId={subjectId} />
    </div>
  );
}
