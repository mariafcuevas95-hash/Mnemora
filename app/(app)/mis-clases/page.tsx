"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  Mic, Upload, ChevronRight, Loader2, CheckCircle, AlertCircle,
  Clock, Layers, BookOpen, HelpCircle, FileAudio, Plus, X, Trash2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { PaywallModal } from "@/components/paywall-modal";
import type { Feature, PlanId } from "@/lib/plans";

function cleanTitle(title: string): string {
  return title
    .replace(/\s*\[[^\]]+\]/g, "")
    .replace(/\s*\([A-ZÁÉÍÓÚÑ\s]{4,}\)/g, "")
    .replace(/\s*\|\s*CURSO:\s*/g, " — ")
    .trim();
}

type ClassItem = {
  id: string;
  title: string;
  source: "recording" | "audio" | "video" | "youtube";
  subject_id: string | null;
  subject_name: string | null;
  processing_status: "pending" | "uploading" | "transcribing" | "analyzing" | "done" | "failed";
  processing_stage: string | null;
  flashcards_count: number;
  quiz_count: number;
  concepts_count: number;
  summary: string[] | null;
  duration_seconds: number | null;
  created_at: string;
};

type Subject = { id: string; name: string };
type PaywallState = { feature: Feature; message: string; planRequired: PlanId } | null;

const SOURCE_LABELS = { recording: "Grabación", audio: "Audio", video: "Video", youtube: "YouTube" };
const SOURCE_ICONS = {
  recording: <Mic size={14} />,
  audio: <FileAudio size={14} />,
  video: <FileAudio size={14} />,
  youtube: <FileAudio size={14} />,
};

const ALLOWED_AUDIO = ".mp3,.m4a,.wav,.aac,.flac,.ogg,.webm";
const AUDIO_MIME_MAP: Record<string, string> = {
  mp3: "audio/mpeg", m4a: "audio/x-m4a", wav: "audio/wav",
  aac: "audio/aac", flac: "audio/flac", ogg: "audio/ogg", webm: "audio/webm",
};

function statusBadge(cls: ClassItem) {
  if (cls.processing_status === "done") {
    return <span style={{ fontSize: 11, fontWeight: 600, color: "#16A34A", display: "inline-flex", alignItems: "center", gap: 3 }}><CheckCircle size={11} /> Lista</span>;
  }
  if (cls.processing_status === "failed") {
    return <span style={{ fontSize: 11, fontWeight: 600, color: "var(--mn-error)", display: "inline-flex", alignItems: "center", gap: 3 }}><AlertCircle size={11} /> Error</span>;
  }
  return <span style={{ fontSize: 11, fontWeight: 600, color: "var(--mn-amber)", display: "inline-flex", alignItems: "center", gap: 3 }}><Loader2 size={11} style={{ animation: "spin 1s linear infinite" }} /> {cls.processing_stage ?? "Procesando…"}</span>;
}

export default function MisClasesPage() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [paywall, setPaywall] = useState<PaywallState>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Upload state
  const [step, setStep] = useState<"choose" | "form" | "uploading" | "processing">("choose");
  const [uploadMode, setUploadMode] = useState<"recording" | "audio" | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [classTitle, setClassTitle] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState("");

  // Recorder state
  const [recording, setRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordingPaused, setRecordingPaused] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadClasses = useCallback(async () => {
    const res = await fetch("/api/classes");
    if (res.ok) {
      const data = await res.json();
      setClasses(data.classes ?? []);
    }
  }, []);

  useEffect(() => {
    const db = createClient();
    Promise.all([
      loadClasses(),
      db.from("subjects").select("id, name").order("name"),
    ]).then(([, subRes]) => {
      setSubjects(subRes.data ?? []);
      setLoading(false);
    });
  }, [loadClasses]);

  // Poll clases en procesamiento
  useEffect(() => {
    const processing = classes.filter(c => c.processing_status !== "done" && c.processing_status !== "failed");
    if (processing.length === 0) return;
    const interval = setInterval(loadClasses, 4000);
    return () => clearInterval(interval);
  }, [classes, loadClasses]);

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/classes/${id}`, { method: "DELETE" });
      if (res.ok) {
        setClasses(prev => prev.filter(c => c.id !== id));
      }
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  }

  function resetModal() {
    setStep("choose");
    setUploadMode(null);
    setSelectedSubjectId("");
    setClassTitle("");
    setSelectedFile(null);
    setUploadProgress(0);
    setUploadError("");
    setRecording(false);
    setRecordingSeconds(0);
    setRecordingPaused(false);
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecorderRef.current?.state !== "inactive") mediaRecorderRef.current?.stop();
  }

  // ── Grabación ──────────────────────────────────────────────────────────────
  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: "audio/webm" });
      chunksRef.current = [];
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.start(1000);
      mediaRecorderRef.current = mr;
      setRecording(true);
      setRecordingPaused(false);
      timerRef.current = setInterval(() => setRecordingSeconds(s => s + 1), 1000);
    } catch {
      setUploadError("No se pudo acceder al micrófono. Verifica los permisos del navegador.");
    }
  }

  function pauseRecording() {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.pause();
      setRecordingPaused(true);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }

  function resumeRecording() {
    if (mediaRecorderRef.current?.state === "paused") {
      mediaRecorderRef.current.resume();
      setRecordingPaused(false);
      timerRef.current = setInterval(() => setRecordingSeconds(s => s + 1), 1000);
    }
  }

  async function stopRecordingAndUpload() {
    if (!mediaRecorderRef.current) return;
    if (timerRef.current) clearInterval(timerRef.current);

    await new Promise<void>(resolve => {
      mediaRecorderRef.current!.onstop = () => resolve();
      mediaRecorderRef.current!.stop();
      mediaRecorderRef.current!.stream.getTracks().forEach(t => t.stop());
    });

    const blob = new Blob(chunksRef.current, { type: "audio/webm" });
    const file = new File([blob], `grabacion-${Date.now()}.webm`, { type: "audio/webm" });
    setSelectedFile(file);
    setRecording(false);
    await uploadClass(file, "recording", "audio/webm");
  }

  // ── Upload ─────────────────────────────────────────────────────────────────
  async function uploadClass(file: File, source: "recording" | "audio", mimeType: string) {
    if (!selectedSubjectId || !classTitle.trim()) {
      setUploadError("Completa el título y la materia antes de continuar.");
      return;
    }
    setUploadError("");
    setStep("uploading");
    setUploadProgress(0);

    // 1. Crear registro y obtener URL firmada
    const createRes = await fetch("/api/classes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subjectId: selectedSubjectId,
        title: classTitle.trim(),
        source,
        mimeType,
        fileSize: file.size,
      }),
    });

    if (createRes.status === 403) {
      const body = await createRes.json().catch(() => ({}));
      setPaywall({ feature: "ai_class_studio", message: body.message ?? "AI Class Studio es Premium.", planRequired: "premium" });
      setStep("form");
      return;
    }
    if (!createRes.ok) {
      const body = await createRes.json().catch(() => ({}));
      setUploadError(body.error ?? "Error al crear la clase. Intenta de nuevo.");
      setStep("form");
      return;
    }

    const { classId, uploadUrl } = await createRes.json();

    // 2. Upload directo a Supabase Storage via XHR (para progress)
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.upload.onprogress = e => {
        if (e.lengthComputable) setUploadProgress(Math.round((e.loaded / e.total) * 100));
      };
      xhr.onload = () => xhr.status < 300 ? resolve() : reject(new Error(`Upload ${xhr.status}`));
      xhr.onerror = () => reject(new Error("Error de red al subir el archivo."));
      xhr.open("PUT", uploadUrl);
      xhr.setRequestHeader("Content-Type", mimeType);
      xhr.send(file);
    }).catch(err => {
      setUploadError(err.message);
      setStep("form");
      throw err;
    });

    // 3. Disparar procesamiento
    setStep("processing");
    await fetch(`/api/classes/${classId}/trigger`, { method: "POST" });

    // 4. Agregar a la lista y cerrar modal
    await loadClasses();
    setShowModal(false);
    resetModal();
  }

  function handleFileSelect(file: File) {
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    const mime = AUDIO_MIME_MAP[ext] ?? file.type;
    setSelectedFile(file);
    if (!classTitle) setClassTitle(file.name.replace(/\.[^.]+$/, ""));
    setUploadMode("audio");
    setStep("form");
  }

  const formatTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  if (loading) return (
    <div className="mn-dashboard-wrap" style={{ maxWidth: 720 }}>
      {[200, 320, 260].map((w, i) => (
        <div key={i} style={{ height: 20, width: w, background: "var(--mn-raised)", borderRadius: "var(--mn-r-sm)", marginBottom: 12, animation: "pulse-sk 1.4s ease infinite" }} />
      ))}
      <style>{`@keyframes pulse-sk{0%,100%{opacity:1}50%{opacity:.45}} @keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div className="mn-dashboard-wrap" style={{ maxWidth: 720 }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes fadeIn{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}}`}</style>

      {paywall && <PaywallModal feature={paywall.feature} message={paywall.message} planRequired={paywall.planRequired} onClose={() => setPaywall(null)} />}

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <h1 className="font-display" style={{ fontSize: 24, fontWeight: 800, color: "var(--mn-ink-1)", marginBottom: 4 }}>Mis clases</h1>
          <p style={{ fontSize: 13, color: "var(--mn-ink-3)" }}>Graba o sube una clase y Mnemora genera todos tus materiales de estudio.</p>
        </div>
        <button
          onClick={() => { setShowModal(true); setStep("choose"); }}
          className="mn-btn-primary"
          style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}
        >
          <Plus size={15} /> Nueva clase
        </button>
      </div>

      {/* Lista de clases */}
      {classes.length === 0 ? (
        <div style={{ padding: "48px 24px", textAlign: "center", background: "var(--mn-surface)", borderRadius: "var(--mn-r-xl)", border: "1px solid var(--mn-ink-4)" }}>
          <Mic size={28} color="var(--mn-ink-4)" style={{ marginBottom: 14 }} />
          <p style={{ fontSize: 15, fontWeight: 700, color: "var(--mn-ink-1)", marginBottom: 6 }}>Sin clases aún</p>
          <p style={{ fontSize: 13, color: "var(--mn-ink-3)", marginBottom: 20, maxWidth: 320, margin: "0 auto 20px" }}>
            Graba una clase en vivo o sube un audio y Mnemora generará resumen, apuntes, flashcards y quiz automáticamente.
          </p>
          <button onClick={() => { setShowModal(true); setStep("choose"); }} className="mn-btn-primary" style={{ fontSize: 13 }}>
            <Plus size={14} /> Nueva clase
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {classes.map(cls => (
            <Link
              key={cls.id}
              href={cls.processing_status === "done" ? `/mis-clases/${cls.id}` : "#"}
              style={{ textDecoration: "none", pointerEvents: cls.processing_status === "done" ? "auto" : "none" }}
            >
              <div style={{ padding: "16px 18px", background: "var(--mn-surface)", borderRadius: "var(--mn-r-lg)", border: "1px solid var(--mn-ink-4)", display: "flex", gap: 14, alignItems: "flex-start", cursor: cls.processing_status === "done" ? "pointer" : "default", transition: "border-color 150ms" }}
                onMouseEnter={e => { if (cls.processing_status === "done") e.currentTarget.style.borderColor = "var(--mn-green)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--mn-ink-4)"; }}
              >
                <div style={{ width: 36, height: 36, borderRadius: "var(--mn-r-md)", background: "var(--mn-raised)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "var(--mn-ink-3)" }}>
                  {SOURCE_ICONS[cls.source]}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: "var(--mn-ink-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cleanTitle(cls.title)}</p>
                    {statusBadge(cls)}
                  </div>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                    {cls.subject_name && <span style={{ fontSize: 12, color: "var(--mn-ink-3)" }}>{cls.subject_name}</span>}
                    <span style={{ fontSize: 11, color: "var(--mn-ink-4)" }}>{SOURCE_LABELS[cls.source]}</span>
                    <span style={{ fontSize: 11, color: "var(--mn-ink-4)" }}>{new Date(cls.created_at).toLocaleDateString("es", { day: "numeric", month: "short" })}</span>
                  </div>
                  {cls.processing_status === "done" && (
                    <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                      {cls.flashcards_count > 0 && <span style={{ fontSize: 11, color: "var(--mn-green)", fontWeight: 600, display: "flex", alignItems: "center", gap: 3 }}><Layers size={10} /> {cls.flashcards_count} flashcards</span>}
                      {cls.quiz_count > 0 && <span style={{ fontSize: 11, color: "var(--mn-ink-3)", fontWeight: 600, display: "flex", alignItems: "center", gap: 3 }}><HelpCircle size={10} /> {cls.quiz_count} quiz</span>}
                      {cls.concepts_count > 0 && <span style={{ fontSize: 11, color: "var(--mn-ink-3)", fontWeight: 600, display: "flex", alignItems: "center", gap: 3 }}><BookOpen size={10} /> {cls.concepts_count} conceptos</span>}
                    </div>
                  )}
                  {(cls.processing_status === "transcribing" || cls.processing_status === "analyzing") && (
                    <p style={{ fontSize: 12, color: "var(--mn-amber)", marginTop: 4 }}>{cls.processing_stage}</p>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                  <button
                    onClick={e => { e.preventDefault(); e.stopPropagation(); setConfirmDeleteId(cls.id); }}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--mn-ink-4)", padding: 4, display: "flex", alignItems: "center", borderRadius: 6 }}
                    title="Eliminar clase"
                  >
                    <Trash2 size={14} />
                  </button>
                  {cls.processing_status === "done" && <ChevronRight size={16} color="var(--mn-ink-4)" />}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Modal confirmación eliminar */}
      {confirmDeleteId && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
          onClick={() => setConfirmDeleteId(null)}>
          <div style={{ background: "var(--mn-surface)", borderRadius: "var(--mn-r-xl)", padding: "28px 24px", maxWidth: 380, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.25)" }}
            onClick={e => e.stopPropagation()}>
            <p style={{ fontSize: 16, fontWeight: 700, color: "var(--mn-ink-1)", marginBottom: 8 }}>¿Eliminar esta clase?</p>
            <p style={{ fontSize: 14, color: "var(--mn-ink-3)", marginBottom: 24, lineHeight: 1.6 }}>
              Se eliminarán también las flashcards y el quiz generados de esta clase. Esta acción no se puede deshacer.
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setConfirmDeleteId(null)} style={{ flex: 1, padding: "10px", borderRadius: "var(--mn-r-lg)", border: "1px solid var(--mn-ink-4)", background: "var(--mn-surface)", fontSize: 14, fontWeight: 600, color: "var(--mn-ink-2)", cursor: "pointer" }}>
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(confirmDeleteId)}
                disabled={deletingId === confirmDeleteId}
                style={{ flex: 1, padding: "10px", borderRadius: "var(--mn-r-lg)", border: "none", background: "var(--mn-error)", fontSize: 14, fontWeight: 700, color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, opacity: deletingId === confirmDeleteId ? 0.7 : 1 }}
              >
                {deletingId === confirmDeleteId ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Trash2 size={14} />}
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Nueva Clase ── */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }} onClick={e => { if (e.target === e.currentTarget) { setShowModal(false); resetModal(); } }}>
          <div style={{ background: "var(--mn-surface)", borderRadius: "var(--mn-r-xl)", width: "100%", maxWidth: 480, boxShadow: "0 20px 60px rgba(0,0,0,0.25)", animation: "fadeIn 0.2s ease", overflow: "hidden" }}>

            {/* Modal header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 20px", borderBottom: "1px solid var(--mn-ink-4)" }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: "var(--mn-ink-1)" }}>
                {step === "choose" ? "Nueva clase" : step === "uploading" ? "Subiendo audio..." : step === "processing" ? "Procesando..." : "Configurar clase"}
              </p>
              <button onClick={() => { setShowModal(false); resetModal(); }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--mn-ink-3)", display: "flex", alignItems: "center" }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: "20px" }}>
              {/* Step: choose */}
              {step === "choose" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <p style={{ fontSize: 13, color: "var(--mn-ink-3)", marginBottom: 4 }}>¿Cómo quieres agregar la clase?</p>

                  <button onClick={() => { setUploadMode("recording"); setStep("form"); }}
                    style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 18px", borderRadius: "var(--mn-r-lg)", border: "1px solid var(--mn-ink-4)", background: "var(--mn-surface)", cursor: "pointer", textAlign: "left", transition: "border-color 150ms" }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = "var(--mn-green)"}
                    onMouseLeave={e => e.currentTarget.style.borderColor = "var(--mn-ink-4)"}
                  >
                    <div style={{ width: 40, height: 40, borderRadius: "var(--mn-r-md)", background: "var(--mn-raised)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Mic size={18} color="var(--mn-green)" />
                    </div>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 600, color: "var(--mn-ink-1)" }}>Grabar clase</p>
                      <p style={{ fontSize: 12, color: "var(--mn-ink-3)" }}>Graba desde el micrófono en tiempo real</p>
                    </div>
                  </button>

                  <div onClick={() => fileInputRef.current?.click()}
                    style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 18px", borderRadius: "var(--mn-r-lg)", border: "1px solid var(--mn-ink-4)", background: "var(--mn-surface)", cursor: "pointer", transition: "border-color 150ms" }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = "var(--mn-green)"}
                    onMouseLeave={e => e.currentTarget.style.borderColor = "var(--mn-ink-4)"}
                  >
                    <div style={{ width: 40, height: 40, borderRadius: "var(--mn-r-md)", background: "var(--mn-raised)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Upload size={18} color="var(--mn-ink-2)" />
                    </div>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 600, color: "var(--mn-ink-1)" }}>Subir audio</p>
                      <p style={{ fontSize: 12, color: "var(--mn-ink-3)" }}>MP3, M4A, WAV, AAC, FLAC u OGG</p>
                    </div>
                  </div>
                  <input ref={fileInputRef} type="file" accept={ALLOWED_AUDIO} style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); e.target.value = ""; }} />
                </div>
              )}

              {/* Step: form */}
              {step === "form" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {uploadError && <p style={{ fontSize: 13, color: "var(--mn-error)", background: "var(--mn-raised)", padding: "8px 12px", borderRadius: "var(--mn-r-sm)" }}>{uploadError}</p>}

                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "var(--mn-ink-2)", display: "block", marginBottom: 6 }}>Título de la clase</label>
                    <input value={classTitle} onChange={e => setClassTitle(e.target.value)} placeholder="Ej: Clase 5 — Fotosíntesis" style={{ width: "100%", padding: "10px 12px", borderRadius: "var(--mn-r-md)", border: "1px solid var(--mn-ink-4)", background: "var(--mn-surface)", fontSize: 14, color: "var(--mn-ink-1)", outline: "none" }} />
                  </div>

                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "var(--mn-ink-2)", display: "block", marginBottom: 6 }}>Materia</label>
                    <select value={selectedSubjectId} onChange={e => setSelectedSubjectId(e.target.value)} style={{ width: "100%", padding: "10px 12px", borderRadius: "var(--mn-r-md)", border: "1px solid var(--mn-ink-4)", background: "var(--mn-surface)", fontSize: 14, color: "var(--mn-ink-1)", outline: "none" }}>
                      <option value="">— Seleccionar materia —</option>
                      {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>

                  {/* Recorder */}
                  {uploadMode === "recording" && (
                    <div style={{ padding: "16px", borderRadius: "var(--mn-r-lg)", background: "var(--mn-raised)", textAlign: "center" }}>
                      {!recording ? (
                        <>
                          <Mic size={24} color="var(--mn-ink-3)" style={{ marginBottom: 8 }} />
                          <p style={{ fontSize: 13, color: "var(--mn-ink-3)", marginBottom: 12 }}>Presiona el botón para empezar a grabar</p>
                          <button onClick={startRecording} className="mn-btn-primary" style={{ fontSize: 13 }}>
                            <Mic size={14} /> Comenzar grabación
                          </button>
                        </>
                      ) : (
                        <>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 10 }}>
                            <div style={{ width: 10, height: 10, borderRadius: "50%", background: recordingPaused ? "var(--mn-ink-4)" : "var(--mn-error)", animation: recordingPaused ? "none" : "lpcPulse 1s infinite" }} />
                            <p style={{ fontSize: 22, fontWeight: 700, fontVariantNumeric: "tabular-nums", color: "var(--mn-ink-1)" }}>{formatTime(recordingSeconds)}</p>
                          </div>
                          <p style={{ fontSize: 12, color: "var(--mn-ink-3)", marginBottom: 12 }}>{recordingPaused ? "Pausado" : "Grabando..."}</p>
                          <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                            {!recordingPaused
                              ? <button onClick={pauseRecording} style={{ padding: "8px 16px", borderRadius: "var(--mn-r-md)", border: "1px solid var(--mn-ink-4)", background: "none", fontSize: 13, color: "var(--mn-ink-2)", cursor: "pointer" }}>Pausar</button>
                              : <button onClick={resumeRecording} style={{ padding: "8px 16px", borderRadius: "var(--mn-r-md)", border: "1px solid var(--mn-ink-4)", background: "none", fontSize: 13, color: "var(--mn-ink-2)", cursor: "pointer" }}>Reanudar</button>
                            }
                            <button onClick={stopRecordingAndUpload} disabled={!classTitle || !selectedSubjectId} className="mn-btn-primary" style={{ fontSize: 13, opacity: (!classTitle || !selectedSubjectId) ? 0.5 : 1 }}>
                              Finalizar y procesar
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* Archivo seleccionado */}
                  {uploadMode === "audio" && selectedFile && (
                    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: "var(--mn-r-md)", background: "var(--mn-raised)", border: "1px solid var(--mn-ink-4)" }}>
                      <FileAudio size={16} color="var(--mn-ink-3)" />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: "var(--mn-ink-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{selectedFile.name}</p>
                        <p style={{ fontSize: 11, color: "var(--mn-ink-3)" }}>{(selectedFile.size / 1024 / 1024).toFixed(1)} MB</p>
                      </div>
                    </div>
                  )}

                  {uploadMode === "audio" && (
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => setStep("choose")} style={{ padding: "10px 16px", borderRadius: "var(--mn-r-md)", border: "1px solid var(--mn-ink-4)", background: "none", fontSize: 13, color: "var(--mn-ink-2)", cursor: "pointer" }}>
                        Volver
                      </button>
                      <button
                        onClick={() => { if (selectedFile) { const ext = selectedFile.name.split(".").pop()?.toLowerCase() ?? "mp3"; const mime = AUDIO_MIME_MAP[ext] ?? selectedFile.type; uploadClass(selectedFile, "audio", mime); } }}
                        disabled={!classTitle || !selectedSubjectId || !selectedFile}
                        className="mn-btn-primary"
                        style={{ flex: 1, justifyContent: "center", fontSize: 13, opacity: (!classTitle || !selectedSubjectId || !selectedFile) ? 0.5 : 1 }}
                      >
                        <Upload size={14} /> Subir y procesar
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Step: uploading */}
              {step === "uploading" && (
                <div style={{ textAlign: "center", padding: "8px 0" }}>
                  <div style={{ width: "100%", height: 6, background: "var(--mn-raised)", borderRadius: 3, marginBottom: 12, overflow: "hidden" }}>
                    <div style={{ height: "100%", background: "var(--mn-green)", borderRadius: 3, width: `${uploadProgress}%`, transition: "width 200ms" }} />
                  </div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: "var(--mn-ink-1)", marginBottom: 4 }}>Subiendo audio... {uploadProgress}%</p>
                  <p style={{ fontSize: 12, color: "var(--mn-ink-3)" }}>No cierres esta ventana.</p>
                </div>
              )}

              {/* Step: processing */}
              {step === "processing" && (
                <div style={{ textAlign: "center", padding: "8px 0" }}>
                  <CheckCircle size={32} color="#16A34A" style={{ marginBottom: 12 }} />
                  <p style={{ fontSize: 14, fontWeight: 600, color: "var(--mn-ink-1)", marginBottom: 4 }}>¡Audio recibido!</p>
                  <p style={{ fontSize: 13, color: "var(--mn-ink-3)" }}>Mnemora está transcribiendo y generando tus materiales. Puedes cerrar esta ventana — te avisamos cuando esté lista.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes lpcPulse{0%,100%{opacity:.4}50%{opacity:1}}`}</style>
    </div>
  );
}
