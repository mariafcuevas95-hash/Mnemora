import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: subjectId } = await params;
  const url = new URL(req.url);
  const fromGuided = url.searchParams.get("fromGuided") === "1";
  const flashPct  = url.searchParams.has("flashPct")  ? Number(url.searchParams.get("flashPct"))  : null;
  const quizPct   = url.searchParams.has("quizPct")   ? Number(url.searchParams.get("quizPct"))   : null;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Collect context in parallel
  const [subjectRes, weakRes, examRes, sessionRes, lastMsgRes] = await Promise.all([
    supabase.from("subjects").select("name").eq("id", subjectId).single(),

    supabase
      .from("student_knowledge")
      .select("concept_name, confidence_score, mastery_level, last_reviewed_at")
      .eq("subject_id", subjectId)
      .eq("user_id", user.id)
      .neq("mastery_level", "mastered")
      .order("confidence_score", { ascending: true })
      .limit(3),

    supabase
      .from("calendar_events")
      .select("title, event_date")
      .eq("subject_id", subjectId)
      .eq("user_id", user.id)
      .eq("event_type", "exam")
      .gte("event_date", new Date().toISOString().slice(0, 10))
      .order("event_date", { ascending: true })
      .limit(1),

    supabase
      .from("learning_sessions")
      .select("id", { count: "exact" })
      .eq("subject_id", subjectId)
      .eq("user_id", user.id),

    supabase
      .from("messages")
      .select("role, content, conversations!inner(subject_id, user_id)")
      .eq("conversations.subject_id", subjectId)
      .eq("conversations.user_id", user.id)
      .eq("role", "assistant")
      .order("created_at", { ascending: false })
      .limit(1),
  ]);

  const subjectName = subjectRes.data?.name ?? "tu materia";
  const weakConcepts = weakRes.data ?? [];
  const nextExam = examRes.data?.[0] ?? null;
  const sessionCount = sessionRes.count ?? 0;
  const lastAssistantMsg = lastMsgRes.data?.[0]?.content ?? null;

  // Build context for the greeting
  const contextLines: string[] = [];

  if (sessionCount === 0) {
    contextLines.push("Es la primera sesión del estudiante en esta materia.");
  } else {
    contextLines.push(`El estudiante ha tenido ${sessionCount} sesión${sessionCount !== 1 ? "es" : ""} previas en esta materia.`);
  }

  if (lastAssistantMsg) {
    const snippet = lastAssistantMsg.slice(0, 200).replace(/\n/g, " ");
    contextLines.push(`Último mensaje del tutor en sesión anterior: "${snippet}"`);
  }

  if (weakConcepts.length > 0) {
    const names = weakConcepts.map(c => c.concept_name).join(", ");
    contextLines.push(`Conceptos con menor dominio: ${names}.`);

    const daysSince = weakConcepts[0].last_reviewed_at
      ? Math.floor((Date.now() - new Date(weakConcepts[0].last_reviewed_at).getTime()) / 86_400_000)
      : null;
    if (daysSince !== null && daysSince >= 3) {
      contextLines.push(`El concepto más débil ("${weakConcepts[0].concept_name}") no fue repasado hace ${daysSince} días.`);
    }
  }

  if (nextExam) {
    const daysUntil = Math.ceil(
      (new Date(nextExam.event_date).getTime() - Date.now()) / 86_400_000
    );
    contextLines.push(`Próximo examen: "${nextExam.title}" en ${daysUntil} días.`);
  }

  const context = contextLines.join("\n");

  const isFirstSession = sessionCount === 0;

  let prompt: string;

  if (fromGuided) {
    const scoreLines: string[] = [];
    if (flashPct !== null) scoreLines.push(`Flashcards: ${flashPct}% de precisión`);
    if (quizPct  !== null) scoreLines.push(`Quiz: ${quizPct}% de precisión`);
    const scoreSummary = scoreLines.length > 0 ? `Resultados de la sesión: ${scoreLines.join(" · ")}.` : "";
    prompt = `Eres el tutor de Mnemora para la materia "${subjectName}".
El estudiante acaba de completar una sesión guiada completa: repasó sus flashcards y hizo el quiz. ${scoreSummary}
Contexto adicional:
${context}

Escribe el mensaje de apertura de esta sesión de consolidación (máximo 3 oraciones). Reconocé que terminaron la práctica y que ahora van a consolidar con conversación. Sé directo y motivador.
Ejemplo de tono: "Terminaste las flashcards y el quiz — eso es compromiso real. Ahora vamos a consolidar..."
NO empieces con "Hola" genérico. Responde solo el mensaje, sin comillas ni explicaciones.`;
  } else if (isFirstSession) {
    prompt = `Eres el tutor de Mnemora para la materia "${subjectName}". Es la primera sesión del estudiante.
Escribe un saludo breve y cálido de bienvenida (máximo 3 oraciones). Preséntate como su tutor personal. Muestra entusiasmo genuino. Termina con una pregunta directa sobre por dónde quieren empezar.
NO uses "¿En qué puedo ayudarte?" — sé más específico y personal.
Responde solo el mensaje, sin comillas ni explicaciones adicionales.`;
  } else {
    prompt = `Eres el tutor de Mnemora para la materia "${subjectName}".
Contexto del estudiante:
${context}

Escribe el mensaje de apertura de esta sesión (máximo 4 oraciones). El tono debe ser el de un entrenador académico que ya conoce al estudiante — directo, cálido y con un análisis concreto.
Si hay conceptos débiles con días sin repasar, menciona el patrón que detectaste.
Si hay un examen próximo, menciónalo con urgencia pero sin alarmar.
Termina con una propuesta concreta de lo que harán hoy.
NO empieces con "Hola" genérico — puedes empezar con "Antes de empezar...", "Estuve revisando...", "Noté algo...", etc.
Responde solo el mensaje, sin comillas ni explicaciones adicionales.`;
  }

  let greeting: string;

  try {
    const resp = await anthropic.messages.create({
      model: process.env.AI_MODEL_PROCESSOR ?? "claude-haiku-4-5-20251001",
      max_tokens: 300,
      temperature: 0.7,
      messages: [{ role: "user", content: prompt }],
    });
    greeting = (resp.content[0] as { type: "text"; text: string }).text.trim();
  } catch {
    // Fallback graceful si Anthropic falla
    greeting = isFirstSession
      ? `Bienvenido a tu primera sesión de **${subjectName}**. Soy tu tutor y voy a acompañarte durante todo el semestre.\n\n¿Por dónde quieres empezar?`
      : `Hola. Tengo acceso a tu historial de sesiones en **${subjectName}** y a tu perfil de aprendizaje.\n\n¿Qué quieres trabajar hoy?`;
  }

  // Generate 3 contextual suggestions
  const suggestions: string[] = [];

  if (fromGuided) {
    if (weakConcepts.length > 0) {
      suggestions.push(`¿Podés explicarme ${weakConcepts[0].concept_name} con tus palabras?`);
    }
    suggestions.push("¿Cuál de los conceptos del quiz te quedó menos claro?");
    if (nextExam) {
      const daysUntil = Math.ceil((new Date(nextExam.event_date).getTime() - Date.now()) / 86_400_000);
      suggestions.push(`¿Qué me falta para el examen en ${daysUntil} días?`);
    } else {
      suggestions.push("Dame un ejercicio de práctica sobre lo que acabo de repasar");
    }
  } else {
    if (nextExam) {
      const daysUntil = Math.ceil(
        (new Date(nextExam.event_date).getTime() - Date.now()) / 86_400_000
      );
      suggestions.push(`¿Qué me falta para estar listo para el examen en ${daysUntil} días?`);
    }
    if (weakConcepts.length > 0) {
      suggestions.push(`Explicame ${weakConcepts[0].concept_name} de otra forma`);
    }
    if (weakConcepts.length > 1) {
      suggestions.push(`Dame ejercicios sobre ${weakConcepts[1].concept_name}`);
    }
    if (suggestions.length < 3 && lastAssistantMsg) {
      suggestions.push("Continuemos con lo que estábamos viendo");
    }
    if (suggestions.length < 3) suggestions.push("¿Qué debería estudiar hoy?");
    if (suggestions.length < 3) suggestions.push("Dame un ejercicio de práctica");
  }

  return NextResponse.json({
    greeting,
    suggestions: suggestions.slice(0, 3),
    context: {
      subjectName,
      sessionCount,
      weakConcepts: weakConcepts.map(c => c.concept_name),
      nextExam: nextExam ? {
        title: nextExam.title,
        daysUntil: Math.ceil((new Date(nextExam.event_date).getTime() - Date.now()) / 86_400_000),
      } : null,
      isFirstSession,
    },
  });
}
