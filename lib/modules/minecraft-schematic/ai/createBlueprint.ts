import type {
  BuildScale,
  MinecraftBlueprint,
  MinecraftBuildBrief,
  MinecraftSchematicFeature,
  MinecraftSchematicRoofType,
  MinecraftSchematicTheme,
  TowerDimensions,
} from "../types/blueprint";
import {
  ALLOWED_FEATURES,
  ALLOWED_THEMES,
} from "../types/blueprint";

function hashString(input: string): number {
  let hash = 2166136261;

  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  return Math.abs(hash >>> 0);
}

function toAllowedTheme(theme: string): MinecraftSchematicTheme {
  if ((ALLOWED_THEMES as readonly string[]).includes(theme)) {
    return theme as MinecraftSchematicTheme;
  }

  return "medieval";
}

function toAllowedFeatures(features: string[]): MinecraftSchematicFeature[] {
  const allowed = features.filter((feature): feature is MinecraftSchematicFeature =>
    (ALLOWED_FEATURES as readonly string[]).includes(feature),
  );

  return [...new Set(allowed)];
}

function dimensionsForScale(scale: BuildScale): TowerDimensions {
  switch (scale) {
    case "small":
      return { radius: 4, height: 16, floors: 3 };
    case "large":
      return { radius: 7, height: 34, floors: 6 };
    case "medium":
    default:
      return { radius: 5, height: 22, floors: 4 };
  }
}

function roofForBrief(brief: MinecraftBuildBrief): MinecraftSchematicRoofType {
  const prompt = brief.originalPrompt.toLowerCase();
  const featureText = brief.features.join(" ");

  if (featureText.includes("broken_roof") || prompt.includes("ruined roof") || prompt.includes("collapsed roof")) {
    return "ruined";
  }

  if (brief.structureType === "watchtower" || prompt.includes("watch platform") || prompt.includes("lookout")) {
    return "watch_platform";
  }

  if (brief.theme === "wooden" || prompt.includes("peaked") || prompt.includes("pointed roof")) {
    return "peaked";
  }

  return "flat_battlement";
}

/**
 * Creates the first controlled blueprint candidate.
 *
 * This function intentionally does not produce raw block coordinates or block JSON.
 * It converts a loose build brief into a small, validated vocabulary that the
 * deterministic generator can compile.
 */
export function createBlueprint(brief: MinecraftBuildBrief): MinecraftBlueprint {
  const theme = toAllowedTheme(brief.theme);
  const features = toAllowedFeatures(brief.features);

  if (theme === "snow" && !features.includes("snow_layers")) {
    features.push("snow_layers");
  }

  if (theme === "ruined") {
    if (!features.includes("cracked_blocks")) features.push("cracked_blocks");
    if (!features.includes("mossy_weathering")) features.push("mossy_weathering");
  }

  if (theme === "dark_fantasy" && !features.includes("lanterns")) {
    features.push("lanterns");
  }

  return {
    generator: "tower",
    theme,
    scale: brief.scale,
    roofType: roofForBrief(brief),
    features,
    palette: theme,
    dimensions: dimensionsForScale(brief.scale),
    seed: hashString(brief.originalPrompt),
  };
}
