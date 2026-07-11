"use client";

import { useRef, useState } from "react";
import { useDemoEngine, SCENES } from "@/lib/demo/engine";
import type { DemoFormat } from "@/lib/demo/data";
import DemoShell from "./components/DemoShell";
import DemoControls from "./components/DemoControls";
import SimCursor from "./components/SimCursor";

// Scenes
import S01Apertura   from "./components/scenes/S01Apertura";
import S02Dashboard  from "./components/scenes/S02Dashboard";
import S03Materia    from "./components/scenes/S03Materia";
import S04Documento  from "./components/scenes/S04Documento";
import S05ClassStudio from "./components/scenes/S05ClassStudio";
import S06Apuntes    from "./components/scenes/S06Apuntes";
import S07Flashcards from "./components/scenes/S07Flashcards";
import S08Quiz       from "./components/scenes/S08Quiz";
import S09Tutor      from "./components/scenes/S09Tutor";
import S10Calendario from "./components/scenes/S10Calendario";
import S11Roadmap    from "./components/scenes/S11Roadmap";
import S12Progreso   from "./components/scenes/S12Progreso";
import S13Cierre     from "./components/scenes/S13Cierre";

const SCENE_COMPONENTS = [
  S01Apertura, S02Dashboard, S03Materia, S04Documento, S05ClassStudio,
  S06Apuntes, S07Flashcards, S08Quiz, S09Tutor, S10Calendario,
  S11Roadmap, S12Progreso, S13Cierre,
] as const;

interface Props {
  initialTour: string;
  initialScene: number;
}

export default function DemoClient({ initialTour, initialScene }: Props) {
  const [format, setFormat] = useState<DemoFormat>("16:9");
  const shellRef = useRef<HTMLDivElement>(null);

  const engine = useDemoEngine(initialTour, initialScene);
  const { state, currentSceneGlobalIdx, progressPct, currentScene } = engine;

  const SceneComponent = SCENE_COMPONENTS[currentSceneGlobalIdx] ?? S01Apertura;

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "#0A0F0C",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px 100px",
        boxSizing: "border-box",
      }}
    >
      {/* Shell wrapper — needed for SimCursor containerRef */}
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
          <SceneComponent
            elapsed={state.sceneElapsed}
            format={format}
          />
        </DemoShell>
      </div>

      {/* Controls */}
      {state.showControls && (
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
      )}

      {/* Reveal controls button when hidden */}
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
