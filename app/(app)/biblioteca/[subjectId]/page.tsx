"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  FileText, Layers, Brain, Camera, BookOpen,
  Search, ChevronRight, Zap, MessageSquare, CheckCircle2,
  Circle, HelpCircle, Star, X, ExternalLink,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

// ── Types ─────────────────────────────────────────────────────────────────────

type Subject = { id: string; name: string; professor?: string; semester_label?: string };

type Doc = {
  id: string; name: string; summary: string | null;
  processing_status: string; created_at: string; source: string | null;
};

type Flashcard = {
  id: string; front: string; back: string;
  created_at: string; source: string | null;
};

type Concept = {
  id: string; name: string; description: string | null; created_at: string;
  knowledge: { confidence: number; mastery_level: string } | null;
};

type Conversation = {
  id: string; title: string | null; created_at: string; message_count: number;
};

type FilterId = "all" | "documentos" | "fotos" | "flashcards" | "conceptos" | "conversaciones";

// ── Helpers ───────────────────────────────────────────────────────────────────

function masteryTextColor(level: string | undefined): string {
  switch (level) {
    case "mastered":  return "var(--mn-green)";
    case "practiced": return "var(--mn-ink-2)";
    case "learning":  return "var(--mn-amber)";
    default:          return "var(--mn-ink-3)";
  }
}

function masteryLabel(level: string | undefined) {
  switch (level) {
    case "mastered":  return "Dominado";
    case "practiced": return "Practicado";
    case "learning":  return "Aprendiendo";
    default:          return "Sin repasar";
  }
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function BibliotecaPage() {
  const { subjectId } = useParams<{ subjectId: string }>();

  const [subject, setSubject]             = useState<Subject | null>(null);
  const [docs, setDocs]                   = useState<Doc[]>([]);
  const [flashcards, setFlashcards]       = useState<Flashcard[]>([]);
  const [concepts, setConcepts]           = useState<Concept[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading]             = useState(true);
  const [filter, setFilter]               = useState<FilterId>("all");
  const [query, setQuery]                 = useState("");

  useEffect(() => {
    const db = createClient();
    (async () => {
      const { data: { user } } = await db.auth.getUser();
      const [subRes, docRes, fcRes, conceptRes, convRes] = await Promise.all([
        db.from("subjects").select("id, name, professor, semester_label").eq("id", subjectId).single(),
        db.from("documents")
          .select("id, name, summary, processing_status, created_at, source")
          .eq("subject_id", subjectId)
          .order("created_at", { ascending: false }),
        db.from("flashcards")
          .select("id, front, back, created_at, source")
          .eq("subject_id", subjectId)
          .order("created_at", { ascending: false }),
        db.from("subject_concepts")
          .select("id, name, description, created_at")
          .eq("subject_id", subjectId)
          .order("name"),
        db.from("conversations")
          .select("id, title, created_at")
          .eq("subject_id", subjectId)
          .order("created_at", { ascending: false })
          .limit(10),
      ]);

      setSubject(subRes.data);
      setDocs(docRes.data ?? []);
      setFlashcards(fcRes.data ?? []);
      setConversations(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (convRes.data ?? []).map((c: any) => ({ ...c, message_count: 0 }))
      );

      if (user && conceptRes.data?.length) {
        const ids = conceptRes.data.map(c => c.id);
        const { data: knowledge } = await db
          .from("student_knowledge")
          .select("concept_id, confidence, mastery_level")
          .eq("user_id", user.id)
          .in("concept_id", ids);
        const knMap = new Map(
          (knowledge ?? []).map(k => [k.concept_id, { confidence: k.confidence, mastery_level: k.mastery_level }])
        );
        setConcepts(conceptRes.data.map(c => ({ ...c, knowledge: knMap.get(c.id) ?? null })));
      } else {
        setConcepts((conceptRes.data ?? []).map(c => ({ ...c, knowledge: null })));
      }
      setLoading(false);
    })();
  }, [subjectId]);

  // ── Search + filter ──────────────────────────────────────────────────────
  const q = query.toLowerCase().trim();

  const filtered = useMemo(() => {
    const matchDoc  = (d: Doc)          => !q || d.name.toLowerCase().includes(q) || (d.summary ?? "").toLowerCase().includes(q);
    const matchFc   = (f: Flashcard)    => !q || f.front.toLowerCase().includes(q) || f.back.toLowerCase().includes(q);
    const matchCon  = (c: Concept)      => !q || c.name.toLowerCase().includes(q) || (c.description ?? "").toLowerCase().includes(q);
    const matchConv = (c: Conversation) => !q || (c.title ?? "").toLowerCase().includes(q);

    const pdfs     = docs.filter(d => !d.source || d.source !== "multimodal");
    const photos   = docs.filter(d => d.source === "multimodal");
    const photoFcs = flashcards.filter(f => f.source === "multimodal");

    return {
      pdfs:            filter === "all" || filter === "documentos"    ? pdfs.filter(matchDoc)             : [],
      photos:          filter === "all" || filter === "fotos"         ? photos.filter(matchDoc)            : [],
      photoFlashcards: filter === "all" || filter === "fotos"         ? photoFcs.filter(matchFc)           : [],
      flashcards:      filter === "all" || filter === "flashcards"    ? flashcards.filter(f => f.source !== "multimodal").filter(matchFc) : [],
      concepts:        filter === "all" || filter === "conceptos"     ? concepts.filter(matchCon)          : [],
      conversations:   filter === "all" || filter === "conversaciones"? conversations.filter(matchConv)    : [],
    };
  }, [docs, flashcards, concepts, conversations, filter, q]);

  const totalResults = Object.values(filtered).reduce((s, arr) => s + arr.length, 0);

  const FILTERS: { id: FilterId; label: string; count: number }[] = ([
    { id: "all",           label: "Todo",              count: docs.length + flashcards.length + concepts.length + conversations.length },
    { id: "documentos",    label: "Documentos",        count: docs.filter(d => d.source !== "multimodal").length },
    { id: "fotos",         label: "Fotos analizadas",  count: docs.filter(d => d.source === "multimodal").length + flashcards.filter(f => f.source === "multimodal").length },
    { id: "flashcards",    label: "Flashcards",        count: flashcards.filter(f => f.source !== "multimodal").length },
    { id: "conceptos",     label: "Conceptos",         count: concepts.length },
    { id: "conversaciones",label: "Conversaciones",    count: conversations.length },
  ] as { id: FilterId; label: string; count: number }[]).filter(f => f.id === "all" || f.count > 0);

  if (loading) return (
    <div style={{ padding: "24px 20px", maxWidth: 720 }}>
      <style>{`@keyframes pulse-skeleton { 0%,100%{opacity:1} 50%{opacity:0.5} }`}</style>
      {[1, 2, 3].map(i => (
        <div key={i} style={{ height: 72, background: "var(--mn-raised)", borderRadius: "var(--mn-r-xl)", marginBottom: 12, animation: "pulse-skeleton 1.4s ease infinite" }} />
      ))}
    </div>
  );

  if (!subject) return (
    <div style={{ padding: "24px 20px" }}>
      <p style={{ color: "var(--mn-ink-3)", fontSize: 14 }}>Materia no encontrada.</p>
      <Link href="/materias" style={{ color: "var(--mn-green)", fontSize: 13, fontWeight: 600 }}>← Volver</Link>
    </div>
  );

  return (
    <div style={{ padding: "24px 20px", maxWidth: 720 }}>
      <style>{`@keyframes pulse-skeleton { 0%,100%{opacity:1} 50%{opacity:0.5} }`}</style>

      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 16 }}>
        <Link href="/dashboard" style={{ fontSize: 13, color: "var(--mn-ink-3)", textDecoration: "none" }}>Dashboard</Link>
        <ChevronRight size={12} color="var(--mn-ink-4)" />
        <Link href={`/materias/${subjectId}`} style={{ fontSize: 13, color: "var(--mn-ink-3)", textDecoration: "none" }}>{subject.name}</Link>
        <ChevronRight size={12} color="var(--mn-ink-4)" />
        <span style={{ fontSize: 13, color: "var(--mn-ink-1)", fontWeight: 600 }}>Biblioteca</span>
      </div>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 24 }}>
        <div>
          <h1 className="font-display" style={{ fontSize: 22, fontWeight: 800, color: "var(--mn-ink-1)", marginBottom: 4 }}>
            Biblioteca
          </h1>
          <p style={{ fontSize: 13, color: "var(--mn-ink-3)" }}>
            {docs.length} doc{docs.length !== 1 ? "s" : ""} · {flashcards.length} flashcard{flashcards.length !== 1 ? "s" : ""} · {concepts.length} concepto{concepts.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Link href={`/flashcards/${subjectId}`} className="mn-btn-primary" style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, textDecoration: "none" }}>
            <Layers size={13} /> Practicar
          </Link>
          <Link href={`/quiz/${subjectId}`} style={{ display: "flex", alignItems: "center", gap: 5, padding: "8px 14px", borderRadius: "var(--mn-r-lg)", border: "1px solid var(--mn-ink-4)", background: "var(--mn-surface)", color: "var(--mn-ink-2)", fontSize: 12, fontWeight: 700, textDecoration: "none" }}>
            <Zap size={13} /> Quiz
          </Link>
          <Link href={`/tutor/${subjectId}`} style={{ display: "flex", alignItems: "center", gap: 5, padding: "8px 14px", borderRadius: "var(--mn-r-lg)", border: "1px solid var(--mn-ink-4)", background: "var(--mn-surface)", color: "var(--mn-ink-2)", fontSize: 12, fontWeight: 700, textDecoration: "none" }}>
            <Brain size={13} /> Tutor
          </Link>
        </div>
      </div>

      {/* Search */}
      <div style={{ position: "relative", marginBottom: 14 }}>
        <Search size={15} color="var(--mn-ink-3)" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Buscar en documentos, flashcards, conceptos..."
          style={{ width: "100%", padding: "11px 40px 11px 38px", borderRadius: "var(--mn-r-xl)", border: "1.5px solid var(--mn-ink-4)", background: "var(--mn-surface)", fontSize: 14, color: "var(--mn-ink-1)", outline: "none", boxSizing: "border-box" }}
          onFocus={e => (e.target.style.borderColor = "var(--mn-green)")}
          onBlur={e => (e.target.style.borderColor = "var(--mn-ink-4)")}
        />
        {query && (
          <button onClick={() => setQuery("")} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: 2 }}>
            <X size={14} color="var(--mn-ink-3)" />
          </button>
        )}
      </div>

      {/* Filter chips */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 24 }}>
        {FILTERS.map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`mn-chip-filter${filter === f.id ? " active" : ""}`}
          >
            {f.label} <span style={{ opacity: 0.6, fontWeight: 400 }}>({f.count})</span>
          </button>
        ))}
      </div>
      <style>{`.mn-chip-filter { padding: 5px 13px; border-radius: var(--mn-r-full); font-size: 13px; font-weight: 600; border: 1px solid var(--mn-ink-4); cursor: pointer; }
.mn-chip-filter.active { background: var(--mn-ink-1); color: #fff; border-color: var(--mn-ink-1); }
.mn-chip-filter:not(.active) { background: var(--mn-surface); color: var(--mn-ink-2); }`}</style>

      {q && (
        <p style={{ fontSize: 13, color: "var(--mn-ink-3)", marginBottom: 16 }}>
          {totalResults} resultado{totalResults !== 1 ? "s" : ""} para &ldquo;{query}&rdquo;
        </p>
      )}

      {/* Documentos */}
      {filtered.pdfs.length > 0 && (
        <Section title="Documentos" icon={<FileText size={14} color="var(--mn-ink-2)" />}>
          {filtered.pdfs.map(doc => (
            <ResourceCard key={doc.id}
              icon={<div style={{ width: 34, height: 34, background: "var(--mn-canvas)", borderRadius: "var(--mn-r-lg)", border: "1px solid var(--mn-ink-4)", display: "flex", alignItems: "center", justifyContent: "center" }}><FileText size={15} color="var(--mn-ink-2)" /></div>}
              title={doc.name || "Documento sin nombre"}
              subtitle={doc.summary ? doc.summary.slice(0, 100) + (doc.summary.length > 100 ? "…" : "") : (doc.processing_status === "done" ? "Procesado" : "Procesando…")}
              meta={formatDate(doc.created_at)}
              ctaLabel="Ver flashcards"
              ctaHref={`/flashcards/${subjectId}`}
            />
          ))}
        </Section>
      )}

      {/* Fotos analizadas */}
      {(filtered.photos.length > 0 || filtered.photoFlashcards.length > 0) && (
        <Section title="Fotos analizadas" icon={<Camera size={14} color="var(--mn-ink-2)" />}>
          {filtered.photos.map(doc => (
            <ResourceCard key={doc.id}
              icon={<div style={{ width: 34, height: 34, background: "var(--mn-canvas)", borderRadius: "var(--mn-r-lg)", border: "1px solid var(--mn-ink-4)", display: "flex", alignItems: "center", justifyContent: "center" }}><Camera size={15} color="var(--mn-ink-2)" /></div>}
              title={doc.name || "Foto analizada"}
              subtitle={doc.summary ?? "Análisis de imagen"}
              meta={formatDate(doc.created_at)}
              ctaLabel="Ver flashcards"
              ctaHref={`/flashcards/${subjectId}`}
            />
          ))}
          {filtered.photoFlashcards.length > 0 && (
            <p style={{ fontSize: 12, color: "var(--mn-ink-3)", padding: "4px 0" }}>
              {filtered.photoFlashcards.length} flashcard{filtered.photoFlashcards.length !== 1 ? "s" : ""} generada{filtered.photoFlashcards.length !== 1 ? "s" : ""} de fotos
            </p>
          )}
        </Section>
      )}

      {/* Flashcards */}
      {filtered.flashcards.length > 0 && (
        <Section
          title="Flashcards"
          icon={<Layers size={14} color="var(--mn-ink-2)" />}
          cta={
            <Link href={`/flashcards/${subjectId}`} style={{ fontSize: 12, fontWeight: 700, color: "var(--mn-green)", textDecoration: "none", display: "flex", alignItems: "center", gap: 3 }}>
              Practicar todas <ExternalLink size={11} />
            </Link>
          }
        >
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 8 }}>
            {filtered.flashcards.slice(0, 8).map(fc => (
              <div key={fc.id} style={{ background: "var(--mn-canvas)", border: "1px solid var(--mn-ink-4)", borderRadius: "var(--mn-r-lg)", padding: "12px 14px" }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: "var(--mn-ink-1)", marginBottom: 4, lineHeight: 1.4 }}>{fc.front}</p>
                <p style={{ fontSize: 11, color: "var(--mn-ink-3)", lineHeight: 1.4 }}>{fc.back.slice(0, 80)}{fc.back.length > 80 ? "…" : ""}</p>
              </div>
            ))}
          </div>
          {filtered.flashcards.length > 8 && (
            <Link href={`/flashcards/${subjectId}`} style={{ fontSize: 12, color: "var(--mn-green)", fontWeight: 600, textDecoration: "none", marginTop: 8, display: "block" }}>
              Ver las {filtered.flashcards.length} flashcards →
            </Link>
          )}
        </Section>
      )}

      {/* Conceptos */}
      {filtered.concepts.length > 0 && (
        <Section
          title="Conceptos detectados"
          icon={<BookOpen size={14} color="var(--mn-ink-2)" />}
          cta={
            <Link href={`/progreso?subject=${subjectId}`} style={{ fontSize: 12, fontWeight: 700, color: "var(--mn-green)", textDecoration: "none", display: "flex", alignItems: "center", gap: 3 }}>
              Ver progreso <ExternalLink size={11} />
            </Link>
          }
        >
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {filtered.concepts.map(c => {
              const color = masteryTextColor(c.knowledge?.mastery_level);
              const label = masteryLabel(c.knowledge?.mastery_level);
              const MasteryIcon = c.knowledge?.mastery_level === "mastered" ? CheckCircle2
                : c.knowledge?.mastery_level === "practiced" ? Star
                : c.knowledge?.mastery_level === "learning"  ? HelpCircle
                : Circle;
              return (
                <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: "var(--mn-r-full)", background: "var(--mn-raised)", border: "1px solid var(--mn-ink-4)" }}>
                  <MasteryIcon size={11} color={color} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--mn-ink-1)" }}>{c.name}</span>
                  <span style={{ fontSize: 10, color }}>· {label}</span>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {/* Conversaciones */}
      {filtered.conversations.length > 0 && (
        <Section title="Conversaciones con el tutor" icon={<MessageSquare size={14} color="var(--mn-ink-2)" />}>
          {filtered.conversations.map(conv => (
            <ResourceCard key={conv.id}
              icon={<div style={{ width: 34, height: 34, background: "var(--mn-canvas)", borderRadius: "var(--mn-r-lg)", border: "1px solid var(--mn-ink-4)", display: "flex", alignItems: "center", justifyContent: "center" }}><Brain size={15} color="var(--mn-ink-2)" /></div>}
              title={conv.title ?? `Conversación del ${formatDate(conv.created_at)}`}
              subtitle="Conversación con el tutor de IA"
              meta={formatDate(conv.created_at)}
              ctaLabel="Abrir tutor"
              ctaHref={`/tutor/${subjectId}`}
            />
          ))}
        </Section>
      )}

      {/* Empty state */}
      {totalResults === 0 && (
        <div style={{ background: "var(--mn-surface)", border: "1px solid var(--mn-ink-4)", borderRadius: "var(--mn-r-xl)", padding: 40, textAlign: "center" }}>
          <BookOpen size={28} color="var(--mn-ink-4)" style={{ marginBottom: 12 }} />
          {q ? (
            <>
              <p className="font-display" style={{ fontSize: 15, fontWeight: 700, color: "var(--mn-ink-1)", marginBottom: 6 }}>Sin resultados</p>
              <p style={{ fontSize: 13, color: "var(--mn-ink-3)" }}>Prueba con otro término o cambia el filtro.</p>
            </>
          ) : (
            <>
              <p className="font-display" style={{ fontSize: 15, fontWeight: 700, color: "var(--mn-ink-1)", marginBottom: 6 }}>Biblioteca vacía</p>
              <p style={{ fontSize: 13, color: "var(--mn-ink-3)", marginBottom: 20, lineHeight: 1.6 }}>
                Sube un documento o analiza una foto para empezar a construir tu biblioteca.
              </p>
              <Link href={`/materias/${subjectId}`} className="mn-btn-primary" style={{ display: "inline-flex", fontSize: 13, textDecoration: "none" }}>
                Ir a la materia →
              </Link>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Section({ title, icon, children, cta }: {
  title: string; icon: React.ReactNode; children: React.ReactNode; cta?: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          {icon}
          <h2 style={{ fontSize: 12, fontWeight: 700, color: "var(--mn-ink-3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{title}</h2>
        </div>
        {cta}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {children}
      </div>
    </div>
  );
}

function ResourceCard({ icon, title, subtitle, meta, ctaLabel, ctaHref }: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  meta: string;
  ctaLabel: string;
  ctaHref: string;
}) {
  return (
    <div style={{ background: "var(--mn-surface)", border: "1px solid var(--mn-ink-4)", borderRadius: "var(--mn-r-xl)", padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
      {icon}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: "var(--mn-ink-1)", marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</p>
        <p style={{ fontSize: 12, color: "var(--mn-ink-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{subtitle}</p>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        <span style={{ fontSize: 11, color: "var(--mn-ink-4)" }}>{meta}</span>
        <Link href={ctaHref} style={{ padding: "5px 10px", borderRadius: "var(--mn-r-lg)", border: "1px solid var(--mn-ink-4)", background: "var(--mn-canvas)", color: "var(--mn-ink-2)", fontSize: 11, fontWeight: 700, textDecoration: "none", whiteSpace: "nowrap" }}>
          {ctaLabel}
        </Link>
      </div>
    </div>
  );
}
