import type { TraceId } from "./types";

export function createTraceId(): TraceId {
  const generator = globalThis.crypto?.randomUUID;
  if (typeof generator !== "function") {
    throw new Error("A standards-compatible randomUUID generator is required.");
  }
  return generator.call(globalThis.crypto);
}

export function isTraceId(value: unknown): value is TraceId {
  return typeof value === "string" && value.trim().length > 0;
}
