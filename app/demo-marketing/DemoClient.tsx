"use client";

import { useRef, useState, useCallback } from "react";
import { useDemoEngine, SCENES, TOURS } from "@/lib/demo/engine";
import type { DemoFormat } from "@/lib/demo/data";
import DemoShell from "./components/DemoShell";
import DemoControls from "./components/DemoControls";
import SimCursor from "./components/SimCursor";

// Scenes
import S01Apertura    from "./components/scenes/S01Apertura";
import S02Dashboard   from "./components/scenes/S02Dashboard";
import S03Materia     from "./components/scenes/S03Materia";
import S04Documento   from "./components/scenes/S04Documento";
import S05ClassStudio from "./components/scenes/S05ClassStudio";
import S06Apuntes     from "./components/scenes/S06Apuntes";
import S07Flashcards  from "./components/scenes/S07Flashcards";
import S08Quiz        from "./components/scenes/S08Quiz";
import S09Tutor       from "./components/scenes/S09Tutor";
import S10Calendario  from "./components/scenes/S10Calendario";
import S11Roadmap     from "./components/scenes/S11Roadmap";
import S12Progreso    from "./components/scenes/S12Progreso";
import S13Cierre      from "./components/scenes/S13Cierre";

const SCENE_COMPONENTS = [
  S01Apertura, S02Dashboard, S03Materia, S04Documento, S05ClassStudio,
  S06Apuntes, S07Flashcards, S08Quiz, S09Tutor, S10Calendario,
  S11Roadmap, S12Progreso, S13Cierre,
] as const;

type RecordingState = "idle" | "waiting" | "recording" | "processing";

interface Props {
  initialTour: string;
  initialScene: number;
}

export default function DemoClient({ initialTour, initialScene }: Props) {
  const [format, setFormat] = useState<DemoFormat>("16:9");
  const shellRef = useRef<HTMLDivElement>(null);

  // Recording
  const [recState, setRecState]   = useState<RecordingState>("idle");
  const mediaRecRef  = useRef<MediaRecorder | null>(null);
  const chunksRef    = useRef<Blob[]>([]);

  const engine = useDemoEngine(initialTour, initialScene);
  const { state, currentSceneGlobalIdx, progressPct, currentScene } = engine;

  const SceneComponent = SCENE_COMPONENTS[currentSceneGlobalIdx] ?? S01Apertura;

  // ── Recording ──────────────────────────────────────────────────────────────

  const startRecording = useCallback(async () => {
    try {
      setRecState("waiting");
      // Ask the user to select the tab / window to capture
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 30 },
        audio: false,
      });

      chunksRef.current = [];
      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
        ? "video/webm;codecs=vp9"
        : "video/webm";

      const rec = new MediaRecorder(stream, { mimeType });
      mediaRecRef.current = rec;

      rec.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };

      rec.onstop = () => {
        setRecState("processing");
        stream.getTracks().forEach(t => t.stop());

        const blob = new Blob(chunksRef.current, { type: mimeType });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement("a");
        const tourLabel = TOURS[state.tourKey]?.label ?? state.tourKey;
        a.href     = url;
        a.download = `mnemora-demo-${state.tourKey}-${format}.webm`;
        a.click();
        URL.revokeObjectURL(url);
        setRecState("idle");
      };

      rec.start();
      setRecState("recording");

      // Auto-play the demo
      engine.stop();
      setTimeout(() => engine.play(), 300);

    } catch {
      // User cancelled the screen picker
      setRecState("idle");
    }
  }, [engine, format, state.tourKey]);

  const stopRecording = useCallback(() => {
    mediaRecRef.current?.stop();
    engine.pause();
  }, [engine]);

  // Stop recording automatically when demo finishes (status goes idle)
  const prevStatusRef = useRef(state.status);
  if (prevStatusRef.current === "playing" && state.status === "idle" && recState === "recording") {
    mediaRecRef.current?.stop();
  }
  prevStatusRef.current = state.status;

  // ── Render ─────────────────────────────────────────────────────────────────

  const recBtnStyle: React.CSSProperties = {
    display: "flex", alignItems: "center", gap: 6,
    padding: "8px 14px", borderRadius: 8, border: "none", cursor: "pointer",
    fontSize: 13, fontWeight: 700,
    backdropFilter: "blur(8px)",
  };

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "#0A0F0C",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px 120px",
        boxSizing: "border-box",
      }}
    >
      {/* Shell */}
      <div ref={shellRef} style={{ width: "100%", maxWidth: 960 }}>
        <DemoShell
          format={format}
          cursorLayer={
            state.showCursor ? (
              <SimCursor
                waypoints={[]}
                sceneElapsed={state.sceneElapsed}
                containerRef={shellRef}
                visible={state.showCursor}
              />
            ) : null
          }
        >
          <SceneComponent elapsed={state.sceneElapsed} format={format} />
        </DemoShell>
      </div>

      {/* Recording badge — shows while recording */}
      {recState === "recording" && (
        <div style={{
          position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)",
          zIndex: 2000, background: "rgba(185,28,28,0.92)", color: "#fff",
          borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 700,
          display: "flex", alignItems: "center", gap: 8, backdropFilter: "blur(8px)",
        }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#fff", display: "inline-block", animation: "rec-blink 1s ease infinite" }} />
          Grabando — la demo se reproduce automáticamente
          <button
            onClick={stopRecording}
            style={{ marginLeft: 8, background: "#fff", color: "#B91C1C", border: "none", borderRadius: 6, padding: "4px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
          >
            Detener y descargar
          </button>
        </div>
      )}

      {recState === "processing" && (
        <div style={{ position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)", zIndex: 2000, background: "rgba(15,20,18,0.92)", color: "#fff", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 700, backdropFilter: "blur(8px)" }}>
          ⏳ Preparando descarga…
        </div>
      )}

      <style>{`@keyframes rec-blink{0%,100%{opacity:1}50%{opacity:0.2}}`}</style>

      {/* Controls */}
      {state.showControls && (
        <>
          <DemoControls
            state={state}
            progressPct={progressPct}
            currentScene={currentScene ?? SCENES[0]}
            onPlay={engine.play}
            onPause={engine.pause}
            onResume={engine.resume}
            onStop={engine.stop}
            onSkipPrev={engine.skipPrev}
            onSkipNext={engine.skipNext}
            onSkipTo={engine.skipTo}
            onSetTour={engine.setTour}
            onSetSpeed={engine.setSpeed}
            onSetLoop={engine.setLoop}
            onSetShowControls={engine.setShowControls}
            onSetShowCursor={engine.setShowCursor}
            format={format}
            onSetFormat={f => setFormat(f as DemoFormat)}
          />

          {/* Record button — floats above the control bar */}
          <div style={{ position: "fixed", bottom: 100, left: "50%", transform: "translateX(-50%)", zIndex: 1000 }}>
            {recState === "idle" || recState === "waiting" ? (
              <button
                onClick={startRecording}
                disabled={recState === "waiting"}
                style={{
                  ...recBtnStyle,
                  background: recState === "waiting" ? "rgba(80,80,80,0.9)" : "rgba(185,28,28,0.9)",
                  color: "#fff",
                  opacity: recState === "waiting" ? 0.7 : 1,
                  boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
                }}
              >
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#fff" }} />
                {recState === "waiting" ? "Selecciona esta pestaña…" : "Grabar y descargar video"}
              </button>
            ) : recState === "recording" ? (
              <button
                onClick={stopRecording}
                style={{ ...recBtnStyle, background: "rgba(185,28,28,0.9)", color: "#fff", boxShadow: "0 4px 20px rgba(0,0,0,0.4)" }}
              >
                ⏹ Detener y descargar
              </button>
            ) : null}
          </div>
        </>
      )}

      {/* Show controls button when hidden */}
      {!state.showControls && (
        <button
          onClick={() => engine.setShowControls(true)}
          style={{
            position: "fixed", bottom: 16, right: 16, zIndex: 1000,
            background: "rgba(15,20,18,0.85)", color: "#fff", border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: 8, padding: "7px 12px", fontSize: 12, cursor: "pointer", backdropFilter: "blur(8px)",
          }}
        >
          Mostrar controles
        </button>
      )}
    </div>
  );
}
