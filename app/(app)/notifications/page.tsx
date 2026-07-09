"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  BookOpen, Zap, AlertCircle, Brain, Bell, CheckCheck, Loader2, Flame,
} from "lucide-react";
import type { Notification } from "@/app/api/notifications/route";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function typeIcon(type: string) {
  if (type === "review_due")    return <Zap size={16} color="var(--mn-green)" />;
  if (type.startsWith("exam_")) return <AlertCircle size={16} color="var(--mn-amber)" />;
  if (type === "streak")        return <Flame size={16} color="#F97316" />;
  if (type === "low_retention") return <Brain size={16} color="var(--mn-error)" />;
  return <BookOpen size={16} color="var(--mn-ink-2)" />;
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins < 1)   return "Ahora";
  if (mins < 60)  return `Hace ${mins} min`;
  if (hours < 24) return `Hace ${hours}h`;
  if (days === 1) return "Ayer";
  return `Hace ${days} días`;
}

function groupByDate(items: Notification[]): { label: string; items: Notification[] }[] {
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);

  const groups: { label: string; items: Notification[] }[] = [];
  const seen = new Map<string, number>();

  for (const n of items) {
    const day = n.created_at.slice(0, 10);
    const label = day === today ? "Hoy" : day === yesterday ? "Ayer" : new Date(day + "T00:00:00").toLocaleDateString("es", { weekday: "long", day: "numeric", month: "short" });
    if (!seen.has(label)) {
      seen.set(label, groups.length);
      groups.push({ label, items: [] });
    }
    groups[seen.get(label)!].items.push(n);
  }
  return groups;
}

// ─── NotifCard ────────────────────────────────────────────────────────────────

function NotifCard({ item, onRead }: { item: Notification; onRead: (id: string) => void }) {
  return (
    <div
      onClick={() => !item.read && onRead(item.id)}
      style={{
        background: "var(--mn-surface)",
        border: `1px solid ${item.read ? "var(--mn-ink-4)" : "var(--mn-ink-3)"}`,
        borderRadius: "var(--mn-r-xl)",
        padding: "15px 18px",
        display: "flex",
        gap: 13,
        alignItems: "flex-start",
        cursor: item.read ? "default" : "pointer",
        opacity: item.read ? 0.65 : 1,
        transition: "opacity 150ms",
        position: "relative",
      }}
    >
      {!item.read && (
        <div style={{ position: "absolute", top: 15, right: 16, width: 7, height: 7, borderRadius: "50%", background: "var(--mn-green)" }} />
      )}

      <div style={{ width: 34, height: 34, borderRadius: "var(--mn-r-lg)", background: "var(--mn-canvas)", border: "1px solid var(--mn-ink-4)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        {typeIcon(item.type)}
      </div>

      <div style={{ flex: 1, minWidth: 0, paddingRight: item.read ? 0 : 16 }}>
        <p style={{ fontSize: 13, fontWeight: item.read ? 400 : 600, color: "var(--mn-ink-1)", marginBottom: 3, lineHeight: 1.4 }}>
          {item.title}
        </p>
        <p style={{ fontSize: 12, color: "var(--mn-ink-2)", lineHeight: 1.5, marginBottom: 10 }}>
          {item.body}
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {item.cta_href && (
            <Link
              href={item.cta_href}
              onClick={e => { e.stopPropagation(); onRead(item.id); }}
              className="mn-btn-primary"
              style={{ fontSize: 11, padding: "5px 12px", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}
            >
              {item.cta_label ?? "Ver"}
            </Link>
          )}
          <span style={{ fontSize: 11, color: "var(--mn-ink-4)" }}>{relativeTime(item.created_at)}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NotificationsPage() {
  const [items, setItems]       = useState<Notification[]>([]);
  const [loading, setLoading]   = useState(true);
  const [generating, setGen]    = useState(true);

  const loadNotifications = useCallback(() => {
    fetch("/api/notifications")
      .then(r => r.ok ? r.json() : [])
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    // Primero genera las de hoy, luego carga
    fetch("/api/notifications/generate", { method: "POST" })
      .finally(() => { setGen(false); loadNotifications(); });
  }, [loadNotifications]);

  function markRead(id: string) {
    fetch(`/api/notifications/${id}`, { method: "PATCH" });
    setItems(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }

  function markAllRead() {
    fetch("/api/notifications", { method: "DELETE" });
    setItems(prev => prev.map(n => ({ ...n, read: true })));
  }

  const unreadCount = items.filter(n => !n.read).length;
  const groups = groupByDate(items);

  if (loading || generating) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "50vh", gap: 10 }}>
      <Loader2 size={18} color="var(--mn-green)" style={{ animation: "spin 1s linear infinite" }} />
      <p style={{ fontSize: 13, color: "var(--mn-ink-3)" }}>Actualizando notificaciones…</p>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{ maxWidth: 580, padding: "28px 20px" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 className="font-display" style={{ fontSize: 20, fontWeight: 800, color: "var(--mn-ink-1)", marginBottom: 2 }}>Notificaciones</h1>
          <p style={{ fontSize: 13, color: "var(--mn-ink-3)" }}>
            {unreadCount > 0 ? `${unreadCount} sin leer` : "Todo al día"}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600, color: "var(--mn-ink-2)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
          >
            <CheckCheck size={14} /> Marcar todas leídas
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div style={{ textAlign: "center", padding: "56px 24px" }}>
          <div style={{ width: 48, height: 48, borderRadius: "50%", background: "var(--mn-raised)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <Bell size={22} color="var(--mn-ink-3)" />
          </div>
          <p style={{ fontSize: 15, fontWeight: 600, color: "var(--mn-ink-1)", marginBottom: 6 }}>Sin notificaciones por ahora</p>
          <p style={{ fontSize: 13, color: "var(--mn-ink-3)", lineHeight: 1.6, maxWidth: 300, margin: "0 auto" }}>
            Mnemora te avisará cuando tengas flashcards pendientes, exámenes próximos o logros nuevos.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {groups.map(g => (
            <div key={g.label}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "var(--mn-ink-3)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>
                {g.label}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {g.items.map(n => (
                  <NotifCard key={n.id} item={n} onRead={markRead} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
