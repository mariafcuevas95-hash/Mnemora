"use client";

import { useState, useEffect, useCallback , Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Layers, RotateCcw, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Flashcard = { id: string; front: string; back: string };
type Rating = { label: string; quality: 0 | 1 | 2 | 3 | 4 | 5; color: string };

const RATINGS: Rating[] = [
  { label: "No lo sé",  quality: 0, color: "var(--mn-error)" },
  { label: "Difícil",   quality: 2, color: "var(--mn-amber)" },
  { label: "Bien",      quality: 4, color: "#16A34A" },
  { label: "Perfecto",  quality: 5, color: "var(--mn-green)" },
];

function FlashcardsReviewPageInner() {
  const { subjectId } = useParams<{ subjectId: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isGuided = searchParams.get("guided") === "1";

  const [cards, setCards] = useState<Flashcard[]>([]);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [subjectName, setSubjectName] = useState("");
  const [rating, setRating] = useState(false);
  const [xpResult, setXpResult] = useState<{ xpEarned: number; streakDays: number; newAchievements: { title: string; icon: string }[] } | null>(null);
  const [xpAwarded, setXpAwarded] = useState(false);
  const [cogStyle, setCogStyle] = useState<string | null>(null);
  const [cardToast, setCardToast] = useState<string | null>(null);

  useEffect(() => {
    const db = createClient();
    db.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      Promise.all([
        db.from("flashcards").select("id, front, back").eq("subject_id", subjectId).order("created_at"),
        db.from("subjects").select("name").eq("id", subjectId).single(),
        db.from("cognitive_profile").select("preferred_style").eq("user_id", user.id).eq("subject_id", subjectId).maybeSingle(),
      ]).then(([fcRes, subRes, cogRes]) => {
        const fetchedCards = fcRes.data ?? [];
        setCards(fetchedCards);
        setSubjectName(subRes.data?.name ?? "Flashcards");
        setCogStyle(cogRes.data?.preferred_style ?? null);
        setLoading(false);
        if (fetchedCards.length > 0) {
          const key = `mn-fc-toast-${subjectId}`;
          if (!localStorage.getItem(key)) {
            localStorage.setItem(key, "1");
            setCardToast(`Mnemora tiene ${fetchedCards.length} flashcard${fetchedCards.length !== 1 ? "s" : ""} listas para ti.`);
            setTimeout(() => setCardToast(null), 4000);
          }
        }
      });
    });
  }, [subjectId]);

  const handleRate = useCallback(async (quality: number) => {
    if (rating) return;
    setRating(true);
    const card = cards[idx];
    setScores(prev => ({ ...prev, [card.id]: quality }));

    fetch("/api/review-flashcard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ flashcardId: card.id, quality }),
    }).catch(() => {});

    await new Promise(r => setTimeout(r, 220));
    setFlipped(false);
    await new Promise(r => setTimeout(r, 280));
    setIdx(prev => prev + 1);
    setRating(false);
  }, [idx, cards, rating]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === "Space" && !flipped) { e.preventDefault(); setFlipped(true); }
      if (flipped && !rating) {
        if (e.key === "1") handleRate(0);
        if (e.key === "2") handleRate(2);
        if (e.key === "3") handleRate(4);
        if (e.key === "4") handleRate(5);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [flipped, rating, handleRate]);

  const done = idx >= cards.length && cards.length > 0;
  const correctCount = Object.values(scores).filter(q => q >= 3).length;

  useEffect(() => {
    if (done && !xpAwarded && cards.length >= 3) {
      setXpAwarded(true);
      fetch("/api/xp/award", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event: "flashcard_session", meta: { cards_reviewed: cards.length } }),
      })
        .then(r => r.json())
        .then(data => setXpResult(data))
        .catch(() => {});
    }
  }, [done, xpAwarded, cards.length]);

  const pct = cards.length ? Math.round((idx / cards.length) * 100) : 0;

  /* ── Loading ─────────────────────────────── */
  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "var(--mn-canvas)" }}>
      <div style={{ textAlign: "center" }}>
        <Layers size={28} color="var(--mn-ink-4)" style={{ marginBottom: 12 }} />
        <p style={{ color: "var(--mn-ink-3)", fontSize: 14 }}>Cargando tarjetas...</p>
      </div>
    </div>
  );

  /* ── Empty ───────────────────────────────── */
  if (!loading && cards.length === 0) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", background: "var(--mn-canvas)", padding: 32, textAlign: "center" }}>
      <div style={{ width: 56, height: 56, background: "var(--mn-raised)", borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
        <Layers size={24} color="var(--mn-ink-3)" />
      </div>
      <h2 className="font-display" style={{ fontSize: 20, fontWeight: 700, color: "var(--mn-ink-1)", marginBottom: 8 }}>
        Todavía no hay flashcards
      </h2>
      <p style={{ fontSize: 14, color: "var(--mn-ink-2)", marginBottom: 28, maxWidth: 300, lineHeight: 1.6 }}>
        Sube un documento en la página de la materia y Mnemora las genera automáticamente.
      </p>
      <Link href={`/materias/${subjectId}`} className="mn-btn-primary" style={{ fontSize: 14 }}>
        Ir a la materia <ArrowRight size={14} />
      </Link>
    </div>
  );

  /* ── Complete ────────────────────────────── */
  if (done) {
    const pctCorrect = Math.round((correctCount / cards.length) * 100);
    const masteredCards = cards.filter(c => (scores[c.id] ?? 0) >= 4);
    const toReviewCards = cards.filter(c => (scores[c.id] ?? 0) < 3);
    const bestCard = masteredCards[0];

    const message = pctCorrect >= 80 && masteredCards.length >= Math.ceil(cards.length / 2)
      ? "Este tema ya empieza a quedarse contigo."
      : pctCorrect >= 80
      ? "Buena sesión. Este contenido ya empieza a consolidarse en tu memoria."
      : pctCorrect >= 60
      ? `Progreso sólido. Dominaste ${masteredCards.length} de ${cards.length} tarjetas.`
      : "Detecté que estos conceptos necesitan otro enfoque. Mañana los reforzamos.";

    const detail = pctCorrect >= 80 && masteredCards.length >= Math.ceil(cards.length / 2)
      ? `Voy a reducir la frecuencia de estas ${masteredCards.length} tarjetas para que avancemos más rápido.`
      : toReviewCards.length > 0
      ? `${toReviewCards.length} tarjeta${toReviewCards.length !== 1 ? "s" : ""} vuelven mañana con mayor frecuencia — ya las reprogramé.`
      : "Todas las tarjetas quedan programadas según tu curva de aprendizaje.";

    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "var(--mn-canvas)", padding: "32px 24px" }}>
        <div style={{ maxWidth: 440, width: "100%" }}>

          {/* Mnemora voice — white card */}
          <div className="mn-fade-up" style={{ background: "var(--mn-surface)", borderRadius: "var(--mn-r-xl)", padding: "28px 28px 24px", marginBottom: 14, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "var(--mn-ink-3)", letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 12 }}>
              Sesión completada · {cards.length} tarjetas
            </p>
            <p className="font-display" style={{ fontSize: 18, fontWeight: 700, color: "var(--mn-ink-1)", lineHeight: 1.4, marginBottom: 8 }}>
              {message}
            </p>
            <p style={{ fontSize: 14, color: "var(--mn-ink-2)", lineHeight: 1.6, marginBottom: bestCard && pctCorrect >= 70 ? 10 : 0 }}>
              {detail}
            </p>

            {bestCard && pctCorrect >= 70 && (
              <p style={{ fontSize: 13, color: "var(--mn-ink-3)", fontStyle: "italic" }}>
                "{bestCard.front.slice(0, 55)}{bestCard.front.length > 55 ? "…" : ""}"
              </p>
            )}

            {cogStyle && cogStyle !== "balanced" && (
              <p style={{ fontSize: 13, color: "var(--mn-ink-2)", marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--mn-ink-4)", lineHeight: 1.55 }}>
                {cogStyle === "visual"
                  ? "Como aprendes mejor de forma visual, revisa el mapa mental de esta materia después."
                  : cogStyle === "practical"
                  ? "Como aprendes mejor con práctica, haz el quiz para consolidar esto."
                  : "Como prefieres el análisis conceptual, pregúntale al tutor si algo quedó poco claro."}
              </p>
            )}

            {xpResult && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--mn-ink-4)" }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--mn-ink-1)" }}>⚡ +{xpResult.xpEarned} XP</span>
                <span style={{ fontSize: 12, color: "var(--mn-ink-2)" }}>🔥 {xpResult.streakDays} día{xpResult.streakDays !== 1 ? "s" : ""} seguido{xpResult.streakDays !== 1 ? "s" : ""}</span>
              </div>
            )}

            {xpResult?.newAchievements.map(a => (
              <div key={a.title} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", background: "var(--mn-raised)", borderRadius: "var(--mn-r-md)", marginTop: 8 }}>
                <span style={{ fontSize: 15 }}>{a.icon}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--mn-ink-1)" }}>Logro desbloqueado: {a.title}</span>
              </div>
            ))}
          </div>

          {/* Score mini-cards */}
          <div className="mn-fade-up" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16, animationDelay: "80ms" }}>
            <div style={{ background: "var(--mn-surface)", borderRadius: "var(--mn-r-lg)", padding: "16px 12px", textAlign: "center", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
              <p className="font-display" style={{ fontSize: 28, fontWeight: 700, color: "var(--mn-ink-1)", marginBottom: 2 }}>{correctCount}</p>
              <p style={{ fontSize: 11, color: "var(--mn-ink-3)" }}>Bien / Perfecto</p>
            </div>
            <div style={{ background: "var(--mn-surface)", borderRadius: "var(--mn-r-lg)", padding: "16px 12px", textAlign: "center", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
              <p className="font-display" style={{ fontSize: 28, fontWeight: 700, color: "var(--mn-ink-1)", marginBottom: 2 }}>{pctCorrect}%</p>
              <p style={{ fontSize: 11, color: "var(--mn-ink-3)" }}>Precisión</p>
            </div>
          </div>

          {/* Actions */}
          <div className="mn-fade-up" style={{ display: "flex", flexDirection: "column", gap: 8, animationDelay: "160ms" }}>
            {isGuided ? (
              <button
                onClick={() => {
                  try {
                    const raw = localStorage.getItem("mn-session");
                    if (raw) {
                      const s = JSON.parse(raw);
                      s.currentStep = Math.min(s.currentStep + 1, s.totalSteps - 1);
                      s.flashcardResult = { pctCorrect, masteredCount: masteredCards.length, total: cards.length };
                      localStorage.setItem("mn-session", JSON.stringify(s));
                      window.dispatchEvent(new Event("mn-session-update"));
                    }
                  } catch {}
                  router.push(`/quiz/${subjectId}?guided=1`);
                }}
                className="mn-btn-primary"
                style={{ justifyContent: "center", fontSize: 14 }}
              >
                Siguiente — Quiz <ArrowRight size={14} />
              </button>
            ) : (
              <>
                {pctCorrect >= 70 && (
                  <Link
                    href={`/quiz/${subjectId}`}
                    className="mn-btn-primary"
                    style={{ justifyContent: "center", fontSize: 14, textDecoration: "none" }}
                  >
                    Consolidar con un quiz
                  </Link>
                )}
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => { setIdx(0); setFlipped(false); setScores({}); }}
                    style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "11px 14px", borderRadius: "var(--mn-r-lg)", border: "1px solid var(--mn-ink-4)", background: "var(--mn-surface)", fontSize: 13, fontWeight: 600, color: "var(--mn-ink-2)", cursor: "pointer" }}
                  >
                    <RotateCcw size={13} /> Repasar otra vez
                  </button>
                  <Link
                    href={`/materias/${subjectId}`}
                    style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "11px 14px", borderRadius: "var(--mn-r-lg)", background: "var(--mn-raised)", fontSize: 13, fontWeight: 600, color: "var(--mn-ink-2)", textDecoration: "none" }}
                  >
                    Volver <ArrowRight size={13} />
                  </Link>
                </div>
              </>
            )}
          </div>

        </div>
      </div>
    );
  }

  /* ── Review ──────────────────────────────── */
  const card = cards[idx];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100dvh", maxHeight: "100dvh", overflow: "hidden", background: "var(--mn-canvas)" }}>

      {/* Toast: primera carga */}
      {cardToast && (
        <div style={{ position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", background: "#1B3F2F", color: "#fff", padding: "10px 20px", borderRadius: 12, fontSize: 13, fontWeight: 600, zIndex: 200, animation: "toast-in 300ms ease", whiteSpace: "nowrap", boxShadow: "0 4px 16px rgba(0,0,0,0.2)" }}>
          ✨ {cardToast}
          <style>{`@keyframes toast-in{from{opacity:0;transform:translateX(-50%) translateY(-8px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}`}</style>
        </div>
      )}

      {/* Header */}
      <div style={{ padding: "14px 24px", display: "flex", alignItems: "center", gap: 14, borderBottom: "1px solid var(--mn-ink-4)", background: "var(--mn-surface)" }}>
        <Link href={`/materias/${subjectId}`} style={{ display: "flex", alignItems: "center", color: "var(--mn-ink-3)", textDecoration: "none" }}>
          <ChevronLeft size={20} />
        </Link>
        <div style={{ flex: 1 }}>
          <p className="font-display" style={{ fontWeight: 700, fontSize: 14, color: "var(--mn-ink-1)" }}>{subjectName}</p>
          <p style={{ fontSize: 12, color: "var(--mn-ink-3)" }}>Tarjeta {idx + 1} de {cards.length}</p>
        </div>
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--mn-ink-2)" }}>{pct}%</span>
      </div>

      {/* Progress bar */}
      <div style={{ height: 2, background: "var(--mn-ink-4)" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: "var(--mn-green)", transition: "width 300ms var(--mn-ease)" }} />
      </div>

      {/* Card area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 24px", gap: 28 }}>

        {/* 3D Flip card */}
        <div
          style={{ perspective: "1000px", width: "100%", maxWidth: 520, cursor: flipped ? "default" : "pointer" }}
          onClick={() => !flipped && setFlipped(true)}
        >
          <div style={{
            position: "relative",
            width: "100%",
            minHeight: 220,
            transformStyle: "preserve-3d",
            transition: "transform 0.42s cubic-bezier(0.4,0,0.2,1)",
            transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
          }}>
            {/* Front */}
            <div style={{
              position: "absolute", inset: 0,
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
              background: "var(--mn-surface)",
              borderRadius: "var(--mn-r-xl)",
              border: "1px solid var(--mn-ink-4)",
              boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
              padding: "36px 28px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              minHeight: 220,
            }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: "var(--mn-ink-3)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 18 }}>Pregunta</p>
              <p className="font-display" style={{ fontSize: 20, fontWeight: 700, color: "var(--mn-ink-1)", lineHeight: 1.45 }}>{card.front}</p>
              {!flipped && (
                <p style={{ fontSize: 12, color: "var(--mn-ink-4)", marginTop: 24 }}>Toca para revelar · Espacio</p>
              )}
            </div>

            {/* Back — white, sin bloque de color */}
            <div style={{
              position: "absolute", inset: 0,
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
              background: "var(--mn-surface)",
              borderRadius: "var(--mn-r-xl)",
              border: "1px solid var(--mn-ink-4)",
              boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
              padding: "36px 28px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              minHeight: 220,
            }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: "var(--mn-ink-3)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 18 }}>Respuesta</p>
              <p className="font-display" style={{ fontSize: 19, fontWeight: 600, color: "var(--mn-ink-1)", lineHeight: 1.5 }}>{card.back}</p>
            </div>
          </div>
        </div>

        {/* Reveal / Rating */}
        {!flipped ? (
          <button
            onClick={() => setFlipped(true)}
            className="mn-btn-primary"
            style={{ fontSize: 15, padding: "13px 36px" }}
          >
            Revelar respuesta
          </button>
        ) : (
          <div style={{ width: "100%", maxWidth: 520 }}>
            <p style={{ textAlign: "center", fontSize: 12, color: "var(--mn-ink-3)", marginBottom: 14 }}>
              ¿Cómo te fue? · Teclas 1–4
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
              {RATINGS.map((r, i) => (
                <button
                  key={r.label}
                  onClick={() => handleRate(r.quality)}
                  disabled={rating}
                  style={{
                    padding: "12px 8px",
                    borderRadius: "var(--mn-r-lg)",
                    border: "1px solid var(--mn-ink-4)",
                    background: "var(--mn-surface)",
                    color: r.color,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: rating ? "default" : "pointer",
                    opacity: rating ? 0.5 : 1,
                    transition: "transform 100ms, opacity 150ms",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 4,
                  }}
                  onMouseEnter={e => { if (!rating) (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.03)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)"; }}
                >
                  <span style={{ fontSize: 10, color: "var(--mn-ink-3)" }}>{i + 1}</span>
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function FlashcardsReviewPage() {
  return <Suspense><FlashcardsReviewPageInner /></Suspense>;
}
