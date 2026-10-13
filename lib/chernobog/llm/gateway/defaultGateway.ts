import {
  UnifiedLLMGateway,
} from "./gateway";
import {
  ollamaLLMProvider,
} from "./providers/ollamaProvider";
import type {
  LLMRequest,
  LLMResult,
} from "./types";

const defaultLLMGateway =
  new UnifiedLLMGateway({
    providers: [
      ollamaLLMProvider,
    ],
    defaultProvider:
      "ollama",
  });

export function getDefaultLLMGateway():
  UnifiedLLMGateway {
  return defaultLLMGateway;
}

export async function generateWithLLM(
  request: LLMRequest,
): Promise<LLMResult> {
  return defaultLLMGateway.generate(
    request,
  );
}