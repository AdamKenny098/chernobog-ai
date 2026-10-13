/**
 * Transitional OH-1E provider adapter.
 *
 * There must remain exactly one concrete Ollama HTTP transport owner during
 * repository decomposition. The accepted transport therefore stays at its
 * historical location until the later runtime/service extraction.
 */
export {
  buildOllamaRequestPlan,
  generateWithOllama,
  isRetryableOllamaFailure,
} from "@/lib/chernobog/llm/ollamaClient";

export type {
  GenerateWithOllamaOptions,
  GenerateWithOllamaResult,
  OllamaChatMessage,
  OllamaFailureKind,
  OllamaRequestPlan,
} from "@/lib/chernobog/llm/ollamaClient";
