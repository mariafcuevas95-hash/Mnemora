// tutor    → Claude Sonnet (streaming handled separately in /api/chat)
// processor → Gemini Flash Lite (flashcards, summaries — cheap, fast)
// extractor → Gemini Flash (syllabus, complex docs — better reasoning)
export type ModelAlias = "tutor" | "processor" | "extractor";

export interface AIMessage {
  role: "user" | "assistant";
  content: string;
}

export interface GenerateOptions {
  model: ModelAlias;
  messages: AIMessage[];
  system?: string;
  maxTokens?: number;
}

export interface GenerateResult {
  text: string;
  inputTokens: number;
  outputTokens: number;
}
