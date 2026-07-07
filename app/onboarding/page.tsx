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
  const [userPlan, setUserPlan] = useState<string | null>(null);

  useEffect(() => {
    const db = createClient();
    db.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      db.from("profiles").select("plan").eq("id", user.id).single()
        .then(({ data }) => setUserPlan(data?.plan ?? "free"));
    });
  }, []);
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
          {step === 0 && <StepBienvenida onNext={next} plan={userPlan} />}
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
function StepBienvenida({ onNext, plan }: { onNext: () => void; plan: string | null }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ width: 80, height: 80, background: "#E8F1EC", borderRadius: 20, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
        <span style={{ fontSize: 40 }}>🎓</span>
      </div>
      <h1 className="font-display" style={{ fontSize: 32, fontWeight: 800, color: "#1A1612", lineHeight: 1.2, marginBottom: 16 }}>
        Bienvenido a Mnemora
      </h1>
      <p style={{ fontSize: 16, color: "#6B6259", lineHeight: 1.65, marginBottom: 32, maxWidth: 400, margin: "0 auto 32px" }}>
        En 3 minutos organizamos tu semestre y tu tutor personal queda listo para estudiar contigo.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 12, background: "#FFFFFF", borderRadius: 16, padding: 20, marginBottom: 32, border: "0.5px solid rgba(26,22,18,0.08)", textAlign: "left" }}>
        {[
          { icon: <GraduationCap size={18} color="#1B3F2F" />, text: "Configuramos tu carrera y materias" },
          { icon: <Calendar size={18} color="#1B3F2F" />, text: "Extraemos tu calendario del programa de la materia" },
          { icon: <BookMarked size={18} color="#1B3F2F" />, text: "Tu tutor queda listo con memoria" },
        ].map(({ icon, text }) => (
          <div key={text} style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 32, height: 32, background: "#E8F1EC", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              {icon}
            </div>
            <span style={{ fontSize: 14, color: "#1A1612", fontWeight: 500 }}>{text}</span>
          </div>
        ))}
      </div>

      <button onClick={onNext} className="mn-btn-primary" style={{ fontSize: 16, padding: "14px 32px" }}>
        Empezar <ArrowRight size={16} />
      </button>
      {plan === "free" && (
        <p style={{ fontSize: 12, color: "#9E9389", marginTop: 14 }}>Tu prueba Pro de 7 días ya está activa 🎉</p>
      )}
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
        <div>
          <label style={{ fontSize: 13, fontWeight: 600, color: "#1A1612", display: "block", marginBottom: 6 }}>
            Profesor/a <span style={{ fontWeight: 400, color: "#9E9389" }}>(opcional)</span>
          </label>
          <input
            type="text" value={data.professor}
            onChange={e => update({ professor: e.target.value })}
            placeholder="ej. Dr. García"
            style={inputStyle}
            onFocus={e => (e.target.style.borderColor = "#1B3F2F")}
            onBlur={e => (e.target.style.borderColor = "rgba(26,22,18,0.12)")}
          />
        </div>
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

  return (
    <div>
      <h2 className="font-display" style={{ fontSize: 28, fontWeight: 800, color: "#1A1612", marginBottom: 8 }}>
        ¿Tienes el programa de la materia?
      </h2>
      <p style={{ fontSize: 15, color: "#6B6259", marginBottom: 32 }}>
        Súbelo y Mnemora extrae todas las fechas importantes en segundos. Si no lo tienes, puedes omitir este paso.
      </p>

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
              <><Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Procesando programa...</>
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

/* ─── Step 4: ¡Listo! — auto-redirect al tutor en 4s ─── */
function StepListo({ data }: { data: OnboardingData }) {
  const router = useRouter();
  const [countdown, setCountdown] = useState(4);
  const destination = data.subjectId ? `/tutor/${data.subjectId}` : "/dashboard";

  useEffect(() => {
    if (countdown <= 0) {
      router.push(destination);
      return;
    }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown, destination, router]);

  const progress = ((4 - countdown) / 4) * 100;

  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ width: 80, height: 80, background: "#E8F1EC", borderRadius: 20, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
        <span style={{ fontSize: 44 }}>🎉</span>
      </div>
      <h2 className="font-display" style={{ fontSize: 30, fontWeight: 800, color: "#1A1612", marginBottom: 12 }}>¡Todo listo!</h2>
      <p style={{ fontSize: 16, color: "#6B6259", lineHeight: 1.65, marginBottom: 28 }}>
        Tu tutor ya conoce <strong style={{ color: "#1A1612" }}>{data.subjectName}</strong>.
        {!data.syllabusSkipped && " El calendario se llenará en segundos."}
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 28 }}>
        {[
          { text: "Materia creada en Mnemora", done: true },
          { text: data.syllabusSkipped ? "Programa: puedes subirlo desde la materia" : "Programa recibido · extrayendo fechas", done: !data.syllabusSkipped },
          { text: "Tutor con memoria activado", done: true },
          { text: "7 días Pro gratis activos", done: true },
        ].map(({ text, done }) => (
          <div key={text} style={{ display: "flex", alignItems: "center", gap: 10, background: done ? "#FFFFFF" : "#F7F4EF", borderRadius: 12, padding: "12px 16px", border: "0.5px solid rgba(26,22,18,0.08)" }}>
            {done
              ? <Check size={16} color="#1B3F2F" />
              : <div style={{ width: 16, height: 16, borderRadius: "50%", border: "2px solid rgba(26,22,18,0.2)", flexShrink: 0 }} />
            }
            <span style={{ fontSize: 14, color: done ? "#1A1612" : "#9E9389", fontWeight: 500 }}>{text}</span>
          </div>
        ))}
      </div>

      {/* Auto-redirect CTA */}
      <button
        onClick={() => router.push(destination)}
        className="mn-btn-primary"
        style={{ fontSize: 16, padding: "14px 32px", justifyContent: "center", width: "100%", marginBottom: 12 }}
      >
        Hablar con mi tutor ahora <ArrowRight size={16} />
      </button>

      {/* Progress bar + countdown */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ height: 3, background: "#EDE9E2", borderRadius: 99, overflow: "hidden", marginBottom: 8 }}>
          <div style={{ height: "100%", width: `${progress}%`, background: "#1B3F2F", borderRadius: 99, transition: "width 900ms linear" }} />
        </div>
        <p style={{ fontSize: 12, color: "#9E9389" }}>
          Te llevamos en {countdown}s...
        </p>
      </div>

      <button
        onClick={() => router.push("/dashboard")}
        style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "#C4BAAE", textDecoration: "underline" }}
      >
        Ir al dashboard en su lugar
      </button>
    </div>
  );
}

export default function OnboardingPage() {
  return <Suspense><OnboardingPageInner /></Suspense>;
}
