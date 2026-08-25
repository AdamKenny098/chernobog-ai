// lib/chernobog/llm/modelRouter.ts

import {
  normalizeOllamaModelName,
} from "./modelMatching";

export type ModelRole =
  | "default"
  | "code"
  | "planner"
  | "repair";

export type ResolvedModel = {
  role: ModelRole;
  model: string;
  source:
    | "env"
    | "fallback";
};

export type ModelCandidateSource =
  | "role-primary"
  | "builtin-role"
  | "default-model"
  | "builtin-default";

export interface ModelCandidate {
  role: ModelRole;
  model: string;
  source:
    ModelCandidateSource;
}

const BUILTIN_DEFAULT_MODEL =
  "gemma3";

const BUILTIN_CODE_MODEL =
  "deepseek-coder-v2:16b";

function readEnv(
  name: string,
) {
  const value =
    process.env[name];

  if (
    typeof value !== "string"
  ) {
    return undefined;
  }

  const trimmed =
    value.trim();

  return trimmed.length > 0
    ? trimmed
    : undefined;
}

export function resolveModel(
  role:
    ModelRole = "default",
): ResolvedModel {
  const defaultModel =
    readEnv("OLLAMA_MODEL") ??
    BUILTIN_DEFAULT_MODEL;

  const codeModel =
    readEnv(
      "OLLAMA_CODE_MODEL",
    ) ??
    readEnv("OLLAMA_MODEL") ??
    BUILTIN_CODE_MODEL;

  switch (role) {
    case "code":
      return {
        role,
        model:
          codeModel,
        source:
          readEnv(
            "OLLAMA_CODE_MODEL",
          )
            ? "env"
            : "fallback",
      };

    case "planner":
      return {
        role,
        model:
          codeModel,
        source:
          readEnv(
            "OLLAMA_CODE_MODEL",
          )
            ? "env"
            : "fallback",
      };

    case "repair":
      return {
        role,
        model:
          codeModel,
        source:
          readEnv(
            "OLLAMA_CODE_MODEL",
          )
            ? "env"
            : "fallback",
      };

    case "default":
    default:
      return {
        role:
          "default",
        model:
          defaultModel,
        source:
          readEnv(
            "OLLAMA_MODEL",
          )
            ? "env"
            : "fallback",
      };
  }
}

function dedupeCandidates(
  candidates:
    readonly ModelCandidate[],
): ModelCandidate[] {
  const seen =
    new Set<string>();

  const output:
    ModelCandidate[] = [];

  for (
    const candidate
    of candidates
  ) {
    const normalized =
      normalizeOllamaModelName(
        candidate.model,
      );

    if (
      !normalized ||
      seen.has(normalized)
    ) {
      continue;
    }

    seen.add(normalized);

    output.push({
      ...candidate,
    });
  }

  return output;
}

export function getModelCandidates(
  role:
    ModelRole = "default",
): ModelCandidate[] {
  const primary =
    resolveModel(role);

  const defaultModel =
    resolveModel("default");

  if (role === "default") {
    return dedupeCandidates([
      {
        role,
        model:
          primary.model,
        source:
          "role-primary",
      },
      {
        role,
        model:
          BUILTIN_DEFAULT_MODEL,
        source:
          "builtin-default",
      },
    ]);
  }

  return dedupeCandidates([
    {
      role,
      model:
        primary.model,
      source:
        "role-primary",
    },
    {
      role,
      model:
        BUILTIN_CODE_MODEL,
      source:
        "builtin-role",
    },
    {
      role,
      model:
        defaultModel.model,
      source:
        "default-model",
    },
    {
      role,
      model:
        BUILTIN_DEFAULT_MODEL,
      source:
        "builtin-default",
    },
  ]);
}

export function getModelRoutingSummary() {
  const defaultModel =
    resolveModel("default");

  const codeModel =
    resolveModel("code");

  const plannerModel =
    resolveModel("planner");

  const repairModel =
    resolveModel("repair");

  return [
    "Model routing:",
    `Default model: ${defaultModel.model}`,
    `Code model: ${codeModel.model}`,
    `Planner model: ${plannerModel.model}`,
    `Repair model: ${repairModel.model}`,
  ].join("\n");
}
