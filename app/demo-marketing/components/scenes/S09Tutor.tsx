"use client";

import { DEMO_TUTOR, DEMO_PROFILE } from "@/lib/demo/data";
import type { DemoFormat } from "@/lib/demo/data";

export default function S09Tutor({ elapsed, format }: { elapsed: number; format: DemoFormat }) {
  const isMobile = format === "9:16";

  // Messages appear one by one: 0ms, 2500ms, 4500ms
  const visibleMessages = elapsed < 2500 ? 1 : elapsed < 4500 ? 2 : 3;
  const showTyping = (elapsed >= 1800 && elapsed < 2500) || (elapsed >= 3800 && elapsed < 4500);

  return (
    <div style={{ height: "100%", background: "var(--mn-canvas)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <style>{`
        @keyframes demo-fade-up{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes typing-dot{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-4px)}}
      `}</style>

      {/* Header */}
      <div style={{ background: "var(--mn-surface)", borderBottom: "1px solid var(--mn-ink-4)", padding: isMobile ? "12px 16px" : "14px 24px", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, #1B3F2F, #3B7A57)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <span style={{ fontSize: 18 }}>🧠</span>
        </div>
        <div>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: "var(--mn-ink-1)" }}>Tutor · Anatomía II</p>
          <p style={{ margin: 0, fontSize: 11, color: "var(--mn-green)", fontWeight: 600 }}>
            {showTyping ? "Escribiendo…" : "En línea"}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, padding: isMobile ? "12px 14px" : "16px 20px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 12 }}>

        {DEMO_TUTOR.slice(0, visibleMessages).map((msg, i) => {
          const isUser = msg.role === "user";
          return (
            <div key={i} style={{
              display: "flex", flexDirection: isUser ? "row-reverse" : "row", gap: 8, alignItems: "flex-end",
              animation: "demo-fade-up 0.4s ease both",
            }}>
              {!isUser && (
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg, #1B3F2F, #3B7A57)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ fontSize: 14 }}>🧠</span>
                </div>
              )}
              <div style={{
                maxWidth: "78%",
                background: isUser ? "var(--mn-green)" : "var(--mn-surface)",
                borderRadius: isUser ? "var(--mn-r-xl) var(--mn-r-xl) var(--mn-r-sm) var(--mn-r-xl)" : "var(--mn-r-xl) var(--mn-r-xl) var(--mn-r-xl) var(--mn-r-sm)",
                padding: "10px 14px",
                boxShadow: "var(--mn-shadow-sm)",
                border: isUser ? "none" : "1px solid var(--mn-ink-4)",
              }}>
                {msg.text.split("\n").map((line, li) => {
                  if (line.startsWith("**") && line.endsWith("**")) {
                    return <p key={li} style={{ margin: li === 0 ? 0 : "4px 0 0", fontSize: 13, fontWeight: 700, color: isUser ? "#fff" : "var(--mn-ink-1)" }}>{line.replace(/\*\*/g, "")}</p>;
                  }
                  const formatted = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
                  return (
                    <p key={li} style={{ margin: li === 0 ? 0 : "4px 0 0", fontSize: 13, color: isUser ? "#fff" : "var(--mn-ink-1)", lineHeight: 1.55 }}
                      dangerouslySetInnerHTML={{ __html: formatted || "&nbsp;" }} />
                  );
                })}
              </div>
              {isUser && (
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--mn-ink-4)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: "var(--mn-ink-2)" }}>{DEMO_PROFILE.initials}</span>
                </div>
              )}
            </div>
          );
        })}

        {/* Typing indicator */}
        {showTyping && (
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end", animation: "demo-fade-up 0.3s ease both" }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg, #1B3F2F, #3B7A57)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <span style={{ fontSize: 14 }}>🧠</span>
            </div>
            <div style={{ background: "var(--mn-surface)", borderRadius: "var(--mn-r-xl) var(--mn-r-xl) var(--mn-r-xl) var(--mn-r-sm)", padding: "12px 16px", border: "1px solid var(--mn-ink-4)", display: "flex", gap: 4, alignItems: "center" }}>
              {[0, 150, 300].map(delay => (
                <div key={delay} style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--mn-ink-3)", animation: `typing-dot 1.2s ${delay}ms ease infinite` }} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Input area */}
      <div style={{ background: "var(--mn-surface)", borderTop: "1px solid var(--mn-ink-4)", padding: isMobile ? "10px 14px" : "12px 20px", display: "flex", gap: 8, alignItems: "center" }}>
        <div style={{ flex: 1, background: "var(--mn-canvas)", borderRadius: "var(--mn-r-xl)", border: "1px solid var(--mn-ink-4)", padding: "10px 14px" }}>
          <p style={{ margin: 0, fontSize: 13, color: "var(--mn-ink-3)" }}>Pregunta algo sobre Anatomía II…</p>
        </div>
        <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--mn-green)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <span style={{ fontSize: 16, color: "#fff" }}>↑</span>
        </div>
      </div>
    </div>
  );
}
