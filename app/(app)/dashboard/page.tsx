"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Brain, Calendar, Zap, FileText, Layers,
  ArrowRight, AlertCircle, Sparkles, BookOpen, Plus,
  Target, TrendingUp, CheckCircle, BarChart2, Flame, Gift,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { CoachResponse, CoachRecommendation } from "@/app/api/study-coach/route";
import type { PlanTask } from "@/app/api/daily-planner/route";

type Subject = { id: string; name: string; professor?: string; goal_type?: string | null; goal_value?: string | null };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Event = { id: string; title: string; event_date: string; event_type: string; subject_id?: string; subjects?: any };



type ReviewItem = {
  concept_name: string;
  subject_name: string;
  subject_id: string;
  mastery_level: string;
};

type KnowledgeRow = {
  confidence: number;
  mastery_level: string;
  next_review: string | null;
  subject_concepts: { name: string; subject_id: string } | null;
};

type CogProfile = { subject_id: string; performance_estimate: number | null; learning_speed: number | null; preferred_style: string | null };

type SubjectStat = {
  subjectId: string;
  coveragePct: number;
  masteryPct: number;
  predictedGrade: number;
  approvalProb: "alta" | "media" | "baja";
  weakConcepts: string[];
  nextExam: Event | null;
  daysToExam: number | null;
  knownCount: number;
  totalConcepts: number;
  pendingReviewCount: number;
};

function daysUntil(dateStr: string): number {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr); target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("es", { day: "numeric", month: "short" });
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Buen día";
  if (h < 19) return "Buenas tardes";
  return "Buenas noches";
}

function todayLabel(): string {
  const raw = new Date().toLocaleDateString("es", { weekday: "long", day: "numeric", month: "long" });
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

type BriefingResult = { title: string; subtitle: string; estimatedMinutes: number | null; cta: { label: string; href: string } | null };

function buildBriefing({ reviewItems, nextExam, daysToExam, subjects, subjectStats, planTasks }: {
  reviewItems: ReviewItem[]; nextExam: Event | null; daysToExam: number | null;
  subjects: Subject[]; subjectStats: Map<string, SubjectStat>; planTasks: PlanTask[] | null;
}): BriefingResult | null {
  if (subjects.length === 0) return null;

  const n = reviewItems.length;
  const subjectName = reviewItems[0]?.subject_name ?? "";
  const subjectId = reviewItems[0]?.subject_id ?? "";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const examSubjectName = (nextExam?.subjects as any)?.name ?? "";

  if (n > 0 && nextExam && daysToExam !== null && daysToExam <= 14) {
    return {
      title: `Tienes ${n} repaso${n !== 1 ? "s" : ""} pendiente${n !== 1 ? "s" : ""} en ${subjectName}.`,
      subtitle: `Tu examen de ${examSubjectName} es en ${daysToExam} día${daysToExam !== 1 ? "s" : ""}. Hoy es un buen momento para adelantar.`,
      estimatedMinutes: Math.ceil(n * 1.5) + 5,
      cta: { label: "Repasar ahora", href: `/flashcards/${subjectId}` },
    };
  }
  if (n > 0) {
    return {
      title: `Tienes ${n} concepto${n !== 1 ? "s" : ""} para repasar en ${subjectName}.`,
      subtitle: `Son los conceptos que Mnemora detectó que estás a punto de olvidar.`,
      estimatedMinutes: Math.ceil(n * 1.5),
      cta: { label: "Empezar repaso", href: `/flashcards/${subjectId}` },
    };
  }
  if (nextExam && daysToExam !== null && daysToExam <= 14) {
    const stat = subjectStats.get(nextExam.subject_id ?? "");
    const coverage = stat?.coveragePct ?? 0;
    return {
      title: `Tu examen de ${examSubjectName} es en ${daysToExam} día${daysToExam !== 1 ? "s" : ""}.`,
      subtitle: coverage > 0 ? `Ya cubriste el ${coverage}% del temario.` : "Empecemos a preparar el temario.",
      estimatedMinutes: daysToExam <= 7 ? 30 : 20,
      cta: { label: "Ver mi plan", href: "/calendario" },
    };
  }
  if (planTasks && planTasks.length > 0) {
    const mins = planTasks.reduce((a, t) => a + t.minutesEst, 0);
    return {
      title: `Mnemora preparó ${planTasks.length} tarea${planTasks.length !== 1 ? "s" : ""} para hoy.`,
      subtitle: planTasks[0].description,
      estimatedMinutes: mins,
      cta: { label: "Ver plan", href: "#plan" },
    };
  }
  return {
    title: "Al día — sin repasos pendientes por ahora.",
    subtitle: "Aprovecha para explorar un tema nuevo o hacer un quiz.",
    estimatedMinutes: null,
    cta: subjects.length > 0 ? { label: "Hacer quiz", href: `/quiz/${subjects[0].id}` } : null,
  };
}

function buildActivityNote({ reviewItems, nextExam, daysToExam, subjects }: {
  reviewItems: ReviewItem[]; nextExam: Event | null; daysToExam: number | null; subjects: Subject[];
}): string | null {
  if (subjects.length === 0) return null;
  const n = reviewItems.length;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const examSubjectName = (nextExam?.subjects as any)?.name ?? "";
  if (n > 0) {
    const estimatedMin = Math.max(10, n * 3);
    return `revisé tu progreso y detecté ${n} concepto${n !== 1 ? "s" : ""} que estás a punto de olvidar. Preparé una sesión de ~${estimatedMin} minutos para recuperarlos hoy.`;
  }
  if (nextExam && daysToExam !== null && daysToExam <= 14) {
    return `reorganicé tu plan de estudio pensando en el examen de ${examSubjectName} en ${daysToExam} día${daysToExam !== 1 ? "s" : ""}. Tienes material listo para trabajar.`;
  }
  if (nextExam && daysToExam !== null && daysToExam <= 30) {
    return `calculé tu ritmo de estudio y actualicé los repasos. El examen de ${examSubjectName} está en ${daysToExam} días — vas bien.`;
  }
  return `calculé tu progreso de la semana y programé los repasos para que no pierdas lo que ya estudiaste.`;
}

type MnSession = {
  subjectId: string; subjectName: string;
  totalSteps: number; currentStep: number;
  steps: { label: string; href: string; minutes: number }[];
  startedAt: string;
};

export default function DashboardPage() {
  const router = useRouter();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([]);
  const [subjectStats, setSubjectStats] = useState<Map<string, SubjectStat>>(new Map());
  const [bestCogProfile, setBestCogProfile] = useState<CogProfile | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [planTasks, setPlanTasks] = useState<PlanTask[] | null>(null);
  const [planLocked, setPlanLocked] = useState(false);
  const [coach, setCoach] = useState<CoachResponse | null>(null);
  const [coachLoading, setCoachLoading] = useState(true);
  const [coachLocked, setCoachLocked] = useState(false);
  const [gamification, setGamification] = useState<{
    xpTotal: number; streakDays: number; weeklyDays: number;
    studiedToday: boolean;
    recentAchievements: { achievement_id: string; earned_at: string }[];
  } | null>(null);
  const [hasDocument, setHasDocument] = useState(false);
  const [userCount, setUserCount] = useState<number | null>(null);
  useEffect(() => {
    fetch("/api/stats").then(r => r.ok ? r.json() : null).then(d => { if (d) setUserCount(d.userCount); }).catch(() => {});
  }, []);

  // Mostrar página de instalación solo en móvil cuando el usuario tiene plan pago
  useEffect(() => {
    const seen = localStorage.getItem("mnemora_pwa_seen");
    if (seen) return;
    const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
    if (!isMobile) return;
    const db = createClient();
    db.from("profiles").select("plan").single().then(({ data }) => {
      if (data?.plan && data.plan !== "free") {
        router.push("/instalar?next=/dashboard");
      }
    });
  }, [router]);

  // Study Coach — cached per session in sessionStorage
  useEffect(() => {
    const CACHE_KEY = "mn-study-coach";
    const CACHE_TTL = 4 * 60 * 60 * 1000; // 4h
    try {
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed: CoachResponse = JSON.parse(cached);
        if (Date.now() - new Date(parsed.generatedAt).getTime() < CACHE_TTL) {
          setCoach(parsed);
          setCoachLoading(false);
          return;
        }
      }
    } catch {}

    fetch("/api/study-coach")
      .then(async r => {
        if (r.status === 403) { setCoachLocked(true); return null; }
        return r.ok ? r.json() : null;
      })
      .then((data: CoachResponse | null) => {
        if (data) {
          setCoach(data);
          try { sessionStorage.setItem(CACHE_KEY, JSON.stringify(data)); } catch {}
        }
      })
      .catch(() => {})
      .finally(() => setCoachLoading(false));
  }, []);

  // Daily Planner — server-side gated (Pro/Premium)
  useEffect(() => {
    fetch("/api/daily-planner")
      .then(async r => {
        if (r.status === 403) { setPlanLocked(true); return; }
        if (!r.ok) return;
        const data = await r.json();
        setPlanTasks(data.tasks ?? []);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const db = createClient();
    const today = new Date().toISOString().slice(0, 10);

    (async () => {
      const { data: { user } } = await db.auth.getUser();

      const [subjRes, evRes, reviewRes, knowledgeRes, cogRes, docRes] = await Promise.all([
        db.from("subjects").select("id, name, professor, goal_type, goal_value").order("created_at"),
        db.from("calendar_events")
          .select("id, title, event_date, event_type, subject_id, subjects(name)")
          .gte("event_date", today)
          .order("event_date")
          .limit(10),
        user
          ? db.from("student_knowledge")
              .select("mastery_level, subject_concepts!inner(name, subject_id, subjects!inner(id, name))")
              .eq("user_id", user.id)
              .lte("next_review", new Date().toISOString())
              .limit(8)
          : Promise.resolve({ data: [] }),
        user
          ? db.from("student_knowledge")
              .select("confidence, mastery_level, next_review, subject_concepts!inner(name, subject_id)")
              .eq("user_id", user.id)
          : Promise.resolve({ data: [] }),
        user
          ? db.from("cognitive_profile")
              .select("subject_id, performance_estimate, learning_speed, preferred_style")
              .eq("user_id", user.id)
          : Promise.resolve({ data: [] }),
        db.from("documents").select("id", { count: "exact", head: true }),
      ]);

      const subjectList: Subject[] = subjRes.data ?? [];
      const eventList: Event[] = (evRes.data ?? []) as Event[];
      setSubjects(subjectList);
      setEvents(eventList);
      setHasDocument((docRes.count ?? 0) > 0);

      const items = ((reviewRes.data ?? []) as any[]).map((row) => ({
        concept_name: row.subject_concepts?.name ?? "",
        subject_name: row.subject_concepts?.subjects?.name ?? "",
        subject_id: row.subject_concepts?.subjects?.id ?? "",
        mastery_level: row.mastery_level,
      })).filter((r: ReviewItem) => r.concept_name);
      setReviewItems(items);

      // Compute per-subject stats
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const allKnowledge = (knowledgeRes.data ?? []) as any[] as KnowledgeRow[];
      const cogProfiles = (cogRes.data ?? []) as CogProfile[];

      const cogMap = new Map(cogProfiles.map(p => [p.subject_id, p.performance_estimate]));

      // Best cognitive profile: prefer highest learning_speed
      const bestProfile = cogProfiles.reduce<CogProfile | null>((best, p) =>
        (!best || (p.learning_speed ?? 0) > (best.learning_speed ?? 0)) ? p : best, null);
      if (bestProfile) setBestCogProfile(bestProfile);

      const statsMap = new Map<string, SubjectStat>();
      for (const s of subjectList) {
        const rows = allKnowledge.filter(k => k.subject_concepts?.subject_id === s.id);
        const total = rows.length;
        const mastered = rows.filter(k => k.mastery_level === "mastered").length;
        const known = rows.filter(k => k.confidence > 0).length;
        const weak = rows
          .filter(k => k.confidence < 0.5 && k.mastery_level !== "mastered")
          .sort((a, b) => a.confidence - b.confidence)
          .slice(0, 2)
          .map(k => k.subject_concepts?.name ?? "");

        const coveragePct = total > 0 ? Math.round((known / total) * 100) : 0;
        const masteryPct = total > 0 ? Math.round((mastered / total) * 100) : 0;

        const perfEstimate = cogMap.get(s.id);
        const avgConf = total > 0 ? rows.reduce((acc, k) => acc + k.confidence, 0) / total : 0;
        const predictedGrade = perfEstimate != null
          ? Math.round(perfEstimate * 10) / 10
          : Math.round(avgConf * 100) / 10;
        const approvalProb: SubjectStat["approvalProb"] =
          predictedGrade >= 7 ? "alta" : predictedGrade >= 5.5 ? "media" : "baja";

        const subjectExams = eventList.filter(e => e.event_type === "exam" && e.subject_id === s.id);
        const nextExam = subjectExams[0] ?? null;
        const daysToExam = nextExam ? daysUntil(nextExam.event_date) : null;

        const todayStr = new Date().toISOString().slice(0, 10);
        const pendingReviewCount = rows.filter(k =>
          k.next_review !== null && k.next_review <= todayStr && k.mastery_level !== "mastered"
        ).length;

        statsMap.set(s.id, {
          subjectId: s.id,
          coveragePct,
          masteryPct,
          predictedGrade,
          approvalProb,
          weakConcepts: weak.filter(Boolean),
          nextExam,
          daysToExam,
          knownCount: known,
          totalConcepts: total,
          pendingReviewCount,
        });
      }
      setSubjectStats(statsMap);

      // Gamification
      if (user) {
        const [progressRes, achievRes] = await Promise.all([
          db.from("user_progress").select("xp_total, streak_days").eq("user_id", user.id).maybeSingle(),
          db.from("user_achievements").select("achievement_id, earned_at").eq("user_id", user.id).order("earned_at", { ascending: false }).limit(3),
        ]);
        // Weekly active days from xp_events
        const monday = new Date();
        monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
        monday.setHours(0, 0, 0, 0);
        const { data: weekEvents } = await db.from("xp_events").select("created_at").eq("user_id", user.id).gte("created_at", monday.toISOString());
        const todayStr = new Date().toISOString().slice(0, 10);
        const weekDates = (weekEvents ?? []).map((e: { created_at: string }) => e.created_at.slice(0, 10));
        const weekDays = new Set(weekDates).size;
        const studiedToday = weekDates.includes(todayStr);
        setGamification({
          xpTotal: progressRes.data?.xp_total ?? 0,
          streakDays: progressRes.data?.streak_days ?? 0,
          weeklyDays: weekDays,
          studiedToday,
          recentAchievements: achievRes.data ?? [],
        });
      }

      setLoaded(true);
    })();
  }, []);

  const nextExam = events.find(e => e.event_type === "exam");
  const daysToExam = nextExam ? daysUntil(nextExam.event_date) : null;

  function handleStartGuidedSession(href: string, totalMinutes: number | null) {
    const subjectId = href.split("/flashcards/")[1];
    const subjectName = subjects.find(s => s.id === subjectId)?.name ?? "Materia";
    const mins = totalMinutes ?? 30;
    const session: MnSession = {
      subjectId, subjectName, totalSteps: 3, currentStep: 0,
      steps: [
        { label: "Flashcards", href: `/flashcards/${subjectId}?guided=1`, minutes: Math.round(mins * 0.5) },
        { label: "Quiz",       href: `/quiz/${subjectId}?guided=1`,       minutes: Math.round(mins * 0.33) },
        { label: "Tutor",      href: `/tutor/${subjectId}?guided=1`,      minutes: Math.round(mins * 0.17) },
      ],
      startedAt: new Date().toISOString(),
    };
    localStorage.setItem("mn-session", JSON.stringify(session));
    window.dispatchEvent(new Event("mn-session-update"));
    router.push(`/flashcards/${subjectId}?guided=1`);
  }

  // Build natural-language daily briefing from available data
  const briefing = buildBriefing({ reviewItems, nextExam: nextExam ?? null, daysToExam, subjects, subjectStats, planTasks });
  const activityNote = buildActivityNote({ reviewItems, nextExam: nextExam ?? null, daysToExam, subjects });
  const profileLabel = bestCogProfile?.preferred_style
    ? ({ visual: "Visual", conceptual: "Conceptual", practical: "Práctico", balanced: "Mixto" })[bestCogProfile.preferred_style] ?? bestCogProfile.preferred_style
    : null;

  function cogProfileHint(): string | null {
    const style = bestCogProfile?.preferred_style;
    if (!style || style === "balanced") return null;
    const pendingReview = reviewItems.length;
    if (pendingReview > 0) {
      if (style === "visual") return `Como sueles retener mejor de forma visual, hoy toca reforzar con esquemas.`;
      if (style === "practical") return `Como aprendes haciendo, hoy empezamos con práctica directa.`;
      if (style === "conceptual") return `Como prefieres entender en profundidad, hoy revisamos el "por qué" de cada concepto.`;
    }
    return null;
  }
  const cogHint = cogProfileHint();

  return (
    <div className="mn-dashboard-wrap">

      {/* 1 — Greeting */}
      <div className="mn-fade-up" style={{ marginBottom: 32, animationDelay: "0ms" }}>
        <h1 className="font-display" style={{ fontSize: "clamp(24px, 3.2vw, 32px)", fontWeight: 800, color: "var(--mn-ink-1)", lineHeight: 1.15, marginBottom: 4 }}>
          {greeting()}
        </h1>
        <p style={{ fontSize: 14, color: "var(--mn-ink-3)" }}>
          {todayLabel()}
          {profileLabel && ` · Perfil ${profileLabel}`}
        </p>
      </div>

      {/* 1b — Social proof (solo cuando hay datos reales) */}
      {userCount !== null && userCount >= 10 && (
        <div className="mn-fade-up" style={{ marginBottom: 20, animationDelay: "40ms" }}>
          <p style={{ fontSize: 12, color: "var(--mn-ink-3)" }}>
            🎓 <strong style={{ color: "var(--mn-ink-2)" }}>{userCount.toLocaleString("es")} estudiantes</strong> ya organizan su semestre con Mnemora
          </p>
        </div>
      )}

      {/* 2 — Mientras no estabas */}
      {loaded && activityNote && (
        <div className="mn-fade-up" style={{ marginBottom: 32, paddingLeft: 14, borderLeft: "2px solid var(--mn-ink-4)", animationDelay: "80ms" }}>
          <p style={{ fontSize: 14, color: "var(--mn-ink-2)", lineHeight: 1.7 }}>
            <strong style={{ color: "var(--mn-ink-1)" }}>Mientras no estabas,</strong> {activityNote}
          </p>
          {cogHint && (
            <p style={{ fontSize: 13, color: "var(--mn-ink-2)", marginTop: 8, lineHeight: 1.6, fontStyle: "italic" }}>
              {cogHint}
            </p>
          )}
        </div>
      )}

      {/* 2b — Tutor proactivo: alerta cuando hay repasos urgentes + examen próximo */}
      {loaded && reviewItems.length >= 3 && nextExam && daysToExam !== null && daysToExam <= 10 && (
        <div className="mn-fade-up" style={{ marginBottom: 20, animationDelay: "140ms" }}>
          <Link
            href={subjects.find(s => reviewItems[0]?.subject_id === s.id) ? `/tutor/${reviewItems[0].subject_id}` : "/tutor/" + (subjects[0]?.id ?? "")}
            style={{
              display: "flex", alignItems: "flex-start", gap: 12,
              padding: "14px 16px", borderRadius: "var(--mn-r-lg)",
              background: "var(--mn-surface)", border: "1px solid var(--mn-ink-4)",
              textDecoration: "none",
            }}
          >
            <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#1B3F2F", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Brain size={16} color="#fff" />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: "var(--mn-ink-1)", marginBottom: 3 }}>
                Tu tutor detectó algo importante
              </p>
              <p style={{ fontSize: 12, color: "var(--mn-ink-2)", lineHeight: 1.55 }}>
                Tienes {reviewItems.length} conceptos sin repasar y el examen de{" "}
                <strong>{(nextExam.subjects as { name: string } | undefined)?.name ?? "tu materia"}</strong>{" "}
                es en {daysToExam} {daysToExam === 1 ? "día" : "días"}. Entra a hablar.
              </p>
            </div>
            <ArrowRight size={14} color="var(--mn-ink-3)" style={{ marginTop: 2, flexShrink: 0 }} />
          </Link>
        </div>
      )}

      {/* 3 — DailyBriefing: card blanca, protagonista por tipografía */}
      {loaded && briefing && (
        <div className="mn-fade-up" style={{ padding: "24px 28px", marginBottom: 28, animationDelay: "160ms", background: "var(--mn-surface)", borderRadius: "var(--mn-r-xl)", boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)" }}>
          <p className="font-display" style={{ fontSize: 20, fontWeight: 700, color: "var(--mn-ink-1)", lineHeight: 1.35, marginBottom: 6 }}>
            {briefing.title}
          </p>
          {briefing.subtitle && (
            <p style={{ fontSize: 14, color: "var(--mn-ink-2)", lineHeight: 1.6, marginBottom: briefing.cta ? 24 : 0 }}>
              {briefing.subtitle}
              {briefing.estimatedMinutes && (
                <span style={{ marginLeft: 8, color: "var(--mn-ink-3)", fontSize: 12 }}>
                  ~{briefing.estimatedMinutes} min
                </span>
              )}
            </p>
          )}
          {briefing.cta && (
            briefing.cta.href.startsWith("/flashcards/") ? (
              <button
                onClick={() => handleStartGuidedSession(briefing.cta!.href, briefing.estimatedMinutes)}
                style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "13px 28px", background: "var(--mn-green)", borderRadius: "var(--mn-r-lg)", border: "none", cursor: "pointer", fontSize: 14, fontWeight: 600, color: "#FFFFFF" }}
              >
                {briefing.cta.label} <ArrowRight size={14} />
              </button>
            ) : (
              <Link
                href={briefing.cta.href}
                style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "13px 28px", background: "var(--mn-green)", borderRadius: "var(--mn-r-lg)", textDecoration: "none", fontSize: 14, fontWeight: 600, color: "#FFFFFF" }}
              >
                {briefing.cta.label} <ArrowRight size={14} />
              </Link>
            )
          )}
        </div>
      )}

      {/* 4 — Gamification chips + streak-at-risk banner */}
      {gamification && (
        <>
          <div className="mn-fade-up" style={{ display: "flex", gap: 8, marginBottom: gamification.streakDays > 0 && !gamification.studiedToday ? 12 : 28, animationDelay: "220ms" }}>
            {/* Streak — siempre visible */}
            {gamification.streakDays === 0 ? (
              <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "3px 11px", background: "var(--mn-raised)", borderRadius: "var(--mn-r-full)" }}>
                <span style={{ fontSize: 12 }}>🔥</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--mn-ink-3)" }}>Empieza tu racha hoy</span>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "3px 11px", background: gamification.streakDays >= 3 ? "var(--mn-amber-light)" : "var(--mn-raised)", borderRadius: "var(--mn-r-full)", animation: gamification.streakDays === 1 ? "streak-pop 0.4s ease forwards" : "none" }}>
                <span style={{ fontSize: 12 }}>🔥</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: gamification.streakDays >= 3 ? "var(--mn-amber)" : "var(--mn-ink-2)" }}>
                  {gamification.streakDays} {gamification.streakDays === 1 ? "día" : "días"}
                </span>
              </div>
            )}
            {gamification.xpTotal > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "3px 11px", background: "var(--mn-raised)", borderRadius: "var(--mn-r-full)" }}>
                <span style={{ fontSize: 12 }}>⚡</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--mn-ink-2)" }}>{gamification.xpTotal >= 1000 ? `${(gamification.xpTotal / 1000).toFixed(1)}k` : gamification.xpTotal} XP</span>
              </div>
            )}
          </div>

          {/* Mensaje especial día 1 de racha */}
          {gamification.streakDays === 1 && gamification.studiedToday && (
            <p style={{ fontSize: 12, color: "var(--mn-ink-3)", lineHeight: 1.5, marginTop: 4 }}>
              Empezaste tu racha. Los estudiantes con 7+ días recuerdan 3× más el día del examen.
            </p>
          )}

          {/* Racha en riesgo — solo si tiene racha activa y no estudió hoy */}
          {gamification.streakDays > 0 && !gamification.studiedToday && subjects.length > 0 && (
            <div className="mn-fade-up" style={{ marginBottom: 28, animationDelay: "235ms" }}>
              <Link
                href={subjects[0] ? `/flashcards/${subjects[0].id}` : "/dashboard"}
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "12px 16px", borderRadius: "var(--mn-r-lg)",
                  background: "var(--mn-amber-light)", border: "1px solid var(--mn-amber)",
                  textDecoration: "none",
                }}
              >
                <span style={{ fontSize: 22, flexShrink: 0 }}>⚠️</span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "var(--mn-amber)", marginBottom: 2 }}>
                    Tu racha de {gamification.streakDays} {gamification.streakDays === 1 ? "día" : "días"} está en riesgo
                  </p>
                  <p style={{ fontSize: 12, color: "var(--mn-amber)", opacity: 0.8 }}>
                    Estudia aunque sea 5 minutos hoy para no perderla →
                  </p>
                </div>
              </Link>
            </div>
          )}
        </>
      )}

      {/* 5 — Strip de exámenes próximos (todos los próximos 30 días) */}
      {loaded && (() => {
        const upcomingExams = events
          .filter(e => e.event_type === "exam")
          .map(e => ({ ...e, days: daysUntil(e.event_date) }))
          .filter(e => e.days >= 0 && e.days <= 30)
          .slice(0, 5);
        if (upcomingExams.length === 0) return null;
        return (
          <div className="mn-fade-up" style={{ marginBottom: 24, animationDelay: "240ms" }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "var(--mn-ink-3)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>
              Próximos exámenes
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {upcomingExams.map(exam => {
                const urgent = exam.days <= 7;
                return (
                  <div key={exam.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: "var(--mn-r-lg)", background: urgent ? "var(--mn-amber-light, #FEF3C7)" : "var(--mn-surface)", border: `1px solid ${urgent ? "rgba(217,119,6,0.25)" : "var(--mn-ink-4)"}` }}>
                    <div style={{ width: 36, height: 36, borderRadius: "var(--mn-r-md)", background: urgent ? "rgba(217,119,6,0.15)" : "var(--mn-raised)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <span style={{ fontSize: 14, fontWeight: 800, color: urgent ? "#D97706" : "var(--mn-ink-1)", lineHeight: 1 }}>{exam.days === 0 ? "!" : exam.days}</span>
                      <span style={{ fontSize: 8, fontWeight: 600, color: urgent ? "#D97706" : "var(--mn-ink-3)", textTransform: "uppercase", letterSpacing: "0.04em" }}>{exam.days === 0 ? "hoy" : exam.days === 1 ? "día" : "días"}</span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: "var(--mn-ink-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{exam.title}</p>
                      {exam.subjects && <p style={{ fontSize: 11, color: "var(--mn-ink-3)" }}>{(exam.subjects as any).name} · {formatDate(exam.event_date)}</p>}
                    </div>
                    {exam.days <= 14 && exam.subject_id && (
                      <Link href={`/examen/${exam.subject_id}`} style={{ fontSize: 11, fontWeight: 700, color: urgent ? "#D97706" : "var(--mn-green)", textDecoration: "none", flexShrink: 0, padding: "5px 10px", background: urgent ? "rgba(217,119,6,0.1)" : "var(--mn-raised)", borderRadius: "var(--mn-r-md)" }}>
                        Preparar
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* 6 — Daily Planner */}
      <div id="plan" className="mn-fade-up" style={{ marginBottom: 24, animationDelay: "260ms" }}>
        <DailyPlannerWidget tasks={planTasks} locked={planLocked} hasSubjects={subjects.length > 0} />
      </div>

      {/* 7 — Bento: Repasar hoy + Próximos */}
      <div className="mn-bento">
        {/* Repasar hoy */}
        <div className="mn-card mn-bento-main mn-fade-up" style={{ padding: 22, animationDelay: "300ms" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 28, height: 28, background: "var(--mn-amber-light)", borderRadius: "var(--mn-r-sm)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Zap size={14} color="var(--mn-amber)" />
              </div>
              <span className="font-display" style={{ fontWeight: 700, fontSize: 15, color: "var(--mn-ink-1)" }}>Repasar hoy</span>
            </div>
            {loaded && reviewItems.length > 0 && (
              <span style={{ fontSize: 11, background: "var(--mn-amber-light)", color: "var(--mn-amber)", fontWeight: 700, padding: "3px 10px", borderRadius: "var(--mn-r-full)", letterSpacing: "0.03em" }}>
                {reviewItems.length} pendiente{reviewItems.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          {!loaded ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[1, 2, 3].map(i => <div key={i} style={{ height: 44, background: "var(--mn-raised)", borderRadius: "var(--mn-r-md)", animation: "pulse-skeleton 1.4s ease infinite" }} />)}
            </div>
          ) : reviewItems.length === 0 ? (
            <div style={{ padding: "20px 0" }}>
              <p style={{ fontSize: 14, color: "var(--mn-ink-1)", fontWeight: 600, marginBottom: 4 }}>
                {subjects.length === 0 ? "Sin materias aún." : "Todo al día — sin repasos pendientes."}
              </p>
              <p style={{ fontSize: 13, color: "var(--mn-ink-3)", lineHeight: 1.5 }}>
                {subjects.length === 0
                  ? "Agrega una materia y sube un documento para que empiece a trabajar."
                  : "Practica algunas flashcards y registro qué conceptos necesitan refuerzo."}
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {reviewItems.slice(0, 5).map((item, i) => (
                <Link
                  key={i}
                  href={`/flashcards/${item.subject_id}`}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: "var(--mn-r-md)", background: "var(--mn-raised)", textDecoration: "none", transition: "background var(--mn-dur-micro)" }}
                >
                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: item.mastery_level === "learning" ? "var(--mn-amber)" : "var(--mn-error)", flexShrink: 0 }} />
                  <div style={{ flex: 1, overflow: "hidden" }}>
                    <p style={{ fontSize: 13, color: "var(--mn-ink-1)", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.concept_name}</p>
                    <p style={{ fontSize: 11, color: "var(--mn-ink-3)" }}>{item.subject_name}</p>
                  </div>
                  <ArrowRight size={13} color="var(--mn-ink-4)" />
                </Link>
              ))}
              {reviewItems.length > 5 && (
                <p style={{ fontSize: 12, color: "var(--mn-ink-3)", textAlign: "center", paddingTop: 4 }}>+{reviewItems.length - 5} más</p>
              )}
            </div>
          )}
        </div>

        {/* Próximos eventos */}
        <div className="mn-card mn-bento-side mn-fade-up" style={{ padding: 20, animationDelay: "320ms" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <div style={{ width: 28, height: 28, background: "var(--mn-green-light)", borderRadius: "var(--mn-r-sm)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Calendar size={14} color="var(--mn-green)" />
            </div>
            <span className="font-display" style={{ fontWeight: 700, fontSize: 15, color: "var(--mn-ink-1)" }}>Próximos</span>
          </div>

          {!loaded ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[1, 2].map(i => <div key={i} style={{ height: 52, background: "var(--mn-raised)", borderRadius: "var(--mn-r-md)" }} />)}
            </div>
          ) : events.length === 0 ? (
            <div style={{ padding: "16px 0" }}>
              <p style={{ fontSize: 13, color: "var(--mn-ink-2)", fontWeight: 600, marginBottom: 4 }}>Sin fechas registradas aún.</p>
              <p style={{ fontSize: 12, color: "var(--mn-ink-3)", lineHeight: 1.5 }}>Cuando subas el programa de una materia, extraigo los exámenes y entregas automáticamente.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {events.slice(0, 4).map(ev => {
                const days = daysUntil(ev.event_date);
                const isUrgent = days <= 3;
                return (
                  <div key={ev.id} style={{ padding: "10px 12px", borderRadius: "var(--mn-r-md)", background: isUrgent ? "var(--mn-amber-light)" : "var(--mn-raised)", borderLeft: isUrgent ? "2px solid var(--mn-amber)" : "none" }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: isUrgent ? "var(--mn-amber)" : "var(--mn-ink-1)", marginBottom: 2 }}>{ev.title}</p>
                    <p style={{ fontSize: 11, color: isUrgent ? "var(--mn-amber)" : "var(--mn-ink-3)", opacity: isUrgent ? 0.8 : 1 }}>
                      {formatDate(ev.event_date)} · {days === 0 ? "Hoy" : days === 1 ? "Mañana" : `en ${days} días`}
                    </p>
                  </div>
                );
              })}
            </div>
          )}

          <Link href="/calendario" style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, color: "var(--mn-green)", fontWeight: 600, textDecoration: "none", marginTop: 14 }}>
            Ver Mi Plan <ArrowRight size={13} />
          </Link>
        </div>
      </div>

      {/* 8 — AI Study Coach */}
      <div className="mn-fade-up" style={{ marginBottom: 28, animationDelay: "360ms" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <div style={{ width: 24, height: 24, background: "var(--mn-amber-light)", borderRadius: "var(--mn-r-sm)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Sparkles size={13} color="var(--mn-amber)" />
          </div>
          <h2 className="font-display" style={{ fontSize: 15, fontWeight: 800, color: "var(--mn-ink-1)" }}>
            {coach?.greeting ?? "Recomendaciones de Mnemora"}
          </h2>
        </div>

        {coachLoading ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10 }}>
            {[1, 2, 3].map(i => <div key={i} style={{ height: 100, background: "var(--mn-raised)", borderRadius: "var(--mn-r-lg)", animation: "pulse-skeleton 1.4s ease infinite" }} />)}
          </div>
        ) : coachLocked ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", background: "var(--mn-amber-light)", borderRadius: "var(--mn-r-lg)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 18 }}>✨</span>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: "var(--mn-amber)", lineHeight: 1.3 }}>AI Study Coach es Premium</p>
                <p style={{ fontSize: 12, color: "var(--mn-amber)", opacity: 0.8 }}>Recomendaciones personalizadas según tu progreso real.</p>
              </div>
            </div>
            <Link href="/upgrade" style={{ flexShrink: 0, fontSize: 12, fontWeight: 700, color: "var(--mn-green)", textDecoration: "none", padding: "6px 12px", background: "var(--mn-green-light)", borderRadius: "var(--mn-r-md)", display: "flex", alignItems: "center", gap: 4 }}>
              Ver planes <ArrowRight size={12} />
            </Link>
          </div>
        ) : coach ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10 }}>
            {coach.recommendations
              .filter((rec, i, arr) => arr.findIndex(r => r.type === rec.type && r.title === rec.title) === i)
              .map((rec, i) => <CoachCard key={i} rec={rec} />)}
          </div>
        ) : null}
      </div>

      {/* 9 — Mis materias */}
      <div className="mn-fade-up" style={{ marginBottom: 8, animationDelay: "400ms" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <h2 className="font-display" style={{ fontSize: 18, fontWeight: 800, color: "var(--mn-ink-1)" }}>Mis materias</h2>
          <Link href="/onboarding?returning=true" style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, color: "var(--mn-green)", fontWeight: 600, textDecoration: "none" }}>
            <Plus size={14} /> Agregar
          </Link>
        </div>

        {!loaded ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[1, 2, 3].map(i => <div key={i} style={{ height: 140, background: "var(--mn-raised)", borderRadius: "var(--mn-r-xl)", animation: "pulse-skeleton 1.4s ease infinite" }} />)}
          </div>
        ) : subjects.length === 0 ? (
          <div className="mn-card" style={{ padding: 32, textAlign: "center", boxShadow: "var(--mn-shadow-sm)" }}>
            <div style={{ fontSize: 36, marginBottom: 14 }}>📚</div>
            <p className="font-display" style={{ fontSize: 18, fontWeight: 800, color: "var(--mn-ink-1)", marginBottom: 8 }}>
              Empecemos.
            </p>
            <p style={{ fontSize: 14, color: "var(--mn-ink-2)", marginBottom: 24, lineHeight: 1.6 }}>
              Agrega tu primera materia y tu tutor queda listo para estudiar contigo.
            </p>
            <Link href="/onboarding" className="mn-btn-primary" style={{ fontSize: 15, padding: "13px 28px" }}>
              Agregar mi primera materia →
            </Link>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {/* Checklist de primeros pasos — solo visible si el usuario aún no ha ganado XP */}
            {loaded && gamification !== null && gamification.xpTotal === 0 && subjects.length > 0 && (() => {
              const firstSubject = subjects[0];
              const steps = [
                { done: subjects.length > 0,         label: "Creaste tu primera materia",         href: null },
                { done: hasDocument,                  label: "Sube un documento a tu materia",     href: `/materias/${firstSubject.id}` },
                { done: false,                        label: "Practica tus primeras flashcards",    href: `/flashcards/${firstSubject.id}` },
                { done: false,                        label: "Chatea con el tutor",                 href: `/tutor/${firstSubject.id}` },
              ];
              const completed = steps.filter(s => s.done).length;
              if (completed >= steps.length) return null;
              return (
                <div style={{ background: "var(--mn-surface)", border: "1px solid var(--mn-ink-4)", borderRadius: "var(--mn-r-xl)", padding: "16px 18px", marginBottom: 4 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: "var(--mn-ink-1)" }}>Primeros pasos</p>
                    <span style={{ fontSize: 11, color: "var(--mn-ink-3)" }}>{completed}/{steps.length}</span>
                  </div>
                  <div style={{ height: 4, background: "var(--mn-raised)", borderRadius: "var(--mn-r-full)", marginBottom: 14, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${(completed / steps.length) * 100}%`, background: "var(--mn-green)", borderRadius: "var(--mn-r-full)" }} />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {steps.map((step, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 20, height: 20, borderRadius: "50%", border: `1.5px solid ${step.done ? "var(--mn-green)" : "var(--mn-ink-4)"}`, background: step.done ? "var(--mn-green)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          {step.done && <CheckCircle size={12} color="#fff" />}
                        </div>
                        {step.href && !step.done ? (
                          <Link href={step.href} style={{ fontSize: 13, color: "var(--mn-ink-1)", textDecoration: "none", fontWeight: 500 }}>
                            {step.label} <ArrowRight size={11} style={{ display: "inline", verticalAlign: "middle" }} />
                          </Link>
                        ) : (
                          <p style={{ fontSize: 13, color: step.done ? "var(--mn-ink-3)" : "var(--mn-ink-2)", textDecoration: step.done ? "line-through" : "none" }}>{step.label}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
            {[...subjects].sort((a, b) => {
              const sa = subjectStats.get(a.id);
              const sb = subjectStats.get(b.id);
              // Examen más próximo primero
              const daysA = sa?.daysToExam ?? 999;
              const daysB = sb?.daysToExam ?? 999;
              if (daysA !== daysB) return daysA - daysB;
              // Luego menor dominio (más necesita atención)
              const mastA = sa?.masteryPct ?? 100;
              const mastB = sb?.masteryPct ?? 100;
              return mastA - mastB;
            }).map(s => (
              <SubjectControlCard key={s.id} subject={s} stat={subjectStats.get(s.id) ?? null} />
            ))}
          </div>
        )}
      </div>

      {/* 10 — Referidos */}
      <ReferralWidget />

      <style>{`
        @keyframes pulse-skeleton { 0%,100%{opacity:1} 50%{opacity:0.45} }
        @keyframes streak-pop { 0%{transform:scale(1)} 50%{transform:scale(1.1)} 100%{transform:scale(1)} }
        @media (prefers-reduced-motion: reduce) { .mn-fade-up { animation: none !important; } }
      `}</style>
    </div>
  );
}

const TASK_CONFIG = {
  review:     { icon: <Zap size={13} color="#D97706" />,       bg: "#FEF3C7", text: "#92400E",  dot: "#D97706" },
  quiz:       { icon: <Target size={13} color="#7C3AED" />,    bg: "#EDE9FE", text: "#5B21B6",  dot: "#7C3AED" },
  exam_prep:  { icon: <Flame size={13} color="#DC2626" />,     bg: "#FEE2E2", text: "#991B1B",  dot: "#DC2626" },
  study_weak: { icon: <Brain size={13} color="#1B3F2F" />,     bg: "#E8F1EC", text: "#1B3F2F",  dot: "#1B3F2F" },
};

function DailyPlannerWidget({
  tasks, locked, hasSubjects,
}: {
  tasks: PlanTask[] | null;
  locked: boolean;
  hasSubjects: boolean;
}) {
  const loaded = tasks !== null;
  const totalMinutes = (tasks ?? []).reduce((acc, t) => acc + t.minutesEst, 0);
  const hasData = hasSubjects;

  return (
    <div className="mn-card" style={{ padding: "18px 20px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 28, height: 28, background: "#1B3F2F", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <CheckCircle size={14} color="#fff" />
          </div>
          <div>
            <p className="font-display" style={{ fontSize: 14, fontWeight: 800, color: "#1A1612", lineHeight: 1.2 }}>
              ¿Qué estudiar hoy?
            </p>
            {loaded && (tasks ?? []).length > 0 && (
              <p style={{ fontSize: 11, color: "#9E9389" }}>~{totalMinutes} min estimados</p>
            )}
          </div>
        </div>
        {loaded && (tasks ?? []).length > 0 && (
          <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 8px", background: "#E8F1EC", color: "#1B3F2F", borderRadius: 8 }}>
            {(tasks ?? []).length} tarea{(tasks ?? []).length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Content */}
      {locked ? (
        <div style={{ textAlign: "center", padding: "12px 0" }}>
          <p style={{ fontSize: 13, color: "#9E9389", marginBottom: 8 }}>El planificador diario es una función Pro.</p>
          <Link href="/upgrade" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: "#1B3F2F", fontWeight: 700, textDecoration: "none", padding: "6px 12px", background: "#E8F1EC", borderRadius: 8 }}>
            Ver planes <ArrowRight size={12} />
          </Link>
        </div>
      ) : !loaded ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ height: 52, background: "#F7F4EF", borderRadius: 10, animation: "pulse-skeleton 1.4s ease infinite" }} />
          ))}
        </div>
      ) : !hasData ? (
        <div style={{ textAlign: "center", padding: "12px 0" }}>
          <p style={{ fontSize: 13, color: "#9E9389" }}>Agrega una materia para ver tu plan del día.</p>
          <Link href="/onboarding?returning=true" style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 10, fontSize: 12, color: "#1B3F2F", fontWeight: 700, textDecoration: "none" }}>
            + Agregar materia <ArrowRight size={12} />
          </Link>
        </div>
      ) : (tasks ?? []).length === 0 ? (
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0" }}>
          <span style={{ fontSize: 24 }}>🎉</span>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#1A1612" }}>Sin tareas para hoy.</p>
            <p style={{ fontSize: 12, color: "#9E9389" }}>Cuando tengas exámenes próximos, Mnemora organizará tu día aquí.</p>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {(tasks ?? []).map((task, i) => {
            const cfg = TASK_CONFIG[task.type];
            return (
              <Link
                key={i}
                href={task.ctaHref}
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "11px 14px", borderRadius: 11,
                  background: i === 0 ? cfg.bg : "#F7F4EF",
                  border: i === 0 ? `0.5px solid ${cfg.dot}33` : "0.5px solid rgba(26,22,18,0.07)",
                  textDecoration: "none", transition: "background 120ms",
                }}
              >
                {/* Icon */}
                <div style={{ width: 28, height: 28, borderRadius: 8, background: i === 0 ? "white" : "#EDE9E2", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {cfg.icon}
                </div>
                {/* Text */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "#1A1612", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {task.title}
                  </p>
                  <p style={{ fontSize: 11, color: "#9E9389", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {task.description}
                  </p>
                </div>
                {/* Time + CTA */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2, flexShrink: 0 }}>
                  <span style={{ fontSize: 10, color: "#C4BAAE" }}>{task.minutesEst} min</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: i === 0 ? cfg.text : "#1B3F2F" }}>
                    {task.ctaLabel} →
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

const ACHIEVEMENT_ICONS: Record<string, { icon: string; title: string }> = {
  first_session:       { icon: "🎓", title: "Primera sesión" },
  streak_3:            { icon: "🔥", title: "3 días seguidos" },
  streak_7:            { icon: "⚡", title: "Semana sin parar" },
  quiz_first:          { icon: "✅", title: "Primer quiz" },
  quiz_5:              { icon: "🎯", title: "5 quizzes" },
  cards_50:            { icon: "🧠", title: "50 flashcards" },
  cards_200:           { icon: "📚", title: "200 flashcards" },
  upload_first:        { icon: "📁", title: "Primer material" },
  transcription_first: { icon: "🎙", title: "Clase transcrita" },
  photo_first:         { icon: "📷", title: "Análisis visual" },
  xp_500:              { icon: "⭐", title: "Estudiante activo" },
  xp_2000:             { icon: "🏆", title: "Estudio avanzado" },
};

type GoalType = "pass" | "grade" | "exam" | "scholarship" | "hours";
const GOAL_LABEL: Record<GoalType, string> = {
  pass: "Aprobar",
  grade: "Meta nota",
  exam: "Preparar examen",
  scholarship: "Mantener beca",
  hours: "Meta horas",
};

function SubjectControlCard({ subject, stat }: { subject: Subject; stat: SubjectStat | null }) {
  const examUrgent = stat?.daysToExam !== null && stat?.daysToExam !== undefined && stat.daysToExam <= 7;
  const approvalColor = {
    alta:  { bg: "#D1FAE5", text: "#059669" },
    media: { bg: "#FEF3C7", text: "#D97706" },
    baja:  { bg: "#FEE2E2", text: "#DC2626" },
  }[stat?.approvalProb ?? "media"];

  return (
    <div className="mn-card" style={{ padding: "18px 20px", borderRadius: 16 }}>
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, overflow: "hidden" }}>
          <div style={{ width: 34, height: 34, background: "#E8F1EC", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <FileText size={15} color="#1B3F2F" />
          </div>
          <div style={{ flex: 1, overflow: "hidden" }}>
            <p className="font-display" style={{ fontSize: 14, fontWeight: 800, color: "#1A1612", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {subject.name}
            </p>
            {subject.professor && <p style={{ fontSize: 11, color: "#9E9389" }}>{subject.professor}</p>}
            {subject.goal_type && (
              <p style={{ fontSize: 10, color: "#1B3F2F", fontWeight: 700, marginTop: 1 }}>
                🎯 {GOAL_LABEL[subject.goal_type as GoalType] ?? subject.goal_type}
                {subject.goal_value ? ` ${subject.goal_type === "grade" ? `· nota ${subject.goal_value}` : subject.goal_type === "hours" ? `· ${subject.goal_value}h/sem` : ""}` : ""}
              </p>
            )}
          </div>
        </div>
        {/* Next exam badge */}
        {stat?.nextExam && stat.daysToExam !== null && (
          <span style={{
            fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 8, flexShrink: 0,
            background: examUrgent ? "#FEF3C7" : "#F7F4EF",
            color: examUrgent ? "#D97706" : "#6B6259",
            border: examUrgent ? "0.5px solid #D97706" : "none",
          }}>
            {examUrgent ? <Flame size={9} style={{ display: "inline", marginRight: 3 }} /> : null}
            {stat.daysToExam === 0 ? "Examen hoy" : stat.daysToExam === 1 ? "Examen mañana" : `Examen en ${stat.daysToExam}d`}
          </span>
        )}
      </div>

      {/* Stats row */}
      {stat && stat.totalConcepts > 0 ? (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
            {/* Coverage */}
            <div>
              <p style={{ fontSize: 10, color: "#9E9389", marginBottom: 4, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>Cobertura</p>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ flex: 1, height: 4, background: "#EDE9E2", borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ width: `${stat.coveragePct}%`, height: "100%", background: stat.coveragePct >= 70 ? "#059669" : stat.coveragePct >= 40 ? "#D97706" : "#DC2626", borderRadius: 4, transition: "width 600ms ease" }} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#1A1612", minWidth: 28, textAlign: "right" }}>{stat.coveragePct}%</span>
              </div>
            </div>
            {/* Mastery */}
            <div>
              <p style={{ fontSize: 10, color: "#9E9389", marginBottom: 4, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>Dominio</p>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ flex: 1, height: 4, background: "#EDE9E2", borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ width: `${stat.masteryPct}%`, height: "100%", background: "#1B3F2F", borderRadius: 4, transition: "width 600ms ease" }} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#1A1612", minWidth: 28, textAlign: "right" }}>{stat.masteryPct}%</span>
              </div>
            </div>
            {/* Predicted grade */}
            <div>
              <p style={{ fontSize: 10, color: "#9E9389", marginBottom: 4, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>Nota est.</p>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 15, fontWeight: 800, color: "#1A1612", lineHeight: 1 }}>
                  {stat.predictedGrade.toFixed(1)}
                </span>
                <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 5px", borderRadius: 5, background: approvalColor.bg, color: approvalColor.text }}>
                  {stat.approvalProb === "alta" ? "Vas bien" : stat.approvalProb === "media" ? "En riesgo" : "Crítico"}
                </span>
              </div>
            </div>
          </div>

          {/* Weak concepts */}
          {stat.weakConcepts.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
              <span style={{ fontSize: 10, color: "#9E9389", fontWeight: 600 }}>Débiles:</span>
              {stat.weakConcepts.map((c, i) => (
                <span key={i} style={{ fontSize: 10, padding: "2px 7px", background: "#FEF3C7", color: "#92400E", borderRadius: 6, fontWeight: 600 }}>
                  {c}
                </span>
              ))}
            </div>
          )}
        </>
      ) : (
        <p style={{ fontSize: 12, color: "#C4BAAE", marginBottom: 14 }}>
          Sube un documento para que Mnemora analice tu progreso.
        </p>
      )}

      {/* CTA row — smart, contextual */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {examUrgent ? (
          // Examen en ≤7 días: acción principal es Modo Examen
          <>
            <Link href={`/examen/${subject.id}`} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#92400E", fontWeight: 700, textDecoration: "none", padding: "6px 10px", background: "#FEF3C7", border: "0.5px solid #D97706", borderRadius: 8 }}>
              <Flame size={11} /> Modo Examen
            </Link>
            {stat && stat.pendingReviewCount > 0 && (
              <Link href={`/flashcards/${subject.id}`} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#1B3F2F", fontWeight: 700, textDecoration: "none", padding: "6px 10px", background: "#E8F1EC", borderRadius: 8 }}>
                <Layers size={11} /> {stat.pendingReviewCount} pendientes
              </Link>
            )}
          </>
        ) : stat === null || stat.totalConcepts === 0 ? (
          // Sin contenido: invitar a subir material
          <>
            <Link href={`/materias/${subject.id}`} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#1B3F2F", fontWeight: 700, textDecoration: "none", padding: "6px 10px", background: "#E8F1EC", borderRadius: 8 }}>
              <FileText size={11} /> Subir material
            </Link>
            <Link href={`/tutor/${subject.id}`} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#6B6259", fontWeight: 600, textDecoration: "none", padding: "6px 10px", background: "#F7F4EF", borderRadius: 8 }}>
              <Brain size={11} /> Tutor
            </Link>
          </>
        ) : stat.pendingReviewCount > 0 ? (
          // Hay flashcards pendientes de repaso: esa es la prioridad
          <>
            <Link href={`/flashcards/${subject.id}`} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#1B3F2F", fontWeight: 700, textDecoration: "none", padding: "6px 10px", background: "#E8F1EC", borderRadius: 8 }}>
              <Layers size={11} /> Repasar ({stat.pendingReviewCount})
            </Link>
            <Link href={`/tutor/${subject.id}`} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#6B6259", fontWeight: 600, textDecoration: "none", padding: "6px 10px", background: "#F7F4EF", borderRadius: 8 }}>
              <Brain size={11} /> Tutor
            </Link>
          </>
        ) : stat.masteryPct < 40 ? (
          // Dominio bajo: priorizar tutor para cubrir conceptos
          <>
            <Link href={`/tutor/${subject.id}`} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#1B3F2F", fontWeight: 700, textDecoration: "none", padding: "6px 10px", background: "#E8F1EC", borderRadius: 8 }}>
              <Brain size={11} /> Estudiar con tutor
            </Link>
            <Link href={`/flashcards/${subject.id}`} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#6B6259", fontWeight: 600, textDecoration: "none", padding: "6px 10px", background: "#F7F4EF", borderRadius: 8 }}>
              <Layers size={11} /> Flashcards
            </Link>
          </>
        ) : (
          // Todo al día: quiz para consolidar + progreso
          <>
            <Link href={`/quiz/${subject.id}`} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#7C3AED", fontWeight: 700, textDecoration: "none", padding: "6px 10px", background: "#EDE9FE", borderRadius: 8 }}>
              <Target size={11} /> Quiz
            </Link>
            <Link href={`/progreso?subject=${subject.id}`} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#6B6259", fontWeight: 600, textDecoration: "none", padding: "6px 10px", background: "#F7F4EF", borderRadius: 8 }}>
              <BarChart2 size={11} /> Progreso
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

function CoachCard({ rec }: { rec: CoachRecommendation }) {
  const urgencyStyle = {
    high:   { border: "#D97706", dot: "#D97706", bg: "#FFFBEB" },
    medium: { border: "rgba(26,22,18,0.10)", dot: "#1B3F2F", bg: "#FFFFFF" },
    low:    { border: "rgba(26,22,18,0.10)", dot: "#C4BAAE", bg: "#FFFFFF" },
  }[rec.urgency];

  const typeIcon =
    rec.type === "exam_prep"    ? <Target size={13} color="#D97706" /> :
    rec.type === "review"       ? <Zap size={13} color="#1B3F2F" /> :
    rec.type === "new_topic"    ? <TrendingUp size={13} color="#7C3AED" /> :
    <CheckCircle size={13} color="#059669" />;

  return (
    <Link
      href={rec.actionHref}
      style={{
        display: "flex", flexDirection: "column", gap: 8,
        padding: "14px 16px", borderRadius: 12, textDecoration: "none",
        background: urgencyStyle.bg,
        border: `0.5px solid ${urgencyStyle.border}`,
        transition: "background 120ms",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {typeIcon}
        <p style={{ fontSize: 12, fontWeight: 700, color: "#1A1612", lineHeight: 1.3 }}>{rec.title}</p>
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: urgencyStyle.dot, marginLeft: "auto", flexShrink: 0 }} />
      </div>
      <p style={{ fontSize: 12, color: "#6B6259", lineHeight: 1.5 }}>{rec.description}</p>
      <p style={{ fontSize: 11, color: "#1B3F2F", fontWeight: 600, display: "flex", alignItems: "center", gap: 3 }}>
        {rec.actionLabel} <ArrowRight size={10} />
      </p>
    </Link>
  );
}

function ReferralWidget() {
  const [data, setData] = useState<{ convertedCount: number; nextMilestone: { count: number; label: string } | null } | null>(null);

  useEffect(() => {
    fetch("/api/referrals").then(r => r.ok ? r.json() : null).then(d => { if (d) setData(d); }).catch(() => {});
  }, []);

  if (!data) return null;

  const next = data.nextMilestone;
  const pct  = next ? Math.min(100, Math.round((data.convertedCount / next.count) * 100)) : 100;

  return (
    <div className="mn-fade-up" style={{ marginBottom: 20, animationDelay: "140ms" }}>
      <div style={{ background: "#fff", borderRadius: 14, border: "0.5px solid rgba(26,22,18,0.08)", padding: "16px 18px", display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: "#E8F1EC", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Gift size={18} color="#1B3F2F" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#1A1612" }}>
              {next ? `Invita amigos · ${data.convertedCount}/${next.count}` : "¡Eres Embajador Mnemora! 👑"}
            </p>
            {next && <p style={{ fontSize: 12, fontWeight: 700, color: "#1B3F2F" }}>{next.label} gratis</p>}
          </div>
          {next && (
            <div style={{ height: 5, background: "#F0EDE8", borderRadius: 99, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${pct}%`, background: "#1B3F2F", borderRadius: 99, transition: "width 600ms ease" }} />
            </div>
          )}
        </div>
        <Link href="/referidos" style={{ display: "flex", alignItems: "center", gap: 4, padding: "7px 14px", borderRadius: 9, background: "#1B3F2F", color: "#fff", textDecoration: "none", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
          Compartir <ArrowRight size={12} />
        </Link>
      </div>
    </div>
  );
}
