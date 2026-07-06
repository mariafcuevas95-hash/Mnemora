"use client";

/**
 * MnemoraNode — the brand symbol.
 *
 * A central point with four irregular arms ending in satellite dots.
 * Asymmetric angles and lengths (Constelación influence) make it feel
 * organic rather than geometric.
 *
 * States:
 *   idle        — static
 *   processing  — arms pulse sequentially (80ms stagger)
 *   complete    — satellites converge toward center, color turns green
 *
 * Sizes (viewBox 64×64):
 *   sm  — 16px  (inline labels, sidebar dot)
 *   md  — 28px  (chat avatar, button prefix)
 *   lg  — 48px  (loading screens, hero)
 *   xl  — 80px  (onboarding, empty states)
 */

import { useEffect, useState } from "react";

export type NodeState = "idle" | "processing" | "complete";
export type NodeSize  = "sm" | "md" | "lg" | "xl";

interface Props {
  state?: NodeState;
  size?:  NodeSize;
  /** Override fill/stroke color (defaults to currentColor) */
  color?: string;
  /** Green accent color for complete state */
  completeColor?: string;
  className?: string;
  /** Auto-cycle from processing → complete after this many ms (optional) */
  completionMs?: number;
}

// ─── Geometry ────────────────────────────────────────────────────────────────
// All coordinates are in a 64×64 viewBox with center at (32, 32).
// Arms are irregular in angle AND length — this is intentional.

const CENTER = { x: 32, y: 32 };

const ARMS = [
  // angle ~30°, length 19 → upper-right, large satellite
  { x: 48.5, y: 22.5, r: 3.5, delay: 0    },
  // angle ~138°, length 23 → upper-left, largest satellite
  { x: 14.9, y: 17.1, r: 4.0, delay: 80   },
  // angle ~215°, length 14 → lower-left, small satellite
  { x: 20.5, y: 40.0, r: 2.5, delay: 160  },
  // angle ~312°, length 21 → lower-right, medium satellite
  { x: 46.0, y: 47.6, r: 3.0, delay: 240  },
] as const;

const SIZES: Record<NodeSize, number> = { sm: 16, md: 28, lg: 48, xl: 80 };

// ─── Keyframe styles injected once ───────────────────────────────────────────
const STYLE_ID = "mn-node-keyframes";

function injectKeyframes() {
  if (typeof document === "undefined") return;
  if (document.getElementById(STYLE_ID)) return;
  const el = document.createElement("style");
  el.id = STYLE_ID;
  el.textContent = `
    @keyframes mn-arm-pulse {
      0%,100% { stroke-width: 1;   opacity: 0.55; }
      50%      { stroke-width: 1.8; opacity: 1;    }
    }
    @keyframes mn-sat-converge {
      0%   { transform: translate(0px,  0px);  }
      40%  { transform: translate(var(--dx), var(--dy)); }
      100% { transform: translate(0px,  0px);  }
    }
    @keyframes mn-center-pop {
      0%,100% { r: 4.5; }
      50%     { r: 6;   }
    }
  `;
  document.head.appendChild(el);
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function MnemoraNode({
  state = "idle",
  size  = "md",
  color = "currentColor",
  completeColor = "#1B3F2F",
  className = "",
  completionMs,
}: Props) {
  const px = SIZES[size];
  const [localState, setLocalState] = useState<NodeState>(state);

  useEffect(() => { injectKeyframes(); }, []);

  // Respect external state changes
  useEffect(() => { setLocalState(state); }, [state]);

  // Optional auto-complete after N ms
  useEffect(() => {
    if (localState !== "processing" || !completionMs) return;
    const t = setTimeout(() => setLocalState("complete"), completionMs);
    return () => clearTimeout(t);
  }, [localState, completionMs]);

  const isProcessing = localState === "processing";
  const isComplete   = localState === "complete";
  const activeColor  = isComplete ? completeColor : color;

  // Satellite convergence vectors (pointing from satellite toward center)
  // Each arm has a unique direction vector for the animation
  const convergeVectors = [
    { dx: "-2.8px", dy:  "1.6px"  }, // arm 0 → toward center
    { dx:  "2.9px", dy:  "2.5px"  }, // arm 1
    { dx:  "1.9px", dy: "-2.7px"  }, // arm 2
    { dx: "-2.3px", dy: "-2.6px"  }, // arm 3
  ];

  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Arms */}
      {ARMS.map((arm, i) => (
        <line
          key={i}
          x1={CENTER.x}
          y1={CENTER.y}
          x2={arm.x}
          y2={arm.y}
          stroke={activeColor}
          strokeWidth="1"
          strokeLinecap="round"
          opacity={isComplete ? 1 : 0.55}
          style={
            isProcessing
              ? {
                  animation: `mn-arm-pulse 600ms ease-in-out ${arm.delay}ms infinite`,
                }
              : isComplete
              ? { transition: "opacity 300ms ease" }
              : undefined
          }
        />
      ))}

      {/* Satellite dots */}
      {ARMS.map((arm, i) => {
        const v = convergeVectors[i];
        return (
          <circle
            key={i}
            cx={arm.x}
            cy={arm.y}
            r={arm.r}
            fill={activeColor}
            opacity={isComplete ? 1 : 0.7}
            style={
              isComplete
                ? {
                    "--dx": v.dx,
                    "--dy": v.dy,
                    animation: `mn-sat-converge 400ms cubic-bezier(0.34,1.56,0.64,1) ${i * 40}ms both`,
                    transition: "fill 250ms ease, opacity 200ms ease",
                  } as React.CSSProperties
                : { transition: "fill 250ms ease, opacity 200ms ease" }
            }
          />
        );
      })}

      {/* Center point */}
      <circle
        cx={CENTER.x}
        cy={CENTER.y}
        r={4.5}
        fill={activeColor}
        style={
          isComplete
            ? { animation: "mn-center-pop 400ms cubic-bezier(0.34,1.56,0.64,1) both" }
            : undefined
        }
      />
    </svg>
  );
}
