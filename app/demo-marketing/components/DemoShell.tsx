"use client";

import type { DemoFormat } from "@/lib/demo/data";

const FORMAT_DIMENSIONS: Record<DemoFormat, { w: number; h: number; label: string }> = {
  "16:9": { w: 880, h: 495, label: "16:9 — Horizontal" },
  "9:16": { w: 360, h: 640, label: "9:16 — Vertical" },
  "1:1":  { w: 600, h: 600, label: "1:1 — Cuadrado" },
};

interface DemoShellProps {
  format: DemoFormat;
  children: React.ReactNode;
  cursorLayer?: React.ReactNode;
}

export default function DemoShell({ format, children, cursorLayer }: DemoShellProps) {
  const { w, h } = FORMAT_DIMENSIONS[format];
  const aspectRatio = `${w} / ${h}`;

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        maxWidth: w,
        aspectRatio,
        margin: "0 auto",
        borderRadius: 16,
        overflow: "hidden",
        background: "var(--mn-canvas)",
        boxShadow: "0 24px 80px rgba(0,0,0,0.35), 0 4px 16px rgba(0,0,0,0.2)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
      id="demo-shell"
    >
      {/* CSS variables needed by all scene components */}
      <style>{`
        #demo-shell {
          --mn-canvas:      #F3F6F4;
          --mn-surface:     #FFFFFF;
          --mn-ink-1:       #0F1A14;
          --mn-ink-2:       #4A5D52;
          --mn-ink-3:       #8A9E93;
          --mn-ink-4:       #DDE8E2;
          --mn-green:       #1B6B3A;
          --mn-green-light: #E8F3EC;
          --mn-green-text:  #0F4427;
          --mn-amber:       #B45309;
          --mn-amber-light: #FEF3C7;
          --mn-error:       #B91C1C;
          --mn-error-light: #FEE2E2;
          --mn-blue:        #1D4ED8;
          --mn-r-sm:        4px;
          --mn-r-md:        8px;
          --mn-r-lg:        12px;
          --mn-r-xl:        16px;
          --mn-r-full:      9999px;
          --mn-shadow-sm:   0 1px 3px rgba(0,0,0,0.07);
          --mn-shadow-md:   0 4px 12px rgba(0,0,0,0.08);
          --mn-shadow-lg:   0 8px 28px rgba(0,0,0,0.12);
          --mn-spring:      cubic-bezier(0.34,1.56,0.64,1);
        }
      `}</style>

      {/* Scene content */}
      <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
        {children}
      </div>

      {/* Cursor overlay */}
      {cursorLayer && (
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 100 }}>
          {cursorLayer}
        </div>
      )}
    </div>
  );
}
