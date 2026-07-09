"use client";

import { useState } from "react";
import Link from "next/link";
import {
  BookOpen, Brain, Calendar, ChevronDown, FileText, Layers,
  Sparkles, Star, Upload, Zap, Check, ArrowRight,
  Shield, TrendingUp, Map, BarChart2, ClipboardCheck,
  GitBranch, RefreshCw, Trophy, Users, Mic,
} from "lucide-react";
import { Logo } from "@/components/logo";

/* ─────────────────────────────────────────────
   RESPONSIVE STYLES
───────────────────────────────────────────── */
function LandingStyles() {
  return (
    <style>{`
      /* Grids responsive */
      .mn-2col { display: grid; grid-template-columns: 1fr 1fr; gap: 64px; align-items: center; }
      .mn-3col { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
      .mn-4col { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; align-items: stretch; }
      .mn-5col { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; }
      .mn-why-grid { display: grid; grid-template-columns: 1fr 40px 1fr; gap: 0; align-items: stretch; max-width: 820px; margin: 0 auto; }
      .mn-comparison-wrap { border-radius: 20px; overflow: auto; border: 0.5px solid rgba(26,22,18,0.10); box-shadow: 0 4px 24px rgba(26,22,18,0.07); }
      .mn-comparison-table { min-width: 500px; }
      .mn-mockup-grid { display: grid; grid-template-columns: 200px 1fr; min-height: 440px; }
      .mn-mockup-sidebar { display: block; }
      .mn-footer-links { display: flex; gap: 20px; flex-wrap: wrap; justify-content: center; }
      .mn-pricing-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; max-width: 980px; margin: 0 auto; }

      @media (max-width: 768px) {
        .mn-2col { grid-template-columns: 1fr !important; gap: 36px !important; }
        .mn-3col { grid-template-columns: 1fr !important; }
        .mn-4col { grid-template-columns: repeat(2, 1fr) !important; }
        .mn-5col { grid-template-columns: repeat(2, 1fr) !important; }
        .mn-pricing-grid { grid-template-columns: 1fr !important; max-width: 440px !important; }
        .mn-why-grid { grid-template-columns: 1fr !important; gap: 0 !important; }
        .mn-why-arrow { display: none !important; }
        .mn-mockup-sidebar { display: none !important; }
        .mn-mockup-grid { grid-template-columns: 1fr !important; }
        .mn-footer-inner { flex-direction: column !important; align-items: center !important; text-align: center !important; }
        .mn-flow-steps { flex-direction: column !important; align-items: stretch !important; gap: 0 !important; width: 100% !important; flex-wrap: nowrap !important; }
        .mn-flow-step { flex-direction: row !important; align-items: center !important; gap: 16px !important; padding: 14px 0 !important; position: relative !important; }
        .mn-flow-step-inner { flex-direction: row !important; align-items: center !important; gap: 16px !important; }
        .mn-flow-step p { text-align: left !important; max-width: none !important; font-size: 15px !important; }
        .mn-flow-arrow { display: none !important; }
        .mn-hero-pad { padding: 56px 20px 48px !important; }
        .mn-section-pad { padding: 64px 20px !important; }
        .mn-comparison-wrap { overflow: visible !important; border: none !important; box-shadow: none !important; }
        .mn-comparison-desktop { display: none !important; }
        .mn-comparison-mobile { display: flex !important; }
      }

      @media (max-width: 480px) {
        .mn-4col { grid-template-columns: 1fr !important; }
        .mn-5col { grid-template-columns: 1fr !important; }
      }
    `}</style>
  );
}

/* ─────────────────────────────────────────────
   NAV
───────────────────────────────────────────── */
function Nav() {
  return (
    <header style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(247,244,239,0.92)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", borderBottom: "0.5px solid rgba(26,22,18,0.08)" }}>
      <div style={{ maxWidth: 1120, margin: "0 auto", padding: "0 24px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, overflow: "hidden", flexShrink: 0 }}>
            <img src="/icon-192.png" alt="Mnemora" style={{ width: "200%", height: "200%", objectFit: "cover", marginLeft: "-50%", marginTop: "-50%" }} />
          </div>
          <span className="font-display" style={{ fontWeight: 800, fontSize: 18, color: "#1A1612" }}>Mnemora</span>
        </div>
        <style>{`@media(max-width:600px){.mn-nav-link{display:none!important}}`}</style>
        <nav style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <a href="#funciones" className="mn-btn-ghost mn-nav-link" style={{ fontSize: 14, padding: "8px 14px" }}>Funciones</a>
          <a href="#precios" className="mn-btn-ghost mn-nav-link" style={{ fontSize: 14, padding: "8px 14px" }}>Precios</a>
          <Link href="/login" className="mn-btn-ghost mn-nav-link" style={{ fontSize: 14, padding: "8px 14px" }}>Iniciar sesión</Link>
          <Link href="/registro" className="mn-btn-primary" style={{ padding: "8px 18px", fontSize: 14 }}>Comenzar gratis</Link>
        </nav>
      </div>
    </header>
  );
}

/* ─────────────────────────────────────────────
   HERO
───────────────────────────────────────────── */
function Hero() {
  return (
    <section className="mn-hero-pad" style={{ maxWidth: 1120, margin: "0 auto", padding: "88px 24px 72px", textAlign: "center" }}>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 28 }} className="mn-animate">
        <span className="mn-badge mn-badge-green"><Sparkles size={12} />Para estudiantes universitarios LATAM</span>
      </div>

      <h1 className="font-display mn-animate mn-animate-d1" style={{ fontSize: "clamp(38px, 6vw, 70px)", fontWeight: 800, lineHeight: 1.06, letterSpacing: "-0.025em", color: "#1A1612", maxWidth: 900, margin: "0 auto 24px" }}>
        Para de adivinar qué estudiar.
        <br />
        <span style={{ color: "#1B3F2F" }}>Mnemora ya lo sabe.</span>
      </h1>

      <p className="mn-animate mn-animate-d2" style={{ fontSize: "clamp(17px, 2.2vw, 20px)", color: "#6B6259", maxWidth: 580, margin: "0 auto 44px", lineHeight: 1.6 }}>
        Sube tus apuntes o graba tu clase. Mnemora organiza todo, crea tu plan y te dice exactamente qué repasar hoy para llegar preparado al examen.
      </p>

      <div className="mn-animate mn-animate-d3" style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
        <Link href="/registro" className="mn-btn-primary" style={{ fontSize: 16, padding: "16px 32px" }}>
          Crear mi cuenta gratis <ArrowRight size={16} />
        </Link>
        <a href="#funciones" className="mn-btn-ghost" style={{ fontSize: 16 }}>Ver cómo funciona</a>
      </div>

      <p className="mn-animate mn-animate-d4" style={{ marginTop: 16, color: "#9E9389", fontSize: 13 }}>
        Sin tarjeta · plan Free para siempre · actualiza cuando quieras
      </p>

      <div className="mn-animate mn-animate-d4" style={{ marginTop: 72 }}>
        <DashboardMockup />
      </div>
    </section>
  );
}

function DashboardMockup() {
  return (
    <div style={{ maxWidth: 920, margin: "0 auto", borderRadius: 20, overflow: "hidden", border: "0.5px solid rgba(26,22,18,0.10)", boxShadow: "0 32px 80px rgba(26,22,18,0.12), 0 4px 16px rgba(26,22,18,0.06)", background: "#FFFFFF" }}>
      <div style={{ background: "#F0EDE7", padding: "12px 16px", display: "flex", alignItems: "center", gap: 8, borderBottom: "0.5px solid rgba(26,22,18,0.08)" }}>
        <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#F87171" }} />
        <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#FBBF24" }} />
        <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#34D399" }} />
        <div style={{ flex: 1, textAlign: "center", fontSize: 12, color: "#9E9389", fontFamily: "monospace" }}>mnemora.app/dashboard</div>
      </div>
      <div className="mn-mockup-grid" style={{ minHeight: 440 }}>
        <div className="mn-mockup-sidebar" style={{ background: "#FAFAF8", borderRight: "0.5px solid rgba(26,22,18,0.08)", padding: "16px 12px", display: "flex", flexDirection: "column", gap: 4 }}>
          {[{ label: "Dashboard", active: true }, { label: "Mi Plan", active: false }, { label: "Flashcards", active: false }, { label: "Mi progreso", active: false }].map(({ label, active }) => (
            <div key={label} style={{ padding: "7px 10px", borderRadius: 8, background: active ? "#E8F1EC" : "transparent", fontSize: 13, fontWeight: active ? 600 : 400, color: active ? "#1B3F2F" : "#6B6259" }}>{label}</div>
          ))}
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: "0.5px solid rgba(26,22,18,0.07)" }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: "#9E9389", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6, padding: "0 10px" }}>Materias</p>
            {[["Cálculo II", "#1B3F2F"], ["Estadística", "#7C3AED"], ["Física III", "#0369A1"]].map(([m, c]) => (
              <div key={m} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 8 }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: c }} />
                <span style={{ fontSize: 12, color: "#6B6259" }}>{m}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ padding: 20, background: "#F7F4EF", display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Mientras dormías */}
          <div style={{ background: "#1B3F2F", borderRadius: 12, padding: "12px 16px" }}>
            <p style={{ fontSize: 11, color: "#6EE7B7", fontWeight: 700, marginBottom: 8, letterSpacing: "0.04em" }}>Mientras dormías...</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {["Reorganicé tu plan de estudio", "Detecté 12 conceptos débiles", "Preparé tu sesión de hoy"].map(t => (
                <div key={t} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Check size={11} color="#6EE7B7" />
                  <span style={{ fontSize: 12, color: "#D1FAE5" }}>{t}</span>
                </div>
              ))}
            </div>
            <p style={{ fontSize: 11, color: "#86EFAC", marginTop: 8, fontWeight: 700 }}>Solo necesitas 23 minutos hoy.</p>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <p style={{ fontSize: 18, fontWeight: 800, color: "#1A1612" }}>Buenos días 👋</p>
              <p style={{ fontSize: 12, color: "#6B6259" }}>Parcial de Cálculo en 3 días</p>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <div style={{ padding: "6px 12px", borderRadius: 8, background: "#FEF3C7", fontSize: 12, fontWeight: 700, color: "#D97706" }}>🔥 7 días de racha</div>
              <div style={{ padding: "6px 12px", borderRadius: 8, background: "#E8F1EC", fontSize: 12, fontWeight: 700, color: "#1B3F2F" }}>⭐ 1.240 XP</div>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
            {[
              { label: "Materias", value: "3", text: "#1B3F2F" },
              { label: "Flashcards", value: "124", text: "#7C3AED" },
              { label: "Dominados", value: "68%", text: "#059669" },
              { label: "Próximo examen", value: "3 días", text: "#D97706" },
            ].map(s => (
              <div key={s.label} style={{ background: "#fff", borderRadius: 10, padding: "10px 12px", border: "0.5px solid rgba(26,22,18,0.07)" }}>
                <p style={{ fontSize: 16, fontWeight: 800, color: s.text }}>{s.value}</p>
                <p style={{ fontSize: 10, color: "#9E9389", marginTop: 2 }}>{s.label}</p>
              </div>
            ))}
          </div>
          <div style={{ background: "#fff", borderRadius: 12, padding: "14px 16px", border: "0.5px solid rgba(26,22,18,0.07)" }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: "#1B3F2F", marginBottom: 10 }}>⚡ Plan de hoy</p>
            {["Repasar Integrales (25 min)", "10 flashcards de Estadística", "Leer cap. 7 de Física"].map((t, i) => (
              <div key={t} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: i < 2 ? 8 : 0 }}>
                <div style={{ width: 14, height: 14, borderRadius: 4, background: i === 0 ? "#E8F1EC" : "transparent", border: i === 0 ? "none" : "1.5px solid #C4BAAE", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {i === 0 && <Check size={9} color="#1B3F2F" />}
                </div>
                <span style={{ fontSize: 11, color: i === 0 ? "#9E9389" : "#3D352E", textDecoration: i === 0 ? "line-through" : "none" }}>{t}</span>
              </div>
            ))}
          </div>
          <div style={{ background: "#1B3F2F", borderRadius: 12, padding: "12px 16px" }}>
            <p style={{ fontSize: 11, color: "#6EE7B7", fontWeight: 600, marginBottom: 6 }}>🤖 Tutor IA · Cálculo II</p>
            <p style={{ fontSize: 12, color: "#D1FAE5", lineHeight: 1.5 }}>"La semana pasada estudiaste integrales por sustitución. Hoy te recomiendo practicar integración por partes — es lo que más pesa en el parcial."</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   STRIP
───────────────────────────────────────────── */
function Strip() {
  return (
    <section style={{ background: "#1B3F2F", padding: "28px 24px" }}>
      <div style={{ maxWidth: 1120, margin: "0 auto", display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "24px 56px", alignItems: "center" }}>
        {[
          { icon: <Shield size={18} color="#86EFAC" />, text: "Garantía de 30 días sin preguntas" },
          { icon: <Sparkles size={18} color="#86EFAC" />, text: "Plan Free disponible sin tarjeta" },
          { icon: <Star size={18} color="#86EFAC" />, text: "Diseñado para universidades LATAM" },
          { icon: <span style={{ fontSize: 18 }}>🎁</span>, text: "Invita amigos y estudia gratis" },
        ].map(({ icon, text }) => (
          <div key={text} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {icon}
            <span style={{ fontSize: 14, color: "#D1FAE5", fontWeight: 500 }}>{text}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   POR QUÉ ES DIFERENTE
───────────────────────────────────────────── */
function WhyDifferent() {
  return (
    <section style={{ padding: "96px 24px", background: "#F7F4EF" }}>
      <div style={{ maxWidth: 1120, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <h2 className="font-display" style={{ fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 800, color: "#1A1612", letterSpacing: "-0.02em", lineHeight: 1.15, marginBottom: 16 }}>
            Esto es lo que cambia.
          </h2>
          <p style={{ color: "#6B6259", fontSize: 17, maxWidth: 520, margin: "0 auto" }}>
            El problema no es esfuerzo. Es no saber si ese esfuerzo sirve.
          </p>
        </div>
        {/* Comparación horizontal Antes → Después */}
        <div className="mn-why-grid">
          {/* Columna Antes */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ padding: "8px 14px", fontSize: 12, fontWeight: 700, color: "#EF4444", textTransform: "uppercase", letterSpacing: "0.08em" }}>Antes</div>
            {[
              { icon: "📚", text: "No sabes qué estudiar." },
              { icon: "😓", text: "Repasas horas sin saber si sirve." },
              { icon: "😰", text: "Olvidas antes del examen." },
            ].map(r => (
              <div key={r.text} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", background: "#FEF2F2", border: "1px solid rgba(239,68,68,0.1)", borderRadius: 12, flex: 1 }}>
                <span style={{ fontSize: 20, flexShrink: 0 }}>{r.icon}</span>
                <span style={{ fontSize: 14, color: "#6B6259", lineHeight: 1.4 }}>{r.text}</span>
              </div>
            ))}
          </div>
          {/* Flecha central */}
          <div className="mn-why-arrow" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, paddingTop: 36 }}>
            {[0, 1, 2].map(i => <span key={i} style={{ fontSize: 16, color: "#C4BAAE" }}>→</span>)}
          </div>
          {/* Columna Después */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ padding: "8px 14px", fontSize: 12, fontWeight: 700, color: "#1B3F2F", textTransform: "uppercase", letterSpacing: "0.08em" }}>Después</div>
            {[
              { icon: "✅", text: "Sabes exactamente qué estudiar hoy." },
              { icon: "🎯", text: "Cada minuto que estudias va a lo que importa." },
              { icon: "💪", text: "Llegas al examen seguro de que estás listo." },
            ].map(r => (
              <div key={r.text} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", background: "#F0FDF4", border: "1px solid rgba(27,63,47,0.12)", borderRadius: 12, flex: 1 }}>
                <span style={{ fontSize: 20, flexShrink: 0 }}>{r.icon}</span>
                <span style={{ fontSize: 14, color: "#3D352E", lineHeight: 1.4, fontWeight: 500 }}>{r.text}</span>
              </div>
            ))}
          </div>
        </div>
        <p style={{ textAlign: "center", fontSize: 17, color: "#1A1612", fontWeight: 600, maxWidth: 480, margin: "40px auto 0", lineHeight: 1.6 }}>
          Tú estudias. Mnemora decide qué viene después.
        </p>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   TUTOR SHOWCASE
───────────────────────────────────────────── */
function TutorShowcase() {
  return (
    <section style={{ padding: "96px 24px", background: "#FFFFFF" }}>
      <div className="mn-2col" style={{ maxWidth: 1120, margin: "0 auto" }}>
        <div>
          <span className="mn-badge mn-badge-green" style={{ marginBottom: 20, display: "inline-flex" }}><Brain size={12} /> Tutor con memoria</span>
          <h2 className="font-display" style={{ fontSize: "clamp(26px, 4vw, 42px)", fontWeight: 800, color: "#1A1612", letterSpacing: "-0.02em", lineHeight: 1.15, marginBottom: 20 }}>
            Un tutor que conoce tu materia<br />y no olvida nada
          </h2>
          <p style={{ fontSize: 16, color: "#6B6259", lineHeight: 1.75, marginBottom: 28 }}>
            No empiezas desde cero cada vez. El tutor recuerda lo que estudiaste la semana pasada, sabe qué te costó más, conoce tu programa y te habla en español universitario — sin vaguedades.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {["Recuerda el contexto de sesiones anteriores", "Conoce tu programa y fechas de parciales", "Detecta patrones de error y los trabaja contigo", "Responde con ejemplos de tu materia, no genéricos"].map(f => (
              <div key={f} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <Check size={16} color="#1B3F2F" style={{ marginTop: 2, flexShrink: 0 }} />
                <span style={{ fontSize: 14, color: "#3D352E" }}>{f}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ background: "#F7F4EF", borderRadius: 20, padding: 24, border: "0.5px solid rgba(26,22,18,0.08)", boxShadow: "0 8px 40px rgba(26,22,18,0.08)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, paddingBottom: 16, borderBottom: "0.5px solid rgba(26,22,18,0.08)" }}>
            <div style={{ width: 32, height: 32, background: "#1B3F2F", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Brain size={14} color="#fff" />
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#1A1612" }}>Tutor IA · Epistemología</p>
              <p style={{ fontSize: 11, color: "#9E9389" }}>Sesión #4 · Continuando desde el jueves</p>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ background: "#EDE9E2", borderRadius: "12px 12px 4px 12px", padding: "10px 14px", fontSize: 13, color: "#6B6259", alignSelf: "flex-end", maxWidth: "78%" }}>
              No entiendo bien el empirismo de Hume.
            </div>
            <div style={{ background: "#fff", borderRadius: "4px 12px 12px 12px", padding: "12px 16px", fontSize: 13, color: "#1A1612", lineHeight: 1.65, maxWidth: "90%", boxShadow: "0 1px 4px rgba(26,22,18,0.06)" }}>
              <span style={{ fontWeight: 700, color: "#1B3F2F" }}>Mnemora:</span> La semana pasada vimos el racionalismo de Descartes. Hume va en dirección opuesta: para él, todo conocimiento viene de la experiencia sensorial — las "impresiones". Si no puedes percibir algo con los sentidos, no es conocimiento real. ¿Quieres que lo apliquemos al problema mente-cuerpo del parcial anterior?
            </div>
            <div style={{ background: "#EDE9E2", borderRadius: "12px 12px 4px 12px", padding: "10px 14px", fontSize: 13, color: "#6B6259", alignSelf: "flex-end", maxWidth: "78%" }}>
              Sí, pero con un ejemplo más concreto.
            </div>
            <div style={{ background: "#fff", borderRadius: "4px 12px 12px 12px", padding: "12px 16px", fontSize: 13, color: "#1A1612", lineHeight: 1.65, maxWidth: "90%", boxShadow: "0 1px 4px rgba(26,22,18,0.06)" }}>
              <span style={{ fontWeight: 700, color: "#1B3F2F" }}>Mnemora:</span> Perfecto. Imagina que nunca viste el color rojo. Hume diría que no puedes tener la idea de "rojo" — porque la idea viene de la impresión sensorial de haberlo visto. Sin experiencia, no hay concepto. Eso es exactamente lo que va a preguntarte el prof. Gutiérrez el 15 de marzo.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   FLASHCARDS SHOWCASE
───────────────────────────────────────────── */
function FlashcardShowcase() {
  const [flipped, setFlipped] = useState(false);
  return (
    <section style={{ padding: "96px 24px", background: "#F7F4EF" }}>
      <div className="mn-2col" style={{ maxWidth: 1120, margin: "0 auto" }}>
        <div style={{ position: "relative" }}>
          <div style={{ position: "absolute", top: 12, left: 12, right: -12, bottom: -12, background: "#E8F1EC", borderRadius: 20, border: "0.5px solid rgba(27,63,47,0.15)" }} />
          <div style={{ position: "absolute", top: 6, left: 6, right: -6, bottom: -6, background: "#D1FAE5", borderRadius: 20, border: "0.5px solid rgba(27,63,47,0.12)" }} />
          <div onClick={() => setFlipped(f => !f)} style={{ position: "relative", background: flipped ? "#1B3F2F" : "#fff", borderRadius: 20, padding: 32, cursor: "pointer", border: "0.5px solid rgba(26,22,18,0.10)", boxShadow: "0 8px 32px rgba(26,22,18,0.10)", minHeight: 200, display: "flex", flexDirection: "column", justifyContent: "space-between", transition: "background 250ms", userSelect: "none" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <span style={{ fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 8, background: flipped ? "rgba(110,231,183,0.15)" : "#E8F1EC", color: flipped ? "#6EE7B7" : "#1B3F2F" }}>Epistemología · Tarjeta 3/24</span>
              <span style={{ fontSize: 11, color: flipped ? "#6EE7B7" : "#9E9389" }}>{flipped ? "Respuesta" : "Pregunta"}</span>
            </div>
            {!flipped ? (
              <div style={{ textAlign: "center", padding: "16px 0" }}>
                <p style={{ fontSize: 18, fontWeight: 700, color: "#1A1612", lineHeight: 1.4, marginBottom: 16 }}>¿Cuál es la diferencia central entre empirismo y racionalismo?</p>
                <p style={{ fontSize: 12, color: "#9E9389" }}>Toca para ver la respuesta</p>
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "8px 0" }}>
                <p style={{ fontSize: 15, color: "#D1FAE5", lineHeight: 1.7, marginBottom: 16 }}>El <strong style={{ color: "#6EE7B7" }}>empirismo</strong> sostiene que el conocimiento proviene de la experiencia sensorial (Hume, Locke). El <strong style={{ color: "#6EE7B7" }}>racionalismo</strong> afirma que la razón es la fuente principal del conocimiento (Descartes, Leibniz).</p>
                <p style={{ fontSize: 12, color: "#6EE7B7" }}>Toca para volver</p>
              </div>
            )}
            <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
              {["😓 Difícil", "🤔 Regular", "✅ Fácil"].map((btn, i) => (
                <button key={btn} style={{ padding: "6px 14px", borderRadius: 8, border: "none", background: flipped ? ["rgba(239,68,68,0.2)", "rgba(245,158,11,0.2)", "rgba(16,185,129,0.2)"][i] : "#F7F4EF", color: flipped ? ["#FCA5A5", "#FDE68A", "#6EE7B7"][i] : "#9E9389", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{btn}</button>
              ))}
            </div>
          </div>
        </div>
        <div>
          <span className="mn-badge mn-badge-green" style={{ marginBottom: 20, display: "inline-flex" }}><Layers size={12} /> Flashcards inteligentes</span>
          <h2 className="font-display" style={{ fontSize: "clamp(26px, 4vw, 42px)", fontWeight: 800, color: "#1A1612", letterSpacing: "-0.02em", lineHeight: 1.15, marginBottom: 20 }}>
            50 flashcards desde tu apunte en segundos
          </h2>
          <p style={{ fontSize: 16, color: "#6B6259", lineHeight: 1.75, marginBottom: 28 }}>
            Sube un PDF o pega texto. Mnemora detecta los conceptos clave y genera el mazo listo para repasar — con repetición espaciada que sube la dificultad según tu avance.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {["Generación automática desde cualquier documento", "Repetición espaciada (SM-2) adaptada a tu ritmo", "Categorización por tema y nivel de dificultad", "Seguimiento de dominio por concepto"].map(f => (
              <div key={f} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <Check size={16} color="#1B3F2F" style={{ marginTop: 2, flexShrink: 0 }} />
                <span style={{ fontSize: 14, color: "#3D352E" }}>{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   MAPA MENTAL SHOWCASE
───────────────────────────────────────────── */
function MindMapShowcase() {
  return (
    <section style={{ padding: "80px 0 0", background: "#1B3F2F" }}>
      <div style={{ maxWidth: 1120, margin: "0 auto", padding: "0 24px" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 16, marginBottom: 20 }}>
          <div>
            <span className="mn-badge" style={{ background: "rgba(255,255,255,0.12)", color: "#D1FAE5", marginBottom: 12, display: "inline-flex" }}><GitBranch size={12} /> Mapa mental</span>
            <h2 className="font-display" style={{ fontSize: "clamp(24px, 3.5vw, 38px)", fontWeight: 800, color: "#fff", letterSpacing: "-0.02em", lineHeight: 1.15 }}>
              Visualiza cómo se conectan<br />todos los conceptos
            </h2>
          </div>
          <p style={{ color: "#A3C4AC", fontSize: 15, maxWidth: 320, lineHeight: 1.6 }}>
            Generado automáticamente desde tus documentos. Nodos coloreados por nivel de dominio.
          </p>
        </div>
      </div>
      <div style={{ background: "rgba(255,255,255,0.03)", borderTop: "0.5px solid rgba(255,255,255,0.08)" }}>
          <svg viewBox="0 0 800 340" width="100%" style={{ display: "block" }} xmlns="http://www.w3.org/2000/svg">
            <rect x="330" y="135" width="140" height="44" rx="22" fill="#6EE7B7" />
            <text x="400" y="162" textAnchor="middle" fontSize="13" fontWeight="700" fill="#1B3F2F">Epistemología</text>
            <line x1="330" y1="157" x2="230" y2="90" stroke="#6EE7B7" strokeWidth="1.5" strokeOpacity="0.5" />
            <line x1="330" y1="157" x2="220" y2="157" stroke="#6EE7B7" strokeWidth="1.5" strokeOpacity="0.5" />
            <line x1="330" y1="157" x2="230" y2="230" stroke="#6EE7B7" strokeWidth="1.5" strokeOpacity="0.5" />
            <rect x="140" y="68" width="90" height="36" rx="18" fill="#1B3F2F" stroke="#6EE7B7" strokeWidth="1.5" />
            <text x="185" y="90" textAnchor="middle" fontSize="11" fill="#D1FAE5">Empirismo</text>
            <rect x="120" y="139" width="100" height="36" rx="18" fill="#1B3F2F" stroke="#4ADE80" strokeWidth="1.5" />
            <text x="170" y="161" textAnchor="middle" fontSize="11" fill="#D1FAE5">Racionalismo</text>
            <rect x="140" y="212" width="90" height="36" rx="18" fill="#1B3F2F" stroke="#86EFAC" strokeWidth="1.5" strokeDasharray="4 2" />
            <text x="185" y="234" textAnchor="middle" fontSize="11" fill="#6EE7B7">Kant</text>
            <line x1="140" y1="86" x2="60" y2="60" stroke="#6EE7B7" strokeWidth="1" strokeOpacity="0.3" />
            <line x1="140" y1="86" x2="60" y2="110" stroke="#6EE7B7" strokeWidth="1" strokeOpacity="0.3" />
            <rect x="10" y="42" width="55" height="28" rx="14" fill="rgba(110,231,183,0.1)" stroke="#6EE7B7" strokeWidth="1" strokeOpacity="0.5" />
            <text x="37" y="60" textAnchor="middle" fontSize="9" fill="#A3C4AC">Hume</text>
            <rect x="10" y="92" width="55" height="28" rx="14" fill="rgba(110,231,183,0.1)" stroke="#6EE7B7" strokeWidth="1" strokeOpacity="0.5" />
            <text x="37" y="110" textAnchor="middle" fontSize="9" fill="#A3C4AC">Locke</text>
            <line x1="470" y1="157" x2="570" y2="90" stroke="#6EE7B7" strokeWidth="1.5" strokeOpacity="0.5" />
            <line x1="470" y1="157" x2="580" y2="157" stroke="#6EE7B7" strokeWidth="1.5" strokeOpacity="0.5" />
            <line x1="470" y1="157" x2="570" y2="230" stroke="#6EE7B7" strokeWidth="1.5" strokeOpacity="0.5" />
            <rect x="570" y="68" width="110" height="36" rx="18" fill="#059669" stroke="#6EE7B7" strokeWidth="1.5" />
            <text x="625" y="90" textAnchor="middle" fontSize="11" fill="#fff">Falsabilidad</text>
            <rect x="580" y="139" width="100" height="36" rx="18" fill="#1B3F2F" stroke="#6EE7B7" strokeWidth="1.5" />
            <text x="630" y="161" textAnchor="middle" fontSize="11" fill="#D1FAE5">Método cient.</text>
            <rect x="570" y="212" width="110" height="36" rx="18" fill="rgba(110,231,183,0.08)" stroke="#6EE7B7" strokeWidth="1" strokeDasharray="4 2" />
            <text x="625" y="234" textAnchor="middle" fontSize="11" fill="#6EE7B7">Paradigmas</text>
            <line x1="680" y1="86" x2="740" y2="60" stroke="#6EE7B7" strokeWidth="1" strokeOpacity="0.3" />
            <line x1="680" y1="86" x2="740" y2="110" stroke="#6EE7B7" strokeWidth="1" strokeOpacity="0.3" />
            <rect x="735" y="42" width="55" height="28" rx="14" fill="rgba(110,231,183,0.1)" stroke="#6EE7B7" strokeWidth="1" strokeOpacity="0.5" />
            <text x="762" y="60" textAnchor="middle" fontSize="9" fill="#A3C4AC">Popper</text>
            <rect x="735" y="92" width="55" height="28" rx="14" fill="rgba(110,231,183,0.1)" stroke="#6EE7B7" strokeWidth="1" strokeOpacity="0.5" />
            <text x="762" y="110" textAnchor="middle" fontSize="9" fill="#A3C4AC">Kuhn</text>
            <circle cx="320" cy="310" r="6" fill="#059669" />
            <text x="332" y="315" fontSize="10" fill="#A3C4AC">Dominado</text>
            <circle cx="400" cy="310" r="6" fill="#1B3F2F" stroke="#6EE7B7" strokeWidth="1.5" />
            <text x="412" y="315" fontSize="10" fill="#A3C4AC">En progreso</text>
            <circle cx="490" cy="310" r="6" fill="rgba(110,231,183,0.1)" stroke="#6EE7B7" strokeWidth="1" />
            <text x="502" y="315" fontSize="10" fill="#A3C4AC">Sin comenzar</text>
          </svg>
        </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   AI CLASS STUDIO
───────────────────────────────────────────── */
function AIClassStudio() {
  const outputs = [
    { icon: "📝", label: "Apuntes organizados" },
    { icon: "🗂️", label: "Flashcards" },
    { icon: "❓", label: "Quiz" },
    { icon: "🤖", label: "Tutor IA actualizado" },
    { icon: "📅", label: "Plan de estudio" },
  ];

  return (
    <section style={{ padding: "96px 24px", background: "#FFFFFF" }}>
      <div className="mn-2col" style={{ maxWidth: 1120, margin: "0 auto" }}>
        {/* Texto */}
        <div>
          <span className="mn-badge mn-badge-green" style={{ marginBottom: 20, display: "inline-flex" }}>
            <Mic size={12} /> AI Class Studio
          </span>
          <h2 className="font-display" style={{ fontSize: "clamp(26px, 4vw, 42px)", fontWeight: 800, color: "#1A1612", letterSpacing: "-0.02em", lineHeight: 1.15, marginBottom: 20 }}>
            Convierte cualquier clase en todo tu material de estudio.
          </h2>
          <p style={{ fontSize: 16, color: "#6B6259", lineHeight: 1.75, marginBottom: 28 }}>
            Graba directamente desde Mnemora o sube un archivo de audio. En minutos, tu clase se convierte en apuntes, flashcards, quiz y más — y tu tutor ya sabe exactamente qué se vio.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 32 }}>
            {[
              "Graba en vivo desde la app o sube un audio",
              "Transcripción automática del contenido",
              "Detecta conceptos, fórmulas, fechas y tareas",
              "Actualiza tu calendario y plan de estudio",
            ].map(f => (
              <div key={f} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <Check size={16} color="#1B3F2F" style={{ marginTop: 2, flexShrink: 0 }} />
                <span style={{ fontSize: 14, color: "#3D352E" }}>{f}</span>
              </div>
            ))}
          </div>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 8, background: "#0F0A04", fontSize: 12, fontWeight: 700, color: "#FCD34D" }}>
            ⭐ Incluido en Plan Premium
          </span>
        </div>

        {/* Visual flow */}
        <div style={{ background: "#1B3F2F", borderRadius: 24, padding: 32, boxShadow: "0 16px 60px rgba(27,63,47,0.22)", display: "flex", flexDirection: "column", alignItems: "center", gap: 0 }}>
          {/* Input */}
          <div style={{ width: "100%", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(110,231,183,0.3)", borderRadius: 14, padding: "14px 18px", display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(110,231,183,0.15)", border: "1px solid rgba(110,231,183,0.3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Mic size={16} color="#6EE7B7" />
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#FFFFFF", margin: 0 }}>Grabación o archivo de audio</p>
              <p style={{ fontSize: 11, color: "#86EFAC", margin: 0, marginTop: 2 }}>Clase de Cálculo II · 47 min</p>
            </div>
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 6, background: "rgba(110,231,183,0.15)" }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#6EE7B7" }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: "#6EE7B7" }}>Listo</span>
            </div>
          </div>

          {/* Arrow down */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "12px 0" }}>
            {[0,1,2].map(i => <div key={i} style={{ width: 1.5, height: 8, background: `rgba(110,231,183,${0.3 + i * 0.2})` }} />)}
            <div style={{ fontSize: 14, color: "#6EE7B7" }}>↓</div>
          </div>

          {/* Processing */}
          <div style={{ width: "100%", background: "rgba(110,231,183,0.1)", border: "1px solid rgba(110,231,183,0.25)", borderRadius: 14, padding: "14px 18px", display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "#6EE7B7", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Brain size={16} color="#1B3F2F" />
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#FFFFFF", margin: 0 }}>Mnemora analiza el contenido</p>
              <p style={{ fontSize: 11, color: "#86EFAC", margin: 0, marginTop: 2 }}>Transcripción · extracción · organización</p>
            </div>
          </div>

          {/* Arrow down */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "12px 0" }}>
            {[0,1,2].map(i => <div key={i} style={{ width: 1.5, height: 8, background: `rgba(110,231,183,${0.3 + i * 0.2})` }} />)}
            <div style={{ fontSize: 14, color: "#6EE7B7" }}>↓</div>
          </div>

          {/* Outputs grid */}
          <div style={{ width: "100%", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {outputs.map((o, i) => (
              <div key={o.label} style={{
                background: "rgba(255,255,255,0.06)",
                border: "0.5px solid rgba(255,255,255,0.1)",
                borderRadius: 10,
                padding: "10px 14px",
                display: "flex",
                alignItems: "center",
                gap: 8,
                gridColumn: i === 4 ? "1 / -1" : undefined,
              }}>
                <span style={{ fontSize: 16 }}>{o.icon}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#D1FAE5" }}>{o.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   RECORRIDO DEL ESTUDIANTE
───────────────────────────────────────────── */
function StudentJourney() {
  const phases = [
    { title: "Organiza", num: "01", items: [{ icon: <FileText size={15} color="var(--mn-ink-2)" />, label: "Sube tus apuntes" }, { icon: <Upload size={15} color="var(--mn-ink-2)" />, label: "Graba o sube clases en audio" }, { icon: <BookOpen size={15} color="var(--mn-ink-2)" />, label: "Biblioteca inteligente" }] },
    { title: "Aprende", num: "02", items: [{ icon: <Layers size={15} color="var(--mn-ink-2)" />, label: "Flashcards inteligentes" }, { icon: <Brain size={15} color="var(--mn-ink-2)" />, label: "Tutor IA" }, { icon: <ClipboardCheck size={15} color="var(--mn-ink-2)" />, label: "Quizzes automáticos" }] },
    { title: "Mejora",  num: "03", items: [{ icon: <GitBranch size={15} color="var(--mn-ink-2)" />, label: "Mapas mentales" }, { icon: <BarChart2 size={15} color="var(--mn-ink-2)" />, label: "Perfil cognitivo" }, { icon: <Map size={15} color="var(--mn-ink-2)" />, label: "Objetivos por materia" }] },
    { title: "Domina",  num: "04", items: [{ icon: <Trophy size={15} color="var(--mn-ink-2)" />, label: "Modo examen intensivo" }, { icon: <TrendingUp size={15} color="var(--mn-ink-2)" />, label: "Predicción de nota" }, { icon: <RefreshCw size={15} color="var(--mn-ink-2)" />, label: "XP y logros académicos" }] },
  ];

  return (
    <section id="funciones" style={{ padding: "96px 24px", background: "#FFFFFF" }}>
      <div style={{ maxWidth: 1120, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <h2 className="font-display" style={{ fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 800, color: "#1A1612", letterSpacing: "-0.02em", lineHeight: 1.15, marginBottom: 16 }}>
            Todo el semestre, en una sola app
          </h2>
          <p style={{ color: "#6B6259", fontSize: 17 }}>El recorrido completo desde que subes el primer apunte hasta que apruebas el final.</p>
        </div>
        <div className="mn-4col">
          {phases.map((phase, pi) => (
            <div key={phase.title} style={{ background: "var(--mn-surface)", borderRadius: 20, padding: 24, border: "1.5px solid var(--mn-ink-4)", position: "relative" }}>
              {pi < phases.length - 1 && (
                <div style={{ position: "absolute", top: "50%", right: -12, width: 24, height: 24, borderRadius: "50%", background: "var(--mn-raised)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, zIndex: 1 }}>→</div>
              )}
              <p style={{ fontSize: 10, fontWeight: 800, color: "var(--mn-ink-3)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>{phase.num}</p>
              <h3 className="font-display" style={{ fontSize: 22, fontWeight: 900, color: "var(--mn-ink-1)", marginBottom: 20 }}>{phase.title}</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {phase.items.map(item => (
                  <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--mn-canvas)", borderRadius: 10, padding: "10px 14px" }}>
                    {item.icon}
                    <span style={{ fontSize: 13, fontWeight: 600, color: "var(--mn-ink-2)" }}>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   FLUJO COMPLETO
───────────────────────────────────────────── */
function FlowDiagram() {
  const steps = [
    { icon: "📄", label: "Subes apuntes o grabas tu clase" },
    { icon: "🤖", label: "La IA analiza el contenido" },
    { icon: "🃏", label: "Genera flashcards y quizzes" },
    { icon: "🗺", label: "Construye el mapa mental" },
    { icon: "🎯", label: "Rastrea tus objetivos" },
    { icon: "⚡", label: "Te dice qué estudiar hoy" },
    { icon: "📊", label: "Predice tu rendimiento" },
  ];

  return (
    <section style={{ padding: "80px 24px", background: "#F7F4EF" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <h2 className="font-display" style={{ fontSize: "clamp(24px, 3.5vw, 38px)", fontWeight: 800, color: "#1A1612", letterSpacing: "-0.02em", marginBottom: 12 }}>¿Cómo funciona Mnemora?</h2>
          <p style={{ color: "#6B6259", fontSize: 16 }}>Tu primer resultado en menos de 5 minutos.</p>
        </div>
        <div className="mn-flow-steps" style={{ display: "flex", alignItems: "center", justifyContent: "center", flexWrap: "wrap" }}>
          {steps.map((step, i) => (
            <div key={step.label} className="mn-flow-step" style={{ display: "flex", alignItems: "center" }}>
              <div className="mn-flow-step-inner" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "0 8px" }}>
                <div style={{ width: 52, height: 52, borderRadius: 14, background: i === 5 ? "#1B3F2F" : "#FFFFFF", border: i === 5 ? "none" : "0.5px solid rgba(26,22,18,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, boxShadow: i === 5 ? "0 4px 20px rgba(27,63,47,0.3)" : "0 2px 8px rgba(26,22,18,0.06)", flexShrink: 0 }}>
                  {step.icon}
                </div>
                <p style={{ fontSize: 12, fontWeight: 600, color: i === 5 ? "#1B3F2F" : "#3D352E", textAlign: "center", maxWidth: 90, lineHeight: 1.3 }}>{step.label}</p>
              </div>
              {i < steps.length - 1 && <div className="mn-flow-arrow" style={{ width: 24, height: 1, background: "rgba(26,22,18,0.15)", flexShrink: 0, marginBottom: 28 }} />}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   COMPARACIÓN
───────────────────────────────────────────── */
function Comparison() {
  const rows = [
    { feature: "Trabaja mientras no estudias",         mnemora: true,  chatgpt: false, quizlet: false, highlight: true },
    { feature: "Recuerda tu progreso entre sesiones",  mnemora: true,  chatgpt: false, quizlet: false, highlight: false },
    { feature: "Tutor IA en español universitario",    mnemora: true,  chatgpt: true,  quizlet: false, highlight: false },
    { feature: "Flashcards automáticas desde PDF",     mnemora: true,  chatgpt: false, quizlet: true,  highlight: false },
    { feature: "Transcripción de clases con IA",       mnemora: true,  chatgpt: false, quizlet: false, highlight: false },
    { feature: "Roadmap personalizado por materia",    mnemora: true,  chatgpt: false, quizlet: false, highlight: false },
    { feature: "Perfil cognitivo y puntos débiles",    mnemora: true,  chatgpt: false, quizlet: false, highlight: false },
    { feature: "Mapa mental automático",               mnemora: true,  chatgpt: false, quizlet: false, highlight: false },
    { feature: "Predicción de rendimiento",            mnemora: true,  chatgpt: false, quizlet: false, highlight: false },
    { feature: "Modo examen intensivo",                mnemora: true,  chatgpt: false, quizlet: false, highlight: false },
    { feature: "Resumen semanal por email",            mnemora: true,  chatgpt: false, quizlet: false, highlight: false },
  ];

  return (
    <section style={{ padding: "96px 24px", background: "#FFFFFF" }}>
      <div style={{ maxWidth: 820, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <h2 className="font-display" style={{ fontSize: "clamp(26px, 4vw, 40px)", fontWeight: 800, color: "#1A1612", letterSpacing: "-0.02em", marginBottom: 12 }}>Mnemora vs. otras herramientas</h2>
          <p style={{ color: "#6B6259", fontSize: 16 }}>No atacamos a nadie — solo mostramos la diferencia.</p>
        </div>
        <div className="mn-comparison-wrap">
          {/* Desktop table */}
          <div className="mn-comparison-desktop">
            <div className="mn-comparison-table" style={{ display: "grid", gridTemplateColumns: "1fr 120px 120px 120px", background: "#F7F4EF", padding: "16px 24px", borderBottom: "0.5px solid rgba(26,22,18,0.08)" }}>
              <div />
              {[{ name: "Mnemora", highlight: true }, { name: "ChatGPT", highlight: false }, { name: "Quizlet", highlight: false }].map(({ name, highlight }) => (
                <div key={name} style={{ textAlign: "center" }}>
                  <p style={{ fontSize: 13, fontWeight: 800, color: highlight ? "#1B3F2F" : "#6B6259" }}>{name}</p>
                  {highlight && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#1B3F2F", margin: "4px auto 0" }} />}
                </div>
              ))}
            </div>
            {rows.map((row, i) => (
              <div key={row.feature} className="mn-comparison-table" style={{ display: "grid", gridTemplateColumns: "1fr 120px 120px 120px", padding: "14px 24px", borderBottom: i < rows.length - 1 ? "0.5px solid rgba(26,22,18,0.06)" : "none", background: row.highlight ? "#F0FDF4" : i % 2 === 0 ? "#FFFFFF" : "#FAFAF8" }}>
                <span style={{ fontSize: 14, color: row.highlight ? "#1B3F2F" : "#3D352E", paddingRight: 16, fontWeight: row.highlight ? 700 : 400 }}>{row.feature}</span>
                {[row.mnemora, row.chatgpt, row.quizlet].map((has, ci) => (
                  <div key={ci} style={{ textAlign: "center" }}><span style={{ fontSize: 18 }}>{has ? "✅" : "❌"}</span></div>
                ))}
              </div>
            ))}
          </div>

          {/* Mobile: card list */}
          <div className="mn-comparison-mobile" style={{ display: "none", flexDirection: "column", gap: 8 }}>
            {/* Header chips */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 60px 60px 60px", gap: 4, padding: "10px 16px", background: "#F7F4EF", borderRadius: 16, marginBottom: 4 }}>
              <div />
              {[{ name: "Mnemora", highlight: true }, { name: "ChatGPT", highlight: false }, { name: "Quizlet", highlight: false }].map(({ name, highlight }) => (
                <div key={name} style={{ textAlign: "center" }}>
                  <p style={{ fontSize: 11, fontWeight: 800, color: highlight ? "#1B3F2F" : "#6B6259", lineHeight: 1.2 }}>{name}</p>
                </div>
              ))}
            </div>
            {rows.map((row, i) => (
              <div key={row.feature} style={{ display: "grid", gridTemplateColumns: "1fr 60px 60px 60px", gap: 4, padding: "12px 16px", borderRadius: 12, background: row.highlight ? "#F0FDF4" : i % 2 === 0 ? "#FFFFFF" : "#FAFAF8", border: row.highlight ? "0.5px solid #BBF7D0" : "0.5px solid rgba(26,22,18,0.06)", alignItems: "center" }}>
                <span style={{ fontSize: 13, color: row.highlight ? "#1B3F2F" : "#3D352E", fontWeight: row.highlight ? 700 : 400, lineHeight: 1.3 }}>{row.feature}</span>
                {[row.mnemora, row.chatgpt, row.quizlet].map((has, ci) => (
                  <div key={ci} style={{ textAlign: "center" }}><span style={{ fontSize: 16 }}>{has ? "✅" : "❌"}</span></div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   PRECIOS
───────────────────────────────────────────── */
function Pricing() {
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");

  return (
    <section id="precios" style={{ padding: "96px 24px", background: "#F7F4EF" }}>
      <div style={{ maxWidth: 1120, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <h2 className="font-display" style={{ fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 800, color: "#1A1612", letterSpacing: "-0.02em", lineHeight: 1.15, marginBottom: 16 }}>
            Elige tu plan
          </h2>
          <p style={{ color: "#6B6259", fontSize: 17, marginBottom: 28 }}>Empieza gratis, sin tarjeta. Elige el plan que más te sirve cuando estés listo.</p>
          {/* Toggle */}
          <div style={{ display: "inline-flex", background: "#EDE9E2", borderRadius: 12, padding: 4, gap: 2 }}>
            {(["monthly", "annual"] as const).map(b => (
              <button key={b} onClick={() => setBilling(b)} style={{ padding: "8px 20px", borderRadius: 9, border: "none", background: billing === b ? "#FFFFFF" : "transparent", color: billing === b ? "#1A1612" : "#6B6259", fontSize: 14, fontWeight: billing === b ? 700 : 400, cursor: "pointer", boxShadow: billing === b ? "0 1px 4px rgba(26,22,18,0.08)" : "none", transition: "all 150ms" }}>
                {b === "monthly" ? "Mensual" : "Anual"}
                {b === "annual" && <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 700, color: "#059669", background: "#D1FAE5", padding: "2px 7px", borderRadius: 6 }}>Ahorra hasta $30</span>}
              </button>
            ))}
          </div>
        </div>

        <div className="mn-pricing-grid">

          {/* STARTER */}
          <div className="mn-card" style={{ padding: 32 }}>
            <h3 className="font-display" style={{ fontSize: 20, fontWeight: 800, color: "#1A1612", marginBottom: 4 }}>Starter</h3>
            <p style={{ fontSize: 13, color: "#6B6259", marginBottom: 24 }}>Para explorar Mnemora</p>
            <div style={{ marginBottom: 28 }}>
              <span className="font-display" style={{ fontSize: 44, fontWeight: 800, color: "#1A1612" }}>$0</span>
              <span style={{ fontSize: 14, color: "#9E9389", marginLeft: 6 }}>para siempre</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 28 }}>
              {["1 materia activa", "1 programa de materia / mes", "30 flashcards / mes", "3 resúmenes / mes", "20 mensajes al tutor / mes"].map(f => (
                <div key={f} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <Check size={15} color="#9E9389" />
                  <span style={{ fontSize: 14, color: "#6B6259" }}>{f}</span>
                </div>
              ))}
            </div>
            <Link href="/registro" style={{ display: "block", textAlign: "center", padding: "13px", borderRadius: 12, border: "1.5px solid rgba(26,22,18,0.14)", fontSize: 15, fontWeight: 700, color: "#1A1612", textDecoration: "none" }}>
              Crear cuenta gratis
            </Link>
          </div>

          {/* PRO */}
          <div className="mn-card" style={{ padding: 32, background: "#1B3F2F", border: "none", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 16, right: 16, background: "#6EE7B7", borderRadius: 20, padding: "4px 12px", fontSize: 11, fontWeight: 800, color: "#1B3F2F" }}>⭐ Más popular</div>
            <h3 className="font-display" style={{ fontSize: 20, fontWeight: 800, color: "#FFFFFF", marginBottom: 4 }}>Pro</h3>
            <p style={{ fontSize: 13, color: "#86EFAC", marginBottom: 24 }}>Todo lo que necesitas para el semestre</p>
            {billing === "monthly" ? (
              <div style={{ marginBottom: 28 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                  <span className="font-display" style={{ fontSize: 44, fontWeight: 800, color: "#FFFFFF" }}>$9.99</span>
                  <span style={{ color: "#86EFAC", fontSize: 14 }}>/mes</span>
                </div>
              </div>
            ) : (
              <div style={{ marginBottom: 28 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                  <span className="font-display" style={{ fontSize: 44, fontWeight: 800, color: "#FFFFFF" }}>$89</span>
                  <span style={{ color: "#86EFAC", fontSize: 14 }}>/año</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
                  <span style={{ fontSize: 12, color: "#6EE7B7", background: "rgba(110,231,183,0.15)", padding: "3px 8px", borderRadius: 6, fontWeight: 700 }}>⭐ Ahorras $30 al año</span>
                </div>
                <p style={{ fontSize: 12, color: "#86EFAC", marginTop: 4 }}>Equivale a $7.42/mes</p>
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 28 }}>
              {["Materias ilimitadas", "Flashcards y resúmenes ilimitados", "Tutor con memoria entre sesiones", "Mapa mental automático", "Planificador diario personalizado", "Quiz automático", "Soporte prioritario"].map(f => (
                <div key={f} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <Check size={15} color="#86EFAC" />
                  <span style={{ fontSize: 14, color: "#D1FAE5" }}>{f}</span>
                </div>
              ))}
            </div>
            <Link href={billing === "monthly" ? "https://pay.hotmart.com/X106608100N?off=dc4u4ck4" : "https://pay.hotmart.com/X106608100N?off=rglfytvv"} target="_blank" rel="noopener noreferrer" style={{ display: "block", textAlign: "center", padding: "14px", borderRadius: 12, background: "#FFFFFF", fontSize: 15, fontWeight: 700, color: "#1B3F2F", textDecoration: "none" }}>
              Obtener Pro — cobro inmediato
            </Link>
            <p style={{ textAlign: "center", fontSize: 12, color: "#86EFAC", marginTop: 12, lineHeight: 1.5 }}>
              Cobro inmediato al confirmar. Cancela cuando quieras.
            </p>
          </div>

          {/* PREMIUM */}
          <div className="mn-card" style={{ padding: 32, background: "#0F0A04", border: "none", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 16, right: 16, background: "rgba(255,255,255,0.12)", borderRadius: 20, padding: "4px 12px", fontSize: 11, fontWeight: 700, color: "#fff" }}>Máximo potencial</div>
            <h3 className="font-display" style={{ fontSize: 20, fontWeight: 800, color: "#FFFFFF", marginBottom: 4 }}>Premium</h3>
            <p style={{ fontSize: 13, color: "#FCD34D", marginBottom: 24 }}>Tu entrenador académico personal</p>
            {billing === "monthly" ? (
              <div style={{ marginBottom: 28 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                  <span className="font-display" style={{ fontSize: 44, fontWeight: 800, color: "#FFFFFF" }}>$14.99</span>
                  <span style={{ color: "#FDE68A", fontSize: 14 }}>/mes</span>
                </div>
              </div>
            ) : (
              <div style={{ marginBottom: 28 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                  <span className="font-display" style={{ fontSize: 44, fontWeight: 800, color: "#FFFFFF" }}>$159</span>
                  <span style={{ color: "#FDE68A", fontSize: 14 }}>/año</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
                  <span style={{ fontSize: 12, color: "#FCD34D", background: "rgba(245,158,11,0.2)", padding: "3px 8px", borderRadius: 6, fontWeight: 700 }}>⭐ Ahorras $20 al año</span>
                </div>
                <p style={{ fontSize: 12, color: "#FDE68A", marginTop: 4 }}>Equivale a $13.25/mes</p>
              </div>
            )}
            <p style={{ fontSize: 12, fontWeight: 700, color: "#F59E0B", marginBottom: 10 }}>Todo lo de Pro, más:</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 28 }}>
              {[
                { label: "AI Class Studio (graba o sube audio)", star: true },
                { label: "Coach académico IA", star: true },
                { label: "Tutor ilimitado", star: true },
                { label: "Modo examen intensivo", star: false },
                { label: "Predicción de nota", star: true },
                { label: "Estrategias personalizadas", star: true },
                { label: "Cobertura inteligente del examen", star: true },
                { label: "Perfil cognitivo avanzado", star: true },
              ].map(({ label, star }) => (
                <div key={label} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <Check size={15} color={star ? "#F59E0B" : "#FDE68A"} />
                  <span style={{ fontSize: 14, color: star ? "#FEF3C7" : "#FDE68A", fontWeight: star ? 600 : 400 }}>{label}</span>
                </div>
              ))}
            </div>
            <Link href={billing === "monthly" ? "https://pay.hotmart.com/X106608100N?off=ob9wndyf" : "https://pay.hotmart.com/X106608100N?off=5k6odu6s"} target="_blank" rel="noopener noreferrer" style={{ display: "block", textAlign: "center", padding: "14px", borderRadius: 12, background: "var(--mn-green)", fontSize: 15, fontWeight: 700, color: "#fff", textDecoration: "none" }}>
              Obtener Premium — cobro inmediato
            </Link>
            <p style={{ textAlign: "center", fontSize: 12, color: "#FCD34D", marginTop: 12, lineHeight: 1.5 }}>
              Cobro inmediato al confirmar. Cancela cuando quieras.
            </p>
          </div>

        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   REFERIDOS
───────────────────────────────────────────── */
function Referrals() {
  const milestones = [
    { count: 1,  icon: "🥉", label: "1 semana gratis",              desc: "1 referido" },
    { count: 3,  icon: "🥈", label: "1 mes gratis",                 desc: "3 referidos" },
    { count: 5,  icon: "🥇", label: "2 meses gratis",               desc: "5 referidos" },
    { count: 10, icon: "💎", label: "6 meses gratis",               desc: "10 referidos" },
    { count: 25, icon: "👑", label: "12 meses + Insignia Embajador", desc: "25 referidos" },
  ];

  return (
    <section id="recompensas" style={{ padding: "96px 24px", background: "#FFFFFF" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 14px", borderRadius: 20, background: "#E8F1EC", fontSize: 12, fontWeight: 700, color: "#1B3F2F", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 20 }}>
            🎁 Recompensas Mnemora
          </span>
          <h2 className="font-display" style={{ fontSize: "clamp(26px, 4vw, 42px)", fontWeight: 800, color: "#1A1612", letterSpacing: "-0.02em", lineHeight: 1.15, marginBottom: 16 }}>
            Invita amigos.{" "}<span style={{ color: "#1B3F2F" }}>Estudia gratis.</span>
          </h2>
          <p style={{ color: "#6B6259", fontSize: 16, maxWidth: 520, margin: "0 auto", lineHeight: 1.65 }}>
            Cada amigo que invite y active un plan te suma tiempo gratis en Mnemora.
          </p>
        </div>

        {/* Milestone cards */}
        <div className="mn-5col" style={{ marginBottom: 40 }}>
          {milestones.map((m, i) => (
            <div key={m.count} style={{ background: "#F7F4EF", borderRadius: 16, padding: "20px 16px", textAlign: "center", border: "0.5px solid rgba(26,22,18,0.08)", position: "relative" }}>
              {i < milestones.length - 1 && (
                <div style={{ position: "absolute", top: "50%", right: -8, fontSize: 12, color: "#C4BAAE", transform: "translateY(-50%)", zIndex: 1 }}>→</div>
              )}
              <div style={{ fontSize: 32, marginBottom: 8 }}>{m.icon}</div>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#9E9389", marginBottom: 4 }}>{m.desc}</p>
              <p style={{ fontSize: 12, fontWeight: 800, color: "#1A1612", lineHeight: 1.3 }}>{m.label}</p>
            </div>
          ))}
        </div>

        <div style={{ textAlign: "center" }}>
          <p style={{ fontSize: 14, color: "#9E9389", marginBottom: 24 }}>
            ❤️ Cada referido que activa un plan te suma tiempo gratis.
          </p>
          <Link href="/registro" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "14px 32px", borderRadius: 12, background: "#1B3F2F", color: "#fff", fontSize: 15, fontWeight: 700, textDecoration: "none" }}>
            Empieza y comparte tu enlace <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   GARANTÍA
───────────────────────────────────────────── */
function Proof() {
  return (
    <section style={{ padding: "80px 24px", background: "#F7F4EF" }}>
      <div style={{ maxWidth: 1120, margin: "0 auto" }}>
        <div className="mn-3col" style={{ alignItems: "stretch" }}>
          <div className="mn-card" style={{ padding: 32, background: "#1B3F2F" }}>
            <Shield size={32} color="#86EFAC" style={{ marginBottom: 16 }} />
            <h3 className="font-display" style={{ fontSize: 22, fontWeight: 800, color: "#FFFFFF", marginBottom: 12 }}>Garantía de 30 días</h3>
            <p style={{ color: "#D1FAE5", fontSize: 15, lineHeight: 1.7 }}>Si en los primeros 30 días Mnemora no te ayudó a estudiar mejor, te devolvemos el 100% de tu dinero. Sin preguntas, sin burocracia.</p>
          </div>
          <div className="mn-card" style={{ padding: 32 }}>
            <h3 className="font-display" style={{ fontSize: 18, fontWeight: 800, color: "#1A1612", marginBottom: 20 }}>El problema es real y enorme</h3>
            {[
              { stat: "92%", desc: "de estudiantes LATAM ya usan IA para estudiar" },
              { stat: "0",   desc: "apps en español con tutor + memoria + planner combinados" },
              { stat: "6M",  desc: "usuarios de StudyFetch en EE.UU. — no existe en LATAM" },
            ].map(({ stat, desc }) => (
              <div key={stat} style={{ display: "flex", alignItems: "center", gap: 16, paddingBottom: 16, borderBottom: "0.5px solid rgba(26,22,18,0.06)", marginBottom: 16 }}>
                <span className="font-display" style={{ fontSize: 28, fontWeight: 800, color: "#1B3F2F", minWidth: 60 }}>{stat}</span>
                <span style={{ fontSize: 14, color: "#6B6259" }}>{desc}</span>
              </div>
            ))}
          </div>
          <div className="mn-card" style={{ padding: 32 }}>
            <Users size={28} color="#1B3F2F" style={{ marginBottom: 16 }} />
            <h3 className="font-display" style={{ fontSize: 18, fontWeight: 800, color: "#1A1612", marginBottom: 16 }}>Construido para la universidad</h3>
            <p style={{ fontSize: 14, color: "#6B6259", lineHeight: 1.7, marginBottom: 20 }}>Desarrollado escuchando a estudiantes de Ingeniería, Medicina, Derecho y Administración en Argentina, México y Colombia.</p>
            {["Extracción de programa validada con 12+ formatos", "Tutor en español con contexto académico real", "Planificador calibrado para la carga universitaria LATAM"].map(item => (
              <div key={item} style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                <Check size={16} color="#1B3F2F" style={{ marginTop: 2, flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: "#6B6259" }}>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   FAQ
───────────────────────────────────────────── */
const faqs = [
  { q: "¿Necesito saber usar IA?", a: "No. Solo sube tus documentos y Mnemora hace el resto. No hay comandos, no hay prompts, no hay configuración." },
  { q: "¿Puedo cancelar cuando quiera?", a: "Sí. La suscripción se puede cancelar en cualquier momento desde tu cuenta, sin formularios ni llamadas." },
  { q: "¿Necesito tarjeta para empezar?", a: "No. El plan Free es permanente y no requiere tarjeta ni datos de pago. Solo necesitas una tarjeta si decides actualizar a Pro o Premium." },
  { q: "¿Mis documentos son privados?", a: "Sí. Solo tú puedes acceder a ellos. No usamos tu contenido para entrenar modelos de IA." },
  { q: "¿En qué idioma funciona el tutor?", a: "100% en español. Entiende vocabulario académico latinoamericano, nombres de materias en español y el formato de las universidades de la región." },
  { q: "¿Qué formatos de documentos acepta?", a: "PDF (el más común para programas de materia y apuntes), texto copiado directamente, e imágenes de apuntes. No requiere formato especial." },
  { q: "¿Qué es AI Class Studio?", a: "Es la función que convierte tus clases en material de estudio completo. Puedes grabar directamente desde Mnemora o subir un archivo de audio. La IA transcribe la clase, extrae conceptos, fórmulas, fechas y tareas, genera flashcards y quiz, actualiza tu calendario y le informa a tu tutor qué se vio. Disponible en Plan Premium." },
  { q: "¿Cómo funciona la memoria del tutor?", a: "Mnemora guarda un resumen semántico de cada sesión de estudio por materia. Cuando vuelves, el tutor sabe qué temas viste, cuáles te costaron más y qué hay próximo en tu calendario." },
  { q: "¿Cuál es la diferencia entre Pro y Premium?", a: "Pro incluye todo lo que necesitas para estudiar: tutor con memoria, flashcards, mapas mentales, quiz y planificador. Premium agrega predicción de nota, perfil cognitivo avanzado, modo examen intensivo, cobertura inteligente del examen y el AI Coach personalizado." },
  { q: "¿Cómo funciona el programa de Recompensas?", a: "Cada amigo que invites y active un plan te suma tiempo gratis en Mnemora: 1 referido = 1 semana, 3 = 1 mes, 5 = 2 meses, 10 = 6 meses, 25 = 12 meses + Insignia Embajador." },
];

function FAQ() {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <section style={{ padding: "80px 24px", background: "#FFFFFF" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <h2 className="font-display" style={{ fontSize: "clamp(24px, 3.5vw, 38px)", fontWeight: 800, color: "#1A1612", letterSpacing: "-0.02em", textAlign: "center", marginBottom: 48 }}>Preguntas frecuentes</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {faqs.map(({ q, a }, i) => (
            <div key={q} className="mn-card" style={{ padding: 0, overflow: "hidden" }}>
              <button onClick={() => setOpen(open === i ? null : i)} style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 24px", background: "none", border: "none", cursor: "pointer", textAlign: "left", gap: 16 }}>
                <span style={{ fontSize: 15, fontWeight: 600, color: "#1A1612" }}>{q}</span>
                <ChevronDown size={18} color="#6B6259" style={{ flexShrink: 0, transform: open === i ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 200ms" }} />
              </button>
              {open === i && <div style={{ padding: "0 24px 18px", fontSize: 14, color: "#6B6259", lineHeight: 1.7 }}>{a}</div>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   CTA FINAL
───────────────────────────────────────────── */
function FinalCTA() {
  return (
    <section style={{ padding: "96px 24px", background: "#1B3F2F" }}>
      <div style={{ maxWidth: 680, margin: "0 auto", textAlign: "center" }}>
        <h2 className="font-display" style={{ fontSize: "clamp(28px, 5vw, 52px)", fontWeight: 800, color: "#FFFFFF", letterSpacing: "-0.02em", lineHeight: 1.1, marginBottom: 20 }}>
          Empieza a estudiar
          <br />
          <span style={{ color: "#86EFAC" }}>de forma inteligente</span>
        </h2>
        <p style={{ color: "#D1FAE5", fontSize: 17, marginBottom: 40, lineHeight: 1.6 }}>
          El tutor que recuerda todo lo que estudias — listo en 5 minutos.
        </p>
        <Link href="/registro" className="mn-btn-primary" style={{ fontSize: 17, padding: "18px 40px", background: "#FFFFFF", color: "#1B3F2F" }}>
          Crear mi cuenta gratis
          <ArrowRight size={18} />
        </Link>
        <p style={{ marginTop: 20, color: "#6EE7B7", fontSize: 13 }}>
          Garantía de 30 días · cancela cuando quieras
        </p>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   FOOTER
───────────────────────────────────────────── */
function Footer() {
  return (
    <footer style={{ background: "#111810", padding: "40px 24px" }}>
      <div className="mn-footer-inner" style={{ maxWidth: 1120, margin: "0 auto", display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Logo size={28} />
          <span className="font-display" style={{ fontWeight: 800, fontSize: 16, color: "#FFFFFF" }}>Mnemora</span>
        </div>
        <div style={{ textAlign: "center" }}>
          <p style={{ fontSize: 13, color: "#6B6259" }}>© 2026 Mnemora · Hecho para estudiantes de Latinoamérica</p>
          <p style={{ fontSize: 12, color: "#4B5563", marginTop: 4, fontStyle: "italic" }}>Creado para estudiantes que quieren estudiar mejor, no más.</p>
        </div>
        <div style={{ display: "flex", gap: 20 }}>
          {[{ label: "Términos", href: "/terminos" }, { label: "Privacidad", href: "/privacidad" }, { label: "Contacto", href: "/contacto" }, { label: "Recompensas", href: "/#recompensas" }].map(({ label, href }) => (
            <Link key={label} href={href} style={{ fontSize: 13, color: "#6B6259", textDecoration: "none" }}>{label}</Link>
          ))}
        </div>
      </div>
    </footer>
  );
}

/* ─────────────────────────────────────────────
   PAGE ROOT
───────────────────────────────────────────── */
export default function LandingPage() {
  return (
    <main>
      <LandingStyles />
      <Nav />
      <Hero />
      <Strip />
      <WhyDifferent />
      <TutorShowcase />
      <FlashcardShowcase />
      <MindMapShowcase />
      <AIClassStudio />
      <StudentJourney />
      <FlowDiagram />
      <Comparison />
      <Pricing />
      <Referrals />
      <Proof />
      <FAQ />
      <FinalCTA />
      <Footer />
    </main>
  );
}
