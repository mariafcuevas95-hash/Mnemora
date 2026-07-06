import MemoryClient from "mem0ai";
import type { IMemoryProvider, MemoryMessage } from "./types";

export class Mem0Provider implements IMemoryProvider {
  private client: MemoryClient;

  constructor() {
    this.client = new MemoryClient({ apiKey: process.env.MEM0_API_KEY! });
  }

  async get(userId: string, subjectId: string): Promise<string> {
    const agentId = `user_${userId}_subject_${subjectId}`;
    try {
      const result = await this.client.search("contexto académico del estudiante", {
        filters: { agent_id: agentId },
        topK: 10,
      });
      if (!result?.results?.length) return "";
      return result.results
        .map((m: { memory?: string }) => `- ${m.memory ?? ""}`)
        .join("\n");
    } catch {
      return "";
    }
  }

  async add(userId: string, subjectId: string, messages: MemoryMessage[]): Promise<void> {
    const agentId = `user_${userId}_subject_${subjectId}`;
    try {
      await this.client.add(messages, { agent_id: agentId });
    } catch {}
  }
}
