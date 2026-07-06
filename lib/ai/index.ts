import Anthropic from "@anthropic-ai/sdk";
import type { GenerateOptions, GenerateResult } from "./types";

// Model IDs — override per-alias via env vars when needed
const ANTHROPIC_MODELS: Record<string, string> = {
  tutor: process.env.AI_MODEL_TUTOR ?? "claude-sonnet-4-6",
  processor: process.env.AI_MODEL_PROCESSOR ?? "claude-haiku-4-5-20251001",
  extractor: process.env.AI_MODEL_EXTRACTOR ?? "claude-haiku-4-5-20251001",
};

const GOOGLE_MODELS: Record<string, string> = {};

let _anthropic: Anthropic | null = null;
function getAnthropic() {
  if (!_anthropic) _anthropic = new Anthropic();
  return _anthropic;
}

// Lazy-loaded so the module doesn't crash when GEMINI_API_KEY is absent
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _google: any = null;
async function getGoogle() {
  if (!_google) {
    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    _google = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  }
  return _google;
}

export async function generateText(options: GenerateOptions): Promise<GenerateResult> {
  const { model, messages, system, maxTokens = 2048 } = options;

  // ── Anthropic path ────────────────────────────────────────────────────────
  if (ANTHROPIC_MODELS[model]) {
    const client = getAnthropic();
    const resp = await client.messages.create({
      model: ANTHROPIC_MODELS[model],
      max_tokens: maxTokens,
      ...(system ? { system } : {}),
      messages,
    });
    return {
      text: (resp.content[0] as { text: string }).text,
      inputTokens: resp.usage.input_tokens,
      outputTokens: resp.usage.output_tokens,
    };
  }

  // ── Google Gemini path ────────────────────────────────────────────────────
  const genAI = await getGoogle();
  const modelId = GOOGLE_MODELS[model] ?? "gemini-2.0-flash-lite";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const gemini = genAI.getGenerativeModel({
    model: modelId,
    ...(system ? { systemInstruction: system } : {}),
  });

  const history = messages.slice(0, -1).map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));
  const last = messages[messages.length - 1];

  const chat = gemini.startChat({ history });
  const result = await chat.sendMessage(last.content);
  const response = result.response;

  return {
    text: response.text(),
    inputTokens: response.usageMetadata?.promptTokenCount ?? 0,
    outputTokens: response.usageMetadata?.candidatesTokenCount ?? 0,
  };
}

// Re-export types for consumers that only need to import from lib/ai
export type { ModelAlias, GenerateOptions, GenerateResult } from "./types";
