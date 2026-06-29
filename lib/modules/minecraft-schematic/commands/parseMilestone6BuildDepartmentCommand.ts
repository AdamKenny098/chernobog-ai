import type { BuildDepartmentAction } from "../build-department/types";

export type Milestone6BuildDepartmentParsedCommand = {
  kind: "milestone6_build_department";
  action: BuildDepartmentAction;
  raw: string;
  prompt: string;
};

function normalize(input: string): string {
  return input.trim().toLowerCase().replace(/\s+/g, " ");
}

function stripDepartmentPrefix(input: string): string {
  return input
    .replace(/^build department\s+/i, "")
    .replace(/^chernobog build department\s+/i, "")
    .replace(/^schematic department\s+/i, "")
    .trim();
}

function inferAction(normalized: string): BuildDepartmentAction | null {
  if (
    normalized === "build department" ||
    normalized === "build department status" ||
    normalized === "chernobog build department status" ||
    normalized === "schematic department status"
  ) {
    return "status";
  }

  if (normalized.startsWith("build department plan ") || normalized.startsWith("chernobog build department plan ")) {
    return "plan";
  }

  if (normalized.startsWith("build department generate ") || normalized.startsWith("chernobog build department generate ")) {
    return "generate";
  }

  if (
    normalized.startsWith("build department full pipeline ") ||
    normalized.startsWith("build department pipeline ") ||
    normalized.startsWith("chernobog build department full pipeline ")
  ) {
    return "full_pipeline";
  }

  if (
    normalized === "build department review latest" ||
    normalized === "build department inspect latest" ||
    normalized === "chernobog build department review latest"
  ) {
    return "review";
  }

  if (
    normalized === "build department repair latest" ||
    normalized === "chernobog build department repair latest"
  ) {
    return "repair";
  }

  if (
    normalized === "build department preview latest" ||
    normalized === "build department export preview latest" ||
    normalized === "chernobog build department preview latest"
  ) {
    return "preview";
  }

  return null;
}

function extractPrompt(input: string, action: BuildDepartmentAction): string {
  if (action === "status" || action === "review" || action === "repair" || action === "preview") {
    return input;
  }

  const withoutPrefix = stripDepartmentPrefix(input);

  return withoutPrefix
    .replace(/^plan\s+/i, "")
    .replace(/^generate\s+/i, "")
    .replace(/^full pipeline\s+/i, "")
    .replace(/^pipeline\s+/i, "")
    .trim();
}

export function parseMilestone6BuildDepartmentCommand(input: string): Milestone6BuildDepartmentParsedCommand | null {
  const normalized = normalize(input);
  const action = inferAction(normalized);

  if (!action) {
    return null;
  }

  return {
    kind: "milestone6_build_department",
    action,
    raw: input,
    prompt: extractPrompt(input, action),
  };
}
