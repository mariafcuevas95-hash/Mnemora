"use client";

import { Lock } from "lucide-react";
import { useState } from "react";
import { PaywallModal } from "./paywall-modal";
import type { Feature, PlanId } from "@/lib/plans";

interface ProLockProps {
  feature: Feature;
  planRequired?: PlanId;
  message?: string;
  children: React.ReactNode;
  /** If true, renders children but overlays a lock badge — useful for visible-but-disabled UI */
  overlay?: boolean;
}

export function ProLock({
  feature,
  planRequired = "pro",
  message = "Esta función requiere un plan superior.",
  children,
  overlay = false,
}: ProLockProps) {
  const [showPaywall, setShowPaywall] = useState(false);

  if (overlay) {
    return (
      <>
        <div style={{ position: "relative", pointerEvents: "none", opacity: 0.5 }}>
          {children}
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <div
              onClick={e => { e.stopPropagation(); setShowPaywall(true); }}
              style={{
                pointerEvents: "all",
                background: "#1B3F2F", borderRadius: 10,
                padding: "6px 12px",
                display: "flex", alignItems: "center", gap: 6,
                cursor: "pointer",
                boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
              }}
            >
              <Lock size={13} color="#F0C040" />
              <span style={{ fontSize: 12, fontWeight: 700, color: "#F7F4EF" }}>Pro</span>
            </div>
          </div>
        </div>
        {showPaywall && (
          <PaywallModal
            feature={feature}
            message={message}
            planRequired={planRequired}
            onClose={() => setShowPaywall(false)}
          />
        )}
      </>
    );
  }

  // Non-overlay: replace children with a lock button
  return (
    <>
      <button
        onClick={() => setShowPaywall(true)}
        style={{
          background: "rgba(26,22,18,0.06)",
          border: "1.5px dashed rgba(26,22,18,0.2)",
          borderRadius: 10, cursor: "pointer",
          padding: "10px 16px",
          display: "flex", alignItems: "center", gap: 8,
          color: "#9E9389", width: "100%",
        }}
      >
        <Lock size={15} color="#D97706" />
        <span style={{ fontSize: 14, fontWeight: 600 }}>Función Pro</span>
      </button>
      {showPaywall && (
        <PaywallModal
          feature={feature}
          message={message}
          planRequired={planRequired}
          onClose={() => setShowPaywall(false)}
        />
      )}
    </>
  );
}
