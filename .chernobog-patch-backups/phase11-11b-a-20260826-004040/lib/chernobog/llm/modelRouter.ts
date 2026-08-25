// lib/chernobog/llm/modelRouter.ts

export type ModelRole = "default" | "code" | "planner" | "repair";

export type ResolvedModel = {
  role: ModelRole;
  model: string;
  source: "env" | "fallback";
};

function readEnv(name: string) {
  const value = process.env[name];

  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function resolveModel(role: ModelRole = "default"): ResolvedModel {
  const defaultModel = readEnv("OLLAMA_MODEL") ?? "gemma3";
  const codeModel =
    readEnv("OLLAMA_CODE_MODEL") ??
    readEnv("OLLAMA_MODEL") ??
    "deepseek-coder-v2:16b";

  switch (role) {
    case "code":
      return {
        role,
        model: codeModel,
        source: readEnv("OLLAMA_CODE_MODEL") ? "env" : "fallback",
      };

    case "planner":
      return {
        role,
        model: codeModel,
        source: readEnv("OLLAMA_CODE_MODEL") ? "env" : "fallback",
      };

    case "repair":
      return {
        role,
        model: codeModel,
        source: readEnv("OLLAMA_CODE_MODEL") ? "env" : "fallback",
      };

    case "default":
    default:
      return {
        role: "default",
        model: defaultModel,
        source: readEnv("OLLAMA_MODEL") ? "env" : "fallback",
      };
  }
}

export function getModelRoutingSummary() {
  const defaultModel = resolveModel("default");
  const codeModel = resolveModel("code");
  const plannerModel = resolveModel("planner");
  const repairModel = resolveModel("repair");

  return [
    "Model routing:",
    `Default model: ${defaultModel.model}`,
    `Code model: ${codeModel.model}`,
    `Planner model: ${plannerModel.model}`,
    `Repair model: ${repairModel.model}`,
  ].join("\n");
}