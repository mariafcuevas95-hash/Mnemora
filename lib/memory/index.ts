import type { IMemoryProvider } from "./types";
import { Mem0Provider } from "./mem0-provider";

// To replace Mem0 with an internal solution, swap this single line.
// The rest of the codebase is unaffected.
export const memoryProvider: IMemoryProvider = new Mem0Provider();

export type { IMemoryProvider, MemoryMessage } from "./types";
