export type Milestone6ScenePackParsedCommand = {
  kind: "milestone6_scene_pack";
  action: "generate" | "latest";
  raw: string;
  prompt: string;
};

function normalize(input: string): string {
  return input.trim().toLowerCase().replace(/\s+/g, " ");
}

export function parseMilestone6ScenePackCommand(input: string): Milestone6ScenePackParsedCommand | null {
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

  if (!text.includes("generate") && !text.includes("create") && !text.includes("siriocraft")) {
    return null;
  }

  return {
    kind: "milestone6_scene_pack",
    action: "generate",
    raw: input,
    prompt: input,
  };
}
