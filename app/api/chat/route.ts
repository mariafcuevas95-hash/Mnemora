import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { memoryProvider } from "@/lib/memory";
import { getIntelligenceContext, buildCognitiveBlock } from "@/lib/intelligence";
import { rateLimit } from "@/lib/rate-limit";
import { checkLimit, incrementUsage, limitExceededResponse } from "@/lib/plan-limits";
import { z } from "zod";

const anthropic = new Anthropic();

const BodySchema = z.object({
  subjectId: z.string().min(1),
  conversationId: z.string().uuid().optional(),
  message: z.string().min(1).max(4000),
  subjectName: z.string().optional(),
  focusConcept: z.string().optional(),
});

export async function POST(req: NextRequest) {
  // 1. Auth
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  if (!(await rateLimit(`chat:${user.id}`, 30, 60_000))) {
    return new Response("Too Many Requests", { status: 429 });
  }

  // 2. Plan limit check (before parsing body to fail fast)
  const limitCheck = await checkLimit(user.id, "tutor_messages");
  if (!limitCheck.allowed) return limitExceededResponse(limitCheck);

  // 3. Parse + validate
  const body = await req.json();
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) return new Response("Bad Request", { status: 400 });
  const { subjectId, conversationId, message, subjectName, focusConcept } = parsed.data;

  // 3. Check advanced_memory plan — Free users get no cross-session memory
  const memoryCheck = await checkLimit(user.id, "advanced_memory");
  const hasMemory = memoryCheck.allowed;

  // 4. Recuperar contexto en paralelo (ninguno bloquea el stream si falla)
  const [memoryContext, intelligenceCtx, history] = await Promise.all([
    hasMemory ? memoryProvider.get(user.id, subjectId) : Promise.resolve(null),
    getIntelligenceContext(user.id, subjectId),
    conversationId
      ? supabase
          .from("messages")
          .select("role, content")
          .eq("conversation_id", conversationId)
          .order("created_at", { ascending: true })
          .limit(10)
          .then(r => (r.data ?? []) as { role: "user" | "assistant"; content: string }[])
      : Promise.resolve([] as { role: "user" | "assistant"; content: string }[]),
  ]);

  // 4. Guardar mensaje del usuario + crear conversación si es nueva
  let activeConversationId = conversationId;
  if (!activeConversationId) {
    const { data: conv } = await supabase
      .from("conversations")
      .insert({ subject_id: subjectId, user_id: user.id, title: message.slice(0, 60) })
      .select("id")
      .single();
    activeConversationId = conv?.id;
  }
  if (activeConversationId) {
    await supabase.from("messages").insert({
      conversation_id: activeConversationId,
      role: "user",
      content: message,
    });
  }

  // 5. System prompt con contexto académico + perfil cognitivo
  const cognitiveBlock = buildCognitiveBlock(intelligenceCtx);
  const memoryBlock = memoryContext ? `\n### Memoria académica:\n${memoryContext}` : "";

  const focusBlock = focusConcept
    ? `\n### Concepto a trabajar:\nEl estudiante llegó desde el mapa mental queriendo trabajar "${focusConcept}". Enfoca tu ayuda en ese concepto.`
    : "";

  const systemPrompt = [
    `Eres el tutor de IA de Mnemora para la materia "${subjectName || subjectId}".`,
    `Responde siempre en español neutro latinoamericano (claro para cualquier estudiante de LATAM). Sé claro, conciso y pedagógico.`,
    `Cuando expliques un concepto, usa ejemplos concretos. Nunca seas genérico.`,
    cognitiveBlock,
    memoryBlock,
    focusBlock,
    `\nSi el estudiante pregunta algo fuera de la materia, rediríge lo amablemente.`,
  ].filter(Boolean).join("\n");

  // 6. Stream con Claude Sonnet
  const stream = await anthropic.messages.stream({
    model: process.env.AI_MODEL_TUTOR ?? "claude-sonnet-4-6",
    max_tokens: 1024,
    system: systemPrompt,
    messages: [
      ...history.map(m => ({ role: m.role, content: m.content })),
      { role: "user", content: message },
    ],
  });

  // 7. SSE → cliente; al finalizar: persiste + dispara learning engine
  let fullResponse = "";
  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        if (
          chunk.type === "content_block_delta" &&
          chunk.delta.type === "text_delta"
        ) {
          fullResponse += chunk.delta.text;
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`));
        }
      }
      controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
      controller.close();

      if (!activeConversationId || !fullResponse) return;

      // Persistir respuesta + contabilizar uso
      await supabase.from("messages").insert({
        conversation_id: activeConversationId,
        role: "assistant",
        content: fullResponse,
      });
      const yearMonth = new Date().toISOString().slice(0, 7);
      await supabase.rpc("increment_usage", {
        p_user_id: user.id,
        p_year_month: yearMonth,
        p_field: "tutor_messages_count",
      });

      // Fire-and-forget: actualizar Mem0 y aprendizaje en paralelo
      const learnPayload = {
        userId: user.id,
        subjectId,
        subjectName: subjectName ?? subjectId,
        conversationId: activeConversationId,
        exchange: [message, fullResponse] as [string, string],
      };

      // Mem0 solo para usuarios Pro/Premium
      if (hasMemory) memoryProvider.add(user.id, subjectId, [
        { role: "user", content: message },
        { role: "assistant", content: fullResponse },
      ]);

      // Learning Engine: Trigger.dev si está configurado, skip silencioso si no
      if (process.env.TRIGGER_SECRET_KEY) {
        import("@/trigger/analyze-session.task").then(({ analyzeSessionTask }) => {
          analyzeSessionTask.trigger(learnPayload).catch(() => {});
        });
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "X-Conversation-Id": activeConversationId ?? "",
    },
  });
}
