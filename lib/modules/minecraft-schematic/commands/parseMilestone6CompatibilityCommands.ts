import type { BuildDepartmentAction } from "../build-department/types";

export type Milestone6BuildDepartmentParsedCommand = {
  kind: "milestone6_build_department";
  action: BuildDepartmentAction;
  raw: string;
  prompt: string;
};

export type Milestone6FinalizationParsedCommand = {
  kind: "milestone6_finalization";
  action: "status" | "write_docs";
  raw: string;
  prompt: string;
};

export type Milestone6PackReviewAction = "review" | "inspect" | "repair";

export type Milestone6PackReviewParsedCommand = {
  kind: "milestone6_pack_review";
  action: Milestone6PackReviewAction;
  target: "latest";
  raw: string;
  prompt: string;
};

export type Milestone6PreviewParsedCommand = {
  kind: "milestone6_preview_pack";
  action: "preview";
  target: "latest";
  raw: string;
  prompt: string;
};

export type Milestone6ScenePackParsedCommand = {
  kind: "milestone6_scene_pack";
  action: "generate" | "latest";
  raw: string;
  prompt: string;
};

export type Milestone6CompatibilityParsedCommand =
  | Milestone6BuildDepartmentParsedCommand
  | Milestone6FinalizationParsedCommand
  | Milestone6PackReviewParsedCommand
  | Milestone6PreviewParsedCommand
  | Milestone6ScenePackParsedCommand;

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

function inferBuildDepartmentAction(normalized: string): BuildDepartmentAction | null {
  if (
    normalized === "build department" ||
    normalized === "build department status" ||
    normalized === "chernobog build department status" ||
    normalized === "schematic department status"
  ) {
    return "status";
  }

  if (
    normalized.startsWith("build department plan ") ||
    normalized.startsWith("chernobog build department plan ")
  ) {
    return "plan";
  }

  if (
    normalized.startsWith("build department generate ") ||
    normalized.startsWith("chernobog build department generate ")
  ) {
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

function extractBuildDepartmentPrompt(input: string, action: BuildDepartmentAction): string {
  if (
    action === "status" ||
    action === "review" ||
    action === "repair" ||
    action === "preview"
  ) {
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

export function parseMilestone6BuildDepartmentCommand(
  input: string,
): Milestone6BuildDepartmentParsedCommand | null {
  const normalized = normalize(input);
  const action = inferBuildDepartmentAction(normalized);

  if (!action) {
    return null;
  }

  return {
    kind: "milestone6_build_department",
    action,
    raw: input,
    prompt: extractBuildDepartmentPrompt(input, action),
  };
}

export function parseMilestone6FinalizationCommand(
  input: string,
): Milestone6FinalizationParsedCommand | null {
  const text = normalize(input);

  if (
    text === "milestone 6 status" ||
    text === "schematic milestone 6 status" ||
    text === "minecraft schematic milestone 6 status" ||
    text === "build department milestone status" ||
    text === "build department final status"
  ) {
    return {
      kind: "milestone6_finalization",
      action: "status",
      raw: input,
      prompt: input,
    };
  }

  if (
    text === "write milestone 6 docs" ||
    text === "schematic write milestone 6 docs" ||
    text === "build department write docs" ||
    text === "build department finalize docs"
  ) {
    return {
      kind: "milestone6_finalization",
      action: "write_docs",
      raw: input,
      prompt: input,
    };
  }

  return null;
}

export function parseMilestone6PackReviewCommand(
  input: string,
): Milestone6PackReviewParsedCommand | null {
  const text = normalize(input);

  const isLatestPackTarget =
    text.includes("pack latest") ||
    text.includes("latest pack") ||
    text.includes("schematic pack") ||
    text.includes("scene pack");

  if (!isLatestPackTarget) {
    return null;
  }

  if (
    text === "schematic inspect pack latest" ||
    text === "inspect schematic pack latest" ||
    text === "scene pack inspect latest"
  ) {
    return {
      kind: "milestone6_pack_review",
      action: "inspect",
      target: "latest",
      raw: input,
      prompt: input,
    };
  }

  if (
    text === "schematic review pack latest" ||
    text === "review schematic pack latest" ||
    text === "scene pack review latest"
  ) {
    return {
      kind: "milestone6_pack_review",
      action: "review",
      target: "latest",
      raw: input,
      prompt: input,
    };
  }

  if (
    text === "schematic repair pack latest" ||
    text === "repair schematic pack latest" ||
    text === "scene pack repair latest"
  ) {
    return {
      kind: "milestone6_pack_review",
      action: "repair",
      target: "latest",
      raw: input,
      prompt: input,
    };
  }

  return null;
}

export function parseMilestone6PreviewCommand(
  input: string,
): Milestone6PreviewParsedCommand | null {
  const text = normalize(input);

  const matches =
    text === "schematic preview pack latest" ||
    text === "schematic pack preview latest" ||
    text === "preview schematic pack latest" ||
    text === "schematio preview pack latest" ||
    text === "schematic schematio pack latest" ||
    text === "schematic export vanilla preview latest" ||
    text === "export vanilla preview pack latest" ||
    text === "vanilla preview pack latest";

  if (!matches) {
    return null;
  }

  return {
    kind: "milestone6_preview_pack",
    action: "preview",
    target: "latest",
    raw: input,
    prompt: input,
  };
}

export function parseMilestone6ScenePackCommand(
  input: string,
): Milestone6ScenePackParsedCommand | null {
  const text = normalize(input);

  if (text === "schematic pack latest" || text === "scene pack latest") {
    return {
      kind: "milestone6_scene_pack",
      action: "latest",
      raw: input,
      prompt: input,
    };
  }

  const looksLikeScenePack =
    text.includes("factory yard") ||
    text.includes("train platform") ||
    text.includes("faction outpost") ||
    text.includes("spawn market") ||
    text.includes("spawn marketplace") ||
    text.includes("ruined settlement") ||
    text.includes("scene pack") ||
    text.includes("build pack");

  if (!looksLikeScenePack) {
    return null;
  }

  if (
    !text.includes("generate") &&
    !text.includes("create") &&
    !text.includes("siriocraft")
  ) {
    return null;
  }

  return {
    kind: "milestone6_scene_pack",
    action: "generate",
    raw: input,
    prompt: input,
  };
}

export function parseMilestone6CompatibilityCommand(
  input: string,
): Milestone6CompatibilityParsedCommand | null {
  return (
    parseMilestone6FinalizationCommand(input) ??
    parseMilestone6BuildDepartmentCommand(input) ??
    parseMilestone6PreviewCommand(input) ??
    parseMilestone6PackReviewCommand(input) ??
    parseMilestone6ScenePackCommand(input)
  );
}