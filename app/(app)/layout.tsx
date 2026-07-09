"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import {
  BookOpen, LayoutDashboard, Calendar,
  Layers, Plus, ChevronRight, Settings, TrendingUp, LogOut, Library, GitBranch, Map, BarChart2, RefreshCw, ClipboardCheck, Gift, Mic, Brain,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Subject = { id: string; name: string };
type Profile = { name: string | null; email: string; plan: string | null; plan_expires_at: string | null };

type MnSession = {
  subjectId: string; subjectName: string;
  totalSteps: number; currentStep: number;
  steps: { label: string; href: string; minutes: number }[];
  startedAt: string;
};

function DailyObjectiveBar() {
  const pathname = usePathname();
  const [session, setSession] = useState<MnSession | null>(null);

  useEffect(() => {
    function readSession() {
      try {
        const raw = localStorage.getItem("mn-session");
        if (!raw) { setSession(null); return; }
        const s: MnSession = JSON.parse(raw);
        if (Date.now() - new Date(s.startedAt).getTime() > 8 * 60 * 60 * 1000) {
          localStorage.removeItem("mn-session");
          setSession(null);
          return;
        }
        setSession(s);
      } catch { setSession(null); }
    }
    readSession();
    window.addEventListener("storage", readSession);
    window.addEventListener("mn-session-update", readSession);
    return () => {
      window.removeEventListener("storage", readSession);
      window.removeEventListener("mn-session-update", readSession);
    };
  }, [pathname]);

  if (!session || session.currentStep >= session.totalSteps) return null;

  const currentStep = session.steps[session.currentStep];
  const remainingMinutes = session.steps
    .slice(session.currentStep)
    .reduce((sum, s) => sum + s.minutes, 0);

  function dismiss() {
    localStorage.removeItem("mn-session");
    window.dispatchEvent(new Event("mn-session-update"));
  }

  return (
    <div style={{
      position: "sticky", top: 0, zIndex: 40,
      display: "flex", alignItems: "center", gap: 12,
      padding: "10px 24px",
      background: "#1B3F2F",
      borderBottom: "0.5px solid rgba(255,255,255,0.08)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
        <span style={{ fontSize: 14 }}>🎯</span>
        {session.steps.map((_, i) => (
          <div key={i} style={{
            height: 5, borderRadius: 3,
            width: i === session.currentStep ? 18 : 7,
            background: i < session.currentStep ? "#6EE7B7" : i === session.currentStep ? "#F7F4EF" : "rgba(255,255,255,0.2)",
            transition: "width 300ms",
          }} />
        ))}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: "#F7F4EF", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {session.subjectName} · {currentStep.label}
        </p>
        <p style={{ fontSize: 11, color: "#A3C4B0" }}>
          Paso {session.currentStep + 1}/{session.totalSteps} · ~{remainingMinutes} min restantes
        </p>
      </div>
      <Link
        href={currentStep.href}
        style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 14px", borderRadius: 8, background: "#F7F4EF", color: "#1B3F2F", fontSize: 12, fontWeight: 700, textDecoration: "none", flexShrink: 0 }}
      >
        Continuar →
      </Link>
      <button onClick={dismiss} style={{ background: "none", border: "none", cursor: "pointer", color: "#6B9E7E", fontSize: 13, padding: "2px 6px", flexShrink: 0 }}>
        ✕
      </button>
    </div>
  );
}

const SUBJECT_COLORS = ["#1B3F2F", "#7C3AED", "#0369A1", "#BE185D", "#B45309", "#0F766E"];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => { setSidebarOpen(false); }, [pathname]);

  useEffect(() => {
    const db = createClient();
    db.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      db.from("profiles").select("name, email, plan, plan_expires_at").eq("id", user.id).single()
        .then(({ data }) => setProfile(data));
      db.from("subjects").select("id, name").order("created_at")
        .then(({ data }) => setSubjects(data ?? []));
    });
  }, []);

  async function handleLogout() {
    setLoggingOut(true);
    const db = createClient();
    await db.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const navItems = [
    { href: "/dashboard", icon: <LayoutDashboard size={16} />, label: "Inicio" },
    { href: "/mis-clases", icon: <Mic size={16} />, label: "Mis clases" },
    { href: "/quiz", icon: <Brain size={16} />, label: "Quiz" },
    { href: "/calendario", icon: <Calendar size={16} />, label: "Mi Plan" },
    { href: "/flashcards", icon: <Layers size={16} />, label: "Flashcards" },
    { href: "/progreso", icon: <TrendingUp size={16} />, label: "Mi progreso" },
    { href: "/analytics", icon: <BarChart2 size={16} />, label: "Estadísticas" },
    { href: "/replanner", icon: <RefreshCw size={16} />, label: "Ajustar plan" },
    { href: "/referidos", icon: <Gift size={16} />, label: "Referidos" },
  ];

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#F7F4EF" }}>
      <style>{`
        @media (max-width: 767px) {
          .mn-sidebar {
            position: fixed !important;
            top: 0; left: 0;
            height: 100vh !important;
            z-index: 100;
            transform: translateX(-240px);
            transition: transform 220ms ease;
          }
          .mn-sidebar.mn-sidebar-open { transform: translateX(0); }
          .mn-overlay { display: block !important; }
          .mn-hamburger { display: flex !important; }
          .mn-mobile-topbar { display: flex !important; }
        }
        .mn-overlay {
          display: none;
          position: fixed; inset: 0;
          background: rgba(0,0,0,0.38);
          z-index: 99;
        }
        .mn-hamburger { display: none; }
        .mn-mobile-topbar { display: none; }
      `}</style>

      {/* Overlay mobile */}
      {sidebarOpen && (
        <div className="mn-overlay" style={{ display: "block" }} onClick={() => setSidebarOpen(false)} />
      )}

      {/* ─── Sidebar ─── */}
      <aside
        className={`mn-sidebar${sidebarOpen ? " mn-sidebar-open" : ""}`}
        style={{
          width: 240, flexShrink: 0,
          background: "#FAFAF8",
          borderRight: "0.5px solid rgba(26,22,18,0.08)",
          display: "flex", flexDirection: "column", padding: "16px 0",
          position: "sticky", top: 0, height: "100vh", overflow: "hidden",
        }}>
        {/* Logo */}
        <div style={{ padding: "4px 16px 20px", display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 28, height: 28, background: "#1B3F2F", borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <BookOpen size={14} color="#fff" />
          </div>
          <span className="font-display" style={{ fontWeight: 800, fontSize: 16, color: "#1A1612" }}>Mnemora</span>
        </div>

        {/* Nav principal */}
        <div style={{ padding: "0 8px", marginBottom: 8 }}>
          {navItems.map(({ href, icon, label }) => {
            const active = pathname === href;
            return (
              <Link key={href} href={href} style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "8px 10px", borderRadius: 8,
                background: active ? "#E8F1EC" : "transparent",
                color: active ? "#1B3F2F" : "#6B6259",
                textDecoration: "none", fontSize: 14,
                fontWeight: active ? 600 : 400, marginBottom: 2,
                transition: "background 120ms",
              }}>
                {icon} {label}
              </Link>
            );
          })}
        </div>

        <div style={{ height: "0.5px", background: "rgba(26,22,18,0.07)", margin: "8px 16px" }} />

        {/* Materias */}
        <div style={{ padding: "0 8px", flex: 1, overflowY: "auto" }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "#9E9389", textTransform: "uppercase", letterSpacing: "0.08em", padding: "0 10px", marginBottom: 6 }}>
            Materias
          </p>
          {subjects.length === 0 ? (
            <p style={{ fontSize: 12, color: "#C4BAAE", padding: "4px 10px" }}>Sin materias aún</p>
          ) : (
            subjects.map(({ id, name }, i) => {
              const active = pathname.startsWith(`/materias/${id}`);
              return (
                <React.Fragment key={id}>
                  <Link href={`/materias/${id}`} style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "7px 10px", borderRadius: 8,
                    background: active ? "#E8F1EC" : "transparent",
                    color: active ? "#1B3F2F" : "#6B6259",
                    textDecoration: "none", fontSize: 13,
                    fontWeight: active ? 600 : 400, marginBottom: 2,
                    transition: "background 120ms",
                  }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: SUBJECT_COLORS[i % SUBJECT_COLORS.length], flexShrink: 0 }} />
                    <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</span>
                    {active && <ChevronRight size={12} color="#1B3F2F" />}
                  </Link>
                  {active && (
                    <>
                      <Link href={`/biblioteca/${id}`} style={{
                        display: "flex", alignItems: "center", gap: 8,
                        padding: "5px 10px 5px 26px", borderRadius: 8,
                        background: pathname.startsWith(`/biblioteca/${id}`) ? "#E8F1EC" : "transparent",
                        color: pathname.startsWith(`/biblioteca/${id}`) ? "#1B3F2F" : "#9E9389",
                        textDecoration: "none", fontSize: 12, fontWeight: 500, marginBottom: 2,
                        transition: "background 120ms",
                      }}>
                        <Library size={12} /> Biblioteca
                      </Link>
                      <Link href={`/mapas/${id}`} style={{
                        display: "flex", alignItems: "center", gap: 8,
                        padding: "5px 10px 5px 26px", borderRadius: 8,
                        background: pathname.startsWith(`/mapas/${id}`) ? "#E8F1EC" : "transparent",
                        color: pathname.startsWith(`/mapas/${id}`) ? "#1B3F2F" : "#9E9389",
                        textDecoration: "none", fontSize: 12, fontWeight: 500, marginBottom: 2,
                        transition: "background 120ms",
                      }}>
                        <GitBranch size={12} /> Mapa mental
                      </Link>
                      <Link href={`/roadmap/${id}`} style={{
                        display: "flex", alignItems: "center", gap: 8,
                        padding: "5px 10px 5px 26px", borderRadius: 8,
                        background: pathname.startsWith(`/roadmap/${id}`) ? "#E8F1EC" : "transparent",
                        color: pathname.startsWith(`/roadmap/${id}`) ? "#1B3F2F" : "#9E9389",
                        textDecoration: "none", fontSize: 12, fontWeight: 500, marginBottom: 2,
                        transition: "background 120ms",
                      }}>
                        <Map size={12} /> Roadmap
                      </Link>
                      <Link href={`/quiz/${id}`} style={{
                        display: "flex", alignItems: "center", gap: 8,
                        padding: "5px 10px 5px 26px", borderRadius: 8,
                        background: pathname.startsWith(`/quiz/${id}`) ? "#E8F1EC" : "transparent",
                        color: pathname.startsWith(`/quiz/${id}`) ? "#1B3F2F" : "#9E9389",
                        textDecoration: "none", fontSize: 12, fontWeight: 500, marginBottom: 2,
                        transition: "background 120ms",
                      }}>
                        <ClipboardCheck size={12} /> Quiz
                      </Link>
                    </>
                  )}
                </React.Fragment>
              );
            })
          )}
          <Link href="/onboarding" style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "7px 10px", borderRadius: 8, marginTop: 4,
            fontSize: 13, color: "#9E9389", textDecoration: "none",
          }}>
            <Plus size={14} /> Agregar materia
          </Link>
        </div>

        {/* Bottom */}
        <div style={{ padding: "8px 8px 0" }}>
          <div style={{ height: "0.5px", background: "rgba(26,22,18,0.07)", margin: "0 8px 8px" }} />

          {/* User / plan */}
          {profile && (() => {
            const planLabel =
              profile.plan === "premium" ? "Premium" :
              profile.plan === "pro"
                ? (profile.plan_expires_at && new Date(profile.plan_expires_at) > new Date() ? "Pro · Trial activo" : "Pro")
                : "Plan gratuito";
            const isFree = !profile.plan || profile.plan === "free";
            return (
              <div style={{ padding: "10px 12px", background: "#E8F1EC", borderRadius: 10, margin: "0 4px 8px" }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: "#1B3F2F", marginBottom: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {profile.name ?? profile.email}
                </p>
                <p style={{ fontSize: 11, color: "#6B6259", marginBottom: isFree ? 6 : 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {planLabel}
                </p>
                {isFree && (
                  <Link href="/upgrade" style={{ fontSize: 11, color: "#1B3F2F", fontWeight: 600, textDecoration: "none" }}>
                    Activar Pro →
                  </Link>
                )}
              </div>
            );
          })()}

          <Link href="/settings" style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 8, color: "#9E9389", textDecoration: "none", fontSize: 13 }}>
            <Settings size={15} /> Configuración
          </Link>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              width: "100%", padding: "8px 10px", borderRadius: 8,
              background: "none", border: "none", cursor: "pointer",
              fontSize: 13, color: "#9E9389", textAlign: "left",
              opacity: loggingOut ? 0.6 : 1,
            }}
          >
            <LogOut size={15} /> {loggingOut ? "Saliendo..." : "Cerrar sesión"}
          </button>
        </div>
      </aside>

      {/* ─── Main ─── */}
      <main style={{ flex: 1, overflow: "auto", minWidth: 0 }}>
        {/* Mobile topbar */}
        <div className="mn-mobile-topbar" style={{ alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "#FAFAF8", borderBottom: "0.5px solid rgba(26,22,18,0.08)", position: "sticky", top: 0, zIndex: 50 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 26, height: 26, background: "#1B3F2F", borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <BookOpen size={13} color="#fff" />
            </div>
            <span className="font-display" style={{ fontWeight: 800, fontSize: 15, color: "#1A1612" }}>Mnemora</span>
          </div>
          <button
            onClick={() => setSidebarOpen(true)}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "#1A1612" }}
            aria-label="Abrir menú"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect y="3" width="20" height="2" rx="1" fill="currentColor"/><rect y="9" width="20" height="2" rx="1" fill="currentColor"/><rect y="15" width="20" height="2" rx="1" fill="currentColor"/></svg>
          </button>
        </div>
        <DailyObjectiveBar />
        {children}
      </main>
    </div>
  );
}
