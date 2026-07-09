"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  BookOpen, ArrowRight, Check, GraduationCap,
  BookMarked, Calendar, Upload, Loader2, X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const STEPS = ["Bienvenida", "Tu carrera", "Primera materia", "Programa", "¡Listo!"];

type OnboardingData = {
  university: string;
  career: string;
  subjectName: string;
  professor: string;
  semester: string;
  subjectId: string | null;
  documentId: string | null;
  syllabusSkipped: boolean;
};

const inputStyle = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 10,
  border: "1.5px solid rgba(26,22,18,0.12)",
  background: "#EDE9E2",
  fontSize: 15,
  color: "#1A1612",
  outline: "none",
  boxSizing: "border-box" as const,
};

function OnboardingInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returning = searchParams.get("returning") === "true";
  const [step, setStep] = useState(returning ? 2 : 0);
  const [data, setData] = useState<OnboardingData>({
    university: "",
    career: "",
    subjectName: "",
    professor: "",
    semester: "2026-I",
    subjectId: null,
    documentId: null,
    syllabusSkipped: false,
  });

  function update(partial: Partial<OnboardingData>) {
    setData(prev => ({ ...prev, ...partial }));
  }

  function next() { setStep(s => s + 1); }
  function back() { setStep(s => Math.max(returning ? 2 : 0, s - 1)); }

  return (
    <div style={{ minHeight: "100vh", background: "#F7F4EF", display: "flex", flexDirection: "column" }}>
      {/* Top bar */}
      <header style={{ padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 28, height: 28, background: "#1B3F2F", borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <BookOpen size={14} color="#fff" />
          </div>
          <span className="font-display" style={{ fontWeight: 800, fontSize: 16, color: "#1A1612" }}>Mnemora</span>
        </div>

        {/* Progress dots */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {STEPS.map((_, i) => (
            <div
              key={i}
              style={{
                width: i === step ? 20 : 8,
                height: 8,
                borderRadius: 4,
                background: i <= step ? "#1B3F2F" : "rgba(26,22,18,0.12)",
                opacity: i === step ? 1 : i < step ? 0.5 : 0.25,
                transition: "all 300ms",
              }}
            />
          ))}
        </div>

        <span style={{ fontSize: 13, color: "#9E9389" }}>{step + 1} / {STEPS.length}</span>
      </header>

      {/* Content */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
        <div style={{ width: "100%", maxWidth: 520 }}>
          {step > (returning ? 2 : 0) && step < 4 && (
            <button
              onClick={back}
              style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "#9E9389", marginBottom: 20, padding: 0, display: "flex", alignItems: "center", gap: 4 }}
            >
              ← Atrás
            </button>
          )}
          {step === 0 && <StepBienvenida onNext={next} />}
          {step === 1 && <StepCarrera data={data} update={update} onNext={next} />}
          {step === 2 && <StepMateria data={data} update={update} onNext={next} />}
          {step === 3 && <StepSyllabus data={data} update={update} onNext={next} />}
          {step === 4 && <StepListo data={data} />}
        </div>
      </div>
    </div>
  );
}

/* ─── Step 0: Bienvenida ─── */
function StepBienvenida({ onNext }: { onNext: () => void }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ width: 72, height: 72, background: "#E8F1EC", borderRadius: 20, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
        <span style={{ fontSize: 36 }}>🎓</span>
      </div>
      <h1 className="font-display" style={{ fontSize: 30, fontWeight: 800, color: "#1A1612", lineHeight: 1.2, marginBottom: 10 }}>
        Bienvenido a Mnemora
      </h1>
      <p style={{ fontSize: 15, color: "#6B6259", lineHeight: 1.6, marginBottom: 28, maxWidth: 360, margin: "0 auto 28px" }}>
        En los próximos minutos vamos a preparar todo para que puedas estudiar mejor.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, background: "#FFFFFF", borderRadius: 16, padding: "18px 20px", marginBottom: 28, border: "0.5px solid rgba(26,22,18,0.08)", textAlign: "left" }}>
        {[
          "Crear tu primera materia",
          "Organizar tu semestre",
          "Preparar a tu tutor",
        ].map(text => (
          <div key={text} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Check size={15} color="#1B3F2F" />
            <span style={{ fontSize: 14, color: "#1A1612", fontWeight: 500 }}>{text}</span>
          </div>
        ))}
      </div>

      <button onClick={onNext} className="mn-btn-primary" style={{ fontSize: 16, padding: "14px 32px" }}>
        Comenzar <ArrowRight size={16} />
      </button>
    </div>
  );
}

/* ─── Step 1: Carrera ─── */
function StepCarrera({ data, update, onNext }: { data: OnboardingData; update: (d: Partial<OnboardingData>) => void; onNext: () => void }) {
  const [loading, setLoading] = useState(false);

  async function handleNext() {
    setLoading(true);
    try {
      const db = createClient();
      const { data: { user } } = await db.auth.getUser();
      if (user) {
        await db.from("profiles").upsert(
          { id: user.id, email: user.email!, university: data.university, career: data.career },
          { onConflict: "id" }
        );
      }
    } catch {
      // Sin credenciales en dev — continuar igual
    }
    setLoading(false);
    onNext();
  }

  return (
    <div>
      <h2 className="font-display" style={{ fontSize: 28, fontWeight: 800, color: "#1A1612", marginBottom: 8 }}>¿Dónde estudias?</h2>
      <p style={{ fontSize: 15, color: "#6B6259", marginBottom: 32 }}>Mnemora adapta el tutor a tu universidad y carrera.</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <label style={{ fontSize: 13, fontWeight: 600, color: "#1A1612", display: "block", marginBottom: 6 }}>Universidad o institución</label>
          <input
            type="text" value={data.university}
            onChange={e => update({ university: e.target.value })}
            placeholder="ej. UBA, UNAM, UdeA, PUC..."
            style={inputStyle}
            onFocus={e => (e.target.style.borderColor = "#1B3F2F")}
            onBlur={e => (e.target.style.borderColor = "rgba(26,22,18,0.12)")}
          />
        </div>
        <div>
          <label style={{ fontSize: 13, fontWeight: 600, color: "#1A1612", display: "block", marginBottom: 6 }}>Carrera</label>
          <input
            type="text" value={data.career}
            onChange={e => update({ career: e.target.value })}
            placeholder="ej. Ingeniería en Sistemas, Medicina..."
            style={inputStyle}
            onFocus={e => (e.target.style.borderColor = "#1B3F2F")}
            onBlur={e => (e.target.style.borderColor = "rgba(26,22,18,0.12)")}
          />
        </div>
        <button
          onClick={handleNext}
          disabled={loading || !data.university || !data.career}
          className="mn-btn-primary"
          style={{ width: "100%", justifyContent: "center", marginTop: 8, fontSize: 15, padding: "14px", opacity: loading ? 0.7 : 1 }}
        >
          {loading ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : <>Continuar <ArrowRight size={16} /></>}
        </button>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

/* ─── Step 2: Primera materia ─── */
function StepMateria({ data, update, onNext }: { data: OnboardingData; update: (d: Partial<OnboardingData>) => void; onNext: () => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showOptional, setShowOptional] = useState(false);
  const semestres = ["2026-I", "2026-II", "2025-II", "Otro"];

  async function handleNext() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.subjectName,
          professor: data.professor || undefined,
          semester_label: data.semester,
        }),
      });
      if (res.status === 403) {
        const json = await res.json();
        setError(json.message ?? "Límite del plan Free alcanzado.");
        setLoading(false);
        return;
      }
      if (res.ok) {
        const subject = await res.json();
        update({ subjectId: subject.id });
      }
    } catch {
      // Sin credenciales en dev — continuar igual
    }
    setLoading(false);
    onNext();
  }

  return (
    <div>
      <h2 className="font-display" style={{ fontSize: 28, fontWeight: 800, color: "#1A1612", marginBottom: 8 }}>Tu primera materia</h2>
      <p style={{ fontSize: 15, color: "#6B6259", marginBottom: 32 }}>Después puedes agregar todas las que quieras.</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <label style={{ fontSize: 13, fontWeight: 600, color: "#1A1612", display: "block", marginBottom: 6 }}>Nombre de la materia</label>
          <input
            type="text" value={data.subjectName}
            onChange={e => update({ subjectName: e.target.value })}
            placeholder="ej. Cálculo II, Anatomía, Derecho Penal..."
            style={inputStyle}
            onFocus={e => (e.target.style.borderColor = "#1B3F2F")}
            onBlur={e => (e.target.style.borderColor = "rgba(26,22,18,0.12)")}
          />
        </div>
        <button
          type="button"
          onClick={() => setShowOptional(v => !v)}
          style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "#9E9389", textAlign: "left", padding: 0, display: "flex", alignItems: "center", gap: 4 }}
        >
          {showOptional ? "▾" : "▸"} Agregar profesor/a (opcional)
        </button>
        {showOptional && (
          <input
            type="text" value={data.professor}
            onChange={e => update({ professor: e.target.value })}
            placeholder="ej. Dr. García"
            style={inputStyle}
            onFocus={e => (e.target.style.borderColor = "#1B3F2F")}
            onBlur={e => (e.target.style.borderColor = "rgba(26,22,18,0.12)")}
          />
        )}
        <div>
          <label style={{ fontSize: 13, fontWeight: 600, color: "#1A1612", display: "block", marginBottom: 8 }}>Semestre</label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {semestres.map(s => (
              <button key={s} onClick={() => update({ semester: s })}
                style={{ padding: "8px 16px", borderRadius: 8, border: `1.5px solid ${data.semester === s ? "#1B3F2F" : "rgba(26,22,18,0.12)"}`, background: data.semester === s ? "#E8F1EC" : "#FFFFFF", color: data.semester === s ? "#1B3F2F" : "#6B6259", fontSize: 14, fontWeight: data.semester === s ? 600 : 400, cursor: "pointer", transition: "all 150ms" }}
              >{s}</button>
            ))}
          </div>
        </div>
        {error && (
          <div style={{ padding: "10px 14px", borderRadius: 10, background: "#FEE2E2" }}>
            <p style={{ fontSize: 13, color: "#DC2626" }}>{error}</p>
          </div>
        )}
        <button onClick={handleNext} disabled={loading || !data.subjectName} className="mn-btn-primary"
          style={{ width: "100%", justifyContent: "center", marginTop: 8, fontSize: 15, padding: "14px", opacity: loading ? 0.7 : 1 }}
        >
          {loading ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : <>Continuar <ArrowRight size={16} /></>}
        </button>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

/* ─── Step 3: Programa de la materia ─── */
function StepSyllabus({ data, update, onNext }: { data: OnboardingData; update: (d: Partial<OnboardingData>) => void; onNext: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");

  async function handleFile(f: File) {
    if (!f.type.includes("pdf") && !f.type.includes("text")) {
      setError("Solo se admiten PDFs o archivos de texto.");
      return;
    }
    setFile(f);
    setError("");
  }

  async function handleUploadAndProcess() {
    if (!file) return;
    // Sin subjectId (dev sin credenciales): saltar directamente
    if (!data.subjectId) { onNext(); return; }
    setUploading(true);
    setError("");

    const db = createClient();
    const { data: { user } } = await db.auth.getUser();
    if (!user) { setError("Sesión expirada."); setUploading(false); return; }

    // 1. Upload al Storage de Supabase
    const ext = file.name.split(".").pop();
    const path = `${user.id}/${data.subjectId}/${Date.now()}.${ext}`;
    const { error: uploadError } = await db.storage
      .from("documents")
      .upload(path, file, { contentType: file.type, upsert: false });

    if (uploadError) {
      setError("Error al subir el archivo. Intenta de nuevo.");
      setUploading(false);
      return;
    }

    // 2. Crear registro en documents
    const { data: doc, error: docError } = await db
      .from("documents")
      .insert({
        subject_id: data.subjectId,
        user_id: user.id,
        name: file.name,
        file_url: path,
        processing_status: "pending",
      })
      .select("id")
      .single();

    if (docError || !doc) {
      setError("Error al registrar el documento.");
      setUploading(false);
      return;
    }

    update({ documentId: doc.id });
    setUploading(false);
    setProcessing(true);

    // 3. Disparar procesamiento (syllabus → extrae calendario + conceptos)
    const res = await fetch("/api/process-document", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        documentId: doc.id,
        subjectId: data.subjectId,
        type: "syllabus",
        subjectName: data.subjectName,
      }),
    });

    setProcessing(false);

    if (!res.ok) {
      // No bloqueamos al usuario — el procesamiento puede fallar y reintentarse
      console.warn("process-document falló:", await res.text());
    }

    onNext();
  }

  const [isDragging, setIsDragging] = useState(false);
  const [processingMsgIdx, setProcessingMsgIdx] = useState(0);
  const PROCESSING_MSGS = ["Leyendo el programa...", "Detectando fechas de examen...", "Mapeando temas del semestre...", "Casi listo..."];

  useEffect(() => {
    if (!processing) return;
    const t = setInterval(() => setProcessingMsgIdx(i => (i + 1) % PROCESSING_MSGS.length), 2000);
    return () => clearInterval(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [processing]);

  return (
    <div>
      <div style={{ background: "#1B3F2F", borderRadius: 16, padding: "20px 22px", marginBottom: 24 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: "#86EFAC", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Tu materia está lista ✓
        </p>
        <h2 className="font-display" style={{ fontSize: 22, fontWeight: 800, color: "#fff", lineHeight: 1.2, marginBottom: 10 }}>
          Ahora sube el programa de la materia.
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          {[
            "Detectamos tus fechas de examen",
            "Creamos tu calendario del semestre",
            "Preparamos a tu tutor con el temario",
            "Organizamos qué estudiar cada día",
          ].map(t => (
            <div key={t} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Check size={13} color="#86EFAC" />
              <span style={{ fontSize: 13, color: "#D1FAE5" }}>{t}</span>
            </div>
          ))}
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept=".pdf,.txt,.md"
        style={{ display: "none" }}
        onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
      />

      {!file ? (
        /* Drop zone */
        <div
          onClick={() => fileRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={e => { e.preventDefault(); setIsDragging(false); e.dataTransfer.files[0] && handleFile(e.dataTransfer.files[0]); }}
          style={{
            border: `2px dashed ${isDragging ? "#1B3F2F" : "rgba(26,22,18,0.16)"}`,
            borderRadius: 16, padding: "48px 24px",
            textAlign: "center", cursor: "pointer",
            background: isDragging ? "#F7FEFA" : "#FFFFFF", transition: "all 200ms",
            marginBottom: 12,
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = "#1B3F2F"; e.currentTarget.style.background = "#F7FEFA"; }}
          onMouseLeave={e => { if (!isDragging) { e.currentTarget.style.borderColor = "rgba(26,22,18,0.16)"; e.currentTarget.style.background = "#FFFFFF"; } }}
        >
          <div style={{ width: 48, height: 48, background: "#E8F1EC", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
            <Upload size={22} color="#1B3F2F" />
          </div>
          <p className="font-display" style={{ fontWeight: 700, color: "#1A1612", marginBottom: 4 }}>Sube tu programa de la materia</p>
          <p style={{ fontSize: 13, color: "#9E9389" }}>PDF o texto · arrastra o toca para seleccionar</p>
        </div>
      ) : (
        /* File selected */
        <div style={{ border: "1.5px solid #1B3F2F", borderRadius: 16, padding: "20px 24px", background: "#E8F1EC", marginBottom: 12, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, background: "#1B3F2F", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <BookOpen size={18} color="#fff" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: "#1B3F2F", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{file.name}</p>
            <p style={{ fontSize: 12, color: "#16A34A" }}>{(file.size / 1024).toFixed(0)} KB · listo para subir</p>
          </div>
          <button onClick={() => setFile(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#6B6259" }}>
            <X size={18} />
          </button>
        </div>
      )}

      {error && (
        <div style={{ padding: "10px 14px", borderRadius: 10, background: "#FEE2E2", marginBottom: 12 }}>
          <p style={{ fontSize: 13, color: "#DC2626" }}>{error}</p>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {file && (
          <button
            onClick={handleUploadAndProcess}
            disabled={uploading || processing}
            className="mn-btn-primary"
            style={{ width: "100%", justifyContent: "center", fontSize: 15, padding: "14px" }}
          >
            {uploading ? (
              <><Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Subiendo...</>
            ) : processing ? (
              <><Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> {PROCESSING_MSGS[processingMsgIdx]}</>
            ) : (
              <>Subir y extraer calendario <ArrowRight size={16} /></>
            )}
          </button>
        )}
        <button
          onClick={() => { update({ syllabusSkipped: true }); onNext(); }}
          style={{
            padding: "12px", borderRadius: 12, border: "1.5px solid rgba(26,22,18,0.12)",
            background: "transparent", fontSize: 14, color: "#6B6259", cursor: "pointer",
          }}
        >
          No lo tengo ahora, omitir →
        </button>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function OnboardingPageInner() {
  return (
    <Suspense>
      <OnboardingInner />
    </Suspense>
  );
}

type AhaMoment = {
  exams: { title: string; event_date: string }[];
  conceptCount: number;
};

/* ─── Step 4: ¡Listo! ─── */
function StepListo({ data }: { data: OnboardingData }) {
  const router = useRouter();
  const [visibleItems, setVisibleItems] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [aha, setAha] = useState<AhaMoment | null>(null);
  const destination = data.subjectId ? `/tutor/${data.subjectId}` : "/dashboard";

  useEffect(() => {
    const timers = [
      setTimeout(() => setVisibleItems(1), 150),
      setTimeout(() => setVisibleItems(2), 350),
      setTimeout(() => setVisibleItems(3), 550),
      setTimeout(() => { setVisibleItems(4); setShowConfetti(true); }, 800),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  // Fetch aha-moment data if syllabus was uploaded
  useEffect(() => {
    if (!data.subjectId || data.syllabusSkipped) return;
    import("@/lib/supabase/client").then(({ createClient }) => {
      const db = createClient();
      Promise.all([
        db.from("calendar_events")
          .select("title, event_date")
          .eq("subject_id", data.subjectId!)
          .eq("event_type", "exam")
          .order("event_date")
          .limit(3),
        db.from("subject_concepts")
          .select("id", { count: "exact", head: true })
          .eq("subject_id", data.subjectId!),
      ]).then(([events, concepts]) => {
        const exams = events.data ?? [];
        const conceptCount = concepts.count ?? 0;
        if (exams.length > 0 || conceptCount > 0) {
          setAha({ exams, conceptCount });
        }
      }).catch(() => {});
    });
  }, [data.subjectId, data.syllabusSkipped]);

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString("es", { day: "numeric", month: "long" });

  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ width: 72, height: 72, background: "#E8F1EC", borderRadius: 20, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
        <span style={{ fontSize: 40 }}>🎉</span>
      </div>

      {showConfetti && (
        <div style={{ position: "fixed", inset: 0, pointerEvents: "none", overflow: "hidden", zIndex: 50 }}>
          {["#1B3F2F","#86EFAC","#D97706","#FCD34D","#1B3F2F","#86EFAC","#D97706","#FCD34D","#86EFAC","#1B3F2F"].map((color, i) => (
            <div key={i} style={{
              position: "absolute", top: "-10px",
              left: `${8 + i * 9}%`,
              width: i % 3 === 0 ? 10 : 7,
              height: i % 3 === 0 ? 10 : 7,
              borderRadius: i % 2 === 0 ? "50%" : 2,
              background: color,
              animation: `confetti-fall ${1.2 + i * 0.1}s ease-out ${i * 60}ms forwards`,
            }} />
          ))}
        </div>
      )}

      {/* Aha moment — datos reales del syllabus */}
      {aha && (aha.exams.length > 0 || aha.conceptCount > 0) ? (
        <>
          <h2 className="font-display" style={{ fontSize: 26, fontWeight: 800, color: "#1A1612", marginBottom: 8 }}>
            Ya encontramos lo que necesitas saber.
          </h2>
          <p style={{ fontSize: 15, color: "#6B6259", marginBottom: 20 }}>
            Esto es lo que Mnemora detectó en el programa de <strong style={{ color: "#1A1612" }}>{data.subjectName}</strong>:
          </p>
          <div style={{ background: "#FFFFFF", borderRadius: 16, padding: "18px 20px", marginBottom: 24, border: "0.5px solid rgba(26,22,18,0.08)", textAlign: "left" }}>
            {aha.exams.map(ev => (
              <div key={ev.title} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <span style={{ fontSize: 16 }}>📅</span>
                <span style={{ fontSize: 14, color: "#1A1612", fontWeight: 500 }}>{ev.title} — {fmtDate(ev.event_date)}</span>
              </div>
            ))}
            {aha.conceptCount > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: aha.exams.length > 0 ? 4 : 0 }}>
                <span style={{ fontSize: 16 }}>🧠</span>
                <span style={{ fontSize: 14, color: "#1A1612", fontWeight: 500 }}>{aha.conceptCount} conceptos identificados</span>
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          <h2 className="font-display" style={{ fontSize: 28, fontWeight: 800, color: "#1A1612", marginBottom: 10 }}>¡Todo listo!</h2>
          <p style={{ fontSize: 15, color: "#6B6259", lineHeight: 1.6, marginBottom: 24 }}>
            Tu tutor ya conoce <strong style={{ color: "#1A1612" }}>{data.subjectName}</strong>.
            {!data.syllabusSkipped && " Tu calendario se llenará en segundos."}
          </p>
        </>
      )}

      {/* Checklist de confirmación */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 28 }}>
        {[
          { text: "Materia creada", done: true },
          { text: data.syllabusSkipped ? "Programa: puedes subirlo desde la materia" : "Programa procesado", done: !data.syllabusSkipped },
          { text: "Tutor con memoria activado", done: true },
        ].map(({ text, done }, idx) => (
          <div key={text} style={{
            display: "flex", alignItems: "center", gap: 10,
            background: done ? "#FFFFFF" : "#F7F4EF", borderRadius: 12,
            padding: "11px 16px", border: "0.5px solid rgba(26,22,18,0.08)",
            opacity: visibleItems > idx ? 1 : 0,
            transform: visibleItems > idx ? "translateY(0)" : "translateY(8px)",
            transition: "opacity 300ms ease, transform 300ms ease",
          }}>
            {done
              ? <Check size={15} color="#1B3F2F" />
              : <div style={{ width: 15, height: 15, borderRadius: "50%", border: "2px solid rgba(26,22,18,0.2)", flexShrink: 0 }} />
            }
            <span style={{ fontSize: 14, color: done ? "#1A1612" : "#9E9389", fontWeight: 500 }}>{text}</span>
          </div>
        ))}
      </div>

      <button
        onClick={() => router.push(destination)}
        className="mn-btn-primary"
        style={{ fontSize: 16, padding: "14px 32px", justifyContent: "center", width: "100%", marginBottom: 12 }}
      >
        Entrar a Mnemora <ArrowRight size={16} />
      </button>

      <button
        onClick={() => router.push("/dashboard")}
        style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "#C4BAAE", textDecoration: "underline" }}
      >
        Ir al dashboard
      </button>
      <style>{`
        @keyframes confetti-fall { 0% { transform: translateY(0) rotate(0deg); opacity: 1; } 100% { transform: translateY(105vh) rotate(720deg); opacity: 0; } }
      `}</style>
    </div>
  );
}

export default function OnboardingPage() {
  return <Suspense><OnboardingPageInner /></Suspense>;
}
