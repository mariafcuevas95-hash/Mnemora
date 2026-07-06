export interface MemoryMessage {
  role: "user" | "assistant";
  content: string;
}

export interface IMemoryProvider {
  get(userId: string, subjectId: string): Promise<string>;
  add(userId: string, subjectId: string, messages: MemoryMessage[]): Promise<void>;
}
