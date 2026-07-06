"use client";

import { useState } from "react";
import {
  Users, DollarSign, TrendingUp, Zap,
  ArrowUpRight, ArrowDownRight, BookOpen,
  FileText, Brain, Star, AlertCircle,
} from "lucide-react";

/* ─── Mock data — conectar con Supabase en prod ─── */
const STATS = [
  {
    label: "Usuarios totales",
    value: "—",
    mock: 127,
    delta: +23,
    deltaLabel: "este mes",
    icon: <Users size={16} color="#1B3F2F" />,
    iconBg: "#E8F1EC",
    positive: true,
  },
  {
    label: "Suscriptores Pro",
    value: "—",
    mock: 34,
    delta: +8,
    deltaLabel: "este mes",
    icon: <Star size={16} color="#D97706" />,
    iconBg: "#FEF3C7",
    positive: true,
  },
  {
    label: "MRR",
    value: "—",
    mock: "$271",
    delta: +31,
    deltaLabel: "vs mes anterior",
    icon: <DollarSign size={16} color="#16A34A" />,
    iconBg: "#DCFCE7",
    positive: true,
  },
  {
    label: "Conversión free→pro",
    value: "—",
    mock: "26.7%",
    delta: +4.2,
    deltaLabel: "vs mes anterior",
    icon: <TrendingUp size={16} color="#7C3AED" />,
    iconBg: "#EDE9FE",
    positive: true,
  },
];

const RECENT_USERS = [
  { email: "ana.gomez@uba.ar", plan: "pro", date: "hace 2h", country: "AR" },
  { email: "carlos.mv@unam.mx", plan: "free", date: "hace 5h", country: "MX" },
  { email: "sofia.r@puc.cl", plan: "pro", date: "hace 1d", country: "CL" },
  { email: "juan.p@udea.edu.co", plan: "free", date: "hace 1d", country: "CO" },
  { email: "lucia.f@ufmg.br", plan: "pro", date: "hace 2d", country: "BR" },
  { email: "martin.d@unlp.edu.ar", plan: "free", date: "hace 2d", country: "AR" },
  { email: "valeria.s@itesm.mx", plan: "pro", date: "hace 3d", country: "MX" },
];

const USAGE = [
  { label: "Documentos procesados", value: 843, icon: <FileText size={14} color="#6B6259" /> },
  { label: "Flashcards generadas", value: 12480, icon: <Zap size={14} color="#6B6259" /> },
  { label: "Mensajes al tutor", value: 5621, icon: <Brain size={14} color="#6B6259" /> },
  { label: "Syllabuses extraídos", value: 291, icon: <BookOpen size={14} color="#6B6259" /> },
];

const FUNNEL = [
  { label: "Visitas landing", value: 4200, pct: 100 },
  { label: "Iniciaron registro", value: 847, pct: 20.2 },
  { label: "Completaron onboarding", value: 612, pct: 14.6 },
  { label: "Subieron 1 syllabus", value: 387, pct: 9.2 },
  { label: "Activaron Pro", value: 127, pct: 3.0 },
];

const FLAG: Record<string, string> = { AR: "🇦🇷", MX: "🇲🇽", CL: "🇨🇱", CO: "🇨🇴", BR: "🇧🇷" };

export default function AdminPage() {
  const [showMock, setShowMock] = useState(false);

  return (
    <div style={{ minHeight: "100vh", background: "#F7F4EF", padding: "32px" }}>
      {/* Header */}
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <div style={{ width: 28, height: 28, background: "#1B3F2F", borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <BookOpen size={14} color="#fff" />
              </div>
              <span className="font-display" style={{ fontWeight: 800, fontSize: 18, color: "#1A1612" }}>Mnemora</span>
              <span style={{ fontSize: 11, background: "#1B3F2F", color: "#fff", padding: "2px 8px", borderRadius: 4, fontWeight: 600 }}>ADMIN</span>
            </div>
            <p style={{ fontSize: 13, color: "#9E9389" }}>Panel de control · datos en tiempo real cuando conectes Supabase</p>
          </div>
          <button
            onClick={() => setShowMock(!showMock)}
            style={{
              padding: "8px 16px", borderRadius: 10, border: "0.5px solid rgba(26,22,18,0.12)",
              background: showMock ? "#1B3F2F" : "#fff", color: showMock ? "#fff" : "#6B6259",
              fontSize: 13, fontWeight: 600, cursor: "pointer",
            }}
          >
            {showMock ? "✓ Preview activo" : "Ver preview con datos"}
          </button>
        </div>

        {/* Sin Supabase banner */}
        {!showMock && (
          <div style={{
            display: "flex", alignItems: "center", gap: 12, padding: "14px 18px",
            background: "#FEF3C7", borderRadius: 12, border: "0.5px solid #D97706",
            marginBottom: 24,
          }}>
            <AlertCircle size={16} color="#D97706" />
            <p style={{ fontSize: 13, color: "#92400E" }}>
              Los datos reales aparecen cuando configures <strong>NEXT_PUBLIC_SUPABASE_URL</strong> en tu <code>.env.local</code>.
              Por ahora activá el preview con el botón.
            </p>
          </div>
        )}

        {/* KPI cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 24 }}>
          {STATS.map(({ label, value, mock, delta, deltaLabel, icon, iconBg, positive }) => (
            <div key={label} className="mn-card" style={{ padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                <div style={{ width: 32, height: 32, background: iconBg, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {icon}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 11, color: positive ? "#16A34A" : "#DC2626", fontWeight: 600 }}>
                  {positive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                  {positive ? "+" : ""}{delta}{typeof delta === "number" && delta < 50 ? "%" : ""}
                </div>
              </div>
              <p className="font-display" style={{ fontSize: 26, fontWeight: 800, color: "#1A1612", marginBottom: 2 }}>
                {showMock ? mock : value}
              </p>
              <p style={{ fontSize: 12, color: "#9E9389" }}>{label}</p>
              <p style={{ fontSize: 11, color: "#B8B0A8", marginTop: 2 }}>{deltaLabel}</p>
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
          {/* Funnel de conversión */}
          <div className="mn-card" style={{ padding: 22 }}>
            <h2 className="font-display" style={{ fontSize: 15, fontWeight: 800, color: "#1A1612", marginBottom: 18 }}>
              Funnel de conversión
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {FUNNEL.map(({ label, value, pct }, i) => (
                <div key={label}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                    <span style={{ fontSize: 13, color: "#1A1612" }}>{label}</span>
                    <div style={{ display: "flex", gap: 10 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#1A1612" }}>
                        {showMock ? value.toLocaleString() : "—"}
                      </span>
                      <span style={{ fontSize: 12, color: "#9E9389", minWidth: 36, textAlign: "right" }}>
                        {showMock ? `${pct}%` : "—"}
                      </span>
                    </div>
                  </div>
                  <div style={{ height: 6, background: "#EDE9E2", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{
                      height: "100%",
                      width: showMock ? `${pct}%` : "0%",
                      background: i === 0 ? "#1B3F2F" : i === FUNNEL.length - 1 ? "#D97706" : "#86EFAC",
                      borderRadius: 4,
                      transition: "width 600ms",
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Uso del producto */}
          <div className="mn-card" style={{ padding: 22 }}>
            <h2 className="font-display" style={{ fontSize: 15, fontWeight: 800, color: "#1A1612", marginBottom: 18 }}>
              Uso del producto (acumulado)
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {USAGE.map(({ label, value, icon }) => (
                <div key={label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {icon}
                    <span style={{ fontSize: 13, color: "#6B6259" }}>{label}</span>
                  </div>
                  <span className="font-display" style={{ fontSize: 18, fontWeight: 800, color: "#1A1612" }}>
                    {showMock ? value.toLocaleString() : "—"}
                  </span>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 24, padding: "14px 16px", background: "#E8F1EC", borderRadius: 10 }}>
              <p style={{ fontSize: 12, color: "#1B3F2F", fontWeight: 600, marginBottom: 4 }}>Fundadores disponibles</p>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ flex: 1, height: 6, background: "rgba(27,63,47,0.15)", borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: showMock ? "17%" : "0%", background: "#1B3F2F", borderRadius: 4, transition: "width 600ms" }} />
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#1B3F2F" }}>
                  {showMock ? "34/200" : "—/200"}
                </span>
              </div>
              <p style={{ fontSize: 11, color: "#6B6259", marginTop: 4 }}>
                {showMock ? "166 lugares fundadores restantes al precio de $7.99/mes" : "Conectá Supabase para ver el conteo real"}
              </p>
            </div>
          </div>
        </div>

        {/* Usuarios recientes */}
        <div className="mn-card" style={{ padding: 22 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
            <h2 className="font-display" style={{ fontSize: 15, fontWeight: 800, color: "#1A1612" }}>
              Usuarios recientes
            </h2>
            <span style={{ fontSize: 12, color: "#9E9389" }}>Últimos 7 días</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {/* Header */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 80px 100px", gap: 16, padding: "8px 0", borderBottom: "0.5px solid rgba(26,22,18,0.08)", marginBottom: 4 }}>
              {["Email", "País", "Plan", "Registro"].map(h => (
                <span key={h} style={{ fontSize: 11, fontWeight: 700, color: "#9E9389", textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</span>
              ))}
            </div>
            {(showMock ? RECENT_USERS : []).map(({ email, plan, date, country }) => (
              <div key={email} style={{
                display: "grid", gridTemplateColumns: "1fr 80px 80px 100px",
                gap: 16, padding: "11px 0",
                borderBottom: "0.5px solid rgba(26,22,18,0.05)",
                alignItems: "center",
              }}>
                <span style={{ fontSize: 13, color: "#1A1612", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{email}</span>
                <span style={{ fontSize: 14 }}>{FLAG[country] ?? "🌎"} {country}</span>
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 5, width: "fit-content",
                  background: plan === "pro" ? "#E8F1EC" : "#F7F4EF",
                  color: plan === "pro" ? "#1B3F2F" : "#6B6259",
                }}>
                  {plan === "pro" ? "Pro" : "Free"}
                </span>
                <span style={{ fontSize: 12, color: "#9E9389" }}>{date}</span>
              </div>
            ))}
            {!showMock && (
              <div style={{ padding: "24px 0", textAlign: "center", color: "#9E9389", fontSize: 13 }}>
                Activá el preview o conectá Supabase para ver usuarios reales
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
