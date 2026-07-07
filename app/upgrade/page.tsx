"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useState, useEffect, Suspense } from "react";
import { BookOpen, Check, Shield, Zap, Lock, Star } from "lucide-react";

type PaywallReason = "materia" | "memoria" | "limite" | "syllabus" | "general";

const HEADLINES: Record<PaywallReason, { title: string; desc: string }> = {
  materia:  { title: "Desbloquea materias ilimitadas",     desc: "Con el plan Free puedes tener 1 materia activa. Sube a Pro para organizar todo tu semestre." },
  memoria:  { title: "El tutor con memoria es Pro",         desc: "La memoria académica entre sesiones es la función más poderosa de Mnemora — y es exclusiva de Pro." },
  limite:   { title: "Alcanzaste el límite del plan Free",  desc: "Ya usaste tus preguntas o flashcards del mes. Pro te da acceso sin límites." },
  syllabus: { title: "Programas de materia ilimitados",     desc: "Ya usaste tu extracción gratuita. Pro te permite procesar todos los programas del semestre." },
  general:  { title: "Estudia sin límites",                 desc: "Desbloquea todas las funciones de Mnemora con el plan que mejor se adapte a ti." },
};

const PRO_FEATURES = [
  "Organiza todas tus materias sin límites",
  "Programas de materia, resúmenes y flashcards ilimitados",
  "500 preguntas al tutor por mes",
  "El tutor te recuerda entre sesiones — no empiezas de cero",
  "Tus fechas de examen en el calendario automáticamente",
  "Sabes exactamente qué estudiar cada día",
  "Ve tu progreso en cada materia",
  "Visualiza los conceptos clave de tus documentos",
  "La IA analiza tus sesiones y mejora tus flashcards",
];

const PREMIUM_FEATURES = [
  "Todo lo de Pro, más:",
  "Pregunta al tutor sin límites",
  "La IA reorganiza tu agenda cuando se acerca un examen",
  "Simulacros adaptativos: te pregunta lo que más te cuesta",
  "Modo intensivo: entra en preparación total para el parcial",
  "Fotografía apuntes, ejercicios escritos a mano y pizarrones",
  "Graba la clase y obtén los conceptos clave automáticamente",
  "Conoce tu probabilidad de aprobar antes del examen",
  "Dashboard completo: rendimiento, brechas y tendencias por materia",
  "La IA te muestra qué aprender después según tu avance actual",
  "Ve qué % del examen ya dominas y qué temas te faltan",
  "Tu plan se adapta a tu meta: aprobar, sacar nota o ganar una beca",
  "Si te atrasas, la IA reorganiza todo el semestre automáticamente",
  "Mapas mentales interactivos que cambian según lo que aprendes",
];

// Official prices
const PRO_MONTHLY  = "9,99";
const PRO_ANNUAL   = "7,42";   // $89/año ÷ 12
const PRM_MONTHLY  = "14,99";
const PRM_ANNUAL   = "13,25";  // $159/año ÷ 12

const CHECKOUT_PRO_MONTHLY     = process.env.NEXT_PUBLIC_HOTMART_CHECKOUT_PRO_MONTHLY     ?? "https://pay.hotmart.com/X106608100N?off=dc4u4ck4";
const CHECKOUT_PRO_ANNUAL      = process.env.NEXT_PUBLIC_HOTMART_CHECKOUT_PRO_ANNUAL      ?? "https://pay.hotmart.com/X106608100N?off=rglfytvv";
const CHECKOUT_PREMIUM_MONTHLY = process.env.NEXT_PUBLIC_HOTMART_CHECKOUT_PREMIUM_MONTHLY ?? "https://pay.hotmart.com/X106608100N?off=ob9wndyf";
const CHECKOUT_PREMIUM_ANNUAL  = process.env.NEXT_PUBLIC_HOTMART_CHECKOUT_PREMIUM_ANNUAL  ?? "https://pay.hotmart.com/X106608100N?off=5k6odu6s";

function UpgradeContent() {
  const searchParams = useSearchParams();
  const reason       = (searchParams.get("reason") as PaywallReason) ?? "general";
  const { title, desc } = HEADLINES[reason] ?? HEADLINES.general;

  const [billing, setBilling] = useState<"monthly" | "annual">("annual");
  const [userCount, setUserCount] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/stats").then(r => r.ok ? r.json() : null).then(d => { if (d) setUserCount(d.userCount); }).catch(() => {});
  }, []);
  const isAnnual = billing === "annual";

  const proPrice  = isAnnual ? PRO_ANNUAL  : PRO_MONTHLY;
  const premPrice = isAnnual ? PRM_ANNUAL  : PRM_MONTHLY;
  const referralCoupon = process.env.NEXT_PUBLIC_HOTMART_REFERRAL_COUPON ?? "";
  const withCoupon = (url: string) =>
    url && referralCoupon ? `${url}?offDiscount=${encodeURIComponent(referralCoupon)}` : url;
  const proUrl    = withCoupon(isAnnual ? CHECKOUT_PRO_ANNUAL      : CHECKOUT_PRO_MONTHLY);
  const premUrl   = withCoupon(isAnnual ? CHECKOUT_PREMIUM_ANNUAL  : CHECKOUT_PREMIUM_MONTHLY);
  const checkoutsReady = !!(CHECKOUT_PRO_MONTHLY && CHECKOUT_PRO_ANNUAL && CHECKOUT_PREMIUM_MONTHLY && CHECKOUT_PREMIUM_ANNUAL);

  return (
    <div style={{ minHeight: "100vh", background: "#F7F4EF", display: "flex", flexDirection: "column" }}>
      {/* Nav */}
      <header style={{ padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 28, height: 28, background: "#1B3F2F", borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <BookOpen size={14} color="#fff" />
          </div>
          <span className="font-display" style={{ fontWeight: 800, fontSize: 16, color: "#1A1612" }}>Mnemora</span>
        </div>
        <Link href="/dashboard" style={{ fontSize: 13, color: "#9E9389", textDecoration: "none" }}>
          Volver al dashboard
        </Link>
      </header>

      <div style={{ flex: 1, padding: "24px 24px 48px", maxWidth: 600, margin: "0 auto", width: "100%" }}>

        {/* Headline */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{
            width: 52, height: 52, background: "var(--mn-canvas)", border: "1px solid var(--mn-ink-4)", borderRadius: "var(--mn-r-xl)",
            display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px",
          }}>
            <Lock size={22} color="var(--mn-ink-2)" />
          </div>
          <h1 className="font-display" style={{ fontSize: 26, fontWeight: 800, color: "#1A1612", lineHeight: 1.2, marginBottom: 10 }}>
            {title}
          </h1>
          <p style={{ fontSize: 15, color: "#6B6259", lineHeight: 1.6, maxWidth: 420, margin: "0 auto" }}>
            {desc}
          </p>
        </div>

        {/* Billing toggle */}
        <div style={{ display: "flex", background: "#E8E3DA", borderRadius: 12, padding: 4, marginBottom: 20 }}>
          {(["annual", "monthly"] as const).map(b => (
            <button key={b} onClick={() => setBilling(b)} style={{
              flex: 1, padding: "9px 12px", borderRadius: 9, border: "none", cursor: "pointer",
              fontSize: 13, fontWeight: 700,
              background: billing === b ? "#1B3F2F" : "transparent",
              color: billing === b ? "#F7F4EF" : "#6B6259",
              transition: "all 200ms",
            }}>
              {b === "annual" ? "Anual" : "Mensual"}
              {b === "annual" && (
                <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 700, background: "#D97706", color: "#fff", padding: "2px 6px", borderRadius: 20 }}>
                  −25%
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Pro card */}
        <PlanCard
          name="Pro"
          icon={<Zap size={16} color="#F0C040" fill="#F0C040" />}
          bgColor="#1B3F2F"
          accentColor="#86EFAC"
          subtleColor="#D1FAE5"
          tagline="Herramienta diaria de estudio"
          price={proPrice}
          priceNote={isAnnual ? `$89 USD/año · equivale a $${PRO_ANNUAL}/mes` : `$${PRO_MONTHLY} USD/mes`}
          features={PRO_FEATURES}
          checkoutUrl={proUrl}
          checkoutsReady={checkoutsReady}
          isAnnual={isAnnual}
        />

        {/* Premium card */}
        <PlanCard
          name="Premium"
          icon={<Star size={16} color="#FBBF24" fill="#FBBF24" />}
          bgColor="#1C1108"
          accentColor="#FCD34D"
          subtleColor="#FEF3C7"
          tagline="Tu coach académico personal con IA"
          price={premPrice}
          priceNote={isAnnual ? `$159 USD/año · equivale a $${PRM_ANNUAL}/mes` : `$${PRM_MONTHLY} USD/mes`}
          features={PREMIUM_FEATURES}
          checkoutUrl={premUrl}
          checkoutsReady={checkoutsReady}
          isAnnual={isAnnual}
        />

        {/* Social proof */}
        {userCount !== null && userCount >= 10 && (
          <p style={{ textAlign: "center", fontSize: 13, color: "#6B6259", marginBottom: 20 }}>
            🎓 <strong>{userCount.toLocaleString("es")} estudiantes</strong> ya organizan su semestre con Mnemora
          </p>
        )}

        {/* Guarantee */}
        <div style={{
          padding: "16px 20px", display: "flex", alignItems: "center", gap: 12,
          marginBottom: 20, background: "#EDEAD4", borderRadius: 12,
        }}>
          <Shield size={20} color="#1B3F2F" style={{ flexShrink: 0 }} />
          <p style={{ fontSize: 13, color: "#6B6259", lineHeight: 1.5, margin: 0 }}>
            <strong style={{ color: "#1A1612" }}>Garantía 30 días.</strong>{" "}
            Si no estás satisfecho, te devolvemos el 100% sin preguntas.
          </p>
        </div>

        <div style={{ textAlign: "center" }}>
          <Link href="/dashboard" style={{ fontSize: 13, color: "#9E9389", textDecoration: "none" }}>
            Continuar con plan gratuito →
          </Link>
        </div>
      </div>
    </div>
  );
}

interface PlanCardProps {
  name: string;
  icon: React.ReactNode;
  bgColor: string;
  accentColor: string;
  subtleColor: string;
  tagline: string;
  price: string;
  priceNote: string;
  features: string[];
  checkoutUrl: string;
  checkoutsReady: boolean;
  isAnnual: boolean;
}

function PlanCard({ name, icon, bgColor, accentColor, subtleColor, tagline, price, priceNote, features, checkoutUrl, checkoutsReady, isAnnual }: PlanCardProps) {
  return (
    <div style={{ background: bgColor, borderRadius: 20, padding: "28px 24px", marginBottom: 16, position: "relative", overflow: "hidden" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            {icon}
            <h2 className="font-display" style={{ fontSize: 22, fontWeight: 800, color: "#fff", margin: 0 }}>{name}</h2>
          </div>
          <p style={{ fontSize: 12, color: accentColor, margin: 0 }}>{tagline}</p>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 4, justifyContent: "flex-end" }}>
            <span className="font-display" style={{ fontSize: 32, fontWeight: 800, color: "#fff" }}>${price}</span>
            <span style={{ color: accentColor, fontSize: 13 }}>/mes</span>
          </div>
          <p style={{ fontSize: 11, color: accentColor, margin: 0, opacity: 0.8 }}>{priceNote}</p>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
        {features.map((f, i) => (
          <div key={f} style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {i === 0 && f.includes("Todo lo de")
              ? <span style={{ fontSize: 11, color: accentColor, opacity: 0.7 }}>{f}</span>
              : <>
                  <Check size={13} color={accentColor} />
                  <span style={{ fontSize: 13, color: subtleColor }}>{f}</span>
                </>
            }
          </div>
        ))}
      </div>

      {checkoutsReady ? (
        <a
          href={checkoutUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            padding: "14px", borderRadius: 12, background: "#fff",
            fontSize: 15, fontWeight: 700, color: bgColor, textDecoration: "none", width: "100%",
          }}
        >
          Obtener {name} {isAnnual ? "anual" : "mensual"} — ${price}/mes
        </a>
      ) : (
        <div style={{
          padding: "14px", borderRadius: 12, background: "rgba(255,255,255,0.1)",
          textAlign: "center", fontSize: 14, color: subtleColor,
        }}>
          Pagos disponibles próximamente
        </div>
      )}

      <p style={{ textAlign: "center", fontSize: 11, color: accentColor, marginTop: 10, opacity: 0.7 }}>
        Procesado por Hotmart · cancela cuando quieras
      </p>
    </div>
  );
}

function UpgradePageInner() {
  return (
    <Suspense>
      <UpgradeContent />
    </Suspense>
  );
}

export default function UpgradePage() {
  return <Suspense><UpgradePageInner /></Suspense>;
}
