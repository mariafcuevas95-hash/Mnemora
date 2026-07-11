"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// ─── Scene definitions ────────────────────────────────────────────────────

export const SCENES = [
  { id: "apertura",    label: "Apertura",           duration: 5000  },
  { id: "dashboard",   label: "Dashboard",          duration: 12000 },
  { id: "materia",     label: "Anatomía II",        duration: 8000  },
  { id: "documento",   label: "Procesar documento", duration: 12000 },
  { id: "class-studio",label: "AI Class Studio",    duration: 15000 },
  { id: "apuntes",     label: "Apuntes",            duration: 8000  },
  { id: "flashcards",  label: "Flashcards",         duration: 10000 },
  { id: "quiz",        label: "Quiz",               duration: 10000 },
  { id: "tutor",       label: "Tutor IA",           duration: 12000 },
  { id: "calendario",  label: "Plan",               duration: 8000  },
  { id: "roadmap",     label: "Roadmap",            duration: 8000  },
  { id: "progreso",    label: "Progreso",           duration: 8000  },
  { id: "cierre",      label: "Cierre",             duration: 6000  },
] as const;

export type SceneId = typeof SCENES[number]["id"];

// Total: 122 000ms ≈ 122s

// ─── Tour presets ─────────────────────────────────────────────────────────

export const TOURS: Record<string, { label: string; scenes: number[] }> = {
  completa:        { label: "Demo completa (~2 min)",          scenes: [0,1,2,3,4,5,6,7,8,9,10,11,12] },
  classStudio:     { label: "AI Class Studio",                 scenes: [0,2,4,5] },
  tutor:           { label: "Tutor IA",                        scenes: [0,1,8] },
  flashcardsQuiz:  { label: "Flashcards + Quiz",               scenes: [0,1,6,7] },
  dashboardPlan:   { label: "Dashboard + Plan",                scenes: [0,1,2,9] },
  corto30s:        { label: "Demo 30 segundos",                scenes: [0,1,6,12] },
  corto15s:        { label: "Demo 15 segundos",                scenes: [0,6,12] },
};

// ─── Engine state ─────────────────────────────────────────────────────────

export type EngineStatus = "idle" | "playing" | "paused";
export type DemoSpeed = 0.75 | 1 | 1.25 | 1.5;

export interface EngineState {
  status: EngineStatus;
  sceneIdx: number;       // index within current tour's scene list
  sceneElapsed: number;   // ms elapsed in current scene (speed-adjusted)
  totalElapsed: number;   // ms elapsed in current tour (speed-adjusted)
  tourKey: string;
  tourScenes: number[];   // indices into SCENES array
  speed: DemoSpeed;
  loop: boolean;
  showControls: boolean;
  showCursor: boolean;
}

const DEFAULT_STATE: EngineState = {
  status: "idle",
  sceneIdx: 0,
  sceneElapsed: 0,
  totalElapsed: 0,
  tourKey: "completa",
  tourScenes: TOURS.completa.scenes,
  speed: 1,
  loop: false,
  showControls: true,
  showCursor: true,
};

// ─── Hook ─────────────────────────────────────────────────────────────────

export function useDemoEngine(initialTour = "completa", startSceneIdx = 0) {
  const [state, setState] = useState<EngineState>(() => ({
    ...DEFAULT_STATE,
    tourKey: initialTour,
    tourScenes: TOURS[initialTour]?.scenes ?? TOURS.completa.scenes,
    sceneIdx: startSceneIdx,
  }));

  const rafRef      = useRef<number | null>(null);
  const lastTsRef   = useRef<number | null>(null);
  const stateRef    = useRef(state);
  stateRef.current  = state;

  const cancelRaf = () => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  };

  const tick = useCallback((ts: number) => {
    const prev = lastTsRef.current;
    lastTsRef.current = ts;
    if (prev === null) { rafRef.current = requestAnimationFrame(tick); return; }

    const s = stateRef.current;
    if (s.status !== "playing") return;

    const delta     = (ts - prev) * s.speed;
    const sceneList = s.tourScenes;
    const sceneDef  = SCENES[sceneList[s.sceneIdx]];
    const newElapsed = s.sceneElapsed + delta;
    const newTotal   = s.totalElapsed + delta;

    if (newElapsed >= sceneDef.duration) {
      // advance to next scene
      const nextIdx = s.sceneIdx + 1;
      if (nextIdx >= sceneList.length) {
        if (s.loop) {
          setState(p => ({ ...p, sceneIdx: 0, sceneElapsed: 0, totalElapsed: 0 }));
          lastTsRef.current = ts;
        } else {
          setState(p => ({ ...p, status: "idle", sceneElapsed: 0, totalElapsed: 0 }));
          lastTsRef.current = null;
          return;
        }
      } else {
        setState(p => ({ ...p, sceneIdx: nextIdx, sceneElapsed: newElapsed - sceneDef.duration, totalElapsed: newTotal }));
      }
    } else {
      setState(p => ({ ...p, sceneElapsed: newElapsed, totalElapsed: newTotal }));
    }

    rafRef.current = requestAnimationFrame(tick);
  }, []);

  // Controls
  const play = useCallback(() => {
    lastTsRef.current = null;
    setState(p => ({ ...p, status: "playing" }));
    rafRef.current = requestAnimationFrame(tick);
  }, [tick]);

  const pause = useCallback(() => {
    cancelRaf();
    lastTsRef.current = null;
    setState(p => ({ ...p, status: "paused" }));
  }, []);

  const resume = useCallback(() => {
    lastTsRef.current = null;
    setState(p => ({ ...p, status: "playing" }));
    rafRef.current = requestAnimationFrame(tick);
  }, [tick]);

  const stop = useCallback(() => {
    cancelRaf();
    lastTsRef.current = null;
    setState(p => ({ ...p, status: "idle", sceneIdx: 0, sceneElapsed: 0, totalElapsed: 0 }));
  }, []);

  const skipTo = useCallback((sceneIdx: number) => {
    cancelRaf();
    lastTsRef.current = null;
    setState(p => {
      const clamped = Math.max(0, Math.min(sceneIdx, p.tourScenes.length - 1));
      const totalElapsed = p.tourScenes
        .slice(0, clamped)
        .reduce((acc, si) => acc + SCENES[si].duration / p.speed, 0);
      return { ...p, sceneIdx: clamped, sceneElapsed: 0, totalElapsed, status: "playing" };
    });
    lastTsRef.current = null;
    rafRef.current = requestAnimationFrame(tick);
  }, [tick]);

  const skipPrev = useCallback(() => {
    skipTo(stateRef.current.sceneIdx - 1);
  }, [skipTo]);

  const skipNext = useCallback(() => {
    skipTo(stateRef.current.sceneIdx + 1);
  }, [skipTo]);

  const setTour = useCallback((key: string) => {
    cancelRaf();
    lastTsRef.current = null;
    const scenes = TOURS[key]?.scenes ?? TOURS.completa.scenes;
    setState(p => ({ ...p, tourKey: key, tourScenes: scenes, sceneIdx: 0, sceneElapsed: 0, totalElapsed: 0, status: "idle" }));
  }, []);

  const setSpeed = useCallback((speed: DemoSpeed) => {
    setState(p => ({ ...p, speed }));
  }, []);

  const setLoop = useCallback((loop: boolean) => {
    setState(p => ({ ...p, loop }));
  }, []);

  const setShowControls = useCallback((v: boolean) => {
    setState(p => ({ ...p, showControls: v }));
  }, []);

  const setShowCursor = useCallback((v: boolean) => {
    setState(p => ({ ...p, showCursor: v }));
  }, []);

  useEffect(() => () => cancelRaf(), []);

  // Derived values
  const currentSceneGlobalIdx = state.tourScenes[state.sceneIdx] ?? 0;
  const currentScene          = SCENES[currentSceneGlobalIdx];
  const totalDuration         = state.tourScenes.reduce((acc, si) => acc + SCENES[si].duration, 0);
  const progressPct           = totalDuration > 0 ? Math.min(100, (state.totalElapsed / totalDuration) * 100) : 0;

  return {
    state,
    currentScene,
    currentSceneGlobalIdx,
    progressPct,
    totalDuration,
    // actions
    play,
    pause,
    resume,
    stop,
    skipTo,
    skipPrev,
    skipNext,
    setTour,
    setSpeed,
    setLoop,
    setShowControls,
    setShowCursor,
  };
}
