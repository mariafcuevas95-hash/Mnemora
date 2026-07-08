"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Logo } from "@/components/logo";

const LS_KEY = "mnemora_pwa_seen";

type Platform = "ios" | "android-prompt" | "android-manual" | "desktop-prompt" | "desktop-manual" | null;

function InstalarContent() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/dashboard";

  const [platform, setPlatform] = useState<Platform>(null);
  const [step, setStep] = useState(0); // for iOS steps
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as unknown as Record<string,unknown>).MSStream;
    const isAndroid = /Android/.test(ua);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prompt = (window as any).__mnInstallPrompt;

    if (isIOS) {
      // Check if already installed as PWA
      if ((navigator as unknown as Record<string,unknown>).standalone) { finish(); return; }
      setPlatform("ios");
    } else if (isAndroid) {
      setPlatform(prompt ? "android-prompt" : "android-manual");
      if (prompt) setDeferredPrompt(prompt);
    } else {
      setPlatform(prompt ? "desktop-prompt" : "desktop-manual");
      if (prompt) setDeferredPrompt(prompt);
    }
  }, []);

  function finish(didInstall = false) {
    localStorage.setItem(LS_KEY, didInstall ? "installed" : "skipped");
    router.push(next);
  }

  async function handleInstallPrompt() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setInstalled(true);
      setTimeout(() => finish(true), 1500);
    }
  }

  if (platform === null) return null;

  return (
    <div style={{
      minHeight: "100vh",
      background: "#FAFAF8",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "40px 28px 36px",
      maxWidth: 480,
      margin: "0 auto",
    }}>

      {/* Top: logo */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Logo size={32} />
        <span className="font-display" style={{ fontWeight: 800, fontSize: 18, color: "#1A1612" }}>Mnemora</span>
      </div>

      {/* Center content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: "100%", textAlign: "center", padding: "32px 0" }}>

        {/* Phone illustration */}
        <PhoneIllustration platform={platform} step={step} />

        <h1 className="font-display" style={{ fontSize: "clamp(24px,5vw,30px)", fontWeight: 800, color: "#1A1612", letterSpacing: "-0.02em", marginBottom: 12, marginTop: 32 }}>
          {installed ? "¡Listo!" : "Instala Mnemora"}
        </h1>

        {installed ? (
          <p style={{ fontSize: 16, color: "#6B6259", lineHeight: 1.6 }}>
            La app está en tu pantalla de inicio. ✅
          </p>
        ) : (
          <PlatformInstructions
            platform={platform}
            step={step}
            setStep={setStep}
            onInstall={handleInstallPrompt}
          />
        )}
      </div>

      {/* Bottom actions */}
      {!installed && (
        <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 10 }}>
          {(platform === "android-prompt" || platform === "desktop-prompt") && (
            <button
              onClick={handleInstallPrompt}
              style={{ padding: "16px 24px", borderRadius: 14, background: "#1B3F2F", color: "#fff", border: "none", fontSize: 16, fontWeight: 700, cursor: "pointer", width: "100%" }}
            >
              Instalar Mnemora
            </button>
          )}
          {platform === "ios" && step < 3 && (
            <button
              onClick={() => setStep(s => s + 1)}
              style={{ padding: "16px 24px", borderRadius: 14, background: "#1B3F2F", color: "#fff", border: "none", fontSize: 16, fontWeight: 700, cursor: "pointer", width: "100%" }}
            >
              {step === 0 ? "Comenzar" : "Siguiente →"}
            </button>
          )}
          {platform === "ios" && step === 3 && (
            <button
              onClick={() => finish(true)}
              style={{ padding: "16px 24px", borderRadius: 14, background: "#1B3F2F", color: "#fff", border: "none", fontSize: 16, fontWeight: 700, cursor: "pointer", width: "100%" }}
            >
              Ya la instalé ✓
            </button>
          )}
          <button
            onClick={() => finish(false)}
            style={{ padding: "12px 24px", borderRadius: 14, background: "transparent", color: "#9E9389", border: "none", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
          >
            Ahora no
          </button>
        </div>
      )}

      {installed && (
        <button
          onClick={() => finish(true)}
          style={{ padding: "16px 24px", borderRadius: 14, background: "#1B3F2F", color: "#fff", border: "none", fontSize: 16, fontWeight: 700, cursor: "pointer", width: "100%" }}
        >
          Ir al dashboard →
        </button>
      )}
    </div>
  );
}

/* ── Platform instructions ── */
function PlatformInstructions({ platform, step, setStep, onInstall }: {
  platform: Platform;
  step: number;
  setStep: (n: number) => void;
  onInstall: () => void;
}) {
  if (platform === "ios") {
    const steps = [
      { icon: "📱", title: "Abre Safari", desc: "Esta página debe estar abierta en Safari (no en Chrome ni otro navegador)." },
      { icon: "⬆️", title: "Toca Compartir", desc: 'Presiona el botón de compartir ↑ en la barra inferior de Safari.' },
      { icon: "➕", title: "Agregar a inicio", desc: 'Desplázate hacia abajo y toca "Agregar a pantalla de inicio".' },
      { icon: "✅", title: "Confirma", desc: 'Toca "Agregar" en la esquina superior derecha. ¡Listo!' },
    ];
    return (
      <div style={{ width: "100%" }}>
        <p style={{ fontSize: 15, color: "#6B6259", lineHeight: 1.6, marginBottom: 28 }}>
          Sigue estos pasos para instalar Mnemora en tu iPhone o iPad.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {steps.map((s, i) => (
            <div
              key={i}
              onClick={() => setStep(i)}
              style={{
                padding: "14px 18px",
                borderRadius: 14,
                background: i === step ? "#1B3F2F" : i < step ? "#EAF2EC" : "var(--mn-surface, #fff)",
                border: i === step ? "none" : "1px solid rgba(26,22,18,0.07)",
                display: "flex", alignItems: "center", gap: 14,
                cursor: "pointer",
                transition: "all 200ms",
                opacity: i > step + 1 ? 0.45 : 1,
              }}
            >
              <span style={{ fontSize: 22, flexShrink: 0 }}>{s.icon}</span>
              <div style={{ textAlign: "left" }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: i === step ? "#fff" : "#1A1612", marginBottom: 2 }}>{s.title}</p>
                <p style={{ fontSize: 13, color: i === step ? "rgba(255,255,255,0.8)" : "#6B6259", lineHeight: 1.4 }}>{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (platform === "android-prompt" || platform === "desktop-prompt") {
    return (
      <p style={{ fontSize: 16, color: "#6B6259", lineHeight: 1.7, maxWidth: 340 }}>
        Instala Mnemora en tu dispositivo para acceder más rápido, sin abrir el navegador, y con soporte sin conexión.
      </p>
    );
  }

  if (platform === "android-manual") {
    return (
      <div style={{ textAlign: "left", width: "100%" }}>
        <p style={{ fontSize: 15, color: "#6B6259", marginBottom: 16, lineHeight: 1.6 }}>
          Instala Mnemora desde Chrome:
        </p>
        {[
          { icon: "⋮", label: 'Toca el menú ⋮ arriba a la derecha' },
          { icon: "➕", label: '"Agregar a pantalla de inicio"' },
          { icon: "✅", label: 'Toca "Agregar"' },
        ].map((s, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "#1B3F2F", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <span style={{ fontSize: 14, color: "#fff", fontWeight: 700 }}>{i + 1}</span>
            </div>
            <p style={{ fontSize: 14, color: "#3D352E" }}>{s.label}</p>
          </div>
        ))}
      </div>
    );
  }

  // desktop-manual
  return (
    <div>
      <p style={{ fontSize: 16, color: "#6B6259", lineHeight: 1.7, marginBottom: 16 }}>
        La mejor experiencia de Mnemora es desde el teléfono.
      </p>
      <p style={{ fontSize: 14, color: "#9E9389", lineHeight: 1.6 }}>
        Abre <strong style={{ color: "#1B3F2F" }}>mnemora.me</strong> en tu celular y sigue las instrucciones para instalar la app.
      </p>
    </div>
  );
}

/* ── Phone illustration ── */
function PhoneIllustration({ platform, step }: { platform: Platform; step: number }) {
  const isIOS = platform === "ios";

  return (
    <div style={{ position: "relative", width: 140, height: 200 }}>
      {/* Phone shell */}
      <div style={{
        width: 120, height: 196,
        borderRadius: 28,
        background: "#1A1612",
        margin: "0 auto",
        position: "relative",
        boxShadow: "0 20px 60px rgba(0,0,0,0.18), 0 4px 12px rgba(0,0,0,0.1)",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        overflow: "hidden",
      }}>
        {/* Screen */}
        <div style={{ width: 106, height: 180, borderRadius: 20, background: "#F7F4EF", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {isIOS && step >= 1 ? (
            <div style={{ textAlign: "center", padding: 8 }}>
              <div style={{ fontSize: 28, marginBottom: 6 }}>
                {step === 1 ? "⬆️" : step === 2 ? "➕" : "✅"}
              </div>
              <p style={{ fontSize: 9, color: "#1A1612", fontWeight: 600, lineHeight: 1.3 }}>
                {step === 1 ? "Compartir" : step === 2 ? "Agregar a\ninicio" : "¡Listo!"}
              </p>
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: 8 }}>
              <Logo size={40} />
              <p style={{ fontSize: 9, fontWeight: 700, color: "#1A1612", marginTop: 6 }}>Mnemora</p>
            </div>
          )}
        </div>
        {/* Notch */}
        <div style={{ position: "absolute", top: 10, width: 36, height: 6, borderRadius: 3, background: "#1A1612", zIndex: 2 }} />
      </div>
    </div>
  );
}

export default function InstalarPage() {
  return (
    <Suspense>
      <InstalarContent />
    </Suspense>
  );
}
