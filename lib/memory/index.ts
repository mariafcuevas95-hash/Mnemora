import type { IMemoryProvider } from "./types";

let _provider: IMemoryProvider | null = null;

// Lazy singleton — instantiated on first use so module import doesn't crash
// during build when MEM0_API_KEY is not available in the build environment.
export function getMemoryProvider(): IMemoryProvider {
  if (!_provider) {
    const { Mem0Provider } = require("./mem0-provider");
    _provider = new Mem0Provider() as IMemoryProvider;
  }
  return _provider as IMemoryProvider;
}

// Backwards-compat alias used by existing callers.
export const memoryProvider = {
  get:(...args: Parameters<IMemoryProvider["get"]>) => getMemoryProvider().get(...args),
  add:(...args: Parameters<IMemoryProvider["add"]>) => getMemoryProvider().add(...args),
};

export type { IMemoryProvider, MemoryMessage } from "./types";
