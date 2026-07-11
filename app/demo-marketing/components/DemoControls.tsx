"use client";

import { Pause, Play, RotateCcw, SkipBack, SkipForward, Eye, EyeOff, MousePointer2 } from "lucide-react";
import type { EngineState, DemoSpeed } from "@/lib/demo/engine";
import { SCENES, TOURS } from "@/lib/demo/engine";

interface Props {
  state: EngineState;
  progressPct: number;
  currentScene: typeof SCENES[number];
  onPlay: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onSkipPrev: () => void;
  onSkipNext: () => void;
  onSkipTo: (i: number) => void;
  onSetTour: (key: string) => void;
  onSetSpeed: (s: DemoSpeed) => void;
  onSetLoop: (v: boolean) => void;
  onSetShowControls: (v: boolean) => void;
  onSetShowCursor: (v: boolean) => void;
  format: string;
  onSetFormat: (f: string) => void;
}

const SPEEDS: DemoSpeed[] = [0.75, 1, 1.25, 1.5];
const FORMATS = [
  { key: "16:9",  label: "16:9 · YouTube/Facebook" },
  { key: "9:16",  label: "9:16 · Reels/TikTok" },
  { key: "1:1",   label: "1:1 · Posts" },
];

export default function DemoControls({
  state, progressPct, currentScene,
  onPlay, onPause, onResume, onStop,
  onSkipPrev, onSkipNext, onSkipTo,
  onSetTour, onSetSpeed, onSetLoop,
  onSetShowControls, onSetShowCursor,
  format, onSetFormat,
}: Props) {
  const isPlaying = state.status === "playing";
  const isPaused  = state.status === "paused";
  const isIdle    = state.status === "idle";

  function handlePlayPause() {
    if (isPlaying) onPause();
    else if (isPaused) onResume();
    else onPlay();
  }

  const btn = (action: () => void, children: React.ReactNode, active = false, title = "") => (
    <button
      onClick={action}
      title={title}
      style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "7px 10px", borderRadius: 8, border: "none", cursor: "pointer",
        background: active ? "rgba(27,63,47,0.25)" : "rgba(255,255,255,0.08)",
        color: active ? "#4ADE80" : "rgba(255,255,255,0.85)",
        fontSize: 13, fontWeight: 600,
        transition: "background 150ms",
      }}
    >
      {children}
    </button>
  );

  return (
    <div style={{
      position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)",
      zIndex: 1000, display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
      pointerEvents: "auto",
    }}>
      {/* Progress bar */}
      <div style={{ width: 480, maxWidth: "95vw", height: 3, background: "rgba(255,255,255,0.12)", borderRadius: 4, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${progressPct}%`, background: "linear-gradient(90deg,#1B3F2F,#4ADE80)", transition: "width 0.1s linear", borderRadius: 4 }} />
      </div>

      {/* Main control bar */}
      <div style={{
        display: "flex", alignItems: "center", gap: 6,
        background: "rgba(15,20,18,0.92)", backdropFilter: "blur(12px)",
        border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14,
        padding: "8px 12px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
      }}>
        {/* Scene info */}
        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", minWidth: 110, paddingRight: 4 }}>
          {state.status !== "idle" ? `${state.sceneIdx + 1}/${state.tourScenes.length} · ${currentScene?.label}` : "· · ·"}
        </span>

        <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.1)" }} />

        {btn(onSkipPrev, <SkipBack size={14} />, false, "Escena anterior")}
        {btn(handlePlayPause, isPlaying ? <Pause size={14} /> : <Play size={14} />, isPlaying, isPlaying ? "Pausar" : "Reproducir")}
        {btn(onSkipNext, <SkipForward size={14} />, false, "Escena siguiente")}
        {!isIdle && btn(onStop, <RotateCcw size={13} />, false, "Reiniciar")}

        <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.1)" }} />

        {/* Speed */}
        {SPEEDS.map(s => (
          <button
            key={s}
            onClick={() => onSetSpeed(s)}
            style={{
              padding: "5px 8px", borderRadius: 6, border: "none", cursor: "pointer",
              background: state.speed === s ? "rgba(74,222,128,0.2)" : "transparent",
              color: state.speed === s ? "#4ADE80" : "rgba(255,255,255,0.45)",
              fontSize: 11, fontWeight: 700,
            }}
          >
            {s}×
          </button>
        ))}

        <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.1)" }} />

        {/* Loop */}
        <button
          onClick={() => onSetLoop(!state.loop)}
          style={{ padding: "5px 8px", borderRadius: 6, border: "none", cursor: "pointer", background: state.loop ? "rgba(74,222,128,0.2)" : "transparent", color: state.loop ? "#4ADE80" : "rgba(255,255,255,0.45)", fontSize: 11, fontWeight: 700 }}
        >
          ↺ Loop
        </button>

        <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.1)" }} />

        {/* Cursor toggle */}
        {btn(() => onSetShowCursor(!state.showCursor),
          state.showCursor ? <MousePointer2 size={13} /> : <MousePointer2 size={13} style={{ opacity: 0.3 }} />,
          state.showCursor, state.showCursor ? "Ocultar cursor" : "Mostrar cursor"
        )}

        {/* Hide controls */}
        {btn(() => onSetShowControls(false), <EyeOff size={13} />, false, "Ocultar controles (para grabar)")}
      </div>

      {/* Tour + Format row */}
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        {/* Tour selector */}
        <select
          value={state.tourKey}
          onChange={e => onSetTour(e.target.value)}
          style={{
            background: "rgba(15,20,18,0.9)", color: "#fff", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 8, padding: "6px 10px", fontSize: 12, cursor: "pointer", backdropFilter: "blur(8px)",
          }}
        >
          {Object.entries(TOURS).map(([key, t]) => (
            <option key={key} value={key}>{t.label}</option>
          ))}
        </select>

        {/* Format selector */}
        <select
          value={format}
          onChange={e => onSetFormat(e.target.value)}
          style={{
            background: "rgba(15,20,18,0.9)", color: "#fff", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 8, padding: "6px 10px", fontSize: 12, cursor: "pointer", backdropFilter: "blur(8px)",
          }}
        >
          {FORMATS.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
        </select>

        {/* Scene jump */}
        <select
          value={state.sceneIdx}
          onChange={e => onSkipTo(parseInt(e.target.value, 10))}
          style={{
            background: "rgba(15,20,18,0.9)", color: "#fff", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 8, padding: "6px 10px", fontSize: 12, cursor: "pointer", backdropFilter: "blur(8px)",
          }}
        >
          {state.tourScenes.map((si, i) => (
            <option key={i} value={i}>
              {i + 1}. {SCENES[si].label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
