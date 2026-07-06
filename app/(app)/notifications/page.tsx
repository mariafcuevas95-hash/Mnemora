"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BookOpen, Zap, AlertCircle, Brain, ChevronRight, Bell,
} from "lucide-react";
import type { PlanTask } from "@/app/api/daily-planner/route";

// ─── Types ────────────────────────────────────────────────────────────────────

type NotifItem = PlanTask & { id: string; read: boolean };

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STORAGE_KEY = "mn_notif_read";

function getReadIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try { return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]")); }
  catch { return new Set(); }
}

function saveReadIds(ids: Set<string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
}

function typeIcon(type: PlanTask["type"]) {
  if (type === "review")     return <Zap size={16} color="var(--mn-green)" />;
  if (type === "exam_prep")  return <AlertCircle size={16} color="var(--mn-amber)" />;
  if (type === "quiz")       return <Brain size={16} color="var(--mn-ink-2)" />;
  return <BookOpen size={16} color="var(--mn-ink-2)" />;
}

function priorityLabel(p: 1 | 2 | 3) {
  if (p === 1) return "Urgente";
  if (p === 2) return "Recomendado";
  return null;
}

// ─── NotifCard ────────────────────────────────────────────────────────────────

function NotifCard({ item, onRead }: { item: NotifItem; onRead: (id: string) => void }) {
  const label = priorityLabel(item.priority);

  return (
    <div
      onClick={() => onRead(item.id)}
      style={{
        background: "var(--mn-surface)",
        border: "1px solid var(--mn-ink-4)",
        borderRadius: "var(--mn-r-xl)",
        padding: "16px 18px",
        display: "flex",
        gap: 14,
        alignItems: "flex-start",
        cursor: "default",
        position: "relative",
        transition: "opacity 150ms",
        opacity: item.read ? 0.6 : 1,
      }}
    >
      {/* Unread dot */}
      {!item.read && (
        <div style={{
          position: "absolute", top: 16, right: 16,
          width: 7, height: 7, borderRadius: "50%",
          background: "var(--mn-green)",
        }} />
      )}

      {/* Icon */}
      <div style={{
        width: 36, height: 36, borderRadius: "var(--mn-r-lg)",
        background: "var(--mn-canvas)", border: "1px solid var(--mn-ink-4)",
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
      }}>
        {typeIcon(item.type)}
      </div>

      {/* Body */}
      <div style={{ flex: 1, minWidth: 0, paddingRight: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 3 }}>
          {label && (
            <span style={{
              fontSize: 10, fontWeight: 700, textTransform: "uppercase",
              letterSpacing: "0.07em",
              color: item.priority === 1 ? "var(--mn-amber)" : "var(--mn-ink-3)",
            }}>
              {label}
            </span>
          )}
          <span style={{ fontSize: 11, color: "var(--mn-ink-3)" }}>{item.subjectName}</span>
        </div>
        <p style={{ fontSize: 14, fontWeight: item.read ? 400 : 600, color: "var(--mn-ink-1)", marginBottom: 3, lineHeight: 1.4 }}>
          {item.title}
        </p>
        <p style={{ fontSize: 13, color: "var(--mn-ink-2)", lineHeight: 1.5 }}>{item.description}</p>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12 }}>
          <Link
            href={item.ctaHref}
            className="mn-btn-primary"
            style={{ fontSize: 12, padding: "6px 14px", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}
          >
            {item.ctaLabel} <ChevronRight size={12} />
          </Link>
          <span style={{ fontSize: 12, color: "var(--mn-ink-3)" }}>~{item.minutesEst} min</span>
        </div>
      </div>
    </div>
  );
}

// ─── Group header ─────────────────────────────────────────────────────────────

function GroupHeader({ label, count }: { label: string; count: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: "var(--mn-ink-2)", textTransform: "uppercase", letterSpacing: "0.07em" }}>{label}</span>
      {count > 0 && (
        <span style={{ fontSize: 11, padding: "1px 7px", borderRadius: "var(--mn-r-full)", background: "var(--mn-raised)", color: "var(--mn-ink-3)", fontWeight: 600 }}>
          {count}
        </span>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NotificationsPage() {
  const [items, setItems]   = useState<NotifItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const readIds = getReadIds();
    fetch("/api/daily-planner")
      .then(r => r.ok ? r.json() : { tasks: [] })
      .then(({ tasks }: { tasks: PlanTask[] }) => {
        const sorted = [...tasks].sort((a, b) => a.priority - b.priority);
        setItems(sorted.map((t, i) => ({
          ...t,
          id: `${t.subjectId}-${t.type}-${i}`,
          read: readIds.has(`${t.subjectId}-${t.type}-${i}`),
        })));
      })
      .finally(() => setLoading(false));
  }, []);

  function markRead(id: string) {
    const ids = getReadIds();
    ids.add(id);
    saveReadIds(ids);
    setItems(prev => prev.map(it => it.id === id ? { ...it, read: true } : it));
  }

  function markAllRead() {
    const ids = getReadIds();
    items.forEach(it => ids.add(it.id));
    saveReadIds(ids);
    setItems(prev => prev.map(it => ({ ...it, read: true })));
  }

  const unreadCount = items.filter(it => !it.read).length;

  if (loading) return (
    <div style={{ padding: "48px 24px", textAlign: "center" }}>
      <p style={{ fontSize: 14, color: "var(--mn-ink-3)" }}>Cargando…</p>
    </div>
  );

  return (
    <div style={{ padding: "24px 20px", maxWidth: 600, margin: "0 auto" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <h1 className="font-display" style={{ fontSize: 22, fontWeight: 800, color: "var(--mn-ink-1)", marginBottom: 2 }}>Notificaciones</h1>
          <p style={{ fontSize: 13, color: "var(--mn-ink-3)" }}>
            {unreadCount > 0 ? `${unreadCount} sin leer` : "Todo al día"}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            style={{ fontSize: 13, fontWeight: 600, color: "var(--mn-ink-2)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
          >
            Marcar todas como leídas
          </button>
        )}
      </div>

      {items.length === 0 ? (
        /* Empty state */
        <div style={{ textAlign: "center", padding: "56px 24px" }}>
          <div style={{ width: 48, height: 48, borderRadius: "50%", background: "var(--mn-raised)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <Bell size={22} color="var(--mn-ink-3)" />
          </div>
          <p style={{ fontSize: 15, fontWeight: 600, color: "var(--mn-ink-1)", marginBottom: 6 }}>Sin recomendaciones hoy</p>
          <p style={{ fontSize: 14, color: "var(--mn-ink-3)", lineHeight: 1.6 }}>
            Mnemora generará sugerencias cuando tengas flashcards vencidas o exámenes próximos.
          </p>
        </div>
      ) : (
        <div>
          {/* Hoy */}
          <div style={{ marginBottom: 32 }}>
            <GroupHeader label="Hoy" count={items.length} />
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {items.map(item => (
                <NotifCard key={item.id} item={item} onRead={markRead} />
              ))}
            </div>
          </div>

          {/* Anteriores — siempre vacío por ahora (sin tabla persistida) */}
          <div>
            <GroupHeader label="Anteriores" count={0} />
            <div style={{ padding: "20px 0", borderTop: "1px solid var(--mn-ink-4)" }}>
              <p style={{ fontSize: 13, color: "var(--mn-ink-3)", lineHeight: 1.6 }}>
                El historial de notificaciones estará disponible próximamente.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
