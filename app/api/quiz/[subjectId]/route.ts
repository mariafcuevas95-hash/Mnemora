import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateText } from "@/lib/ai";
import { checkLimit, limitExceededResponse } from "@/lib/plan-limits";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export type QuestionType = "multiple_choice" | "true_false" | "definition";

export interface QuizOption {
  id: string;   // "a" | "b" | "c" | "d"
  text: string;
}

export interface QuizQuestion {
  id: string;                     // concept_id
  conceptName: string;
  type: QuestionType;
  question: string;
  options: QuizOption[];          // 4 for mc, 2 for t/f, 4 for definition
  correctId: string;              // which option is correct
  explanation: string;            // why that answer is correct
  currentConfidence: number;      // 0-1, used to update after answer
  masteryLevel: string;
}

export interface QuizSession {
  subjectId: string;
  subjectName: string;
  questions: QuizQuestion[];
  generatedAt: string;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ subjectId: string }> }
) {
  const { subjectId } = await params;
  const documentId = req.nextUrl.searchParams.get("documentId") ?? undefined;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allowed = await rateLimit(`quiz:${user.id}`, 30, 60 * 60 * 1000); // 30/hr
  if (!allowed) return NextResponse.json({ error: "Demasiadas solicitudes. Intenta más tarde." }, { status: 429 });

  const check = await checkLimit(user.id, "quiz");
  if (!check.allowed) return limitExceededResponse(check);

  let flashcardsQuery = supabase
    .from("flashcards")
    .select("id, front, back")
    .eq("subject_id", subjectId)
    .order("created_at")
    .limit(40);

  if (documentId) {
    flashcardsQuery = flashcardsQuery.eq("document_id", documentId);
  }

  const [subjectRes, knowledgeRes, flashcardsRes] = await Promise.all([
    supabase.from("subjects").select("name").eq("id", subjectId).single(),
    supabase
      .from("student_knowledge")
      .select("concept_id, confidence, mastery_level, subject_concepts!inner(name, subject_id)")
      .eq("user_id", user.id)
      .eq("subject_concepts.subject_id", subjectId)
      .order("confidence", { ascending: true })
      .limit(30),
    flashcardsQuery,
  ]);

  const subjectName = subjectRes.data?.name ?? "la materia";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const knowledge = (knowledgeRes.data ?? []) as any[];
  const flashcards = (flashcardsRes.data ?? []) as { id: string; front: string; back: string }[];

  const hasKnowledge = knowledge.length > 0;
  const hasFlashcards = flashcards.length > 0;

  if (!hasKnowledge && !hasFlashcards) {
    return NextResponse.json({ error: "No hay contenido para practicar. Sube un documento primero." }, { status: 404 });
  }

  // Shuffle helper
  function shuffle<T>(arr: T[]): T[] {
    return [...arr].sort(() => Math.random() - 0.5);
  }

  let session: typeof knowledge = [];
  let useFlashcardMode = false;
  let sessionFlashcards: typeof flashcards = [];

  const MIN_QUESTIONS = 10;

  if (hasKnowledge) {
    const critical = knowledge.filter(k => k.confidence < 0.4);
    const medium   = knowledge.filter(k => k.confidence >= 0.4 && k.confidence < 0.75);
    const good     = knowledge.filter(k => k.confidence >= 0.75);
    session.push(...critical.slice(0, 7));
    session.push(...medium.slice(0, 5));
    if (session.length < MIN_QUESTIONS) session.push(...good.slice(0, MIN_QUESTIONS - session.length));
    session = session.slice(0, 15);
  }

  if (hasFlashcards) {
    sessionFlashcards = shuffle(flashcards).slice(0, 15);
    if (!hasKnowledge) useFlashcardMode = true;
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(buildFallback(subjectId, subjectName, session, flashcards));
  }

  // Build content for the prompt
  let contentBlock: string;
  if (useFlashcardMode) {
    contentBlock = sessionFlashcards.map((f, i) =>
      `${i + 1}. Concepto: "${f.front}" → Respuesta: "${f.back}"`
    ).join("\n");
  } else {
    // Enrich with flashcard content when available
    const fcMap = new Map(flashcards.map(f => [f.front.toLowerCase(), f]));
    contentBlock = session.map((k, i) => {
      const name = k.subject_concepts?.name ?? "";
      const conf = Math.round(k.confidence * 100);
      const matchedFc = sessionFlashcards.find(f =>
        f.front.toLowerCase().includes(name.toLowerCase()) ||
        name.toLowerCase().includes(f.front.toLowerCase().slice(0, 15))
      );
      fcMap;
      const fcContext = matchedFc ? ` | Flashcard: "${matchedFc.front}" → "${matchedFc.back}"` : "";
      return `${i + 1}. "${name}" (confianza: ${conf}%)${fcContext}`;
    }).join("\n");

    // Si hay pocas entradas de conocimiento, complementar con flashcards disponibles
    if (session.length < MIN_QUESTIONS && sessionFlashcards.length > 0) {
      const extra = sessionFlashcards.slice(0, MIN_QUESTIONS - session.length);
      contentBlock += "\n" + extra.map((f, i) =>
        `${session.length + i + 1}. Concepto: "${f.front}" → Respuesta: "${f.back}"`
      ).join("\n");
    }
  }

  // Garantiza un mínimo de 10 preguntas independientemente del contenido disponible
  const rawCount = useFlashcardMode ? sessionFlashcards.length : Math.max(session.length, MIN_QUESTIONS);
  const questionCount = Math.min(Math.max(rawCount, MIN_QUESTIONS), 15);

  try {
    const resp = await generateText({
      model: "processor",
      maxTokens: 4000,
      system: `Eres un generador experto de preguntas de quiz para estudiantes universitarios de ${subjectName}.
Genera preguntas desafiantes, precisas y pedagógicas. Cada pregunta tiene exactamente 4 opciones (a, b, c, d).
Devuelve SOLO JSON válido. Sin texto extra. Sin markdown.`,
      messages: [{
        role: "user",
        content: `Genera exactamente ${questionCount} preguntas de quiz sobre ${subjectName} usando este contenido:

${contentBlock}

Reglas estrictas:
- Varía los tipos: "multiple_choice" (aplicación o análisis), "true_false", "definition" (al menos uno de cada tipo si hay ≥3 items)
- Para true_false: opciones siempre [{"id":"a","text":"Verdadero"},{"id":"b","text":"Falso"}]
- Las preguntas deben ser específicas al contenido, no genéricas
- Los distractores (incorrectas) deben ser plausibles y relacionados con la materia, nunca absurdos
- La explicación (2-3 oraciones) debe enseñar el concepto, no solo decir "es correcto porque sí"
- Usa el contexto de las flashcards cuando esté disponible para hacer preguntas más ricas

JSON exacto (array):
[
  {
    "conceptIndex": 0,
    "type": "multiple_choice",
    "question": "pregunta específica y desafiante",
    "options": [
      {"id": "a", "text": "opción correcta"},
      {"id": "b", "text": "distractor plausible"},
      {"id": "c", "text": "distractor plausible"},
      {"id": "d", "text": "distractor plausible"}
    ],
    "correctId": "a",
    "explanation": "explicación pedagógica de 2-3 oraciones"
  }
]`,
      }],
    });

    const raw = JSON.parse(resp.text.replace(/```json\n?|```/g, "").trim());

    const questions: QuizQuestion[] = (Array.isArray(raw) ? raw : []).map((q: {
      conceptIndex: number;
      type: QuestionType;
      question: string;
      options: QuizOption[];
      correctId: string;
      explanation: string;
    }) => {
      if (useFlashcardMode) {
        const fc = sessionFlashcards[q.conceptIndex] ?? sessionFlashcards[0];
        return {
          id: fc.id,
          conceptName: fc.front.length > 50 ? fc.front.slice(0, 49) + "…" : fc.front,
          type: q.type,
          question: q.question,
          options: q.options,
          correctId: q.correctId,
          explanation: q.explanation,
          currentConfidence: 0,
          masteryLevel: "unknown",
        };
      }
      const k = session[q.conceptIndex] ?? session[0];
      return {
        id: k.concept_id,
        conceptName: k.subject_concepts?.name ?? "",
        type: q.type,
        question: q.question,
        options: q.options,
        correctId: q.correctId,
        explanation: q.explanation,
        currentConfidence: k.confidence,
        masteryLevel: k.mastery_level,
      };
    }).filter((q: QuizQuestion) => q.conceptName && q.options?.length >= 2);

    return NextResponse.json({
      subjectId,
      subjectName,
      questions,
      generatedAt: new Date().toISOString(),
    } satisfies QuizSession);

  } catch {
    return NextResponse.json(buildFallback(subjectId, subjectName, session, flashcards));
  }
}

function buildFallback(
  subjectId: string,
  subjectName: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  session: any[],
  flashcards: { id: string; front: string; back: string }[]
): QuizSession {
  const knowledgeQs: QuizQuestion[] = session.slice(0, 10).map(k => ({
    id: k.concept_id,
    conceptName: k.subject_concepts?.name ?? "",
    type: "true_false" as QuestionType,
    question: `¿"${k.subject_concepts?.name}" es un concepto clave de ${subjectName}?`,
    options: [{ id: "a", text: "Verdadero" }, { id: "b", text: "Falso" }],
    correctId: "a",
    explanation: `"${k.subject_concepts?.name}" es un concepto importante de ${subjectName}.`,
    currentConfidence: k.confidence,
    masteryLevel: k.mastery_level,
  }));

  const flashcardQs: QuizQuestion[] = flashcards
    .slice(0, Math.max(0, 10 - knowledgeQs.length))
    .map(f => ({
      id: f.id,
      conceptName: f.front.length > 50 ? f.front.slice(0, 49) + "…" : f.front,
      type: "true_false" as QuestionType,
      question: `¿Es correcto que: "${f.back}"?`,
      options: [{ id: "a", text: "Verdadero" }, { id: "b", text: "Falso" }],
      correctId: "a",
      explanation: f.back,
      currentConfidence: 0,
      masteryLevel: "unknown",
    }));

  const questions: QuizQuestion[] = [...knowledgeQs, ...flashcardQs];

  return { subjectId, subjectName, questions, generatedAt: new Date().toISOString() };
}
