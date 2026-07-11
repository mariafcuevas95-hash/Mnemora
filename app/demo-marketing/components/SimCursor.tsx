"use client";

import { useEffect, useRef, useState } from "react";

export interface CursorWaypoint {
  /** 0–1 fraction of container width */
  x: number;
  /** 0–1 fraction of container height */
  y: number;
  /** absolute ms from scene start when cursor should reach this point */
  t: number;
  click?: boolean;
}

interface Props {
  waypoints: CursorWaypoint[];
  sceneElapsed: number;
  containerRef: React.RefObject<HTMLElement | null>;
  visible: boolean;
}

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export default function SimCursor({ waypoints, sceneElapsed, containerRef, visible }: Props) {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [clicking, setClicking] = useState(false);
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!visible || waypoints.length === 0) return;

    // Find which segment we're in
    const sorted = [...waypoints].sort((a, b) => a.t - b.t);
    if (sceneElapsed <= sorted[0].t) {
      setPos({ x: sorted[0].x, y: sorted[0].y });
      return;
    }
    if (sceneElapsed >= sorted[sorted.length - 1].t) {
      setPos({ x: sorted[sorted.length - 1].x, y: sorted[sorted.length - 1].y });
      return;
    }

    for (let i = 0; i < sorted.length - 1; i++) {
      const from = sorted[i];
      const to   = sorted[i + 1];
      if (sceneElapsed >= from.t && sceneElapsed < to.t) {
        const raw = (sceneElapsed - from.t) / (to.t - from.t);
        const t   = easeInOut(Math.min(1, Math.max(0, raw)));
        setPos({ x: lerp(from.x, to.x, t), y: lerp(from.y, to.y, t) });

        // Trigger click animation
        if (to.click && raw >= 0.92 && !clicking) {
          setClicking(true);
          if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
          clickTimerRef.current = setTimeout(() => setClicking(false), 220);
        }
        break;
      }
    }
  }, [sceneElapsed, waypoints, visible, clicking]);

  useEffect(() => () => { if (clickTimerRef.current) clearTimeout(clickTimerRef.current); }, []);

  if (!visible) return null;

  const container = containerRef.current;
  if (!container) return null;
  const rect = container.getBoundingClientRect();

  const px = pos.x * rect.width;
  const py = pos.y * rect.height;

  return (
    <div
      style={{
        position: "absolute",
        left: px,
        top:  py,
        transform: "translate(-4px, -4px)",
        pointerEvents: "none",
        zIndex: 9999,
        transition: "none",
      }}
    >
      {/* Outer ring — click flash */}
      {clicking && (
        <div style={{
          position: "absolute",
          inset: -10,
          borderRadius: "50%",
          border: "2px solid rgba(27,63,47,0.4)",
          animation: "cursor-click 220ms ease-out forwards",
        }} />
      )}
      {/* Arrow cursor SVG */}
      <svg width="22" height="26" viewBox="0 0 22 26" fill="none" style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))", transform: clicking ? "scale(0.88)" : "scale(1)", transition: "transform 100ms" }}>
        <path d="M2 2L2 20L7.5 15L11 22L13.5 21L10 14L18 14L2 2Z" fill="white" stroke="#1B3F2F" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>

      <style>{`
        @keyframes cursor-click {
          from { transform: scale(0.6); opacity: 0.8; }
          to   { transform: scale(1.8); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
