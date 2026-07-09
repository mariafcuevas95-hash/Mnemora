"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import React from "react";
import {
  FileText, Layers, Brain, Upload, Plus,
  Sparkles, ChevronRight, Clock, Loader2, Camera, CheckCircle, BookOpen,
  Star, LayoutGrid, List, Calendar, Zap, ArrowRight, Trash2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { PaywallModal } from "@/components/paywall-modal";
import type { Feature, PlanId } from "@/lib/plans";

type Subject = {
  id: string;
  name: string;
  professor?: string;
  semester_label?: string;
  goal_type?: string | null;
  goal_value?: string | null;
};

type GoalType = "pass" | "grade" | "exam" | "scholarship" | "hours";
const GOAL_LABELS: Record<GoalType, string> = {
  pass:        "Aprobar la materia",
  grade:       "Sacar nota específica",
  exam:        "Prepararse para examen",
  scholarship: "Mantener beca",
  hours:       "Estudiar X horas/semana",
};

type Document = {
  id: string;
  name: string;
  file_url: string | null;
  processing_status: "pending" | "processing" | "done" | "failed";
  summary: string | null;
  created_at: string;
};

type Flashcard = {
  id: string;
  front: string;
  back: string;
};

type CalendarEvent = {
  id: string;
  title: string;
  event_date: string;
  event_type: string;
};

type PaywallState = { feature: Feature; message: string; planRequired: PlanId } | null;
type TabId = "documentos" | "flashcards" | "resumen" | "tutor";

function daysUntil(dateStr: string): number {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr); target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("es", { day: "numeric", month: "short" });
}

function statusIcon(status: Document["processing_status"]) {
  if (status === "processing") return <span style={{ fontSize: 12, color: "var(--mn-amber)" }}>Procesando…</span>;
  if (status === "failed")    return <span style={{ fontSize: 12, color: "var(--mn-error)" }}>Error al procesar</span>;
  if (status === "pending")   return <span style={{ fontSize: 12, color: "var(--mn-ink-3)" }}>En cola…</span>;
  return null;
}

/* ─── Markdown renderer (lógica intacta, colores → tokens) ─── */
function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) =>
    part.startsWith("**") && part.endsWith("**")
      ? <strong key={i} style={{ color: "var(--mn-ink-1)", fontWeight: 700 }}>{part.slice(2, -2)}</strong>
      : part
  );
}

function renderMarkdown(md: string): React.ReactNode[] {
  const lines = md.split("\n");
  const nodes: React.ReactNode[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line) { i++; continue; }
    if (line.startsWith("# ")) {
      nodes.push(<h3 key={i} style={{ fontSize: 14, fontWeight: 700, color: "var(--mn-ink-2)", marginBottom: 10, marginTop: nodes.length > 0 ? 18 : 0, textTransform: "uppercase", letterSpacing: "0.05em" }}>{line.slice(2)}</h3>);
      i++; continue;
    }
    if (line.startsWith("## ")) {
      nodes.push(<h4 key={i} style={{ fontSize: 14, fontWeight: 600, color: "var(--mn-ink-1)", marginBottom: 8, marginTop: nodes.length > 0 ? 14 : 0 }}>{line.slice(3)}</h4>);
      i++; continue;
    }
    if (/^[-•*]\s/.test(line)) {
      const bulletLines: string[] = [];
      while (i < lines.length && /^[-•*]\s/.test(lines[i].trim())) {
        bulletLines.push(lines[i].trim().replace(/^[-•*]\s/, ""));
        i++;
      }
      nodes.push(
        <ul key={i} style={{ margin: "0 0 10px 0", paddingLeft: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
          {bulletLines.map((b, bi) => (
            <li key={bi} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 14, color: "var(--mn-ink-1)", lineHeight: 1.65 }}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--mn-ink-3)", flexShrink: 0, marginTop: 9 }} />
              <span>{renderInline(b)}</span>
            </li>
          ))}
        </ul>
      );
      continue;
    }
    nodes.push(<p key={i} style={{ fontSize: 14, color: "var(--mn-ink-1)", lineHeight: 1.7, marginBottom: 8 }}>{renderInline(line)}</p>);
    i++;
  }
  return nodes;
}

/* ─── SummaryCard ─── */
function SummaryCard({ doc }: { doc: Document }) {
  const [expanded, setExpanded] = useState(false);
  const summary = doc.summary ?? "";
  const isLong = summary.length > 700;
  const display = isLong && !expanded ? summary.slice(0, 700).replace(/\n[^\n]*$/, "") : summary;

  return (
    <div style={{ background: "var(--mn-surface)", borderRadius: "var(--mn-r-xl)", border: "1px solid var(--mn-ink-4)", padding: "20px 24px", boxShadow: "var(--mn-shadow-sm)" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 18, paddingBottom: 14, borderBottom: "1px solid var(--mn-ink-4)" }}>
        <FileText size={15} color="var(--mn-ink-3)" style={{ marginTop: 2, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: "var(--mn-ink-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{doc.name}</p>
          <p style={{ fontSize: 11, color: "var(--mn-ink-3)", marginTop: 2 }}>
            {new Date(doc.created_at).toLocaleDateString("es", { day: "numeric", month: "short", year: "numeric" })}
          </p>
        </div>
      </div>
      <div>{renderMarkdown(display)}</div>
      {isLong && (
        <button onClick={() => setExpanded(e => !e)} style={{ marginTop: 12, background: "none", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "var(--mn-green)", padding: 0 }}>
          {expanded ? "Ver menos ↑" : "Ver resumen completo ↓"}
        </button>
      )}
    </div>
  );
}

/* ─── Processing stages ─── */
const PROCESSING_STAGES = [
  { text: "Leyendo el documento…" },
  { text: "Identificando conceptos clave…" },
  { text: "Preparando flashcards personalizadas…" },
  { text: "Construyendo el mapa de conocimiento…" },
  { text: "Calculando la curva de aprendizaje…" },
];

function LiveProcessingCard({ docId, docName, subjectId, onDone, onViewFlashcards }: {
  docId: string; docName: string; subjectId: string;
  onDone: (n: number) => void; onViewFlashcards: () => void;
}) {
  const [stageIdx, setStageIdx]         = useState(0);
  const [done, setDone]                 = useState(false);
  const [failed, setFailed]             = useState(false);
  const [flashcardCount, setFcCount]    = useState(0);
  const [conceptCount, setCcCount]      = useState(0);
  const [dismissed, setDismissed]       = useState(false);

  useEffect(() => {
    if (done) return;
    const timings = [0, 2200, 5500, 9000, 13000];
    const timers  = timings.map((delay, i) => setTimeout(() => setStageIdx(i), delay));
    return () => timers.forEach(clearTimeout);
  }, [done]);

  useEffect(() => {
    const db = createClient();
    let polls = 0;
    const MAX_POLLS = 60; // 3 min timeout (60 × 3s)
    const interval = setInterval(async () => {
      polls++;
      const { data } = await db.from("documents").select("processing_status").eq("id", docId).single();
      if (data?.processing_status === "done") {
        clearInterval(interval);
        const [fcRes, cRes] = await Promise.all([
          db.from("flashcards").select("id", { count: "exact" }).eq("document_id", docId),
          db.from("subject_concepts").select("id", { count: "exact" }).eq("subject_id", subjectId),
        ]);
        setFcCount(fcRes.count ?? 0);
        setCcCount(cRes.count ?? 0);
        setDone(true);
        onDone(fcRes.count ?? 0);
      } else if (data?.processing_status === "failed" || polls >= MAX_POLLS) {
        clearInterval(interval);
        setFailed(true);
        setDone(true);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [docId, subjectId, onDone]);

  if (dismissed) return null;

  return (
    <div style={{ borderRadius: "var(--mn-r-xl)", border: "1px solid var(--mn-ink-4)", marginBottom: 20, overflow: "hidden", animation: "fadeUp 0.3s ease" }}>
      {/* Header */}
      <div style={{ padding: "16px 20px", background: "var(--mn-raised)", borderBottom: "1px solid var(--mn-ink-4)", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: done ? (failed ? "#DC2626" : "#16A34A") : "var(--mn-amber)", flexShrink: 0, animation: done ? "none" : "lpcPulse 1.5s infinite" }} />
        <p style={{ fontSize: 13, fontWeight: 600, color: "var(--mn-ink-1)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{docName}</p>
        <span style={{ fontSize: 11, fontWeight: 600, color: done ? (failed ? "#DC2626" : "#16A34A") : "var(--mn-amber)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          {done ? (failed ? "Error" : "Listo") : "Procesando"}
        </span>
      </div>

      {/* Body */}
      <div style={{ background: "var(--mn-surface)", padding: "16px 20px" }}>
        {!done ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {PROCESSING_STAGES.map((stage, i) => {
              const isActive = i === stageIdx;
              const isPast   = i < stageIdx;
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, opacity: isPast ? 0.4 : isActive ? 1 : 0.2, transition: "opacity 350ms" }}>
                  <div style={{ width: 20, height: 20, borderRadius: "50%", border: `1.5px solid ${isActive ? "var(--mn-green)" : "var(--mn-ink-4)"}`, background: isPast ? "var(--mn-green)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 300ms" }}>
                    {isPast && <CheckCircle size={12} color="#fff" />}
                  </div>
                  <p style={{ fontSize: 13, fontWeight: isActive ? 600 : 400, color: isActive ? "var(--mn-ink-1)" : "var(--mn-ink-2)" }}>
                    {stage.text}
                    {isActive && <span style={{ marginLeft: 4 }}>
                      {[0,1,2].map(j => <span key={j} style={{ display: "inline-block", width: 4, height: 4, borderRadius: "50%", background: "var(--mn-ink-3)", margin: "0 1px", animation: `lpcDot 1.2s ${j*0.2}s infinite` }} />)}
                    </span>}
                  </p>
                </div>
              );
            })}
          </div>
        ) : failed ? (
          <div>
            <p style={{ fontSize: 14, fontWeight: 600, color: "#DC2626", marginBottom: 6 }}>
              No se pudo procesar el documento.
            </p>
            <p style={{ fontSize: 13, color: "var(--mn-ink-3)", marginBottom: 16, lineHeight: 1.5 }}>
              Verifica que el archivo no esté protegido o dañado, y vuelve a intentarlo.
            </p>
            <button onClick={() => setDismissed(true)} style={{ padding: "9px 16px", borderRadius: "var(--mn-r-md)", border: "1px solid var(--mn-ink-4)", background: "none", fontSize: 13, color: "var(--mn-ink-2)", cursor: "pointer" }}>
              Cerrar
            </button>
          </div>
        ) : (
          <div>
            {(flashcardCount > 0 || conceptCount > 0) && (
              <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
                {flashcardCount > 0 && (
                  <div style={{ textAlign: "center" }}>
                    <p className="font-display" style={{ fontSize: 28, fontWeight: 800, color: "var(--mn-green)", lineHeight: 1 }}>{flashcardCount}</p>
                    <p style={{ fontSize: 11, color: "var(--mn-ink-3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", marginTop: 2 }}>flashcards</p>
                  </div>
                )}
                {flashcardCount > 0 && conceptCount > 0 && (
                  <div style={{ width: 1, background: "var(--mn-ink-4)", margin: "2px 4px" }} />
                )}
                {conceptCount > 0 && (
                  <div style={{ textAlign: "center" }}>
                    <p className="font-display" style={{ fontSize: 28, fontWeight: 800, color: "var(--mn-ink-1)", lineHeight: 1 }}>{conceptCount}</p>
                    <p style={{ fontSize: 11, color: "var(--mn-ink-3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", marginTop: 2 }}>conceptos</p>
                  </div>
                )}
              </div>
            )}
            <p style={{ fontSize: 13, color: "var(--mn-ink-3)", marginBottom: 16 }}>
              {flashcardCount > 0
                ? "Listas para repasar. El sistema ya sabe cuándo mostrarte cada una."
                : "El documento fue procesado y sus conceptos ya están en tu materia."}
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              {flashcardCount > 0 && (
                <button onClick={() => { setDismissed(true); onViewFlashcards(); }} className="mn-btn-primary" style={{ fontSize: 13, padding: "9px 18px" }}>
                  Ver flashcards
                </button>
              )}
              <button onClick={() => setDismissed(true)} style={{ padding: "9px 16px", borderRadius: "var(--mn-r-md)", border: "1px solid var(--mn-ink-4)", background: "none", fontSize: 13, color: "var(--mn-ink-2)", cursor: "pointer" }}>
                Cerrar
              </button>
            </div>
          </div>
        )}
      </div>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(-4px) } to { opacity:1; transform:none } }
        @keyframes lpcPulse { 0%,100% { opacity:.4 } 50% { opacity:1 } }
        @keyframes lpcDot { 0%,100% { opacity:.2; transform:scale(.8) } 50% { opacity:1; transform:scale(1) } }
      `}</style>
    </div>
  );
}

/* ═══════════════════════════════════════════════ */
export default function MateriaPage() {
  const { id } = useParams<{ id: string }>();
  const [tab, setTab]                   = useState<TabId>("documentos");
  const [subject, setSubject]           = useState<Subject | null>(null);
  const [docs, setDocs]                 = useState<Document[]>([]);
  const [flashcards, setFlashcards]     = useState<Flashcard[]>([]);
  const [nextExam, setNextExam]         = useState<CalendarEvent | null>(null);
  const [loading, setLoading]           = useState(true);
  const [flippedCard, setFlippedCard]   = useState<string | null>(null);
  const [starredCards, setStarredCards] = useState<Set<string>>(new Set());
  const [vistaGrid, setVistaGrid]       = useState(true);
  const [filterMostrar, setFilterMostrar] = useState<"todas" | "pendientes" | "dominadas">("todas");
  const [filterOrden, setFilterOrden]   = useState<"recientes" | "dificultad" | "alfabetico">("recientes");
  type CardRating = { mastery: string; nextReview: string | null };
  const [cardRatings, setCardRatings]   = useState<Record<string, CardRating>>({});
  const [uploading, setUploading]       = useState(false);
  const [uploadError, setUploadError]   = useState("");
  const [processingDocId, setProcessingDocId]   = useState<string | null>(null);
  const [processingDocName, setProcessingDocName] = useState("");
  const [paywall, setPaywall]           = useState<PaywallState>(null);
  const fileInputRef  = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [photoAnalyzing, setPhotoAnalyzing] = useState(false);
  const [photoError, setPhotoError]         = useState("");
  const [photoResult, setPhotoResult] = useState<{ extractedText: string; concepts: string[]; count: number } | null>(null);
  const [deletingDocId, setDeletingDocId]     = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [goalOpen, setGoalOpen]   = useState(false);
  const [goalType, setGoalType]   = useState<GoalType | "">("");
  const [goalValue, setGoalValue] = useState("");
  const [goalSaving, setGoalSaving] = useState(false);
  const [displayMasteryPct, setDisplayMasteryPct] = useState(0);
  const masteryAnimRef = useRef<number | null>(null);

  useEffect(() => {
    const db   = createClient();
    const today = new Date().toISOString().slice(0, 10);
    Promise.all([
      db.from("subjects").select("id, name, professor, semester_label, goal_type, goal_value").eq("id", id).single(),
      db.from("documents").select("id, name, file_url, processing_status, summary, created_at").eq("subject_id", id).order("created_at", { ascending: false }),
      db.from("flashcards").select("id, front, back").eq("subject_id", id).order("created_at"),
      db.from("calendar_events").select("id, title, event_date, event_type").eq("subject_id", id).eq("event_type", "exam").gte("event_date", today).order("event_date").limit(1).maybeSingle(),
    ]).then(([subRes, docRes, fcRes, evRes]) => {
      const sub = subRes.data;
      setSubject(sub);
      setDocs(docRes.data ?? []);
      setFlashcards(fcRes.data ?? []);
      setNextExam(evRes.data);
      if (sub?.goal_type) { setGoalType(sub.goal_type as GoalType); setGoalValue(sub.goal_value ?? ""); }
      setLoading(false);
      db.from("student_knowledge")
        .select("mastery_level, next_review, subject_concepts!inner(name, subject_id)")
        .eq("subject_concepts.subject_id", id)
        .then(({ data }) => {
          if (!data) return;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const map: Record<string, CardRating> = {};
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          for (const row of data as any[]) {
            const name = row.subject_concepts?.name ?? "";
            map[name.toLowerCase()] = { mastery: row.mastery_level, nextReview: row.next_review };
          }
          setCardRatings(map);
        });
    });
  }, [id]);

  useEffect(() => {
    const totalRated = Object.keys(cardRatings).length;
    if (totalRated === 0) return;
    const dominadas = Object.values(cardRatings).filter(r => r.mastery === "mastered").length;
    const target = Math.round((dominadas / totalRated) * 100);
    if (target === 0) return;
    const start = performance.now();
    const duration = 900;
    if (masteryAnimRef.current) cancelAnimationFrame(masteryAnimRef.current);
    function step(now: number) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayMasteryPct(Math.round(eased * target));
      if (progress < 1) masteryAnimRef.current = requestAnimationFrame(step);
    }
    masteryAnimRef.current = requestAnimationFrame(step);
    return () => { if (masteryAnimRef.current) cancelAnimationFrame(masteryAnimRef.current); };
  }, [cardRatings]);

  async function handleFileUpload(file: File) {
    if (!file.type.includes("pdf") && !file.type.includes("text")) {
      setUploadError("Solo se admiten PDFs o archivos de texto.");
      return;
    }
    setUploading(true); setUploadError("");
    const db = createClient();
    const { data: { user } } = await db.auth.getUser();
    if (!user) { setUploadError("Sesión expirada."); setUploading(false); return; }
    const ext  = file.name.split(".").pop();
    const path = `${user.id}/${id}/${Date.now()}.${ext}`;
    const { error: storageErr } = await db.storage.from("documents").upload(path, file, { contentType: file.type, upsert: false });
    if (storageErr) { setUploadError("Error al subir el archivo. Intenta de nuevo."); setUploading(false); return; }
    const { data: doc, error: docErr } = await db.from("documents").insert({ subject_id: id, user_id: user.id, name: file.name, file_url: path, processing_status: "pending" }).select("id").single();
    if (docErr || !doc) { setUploadError("Error al registrar el documento."); setUploading(false); return; }
    setDocs(prev => [{ id: doc.id, name: file.name, file_url: path, processing_status: "pending", summary: null, created_at: new Date().toISOString() }, ...prev]);
    const res = await fetch("/api/process-document", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentId: doc.id, subjectId: id, type: "document", subjectName: subject?.name }),
    });
    setUploading(false);
    setProcessingDocId(doc.id);
    setProcessingDocName(file.name);
    if (res.status === 403) {
      const body = await res.json().catch(() => ({}));
      setPaywall({ feature: body.feature ?? "summaries", message: body.message ?? "Límite alcanzado.", planRequired: body.planRequired ?? "pro" });
      return;
    }
    if (!res.ok) console.warn("process-document falló:", res.status);
  }

  async function handleDeleteDoc(doc: Document) {
    setDeletingDocId(doc.id);
    setConfirmDeleteId(null);
    const db = createClient();
    await db.from("flashcards").delete().eq("document_id", doc.id);
    await db.from("documents").delete().eq("id", doc.id);
    if (doc.file_url) {
      await db.storage.from("documents").remove([doc.file_url]);
    }
    setDocs(prev => prev.filter(d => d.id !== doc.id));
    setDeletingDocId(null);
    // Refrescar flashcards por si quedaron huérfanas
    const { data } = await db.from("flashcards").select("id, front, back").eq("subject_id", id).order("created_at");
    if (data) setFlashcards(data);
  }

  async function saveGoal() {
    if (!goalType) return;
    setGoalSaving(true);
    const res = await fetch(`/api/subjects/${id}/goal`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ goal_type: goalType, goal_value: goalValue || null }) });
    setGoalSaving(false);
    if (res.status === 403) {
      const body = await res.json().catch(() => ({}));
      setPaywall({ feature: "academic_goals", message: body.message ?? "Los objetivos académicos son exclusivos de Premium.", planRequired: "premium" });
      return;
    }
    if (res.ok) { setSubject(s => s ? { ...s, goal_type: goalType, goal_value: goalValue || null } : s); setGoalOpen(false); }
  }

  async function handlePhotoAnalysis(file: File) {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/heic"];
    if (!allowed.includes(file.type)) { setPhotoError("Solo se admiten imágenes JPG, PNG o WEBP."); return; }
    if (file.size > 10 * 1024 * 1024) { setPhotoError("La imagen no puede superar 10 MB."); return; }
    setPhotoAnalyzing(true); setPhotoError(""); setPhotoResult(null);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(",")[1];
      const res = await fetch("/api/multimodal", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ imageBase64: base64, mimeType: file.type, subjectId: id, subjectName: subject?.name ?? "" }) });
      setPhotoAnalyzing(false);
      if (res.status === 403) {
        const body = await res.json().catch(() => ({}));
        setPaywall({ feature: "multimodal", message: body.message ?? "Analizar fotos es exclusivo de Premium.", planRequired: "premium" });
        return;
      }
      if (!res.ok) { const body = await res.json().catch(() => ({})); setPhotoError(body.error ?? "Error al analizar la imagen. Intenta de nuevo."); return; }
      const data = await res.json();
      setPhotoResult({ extractedText: data.extractedText, concepts: data.concepts, count: data.count });
      const db = createClient();
      const { data: fc } = await db.from("flashcards").select("id, front, back").eq("subject_id", id).order("created_at");
      setFlashcards(fc ?? []);
    };
    reader.readAsDataURL(file);
  }

  /* ── Skeleton ── */
  if (loading) return (
    <div className="mn-dashboard-wrap" style={{ maxWidth: 720 }}>
      {[220, 320, 180].map((w, i) => <div key={i} style={{ height: i === 0 ? 20 : i === 1 ? 28 : 16, width: w, background: "var(--mn-raised)", borderRadius: "var(--mn-r-sm)", marginBottom: 12, animation: "pulse-sk 1.4s ease infinite" }} />)}
      <style>{`@keyframes pulse-sk{0%,100%{opacity:1}50%{opacity:.45}}`}</style>
    </div>
  );

  if (!subject) return (
    <div className="mn-dashboard-wrap" style={{ textAlign: "center", paddingTop: 48 }}>
      <p style={{ fontSize: 14, color: "var(--mn-ink-2)" }}>Materia no encontrada.</p>
      <Link href="/materias" style={{ fontSize: 13, color: "var(--mn-green)", fontWeight: 600 }}>← Volver</Link>
    </div>
  );

  const examDays = nextExam ? daysUntil(nextExam.event_date) : null;

  return (
    <div className="mn-dashboard-wrap" style={{ maxWidth: 720 }}>
      <style>{`
        @keyframes pulse-sk{0%,100%{opacity:1}50%{opacity:.45}}
        @keyframes spin{to{transform:rotate(360deg)}}
      `}</style>

      {paywall && (
        <PaywallModal feature={paywall.feature} message={paywall.message} planRequired={paywall.planRequired} onClose={() => setPaywall(null)} />
      )}

      {/* ── Header ── */}
      <div className="mn-fade-up" style={{ marginBottom: 28 }}>
        {/* Breadcrumb */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
          <Link href="/dashboard" style={{ fontSize: 12, color: "var(--mn-ink-3)", textDecoration: "none" }}>Dashboard</Link>
          <ChevronRight size={12} color="var(--mn-ink-4)" />
          <Link href="/materias" style={{ fontSize: 12, color: "var(--mn-ink-3)", textDecoration: "none" }}>Materias</Link>
          <ChevronRight size={12} color="var(--mn-ink-4)" />
          <span style={{ fontSize: 12, color: "var(--mn-ink-2)" }}>{subject.name}</span>
        </div>

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div>
            <h1 className="font-display" style={{ fontSize: "clamp(22px,3vw,28px)", fontWeight: 700, color: "var(--mn-ink-1)", marginBottom: 4 }}>
              {subject.name}
            </h1>
            <p style={{ fontSize: 13, color: "var(--mn-ink-3)" }}>
              {subject.professor ? `${subject.professor} · ` : ""}
              {subject.semester_label ? `Semestre ${subject.semester_label}` : "Semestre 2026-I"}
            </p>
            {Object.keys(cardRatings).length > 0 && (
              <p style={{ fontSize: 11, color: "var(--mn-green)", fontWeight: 600, marginTop: 4 }}>
                Mnemora tiene datos de {Object.keys(cardRatings).length} concepto{Object.keys(cardRatings).length !== 1 ? "s" : ""} en esta materia
              </p>
            )}

            {/* Goal pill */}
            {!goalOpen ? (
              <button onClick={() => setGoalOpen(true)} style={{ display: "inline-flex", alignItems: "center", gap: 5, marginTop: 10, padding: "3px 11px", borderRadius: "var(--mn-r-full)", border: "1px solid var(--mn-ink-4)", background: subject.goal_type ? "var(--mn-raised)" : "transparent", fontSize: 12, fontWeight: 600, color: "var(--mn-ink-2)", cursor: "pointer" }}>
                🎯 {subject.goal_type
                  ? `${GOAL_LABELS[subject.goal_type as GoalType] ?? subject.goal_type}${subject.goal_value ? ` · ${subject.goal_type === "grade" ? `Nota ${subject.goal_value}` : subject.goal_type === "hours" ? `${subject.goal_value}h/sem` : ""}` : ""}`
                  : "Definir objetivo"}
              </button>
            ) : (
              <div style={{ marginTop: 12, background: "var(--mn-raised)", borderRadius: "var(--mn-r-lg)", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10, maxWidth: 340 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: "var(--mn-ink-2)" }}>¿Cuál es tu meta para esta materia?</p>
                <select value={goalType} onChange={e => { setGoalType(e.target.value as GoalType); setGoalValue(""); }} style={{ padding: "8px 12px", borderRadius: "var(--mn-r-md)", border: "1px solid var(--mn-ink-4)", background: "var(--mn-surface)", fontSize: 13, color: "var(--mn-ink-1)", outline: "none" }}>
                  <option value="">— Elegir objetivo —</option>
                  {(Object.entries(GOAL_LABELS) as [GoalType, string][]).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                {(goalType === "grade" || goalType === "hours") && (
                  <input type="number" min={goalType === "grade" ? "1" : "1"} max={goalType === "grade" ? "10" : "40"} step={goalType === "grade" ? "0.5" : "1"} placeholder={goalType === "grade" ? "Ej: 8" : "Ej: 8"} value={goalValue} onChange={e => setGoalValue(e.target.value)} style={{ padding: "8px 12px", borderRadius: "var(--mn-r-md)", border: "1px solid var(--mn-ink-4)", background: "var(--mn-surface)", fontSize: 13, color: "var(--mn-ink-1)", width: 120, outline: "none" }} />
                )}
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={saveGoal} disabled={!goalType || goalSaving} className="mn-btn-primary" style={{ fontSize: 13, padding: "8px 16px", opacity: !goalType ? 0.45 : 1 }}>
                    {goalSaving ? "Guardando…" : "Guardar"}
                  </button>
                  <button onClick={() => { setGoalOpen(false); setGoalType((subject.goal_type as GoalType) ?? ""); setGoalValue(subject.goal_value ?? ""); }} style={{ padding: "8px 12px", borderRadius: "var(--mn-r-md)", border: "1px solid var(--mn-ink-4)", background: "none", fontSize: 13, color: "var(--mn-ink-2)", cursor: "pointer" }}>
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right side: exam chip + library */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end", flexShrink: 0 }}>
            <Link href={`/biblioteca/${id}`} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: "var(--mn-r-md)", border: "1px solid var(--mn-ink-4)", background: "var(--mn-surface)", fontSize: 12, fontWeight: 600, color: "var(--mn-ink-2)", textDecoration: "none" }}>
              <BookOpen size={13} /> Biblioteca
            </Link>
            {nextExam && examDays !== null ? (
              <div style={{ padding: "8px 14px", borderLeft: `3px solid ${examDays <= 7 ? "var(--mn-amber)" : "var(--mn-ink-4)"}` }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: examDays <= 7 ? "var(--mn-amber)" : "var(--mn-ink-2)" }}>{nextExam.title}</p>
                <p style={{ fontSize: 11, color: "var(--mn-ink-3)" }}>{formatDate(nextExam.event_date)} · en {examDays} día{examDays !== 1 ? "s" : ""}</p>
              </div>
            ) : (
              <p style={{ fontSize: 12, color: "var(--mn-ink-3)" }}>Sin exámenes próximos</p>
            )}
          </div>
        </div>
      </div>

      {/* ── Cadena de impacto ── */}
      {flashcards.length > 0 && (() => {
        const totalRated = Object.keys(cardRatings).length;
        const dominadas  = Object.values(cardRatings).filter(r => r.mastery === "mastered").length;
        const masteryPct = totalRated > 0 ? Math.round((dominadas / totalRated) * 100) : null;
        const notaLabel  = masteryPct === null ? "—"
          : masteryPct >= 85 ? "~9–10"
          : masteryPct >= 70 ? "~7.5–8.5"
          : masteryPct >= 50 ? "~6–7"
          : masteryPct >= 30 ? "~5–5.5"
          : "< 5";
        const now = new Date();
        const pendientes = Object.values(cardRatings).filter(r => r.nextReview && new Date(r.nextReview) <= now).length;
        return (
          <div style={{ background: "var(--mn-surface)", borderRadius: "var(--mn-r-xl)", border: "1px solid var(--mn-ink-4)", padding: "14px 18px", marginBottom: 20, boxShadow: "var(--mn-shadow-sm)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
              <div style={{ textAlign: "center", flex: 1 }}>
                <p className="font-display" style={{ fontSize: 20, fontWeight: 800, color: "var(--mn-ink-1)", lineHeight: 1 }}>{flashcards.length}</p>
                <p style={{ fontSize: 10, color: "var(--mn-ink-3)", fontWeight: 600, marginTop: 2, textTransform: "uppercase", letterSpacing: "0.04em" }}>flashcards</p>
              </div>
              <span style={{ fontSize: 12, color: "var(--mn-ink-4)", flexShrink: 0 }}>→</span>
              <div style={{ textAlign: "center", flex: 1 }}>
                <p className="font-display" style={{ fontSize: 20, fontWeight: 800, color: masteryPct !== null && masteryPct > 0 ? "var(--mn-green)" : "var(--mn-ink-3)", lineHeight: 1 }}>
                  {masteryPct !== null ? `${displayMasteryPct}%` : "—"}
                </p>
                <p style={{ fontSize: 10, color: "var(--mn-ink-3)", fontWeight: 600, marginTop: 2, textTransform: "uppercase", letterSpacing: "0.04em" }}>dominio</p>
              </div>
              <span style={{ fontSize: 12, color: "var(--mn-ink-4)", flexShrink: 0 }}>→</span>
              <div style={{ textAlign: "center", flex: 1 }}>
                <p className="font-display" style={{ fontSize: 20, fontWeight: 800, color: "var(--mn-ink-2)", lineHeight: 1 }}>{notaLabel}</p>
                <p style={{ fontSize: 10, color: "var(--mn-ink-3)", fontWeight: 600, marginTop: 2, textTransform: "uppercase", letterSpacing: "0.04em" }}>nota est.</p>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              {pendientes > 0
                ? <p style={{ fontSize: 12, color: "var(--mn-amber)", fontWeight: 600 }}>{pendientes} tarjeta{pendientes !== 1 ? "s" : ""} para repasar hoy</p>
                : <span />}
              <Link href={`/flashcards/${id}`} className="mn-btn-primary" style={{ fontSize: 13, display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none", whiteSpace: "nowrap" }}>
                <Zap size={14} /> Practicar
              </Link>
            </div>
          </div>
        );
      })()}

      {/* ── Tabs ── */}
      <div style={{ display: "flex", gap: 0, marginBottom: 24, borderBottom: "1px solid var(--mn-ink-4)" }}>
        {([
          { id: "documentos", label: `Documentos (${docs.length})` },
          { id: "flashcards", label: `Flashcards (${flashcards.length})` },
          { id: "resumen",    label: "Resúmenes" },
          { id: "tutor",      label: "Tutor" },
        ] as { id: TabId; label: string }[]).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: "10px 16px", border: "none", borderBottom: tab === t.id ? "2px solid var(--mn-green)" : "2px solid transparent", background: "none", fontSize: 13, fontWeight: tab === t.id ? 600 : 400, color: tab === t.id ? "var(--mn-ink-1)" : "var(--mn-ink-3)", cursor: "pointer", transition: "color 150ms", marginBottom: -1 }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ══════════ Tab: Documentos ══════════ */}
      {tab === "documentos" && (
        <div>
          {processingDocId && (
            <LiveProcessingCard docId={processingDocId} docName={processingDocName} subjectId={id}
              onDone={() => {
                const db = createClient();
                db.from("documents").select("id, name, file_url, processing_status, summary, created_at").eq("subject_id", id).order("created_at", { ascending: false }).then(({ data }) => { if (data) setDocs(data); });
                db.from("flashcards").select("id, front, back").eq("subject_id", id).order("created_at").then(({ data }) => { if (data) setFlashcards(data); });
              }}
              onViewFlashcards={() => { setProcessingDocId(null); setTab("flashcards"); }}
            />
          )}

          {/* Upload: PDF */}
          <div onClick={() => !uploading && fileInputRef.current?.click()}
            style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 20px", borderRadius: "var(--mn-r-lg)", border: "1px dashed var(--mn-ink-4)", background: "var(--mn-surface)", cursor: uploading ? "default" : "pointer", marginBottom: 10, transition: "border-color 150ms", opacity: uploading ? 0.7 : 1 }}
            onMouseEnter={e => { if (!uploading) e.currentTarget.style.borderColor = "var(--mn-green)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--mn-ink-4)"; }}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFileUpload(f); }}
          >
            <input ref={fileInputRef} type="file" accept=".pdf,.txt,.md" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); e.target.value = ""; }} />
            <div style={{ width: 34, height: 34, borderRadius: "var(--mn-r-md)", background: "var(--mn-raised)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              {uploading ? <Loader2 size={16} color="var(--mn-ink-2)" style={{ animation: "spin 1s linear infinite" }} /> : <Upload size={16} color="var(--mn-ink-2)" />}
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, color: "var(--mn-ink-1)" }}>{uploading ? "Subiendo…" : "Subir documento"}</p>
              <p style={{ fontSize: 12, color: "var(--mn-ink-3)" }}>PDF o texto · Mnemora extrae flashcards y resumen automáticamente</p>
            </div>
          </div>

          {uploadError && <p style={{ fontSize: 13, color: "var(--mn-error)", marginBottom: 12 }}>{uploadError}</p>}

          {/* Upload: Foto */}
          <input ref={photoInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/heic" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) handlePhotoAnalysis(f); e.target.value = ""; }} />
          <div onClick={() => !photoAnalyzing && photoInputRef.current?.click()}
            style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 20px", borderRadius: "var(--mn-r-lg)", border: "1px dashed var(--mn-ink-4)", background: "var(--mn-surface)", cursor: photoAnalyzing ? "default" : "pointer", marginBottom: 16, transition: "border-color 150ms", opacity: photoAnalyzing ? 0.8 : 1 }}
            onMouseEnter={e => { if (!photoAnalyzing) e.currentTarget.style.borderColor = "var(--mn-ink-2)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--mn-ink-4)"; }}
          >
            <div style={{ width: 34, height: 34, borderRadius: "var(--mn-r-md)", background: "var(--mn-raised)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              {photoAnalyzing ? <Loader2 size={16} color="var(--mn-ink-2)" style={{ animation: "spin 1s linear infinite" }} /> : photoResult ? <CheckCircle size={16} color="#16A34A" /> : <Camera size={16} color="var(--mn-ink-2)" />}
            </div>
            <div style={{ flex: 1 }}>
              {photoAnalyzing ? (
                <>
                  <p style={{ fontSize: 14, fontWeight: 600, color: "var(--mn-ink-1)" }}>Analizando imagen…</p>
                  <p style={{ fontSize: 12, color: "var(--mn-ink-3)" }}>Extrayendo conceptos y generando flashcards</p>
                </>
              ) : photoResult ? (
                <>
                  <p style={{ fontSize: 14, fontWeight: 600, color: "var(--mn-ink-1)" }}>
                    {photoResult.count} flashcard{photoResult.count !== 1 ? "s" : ""} generada{photoResult.count !== 1 ? "s" : ""} · Toca para analizar otra foto
                  </p>
                  {photoResult.concepts.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
                      {photoResult.concepts.slice(0, 5).map((c, i) => (
                        <span key={i} style={{ fontSize: 11, padding: "2px 8px", borderRadius: "var(--mn-r-full)", background: "var(--mn-raised)", color: "var(--mn-ink-2)", fontWeight: 600 }}>{c}</span>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: "var(--mn-ink-1)" }}>Analizar foto con IA</p>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 7px", borderRadius: "var(--mn-r-full)", background: "var(--mn-ink-1)", color: "#fff", letterSpacing: "0.04em" }}>PREMIUM</span>
                  </div>
                  <p style={{ fontSize: 12, color: "var(--mn-ink-3)" }}>Cuaderno, pizarrón o ejercicio escrito a mano</p>
                </>
              )}
            </div>
          </div>

          {photoError && <p style={{ fontSize: 13, color: "var(--mn-error)", marginBottom: 12 }}>{photoError}</p>}
          {photoResult && (
            <div style={{ marginBottom: 16, display: "flex", gap: 8 }}>
              <button onClick={() => { setTab("flashcards"); setPhotoResult(null); }} className="mn-btn-primary" style={{ fontSize: 13, padding: "8px 16px" }}>Ver flashcards →</button>
              <button onClick={() => setPhotoResult(null)} style={{ padding: "8px 14px", borderRadius: "var(--mn-r-md)", border: "1px solid var(--mn-ink-4)", background: "none", fontSize: 13, color: "var(--mn-ink-2)", cursor: "pointer" }}>Analizar otra</button>
            </div>
          )}

          {/* Doc list */}
          {docs.length === 0 ? (
            <div style={{ padding: "36px 24px", textAlign: "center", background: "var(--mn-surface)", borderRadius: "var(--mn-r-xl)", border: "1px solid var(--mn-ink-4)" }}>
              <FileText size={24} color="var(--mn-ink-4)" style={{ marginBottom: 12 }} />
              <p style={{ fontSize: 15, fontWeight: 600, color: "var(--mn-ink-1)", marginBottom: 6 }}>Sin documentos aún</p>
              <p style={{ fontSize: 13, color: "var(--mn-ink-3)" }}>Sube el programa de la materia o un apunte y Mnemora genera flashcards automáticamente.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {docs.map(doc => (
                <div key={doc.id} style={{ padding: "14px 18px", background: "var(--mn-surface)", borderRadius: "var(--mn-r-lg)", border: "1px solid var(--mn-ink-4)", display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ width: 32, height: 32, background: "var(--mn-raised)", borderRadius: "var(--mn-r-md)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {doc.processing_status === "processing" || doc.processing_status === "pending"
                      ? <Clock size={15} color="var(--mn-amber)" />
                      : <FileText size={15} color="var(--mn-ink-3)" />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: "var(--mn-ink-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{doc.name}</p>
                    <div style={{ marginTop: 2 }}>
                      {statusIcon(doc.processing_status) ?? (
                        doc.summary
                          ? <span style={{ fontSize: 12, color: "var(--mn-ink-3)", display: "inline-flex", alignItems: "center", gap: 4 }}><Sparkles size={10} /> Resumen listo</span>
                          : <span style={{ fontSize: 12, color: "var(--mn-ink-3)" }}>Procesado</span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
                    {doc.processing_status === "done" && (
                      <button onClick={() => setTab("flashcards")} style={{ padding: "5px 12px", borderRadius: "var(--mn-r-md)", border: "1px solid var(--mn-ink-4)", background: "none", fontSize: 12, color: "var(--mn-ink-2)", cursor: "pointer" }}>
                        Flashcards
                      </button>
                    )}
                    {confirmDeleteId === doc.id ? (
                      <>
                        <button
                          onClick={() => handleDeleteDoc(doc)}
                          disabled={deletingDocId === doc.id}
                          style={{ padding: "5px 12px", borderRadius: "var(--mn-r-md)", border: "1px solid var(--mn-error)", background: "none", fontSize: 12, color: "var(--mn-error)", cursor: "pointer", fontWeight: 600 }}
                        >
                          {deletingDocId === doc.id ? "Borrando…" : "Confirmar"}
                        </button>
                        <button onClick={() => setConfirmDeleteId(null)} style={{ padding: "5px 8px", borderRadius: "var(--mn-r-md)", border: "1px solid var(--mn-ink-4)", background: "none", fontSize: 12, color: "var(--mn-ink-3)", cursor: "pointer" }}>
                          Cancelar
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(doc.id)}
                        disabled={deletingDocId === doc.id}
                        style={{ width: 30, height: 30, borderRadius: "var(--mn-r-md)", border: "1px solid var(--mn-ink-4)", background: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--mn-ink-3)" }}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══════════ Tab: Flashcards ══════════ */}
      {tab === "flashcards" && (
        <div>
          {flashcards.length === 0 ? (
            <div style={{ padding: "40px 24px", textAlign: "center", background: "var(--mn-surface)", borderRadius: "var(--mn-r-xl)", border: "1px solid var(--mn-ink-4)" }}>
              <Layers size={24} color="var(--mn-ink-4)" style={{ marginBottom: 12 }} />
              <p style={{ fontSize: 15, fontWeight: 600, color: "var(--mn-ink-1)", marginBottom: 6 }}>Sin flashcards aún</p>
              <p style={{ fontSize: 13, color: "var(--mn-ink-3)", marginBottom: 20 }}>Sube un documento y Mnemora las genera automáticamente.</p>
              <button onClick={() => setTab("documentos")} className="mn-btn-primary" style={{ fontSize: 13, display: "inline-flex", alignItems: "center", gap: 6 }}>
                <Plus size={14} /> Subir documento
              </button>
            </div>
          ) : (() => {
            function getCardKnowledge(front: string) {
              const key = front.toLowerCase().slice(0, 60);
              for (const [k, v] of Object.entries(cardRatings)) {
                if (key.includes(k.slice(0, 20)) || k.includes(key.slice(0, 20))) return v;
              }
              return null;
            }

            const MASTERY_BADGE: Record<string, { label: string; color: string }> = {
              mastered:  { label: "Fácil",     color: "#16A34A" },
              practiced: { label: "Regular",   color: "var(--mn-amber)" },
              learning:  { label: "Difícil",   color: "var(--mn-error)" },
              unknown:   { label: "Sin datos", color: "var(--mn-ink-3)" },
            };

            const now        = new Date();
            const dominadas  = Object.values(cardRatings).filter(r => r.mastery === "mastered").length;
            const enRepaso   = Object.values(cardRatings).filter(r => r.mastery === "practiced" || r.mastery === "learning").length;
            const pendientes = Object.values(cardRatings).filter(r => r.nextReview && new Date(r.nextReview) <= now).length;

            let displayed = [...flashcards];
            if (filterMostrar === "pendientes") displayed = displayed.filter(c => { const k = getCardKnowledge(c.front); return k && k.nextReview && new Date(k.nextReview) <= now; });
            if (filterMostrar === "dominadas")  displayed = displayed.filter(c => getCardKnowledge(c.front)?.mastery === "mastered");
            if (filterOrden === "alfabetico")   displayed.sort((a, b) => a.front.localeCompare(b.front));
            if (filterOrden === "dificultad")   displayed.sort((a, b) => {
              const order = ["learning", "practiced", "mastered", "unknown"];
              return order.indexOf(getCardKnowledge(a.front)?.mastery ?? "unknown") - order.indexOf(getCardKnowledge(b.front)?.mastery ?? "unknown");
            });

            async function handleRate(cardId: string, quality: number) {
              const card = flashcards.find(c => c.id === cardId);
              if (!card) return;
              const res = await fetch("/api/review-flashcard", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ flashcardId: cardId, quality }) });
              if (res.ok) {
                const data = await res.json();
                const conceptKey = card.front.replace(/^[¿¡]/, "").replace(/[?!]$/, "").trim().slice(0, 60).toLowerCase();
                setCardRatings(prev => ({ ...prev, [conceptKey]: { mastery: data.mastery ?? "unknown", nextReview: data.nextReview } }));
              }
              setFlippedCard(null);
            }

            function formatNextReview(dateStr: string | null): string {
              if (!dateStr) return "Sin programar";
              const diff = Math.round((new Date(dateStr).getTime() - now.getTime()) / 86_400_000);
              if (diff <= 0) return "Hoy";
              if (diff === 1) return "Mañana";
              if (diff <= 7) return `En ${diff} días`;
              return new Date(dateStr).toLocaleDateString("es", { day: "numeric", month: "short" });
            }

            return (
              <>
                {/* Stats */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 16 }}>
                  {[
                    { value: flashcards.length, label: "Total" },
                    { value: dominadas,          label: "Dominadas",  color: "#16A34A" },
                    { value: enRepaso,           label: "En repaso",  color: "var(--mn-amber)" },
                    { value: pendientes,         label: "Hoy",        color: pendientes > 0 ? "var(--mn-error)" : undefined },
                  ].map((s, i) => (
                    <div key={i} style={{ padding: "12px 14px", background: "var(--mn-surface)", borderRadius: "var(--mn-r-lg)", border: "1px solid var(--mn-ink-4)", textAlign: "center" }}>
                      <p className="font-display" style={{ fontSize: 22, fontWeight: 700, color: s.color ?? "var(--mn-ink-1)", lineHeight: 1 }}>{s.value}</p>
                      <p style={{ fontSize: 11, color: "var(--mn-ink-3)", marginTop: 3 }}>{s.label}</p>
                    </div>
                  ))}
                </div>

                {/* Filter bar */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
                  <select value={filterMostrar} onChange={e => setFilterMostrar(e.target.value as typeof filterMostrar)} style={{ padding: "6px 10px", borderRadius: "var(--mn-r-md)", border: "1px solid var(--mn-ink-4)", background: "var(--mn-surface)", fontSize: 12, color: "var(--mn-ink-1)", cursor: "pointer", outline: "none" }}>
                    <option value="todas">Todas</option>
                    <option value="pendientes">Pendientes hoy</option>
                    <option value="dominadas">Dominadas</option>
                  </select>
                  <select value={filterOrden} onChange={e => setFilterOrden(e.target.value as typeof filterOrden)} style={{ padding: "6px 10px", borderRadius: "var(--mn-r-md)", border: "1px solid var(--mn-ink-4)", background: "var(--mn-surface)", fontSize: 12, color: "var(--mn-ink-1)", cursor: "pointer", outline: "none" }}>
                    <option value="recientes">Recientes</option>
                    <option value="dificultad">Dificultad</option>
                    <option value="alfabetico">Alfabético</option>
                  </select>
                  <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
                    <button onClick={() => setVistaGrid(true)} style={{ width: 32, height: 32, borderRadius: "var(--mn-r-md)", border: "none", background: vistaGrid ? "var(--mn-ink-1)" : "var(--mn-raised)", color: vistaGrid ? "#fff" : "var(--mn-ink-2)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><LayoutGrid size={14} /></button>
                    <button onClick={() => setVistaGrid(false)} style={{ width: 32, height: 32, borderRadius: "var(--mn-r-md)", border: "none", background: !vistaGrid ? "var(--mn-ink-1)" : "var(--mn-raised)", color: !vistaGrid ? "#fff" : "var(--mn-ink-2)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><List size={14} /></button>
                  </div>
                </div>

                {/* Cards */}
                <div style={{ display: "grid", gridTemplateColumns: vistaGrid ? "1fr 1fr" : "1fr", gap: 10 }}>
                  {displayed.map(card => {
                    const isFlipped  = flippedCard === card.id;
                    const isStarred  = starredCards.has(card.id);
                    const knowledge  = getCardKnowledge(card.front);
                    const badge      = MASTERY_BADGE[knowledge?.mastery ?? "unknown"];

                    return (
                      <div key={card.id} style={{ background: "var(--mn-surface)", borderRadius: "var(--mn-r-lg)", border: `1px solid ${isFlipped ? "var(--mn-green)" : "var(--mn-ink-4)"}`, overflow: "hidden", transition: "border-color 150ms" }}>
                        <div style={{ padding: "14px 16px 0" }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                            <span style={{ fontSize: 11, fontWeight: 600, color: badge.color }}>{badge.label}</span>
                            <button onClick={e => { e.stopPropagation(); setStarredCards(prev => { const n = new Set(prev); n.has(card.id) ? n.delete(card.id) : n.add(card.id); return n; }); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}>
                              {isStarred ? <Star size={14} color="#F59E0B" fill="#F59E0B" /> : <Star size={14} color="var(--mn-ink-4)" />}
                            </button>
                          </div>

                          {isFlipped ? (
                            <div>
                              <p style={{ fontSize: 14, color: "var(--mn-ink-1)", lineHeight: 1.6, marginBottom: 14 }}>{card.back}</p>
                              <p style={{ fontSize: 11, fontWeight: 600, color: "var(--mn-ink-3)", marginBottom: 8 }}>¿Qué tan fácil fue?</p>
                              <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
                                {[
                                  { label: "Difícil", quality: 1, color: "var(--mn-error)" },
                                  { label: "Regular", quality: 3, color: "var(--mn-amber)" },
                                  { label: "Fácil",   quality: 5, color: "#16A34A" },
                                ].map(r => (
                                  <button key={r.label} onClick={() => handleRate(card.id, r.quality)} style={{ flex: 1, padding: "8px 4px", borderRadius: "var(--mn-r-md)", border: `1px solid var(--mn-ink-4)`, background: "var(--mn-surface)", color: r.color, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                                    {r.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div onClick={() => setFlippedCard(card.id)} style={{ cursor: "pointer", paddingBottom: 10 }}>
                              <p style={{ fontSize: 15, fontWeight: 600, color: "var(--mn-ink-1)", lineHeight: 1.45, marginBottom: 8 }}>{card.front}</p>
                              <span style={{ fontSize: 12, color: "var(--mn-ink-3)" }}>Toca para ver la respuesta</span>
                            </div>
                          )}
                        </div>

                        {!isFlipped && (
                          <div style={{ borderTop: "1px solid var(--mn-ink-4)", padding: "8px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                            <span style={{ fontSize: 11, color: "var(--mn-ink-3)", marginLeft: "auto", display: "flex", alignItems: "center", gap: 4 }}>
                              <Calendar size={10} /> {formatNextReview(knowledge?.nextReview ?? null)}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--mn-ink-4)" }}>
                  <Link href={`/flashcards/${id}`} className="mn-btn-primary" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, textDecoration: "none" }}>
                    <Zap size={14} /> Sesión de repaso completa
                  </Link>
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* ══════════ Tab: Resúmenes ══════════ */}
      {tab === "resumen" && (() => {
        const docsWithSummary = docs.filter(d => d.summary && d.processing_status === "done");
        const docsProcessing  = docs.filter(d => d.processing_status === "processing" || d.processing_status === "pending");
        const docsNoSummary   = docs.filter(d => d.processing_status === "done" && !d.summary);

        if (docs.length === 0) return (
          <div style={{ padding: "40px 24px", textAlign: "center", background: "var(--mn-surface)", borderRadius: "var(--mn-r-xl)", border: "1px solid var(--mn-ink-4)" }}>
            <BookOpen size={24} color="var(--mn-ink-4)" style={{ marginBottom: 12 }} />
            <p style={{ fontSize: 15, fontWeight: 600, color: "var(--mn-ink-1)", marginBottom: 6 }}>Sin documentos aún</p>
            <p style={{ fontSize: 13, color: "var(--mn-ink-3)", marginBottom: 20 }}>Sube un documento y Mnemora generará el resumen automáticamente.</p>
            <button onClick={() => setTab("documentos")} className="mn-btn-primary" style={{ fontSize: 13 }}>Subir documento</button>
          </div>
        );

        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {docsProcessing.length > 0 && (
              <div style={{ paddingLeft: 14, borderLeft: "3px solid var(--mn-amber)" }}>
                <p style={{ fontSize: 13, color: "var(--mn-ink-1)" }}>
                  <strong>{docsProcessing.length} {docsProcessing.length === 1 ? "documento" : "documentos"}</strong> procesándose — el resumen estará listo en unos minutos.
                </p>
              </div>
            )}
            {docsWithSummary.length === 0 && docsProcessing.length === 0 && (
              <p style={{ fontSize: 13, color: "var(--mn-ink-3)", textAlign: "center", paddingTop: 32 }}>Los resúmenes se generan automáticamente al procesar cada documento.</p>
            )}
            {docsWithSummary.map(doc => <SummaryCard key={doc.id} doc={doc} />)}
            {docsNoSummary.length > 0 && (
              <p style={{ fontSize: 12, color: "var(--mn-ink-4)", textAlign: "center" }}>
                {docsNoSummary.length} {docsNoSummary.length === 1 ? "documento procesado sin resumen" : "documentos procesados sin resumen"}
              </p>
            )}
          </div>
        );
      })()}

      {/* ══════════ Tab: Tutor ══════════ */}
      {tab === "tutor" && (
        <div style={{ padding: "40px 0", textAlign: "center" }}>
          <div style={{ width: 48, height: 48, background: "var(--mn-raised)", borderRadius: "var(--mn-r-lg)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <Brain size={22} color="var(--mn-ink-2)" />
          </div>
          <h3 className="font-display" style={{ fontSize: 18, fontWeight: 700, color: "var(--mn-ink-1)", marginBottom: 8 }}>
            Tutor de {subject.name}
          </h3>
          <p style={{ fontSize: 14, color: "var(--mn-ink-2)", maxWidth: 360, margin: "0 auto 24px", lineHeight: 1.65 }}>
            El tutor ya conoce tus documentos, tu progreso y tus conceptos más débiles en esta materia.
          </p>
          <Link href={`/tutor/${id}`} className="mn-btn-primary" style={{ fontSize: 14, padding: "12px 28px", display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
            <Brain size={15} /> Abrir chat con el tutor
          </Link>
        </div>
      )}
    </div>
  );
}
