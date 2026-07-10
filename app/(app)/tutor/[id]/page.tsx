"use client";

import { useState, useRef, useEffect, useCallback , Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Send, ChevronLeft, Sparkles, Calendar, BookOpen, X, ArrowUp } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { PaywallModal } from "@/components/paywall-modal";
import MnemoraNode from "@/components/ui/MnemoraNode";
import type { Feature, PlanId } from "@/lib/plans";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
};

type PaywallState = { feature: Feature; message: string; planRequired: PlanId } | null;

type GreetingContext = {
  subjectName: string;
  sessionCount: number;
  weakConcepts: string[];
  nextExam: { title: string; daysUntil: number } | null;
  isFirstSession: boolean;
};

type GuidedResults = {
  flashcard?: { pctCorrect: number; masteredCount: number; total: number };
  quiz?: { score: number; total: number; pct: number };
};

function renderMarkdown(text: string): string {
  // Escape HTML before applying markdown to prevent XSS from AI-generated content
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return escaped
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/_(.*?)_/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, "<code style=\"background:var(--mn-raised);padding:2px 6px;border-radius:4px;font-size:0.88em\">$1</code>")
    .replace(/\n/g, "<br/>");
}

function TutorContextCard({
  context,
  suggestions,
  guidedResults,
  onSend,
  onDismiss,
}: {
  context: GreetingContext;
  suggestions: string[];
  guidedResults?: GuidedResults | null;
  onSend: (text: string) => void;
  onDismiss: () => void;
}) {
  return (
    <div className="mn-fade-up" style={{
      background: "var(--mn-surface)",
      border: "1px solid var(--mn-ink-4)",
      borderRadius: "var(--mn-r-xl)",
      padding: "20px 22px",
      marginBottom: 8,
      position: "relative",
    }}>
      <button
        onClick={onDismiss}
        style={{ position: "absolute", top: 14, right: 14, background: "none", border: "none", cursor: "pointer", color: "var(--mn-ink-3)", padding: 2 }}
      >
        <X size={15} />
      </button>

      {/* Context chips */}
      <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 16 }}>
        {context.sessionCount > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 5, background: "var(--mn-green-light, #E8F1EC)", borderRadius: "var(--mn-r-full)", padding: "3px 11px", fontSize: 12, color: "var(--mn-green)", fontWeight: 600, animation: "fade-in-chip 400ms ease" }}>
            🧠 Continuando desde tu última sesión
            <style>{`@keyframes fade-in-chip{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}`}</style>
          </div>
        )}
        {context.nextExam && (
          <div style={{ display: "flex", alignItems: "center", gap: 5, background: context.nextExam.daysUntil <= 7 ? "var(--mn-amber-light)" : "var(--mn-raised)", borderRadius: "var(--mn-r-full)", padding: "3px 11px", fontSize: 12, color: context.nextExam.daysUntil <= 7 ? "var(--mn-amber)" : "var(--mn-ink-2)", fontWeight: 500 }}>
            <Calendar size={11} />
            Examen en {context.nextExam.daysUntil} días
          </div>
        )}
        {context.weakConcepts.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 5, background: "var(--mn-raised)", borderRadius: "var(--mn-r-full)", padding: "3px 11px", fontSize: 12, color: "var(--mn-ink-2)", fontWeight: 500 }}>
            Puntos débiles: {context.weakConcepts.slice(0, 2).join(", ")}
          </div>
        )}
      </div>

      {/* Guided results */}
      {guidedResults && (guidedResults.flashcard || guidedResults.quiz) && (
        <div style={{ background: "var(--mn-raised)", borderRadius: "var(--mn-r-md)", padding: "10px 14px", marginBottom: 16, display: "flex", gap: 20, flexWrap: "wrap" }}>
          {guidedResults.flashcard && (
            <div>
              <p style={{ fontSize: 11, fontWeight: 600, color: "var(--mn-ink-2)", marginBottom: 1 }}>Flashcards</p>
              <p style={{ fontSize: 13, color: "var(--mn-ink-1)" }}>{guidedResults.flashcard.pctCorrect}% · {guidedResults.flashcard.masteredCount}/{guidedResults.flashcard.total} dominadas</p>
            </div>
          )}
          {guidedResults.quiz && (
            <div>
              <p style={{ fontSize: 11, fontWeight: 600, color: "var(--mn-ink-2)", marginBottom: 1 }}>Quiz</p>
              <p style={{ fontSize: 13, color: "var(--mn-ink-1)" }}>{guidedResults.quiz.score}/{guidedResults.quiz.total} correctas · {guidedResults.quiz.pct}%</p>
            </div>
          )}
        </div>
      )}

      <p style={{ fontSize: 11, color: "var(--mn-ink-3)", marginBottom: 10, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }}>
        Sugerencias para esta sesión
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {suggestions.map((s, i) => (
          <button
            key={i}
            onClick={() => { onDismiss(); onSend(s); }}
            style={{ padding: "9px 14px", borderRadius: "var(--mn-r-md)", border: "1px solid var(--mn-ink-4)", background: "var(--mn-canvas)", fontSize: 13, color: "var(--mn-ink-1)", fontWeight: 500, cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 8, transition: "background 100ms" }}
            onMouseEnter={e => (e.currentTarget.style.background = "var(--mn-raised)")}
            onMouseLeave={e => (e.currentTarget.style.background = "var(--mn-canvas)")}
          >
            <Sparkles size={12} color="var(--mn-green)" style={{ flexShrink: 0 }} />
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

function TutorPageInner() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const conceptParam = searchParams.get("concept");
  const isGuided = searchParams.get("guided") === "1";
  const [subjectName, setSubjectName] = useState("tu materia");
  const [guidedResults, setGuidedResults] = useState<GuidedResults | null>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [paywall, setPaywall] = useState<PaywallState>(null);
  const [greetingCtx, setGreetingCtx] = useState<GreetingContext | null>(null);
  const [hasProcessedDoc, setHasProcessedDoc] = useState<boolean | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showContextCard, setShowContextCard] = useState(false);
  const [greetingLoading, setGreetingLoading] = useState(true);
  const [showCompletionScreen, setShowCompletionScreen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const greetingFetched = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!isGuided) return;
    try {
      const raw = localStorage.getItem("mn-session");
      if (!raw) return;
      const s = JSON.parse(raw);
      const results: GuidedResults = {};
      if (s.flashcardResult) results.flashcard = s.flashcardResult;
      if (s.quizResult) results.quiz = s.quizResult;
      if (results.flashcard || results.quiz) {
        setGuidedResults(results);
        setShowCompletionScreen(true);
      }
    } catch {}
  }, [isGuided]);

  useEffect(() => {
    if (greetingFetched.current) return;
    greetingFetched.current = true;
    if (conceptParam) { setGreetingLoading(false); return; }

    const params = new URLSearchParams();
    if (isGuided) {
      params.set("fromGuided", "1");
      try {
        const raw = localStorage.getItem("mn-session");
        if (raw) {
          const s = JSON.parse(raw);
          if (s.flashcardResult?.pctCorrect != null) params.set("flashPct", String(s.flashcardResult.pctCorrect));
          if (s.quizResult?.pct != null) params.set("quizPct", String(s.quizResult.pct));
        }
      } catch {}
    }

    fetch(`/api/tutor-greeting/${id}?${params}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return;
        setGreetingCtx(data.context);
        setSuggestions(data.suggestions ?? []);
        setSubjectName(data.context.subjectName);
        try { localStorage.setItem("mn-last-subject", data.context.subjectName); } catch {}
        setMessages([{ id: "init", role: "assistant", content: data.greeting }]);
        setShowContextCard(true);
      })
      .catch(() => null)
      .finally(() => setGreetingLoading(false));
  }, [id, conceptParam, isGuided]);

  useEffect(() => {
    createClient()
      .from("documents")
      .select("id", { count: "exact", head: true })
      .eq("subject_id", id)
      .eq("processing_status", "done")
      .then(({ count }) => setHasProcessedDoc((count ?? 0) > 0));
  }, [id]);

  useEffect(() => {
    if (!greetingLoading && messages.length === 0) {
      const supabase = createClient();
      supabase.from("subjects").select("name").eq("id", id).single().then(({ data }) => {
        const name = data?.name ?? "tu materia";
        setSubjectName(name);
        const content = conceptParam
          ? `Veo que quieres trabajar **${conceptParam}** en ${name}.\n\n¿Qué parte te genera dudas o quieres que explique?`
          : `Hola, soy tu tutor de **${name}**. Tengo acceso a tu historial y perfil de aprendizaje.\n\n¿Qué quieres trabajar hoy?`;
        setMessages([{ id: "init", role: "assistant", content }]);
      });
    }
  }, [greetingLoading, messages.length, id, conceptParam]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  }, [input]);

  const send = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;
    setInput("");
    setLoading(true);
    setShowContextCard(false);

    const userMsgId = Date.now().toString();
    setMessages(prev => [...prev, { id: userMsgId, role: "user", content: text }]);

    const assistantMsgId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, { id: assistantMsgId, role: "assistant", content: "", streaming: true }]);

    abortRef.current = new AbortController();

    try {
      const resp = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjectId: id,
          subjectName,
          message: text,
          ...(conversationId ? { conversationId } : {}),
          ...(conceptParam ? { focusConcept: conceptParam } : {}),
        }),
        signal: abortRef.current.signal,
      });

      if (resp.status === 429) throw new Error("Límite de mensajes por minuto alcanzado. Espera un momento.");
      if (resp.status === 403) {
        const body = await resp.json().catch(() => ({}));
        setMessages(prev => prev.filter(m => m.id !== assistantMsgId));
        setPaywall({ feature: body.feature ?? "tutor_messages", message: body.message ?? "Límite del plan alcanzado.", planRequired: body.planRequired ?? "pro" });
        return;
      }
      if (!resp.ok) throw new Error("Error del servidor. Intenta de nuevo.");

      const newConvId = resp.headers.get("X-Conversation-Id");
      if (newConvId && !conversationId) setConversationId(newConvId);

      const reader = resp.body!.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split("\n")) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          if (data === "[DONE]") break;
          try {
            const { text: token } = JSON.parse(data) as { text: string };
            accumulated += token;
            setMessages(prev => prev.map(m => m.id === assistantMsgId ? { ...m, content: accumulated } : m));
          } catch {}
        }
      }
      setMessages(prev => prev.map(m => m.id === assistantMsgId ? { ...m, streaming: false } : m));

    } catch (err: unknown) {
      const isAbort = err instanceof Error && err.name === "AbortError";
      if (!isAbort) {
        setMessages(prev => prev.map(m =>
          m.id === assistantMsgId
            ? { ...m, content: err instanceof Error ? err.message : "Ocurrió un error. Intenta de nuevo.", streaming: false }
            : m
        ));
      }
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  }, [id, subjectName, conversationId, loading, conceptParam]);

  const hasStartedConversation = messages.length > 1;
  const memoryActive = greetingCtx && greetingCtx.sessionCount > 0;

  if (showCompletionScreen && guidedResults) {
    const fcPct  = guidedResults.flashcard?.pctCorrect ?? null;
    const qzPct  = guidedResults.quiz?.pct ?? null;
    const avgPct = fcPct !== null && qzPct !== null
      ? Math.round((fcPct + qzPct) / 2)
      : fcPct ?? qzPct ?? 0;
    const emoji  = avgPct >= 80 ? "🔥" : avgPct >= 60 ? "💪" : "📚";
    const headline = avgPct >= 80
      ? "Sesión completa. Así se consolida."
      : avgPct >= 60
      ? "Bien hecho. El tutor continúa desde aquí."
      : "Práctica lista. El tutor ya sabe dónde enfocarse.";

    return (
      <div
        onClick={() => setShowCompletionScreen(false)}
        style={{
          minHeight: "100vh",
          background: "var(--mn-canvas)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px 28px",
          textAlign: "center",
          cursor: "pointer",
        }}
      >
        <style>{`
          @keyframes cs-pop {
            0% { transform: scale(0.85); opacity: 0; }
            60% { transform: scale(1.06); }
            100% { transform: scale(1); opacity: 1; }
          }
          @keyframes cs-up {
            from { transform: translateY(10px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
          @keyframes cs-bar {
            from { width: 100%; }
            to { width: 0%; }
          }
        `}</style>

        {/* Paso a paso: ✓ Flashcards · ✓ Quiz → Tutor */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 28, animation: "cs-up 0.35s ease both" }}>
          {guidedResults.flashcard && <>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--mn-green)" }}>✓ Flashcards</span>
            <span style={{ fontSize: 12, color: "var(--mn-ink-4)" }}>·</span>
          </>}
          {guidedResults.quiz && <>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--mn-green)" }}>✓ Quiz</span>
            <span style={{ fontSize: 12, color: "var(--mn-ink-4)" }}>·</span>
          </>}
          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--mn-ink-2)" }}>Tutor →</span>
        </div>

        <div style={{ animation: "cs-pop 0.4s cubic-bezier(0.34,1.56,0.64,1) both" }}>
          <div style={{ fontSize: 48, marginBottom: 14 }}>{emoji}</div>
        </div>

        <h1 className="font-display" style={{
          fontSize: 24, fontWeight: 800, color: "var(--mn-ink-1)",
          marginBottom: 18, letterSpacing: "-0.02em",
          animation: "cs-up 0.35s 0.15s ease both",
        }}>
          {headline}
        </h1>

        <div style={{
          display: "flex", gap: 10, justifyContent: "center",
          marginBottom: 32, animation: "cs-up 0.35s 0.25s ease both",
        }}>
          {guidedResults.flashcard && (
            <div style={{ padding: "8px 16px", borderRadius: 10, background: "var(--mn-surface)", border: "1px solid var(--mn-ink-4)", textAlign: "center" }}>
              <p className="font-display" style={{ fontSize: 20, fontWeight: 800, color: "var(--mn-green)", lineHeight: 1 }}>{guidedResults.flashcard.pctCorrect}%</p>
              <p style={{ fontSize: 10, color: "var(--mn-ink-3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", marginTop: 2 }}>flashcards</p>
            </div>
          )}
          {guidedResults.quiz && (
            <div style={{ padding: "8px 16px", borderRadius: 10, background: "var(--mn-surface)", border: "1px solid var(--mn-ink-4)", textAlign: "center" }}>
              <p className="font-display" style={{ fontSize: 20, fontWeight: 800, color: "var(--mn-green)", lineHeight: 1 }}>{guidedResults.quiz.pct}%</p>
              <p style={{ fontSize: 10, color: "var(--mn-ink-3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", marginTop: 2 }}>quiz</p>
            </div>
          )}
        </div>

        <p style={{ fontSize: 12, color: "var(--mn-ink-4)", animation: "cs-up 0.35s 0.35s ease both" }}>
          Toca para continuar
        </p>

        {/* Barra de progreso auto-dismiss */}
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, height: 3, background: "var(--mn-ink-4)" }}>
          <div style={{
            height: "100%", background: "var(--mn-green)",
            animation: "cs-bar 2.5s 0.3s linear forwards",
            transformOrigin: "left",
          }} onAnimationEnd={() => setShowCompletionScreen(false)} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "var(--mn-canvas)" }}>
      {paywall && (
        <PaywallModal
          feature={paywall.feature}
          message={paywall.message}
          planRequired={paywall.planRequired}
          onClose={() => setPaywall(null)}
        />
      )}

      {/* Header */}
      <div style={{ padding: "14px 24px", background: "var(--mn-surface)", borderBottom: "1px solid var(--mn-ink-4)", display: "flex", alignItems: "center", gap: 14, flexShrink: 0 }}>
        <Link href={`/materias/${id}`} style={{ display: "flex", alignItems: "center", color: "var(--mn-ink-3)", textDecoration: "none" }}>
          <ChevronLeft size={20} />
        </Link>

        <MnemoraNode state={loading ? "processing" : "idle"} size="sm" color="var(--mn-green)" />

        <div style={{ flex: 1 }}>
          <p className="font-display" style={{ fontWeight: 700, fontSize: 15, color: "var(--mn-ink-1)" }}>
            Tutor · {subjectName}
          </p>
          <p style={{ fontSize: 12, color: "var(--mn-ink-3)" }}>
            {memoryActive ? `${greetingCtx!.sessionCount} sesiones · Memoria activa` : "Con perfil cognitivo personalizado"}
          </p>
        </div>

        {memoryActive && (
          <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "3px 11px", background: "var(--mn-raised)", borderRadius: "var(--mn-r-full)", fontSize: 11, fontWeight: 600, color: "var(--mn-ink-2)" }}>
            Memoria activa
          </div>
        )}
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflow: "auto", padding: "32px 24px", display: "flex", flexDirection: "column", gap: 0 }}>
        <div style={{ maxWidth: 720, width: "100%", margin: "0 auto", display: "flex", flexDirection: "column", gap: 0 }}>

          {greetingLoading && messages.length === 0 && (
            <div style={{ display: "flex", gap: 14, paddingBottom: 32 }}>
              <div style={{ flexShrink: 0, marginTop: 3 }}>
                <MnemoraNode state="processing" size="sm" color="var(--mn-green)" />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: "var(--mn-ink-3)", marginBottom: 10, letterSpacing: "0.04em" }}>Mnemora</p>
                <div style={{ display: "flex", gap: 5, alignItems: "center", height: 20 }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--mn-ink-4)", animation: `mnpulse 1.2s ${i * 0.18}s infinite` }} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {showContextCard && !hasStartedConversation && greetingCtx && (
            <TutorContextCard
              context={greetingCtx}
              suggestions={suggestions}
              guidedResults={guidedResults}
              onSend={send}
              onDismiss={() => setShowContextCard(false)}
            />
          )}

          {messages.map((msg, i) => {
            if (msg.role === "assistant") {
              return (
                <div key={msg.id} style={{ display: "flex", gap: 14, paddingBottom: 32, paddingTop: i === 0 ? 0 : 8 }}>
                  <div style={{ flexShrink: 0, marginTop: 3 }}>
                    <MnemoraNode state={msg.streaming ? "processing" : "idle"} size="sm" color="var(--mn-green)" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 11, fontWeight: 600, color: "var(--mn-ink-3)", marginBottom: 10, letterSpacing: "0.04em" }}>
                      Mnemora
                    </p>
                    {msg.streaming && msg.content === "" ? (
                      <div style={{ display: "flex", gap: 5, alignItems: "center", height: 20 }}>
                        {[0, 1, 2].map(i => (
                          <div key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--mn-ink-4)", animation: `mnpulse 1.2s ${i * 0.18}s infinite` }} />
                        ))}
                      </div>
                    ) : (
                      <>
                      <div
                        style={{ fontSize: 15, color: "var(--mn-ink-1)", lineHeight: 1.75, fontWeight: 400 }}
                        dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
                      />
                      {memoryActive && i > 0 && (
                        <p style={{ fontSize: 11, color: "var(--mn-ink-3)", marginTop: 8, animation: "mn-ctx-fade 200ms ease both" }}>
                          Generado usando tu contenido
                        </p>
                      )}
                      </>
                    )}
                  </div>
                </div>
              );
            }

            // User message
            return (
              <div key={msg.id} style={{ display: "flex", justifyContent: "flex-end", paddingBottom: 24, animation: "mn-msg-up 200ms cubic-bezier(0.16,1,0.3,1) both" }}>
                <div style={{ maxWidth: "68%", padding: "10px 16px", background: "var(--mn-raised)", borderRadius: "var(--mn-r-lg)", fontSize: 14, color: "var(--mn-ink-1)", lineHeight: 1.6 }}>
                  {msg.content}
                </div>
              </div>
            );
          })}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      <div style={{ padding: "16px 24px 20px", background: "var(--mn-surface)", borderTop: "1px solid var(--mn-ink-4)", flexShrink: 0 }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-end", background: "var(--mn-canvas)", borderRadius: "var(--mn-r-xl)", border: "1px solid var(--mn-ink-4)", padding: "10px 10px 10px 18px", transition: "border-color 150ms" }}
            onFocusCapture={e => (e.currentTarget.style.borderColor = "var(--mn-green)")}
            onBlurCapture={e => (e.currentTarget.style.borderColor = "var(--mn-ink-4)")}
          >
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); }
              }}
              placeholder="Pregunta algo al tutor..."
              rows={1}
              disabled={loading}
              style={{ flex: 1, background: "transparent", border: "none", outline: "none", resize: "none", fontSize: 15, color: "var(--mn-ink-1)", lineHeight: 1.55, maxHeight: 120, overflowY: "auto", fontFamily: "inherit", opacity: loading ? 0.5 : 1 }}
            />
            <button
              onClick={() => send(input)}
              disabled={!input.trim() || loading}
              style={{ width: 36, height: 36, borderRadius: "var(--mn-r-md)", background: input.trim() && !loading ? "var(--mn-green)" : "var(--mn-raised)", border: "none", cursor: input.trim() && !loading ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "background 150ms" }}
            >
              <ArrowUp size={16} color={input.trim() && !loading ? "#FFFFFF" : "var(--mn-ink-3)"} />
            </button>
          </div>
          {hasProcessedDoc === false && !hasStartedConversation ? (
            <p style={{ textAlign: "center", fontSize: 11, color: "var(--mn-amber)", marginTop: 8, lineHeight: 1.5 }}>
              Esta materia aún no tiene documentos procesados — el tutor responde de forma general.{" "}
              <a href={`/materias/${id}`} style={{ color: "var(--mn-amber)", fontWeight: 600, textDecoration: "underline" }}>Sube un documento</a> para personalizarlo.
            </p>
          ) : (
            <p style={{ textAlign: "center", fontSize: 11, color: "var(--mn-ink-4)", marginTop: 8 }}>
              Shift+Enter para nueva línea · El tutor aprende de cada sesión
            </p>
          )}
        </div>
      </div>

      <style>{`
        @keyframes mnpulse {
          0%, 100% { opacity: 0.25; transform: scale(0.75); }
          50% { opacity: 1; transform: scale(1); }
        }
        @keyframes mn-msg-up { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes mn-ctx-fade { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </div>
  );
}

export default function TutorPage() {
  return <Suspense><TutorPageInner /></Suspense>;
}
