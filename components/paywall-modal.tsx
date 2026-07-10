"use client";

import { X, Zap, Check, Star } from "lucide-react";
import { PLANS } from "@/lib/plans";
import type { Feature, PlanId } from "@/lib/plans";
import { useRouter } from "next/navigation";

interface PaywallModalProps {
  feature: Feature;
  message: string;
  planRequired?: PlanId;
  onClose: () => void;
}

const FEATURE_TITLES: Partial<Record<Feature, string>> = {
  subjects:        "Agrega todas tus materias del semestre",
  syllabuses:      "Procesa todos los programas sin límite",
  summaries:       "Genera más resúmenes este mes",
  flashcards:      "Genera más flashcards este mes",
  tutor_messages:  "Sigue preguntándole al tutor",
  quiz:            "Quizzes adaptativos con IA",
  advanced_memory: "El tutor que te recuerda",
  daily_planner:   "Tu plan de estudio inteligente",
  mind_maps:       "Mapas mentales automáticos",
  exam_mode:             "Modo examen intensivo",
  ai_coaches:            "IA que reorganiza tu agenda",
  multimodal:            "Analiza fotos de tus apuntes",
  transcription:         "Transcripción de clases",
  advanced_analytics:    "Dashboard de rendimiento avanzado",
  performance_prediction:"Conoce tu probabilidad de aprobar",
  semester_replanner:    "Reorganiza tu semestre automáticamente",
  advanced_mind_maps:    "Mapas mentales adaptativos",
  learning_roadmap:      "Tu ruta de aprendizaje personalizada",
  exam_coverage:         "Cobertura del examen en tiempo real",
  academic_goals:        "Metas académicas personalizadas",
  ai_class_studio:       "Graba clases, obtén material en segundos",
};

// Each entry answers: "what does this unlock FOR ME?"
const FEATURE_BENEFITS: Record<Feature, string[]> = {
  // Numeric — upgrade to Pro
  subjects:        ["Organiza todas tus materias en un solo lugar", "Sin límites para todo el semestre"],
  syllabuses:      ["Sube todos tus programas de materia sin restricciones", "Tus fechas de examen aparecen automáticamente en el calendario"],
  summaries:       ["Resume cualquier documento en segundos", "Flashcards generadas automáticamente desde cada resumen"],
  flashcards:      ["Flashcards ilimitadas para repasar cuando quieras", "El sistema sabe exactamente cuándo repasar cada tarjeta"],
  tutor_messages:  ["500 preguntas al tutor por mes", "El tutor recuerda todo lo que trabajaron juntos"],
  // Boolean — Pro
  quiz:            ["Quizzes adaptativos generados con IA", "Las preguntas se ajustan a tus puntos débiles"],
  advanced_memory: ["El tutor te recuerda entre sesiones", "No tienes que explicar todo de cero cada vez"],
  daily_planner:   ["Sabes exactamente qué estudiar cada día", "Tu plan se ajusta solo según tus exámenes"],
  mind_maps:       ["Visualiza los conceptos clave de cada tema", "Generados automáticamente desde tus documentos"],
  // Boolean — Premium
  exam_mode:             ["Modo intensivo antes del examen: la IA lo organiza todo", "Simulacros, repaso y agenda ajustados a la fecha del parcial", "Ve tu nivel de preparación en tiempo real"],
  ai_coaches:            ["La IA reorganiza tu agenda cuando se acerca un examen", "Los simulacros se adaptan a lo que más te cuesta"],
  multimodal:            ["Fotografía apuntes, ejercicios escritos a mano y pizarrones", "La IA extrae los conceptos y los convierte en flashcards"],
  transcription:         ["Próximamente disponible", ""],
  advanced_analytics:    ["Ve exactamente dónde pierdes puntos en cada materia", "Dashboard completo de rendimiento y tendencias"],
  performance_prediction:["Conoce tu probabilidad de aprobar antes del examen", "La IA predice tu nota según tu progreso actual"],
  semester_replanner:    ["Si te atrasas, la IA reorganiza todo el semestre", "Tu plan se adapta solo cuando cambia algo"],
  advanced_mind_maps:    ["Los nodos cambian de color según lo que aprendes", "Haz clic y abre el tutor en ese concepto exacto"],
  learning_roadmap:      ["La IA te muestra qué aprender después según tu avance", "No pierdes tiempo estudiando lo que ya dominas"],
  exam_coverage:         ["Ve qué % del examen ya dominas", "Sabes exactamente qué temas te faltan cubrir"],
  academic_goals:        ["Tu plan se adapta a tu meta: aprobar, sacar buena nota o ganar una beca", "La IA ajusta la estrategia según lo que quieres lograr"],
  ai_class_studio:       ["Graba o sube cualquier clase y obtén resumen, apuntes, flashcards y quiz automáticamente", "La IA transcribe el audio y genera todos tus materiales de estudio en minutos"],
};

export function PaywallModal({ feature, message, planRequired = "pro", onClose }: PaywallModalProps) {
  const router    = useRouter();
  const plan      = PLANS[planRequired];
  const benefits  = FEATURE_BENEFITS[feature] ?? [];
  const isPremium = planRequired === "premium";

  function handleUpgrade() {
    onClose();
    router.push(`/upgrade?reason=${feature}`);
  }

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(26,22,18,0.5)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 24,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: "#F7F4EF", borderRadius: 20, padding: 32,
        maxWidth: 420, width: "100%", position: "relative",
        boxShadow: "0 20px 60px rgba(26,22,18,0.18)",
      }}>
        <button
          onClick={onClose}
          style={{
            position: "absolute", top: 16, right: 16,
            background: "none", border: "none", cursor: "pointer",
            color: "#9E9389", padding: 4, borderRadius: 6,
          }}
        >
          <X size={18} />
        </button>

        <div style={{
          width: 48, height: 48,
          background: isPremium ? "#1C1108" : "#1B3F2F",
          borderRadius: 14,
          display: "flex", alignItems: "center", justifyContent: "center",
          marginBottom: 20,
        }}>
          {isPremium
            ? <Star size={22} color="#FBBF24" fill="#FBBF24" />
            : <Zap  size={22} color="#F0C040" fill="#F0C040" />}
        </div>

        <h2 style={{ fontSize: 22, fontWeight: 800, color: "#1A1612", marginBottom: 8 }}>
          {FEATURE_TITLES[feature] ?? (isPremium ? "Plan Premium" : "Plan Pro")}
        </h2>
        <p style={{ fontSize: 15, color: "#6B6259", marginBottom: 24, lineHeight: 1.5 }}>
          {message}
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 28 }}>
          {benefits.map(b => (
            <div key={b} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 20, height: 20, borderRadius: 10, flexShrink: 0,
                background: isPremium ? "#FEF3C7" : "#E8F0EC",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Check size={11} color={isPremium ? "#92400E" : "#1B3F2F"} strokeWidth={2.5} />
              </div>
              <span style={{ fontSize: 14, color: "#3D3530" }}>{b}</span>
            </div>
          ))}
        </div>

        <button
          onClick={handleUpgrade}
          style={{
            width: "100%", padding: "14px 20px",
            background: isPremium ? "#1C1108" : "#1B3F2F",
            color: "#F7F4EF", border: "none", borderRadius: 12,
            cursor: "pointer", fontSize: 15, fontWeight: 700,
          }}
        >
          Ver planes y precios
        </button>
        <button
          onClick={onClose}
          style={{
            width: "100%", padding: "10px 20px", marginTop: 10,
            background: "none", color: "#9E9389",
            border: "none", borderRadius: 12, cursor: "pointer", fontSize: 14,
          }}
        >
          Continuar con mi plan actual
        </button>
      </div>
    </div>
  );
}
