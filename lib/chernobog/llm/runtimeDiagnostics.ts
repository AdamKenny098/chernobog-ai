import type {
  GenerateWithOllamaResult,
  OllamaFailureKind,
} from "./ollamaClient";

export type OllamaRuntimeDiagnostic = {
  provider: "ollama";
  ok: boolean;
  model: string;
  role: GenerateWithOllamaResult["role"];
  failureKind?: OllamaFailureKind;
  retryable: boolean;
  httpStatus?: number;
  transport?: GenerateWithOllamaResult["transport"];
  durationMs?: number;
};

export function diagnoseOllamaResult(
  result: GenerateWithOllamaResult,
  retryable: boolean,
): OllamaRuntimeDiagnostic {
  return {
    provider: "ollama",
    ok: result.ok,
    model: result.model,
    role: result.role,
    failureKind: result.failureKind,
    retryable,
    httpStatus: result.httpStatus,
    transport: result.transport,
    durationMs: result.durationMs,
  };
}
