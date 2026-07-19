import { getCharacterStyleProfile } from "../styleProfiles";
import type { CharacterBrief } from "../types";

export type CharacterConceptVariation = {
  id: "vanguard" | "specialist" | "outlier" | "grounded";
  label: string;
  variationNotes: string;
  promptDirection: string;
};

export type CompiledCharacterConceptPrompt = CharacterConceptVariation & {
  positivePrompt: string;
  negativePrompt: string;
};

export const CHARACTER_CONCEPT_VARIATIONS: readonly CharacterConceptVariation[] = [
  {
    id: "vanguard",
    label: "Vanguard",
    variationNotes:
      "Bold primary silhouette, assertive proportions, and a strong focal read.",
    promptDirection:
      "Push a bold heroic silhouette, clear large-to-small shape hierarchy, and one dominant visual focal point.",
  },
  {
    id: "specialist",
    label: "Specialist",
    variationNotes:
      "Functional equipment layering with a disciplined, role-specific design.",
    promptDirection:
      "Emphasise believable function, layered equipment, practical costume construction, and the character's specialist role.",
  },
  {
    id: "outlier",
    label: "Outlier",
    variationNotes:
      "An unconventional but model-ready interpretation of the same identity.",
    promptDirection:
      "Explore an unconventional silhouette and surprising shape language while preserving every core identity constraint and riggability.",
  },
  {
    id: "grounded",
    label: "Grounded",
    variationNotes:
      "Restrained proportions, credible materials, and production-safe construction.",
    promptDirection:
      "Use restrained proportions, credible material breaks, economical construction, and a production-safe silhouette.",
  },
] as const;

function formatList(label: string, values: string[]): string | null {
  return values.length > 0 ? `${label}: ${values.join(", ")}` : null;
}

function getRenderingDirection(brief: CharacterBrief): string {
  switch (brief.style.renderingStyle) {
    case "anime":
      return "anime character design, graphic facial construction, clean colour regions, cel-shading friendly materials";
    case "low-poly":
      return "low-poly character design, economical geometry, broad readable forms, compact texture-friendly detail";
    case "stylised-realism":
    default:
      return "stylised realistic character design, believable anatomy, grounded PBR materials, readable exaggeration";
  }
}

export function compileCharacterConceptPrompt(
  brief: CharacterBrief,
  variation: CharacterConceptVariation
): CompiledCharacterConceptPrompt {
  const styleProfile = getCharacterStyleProfile(brief.style.renderingStyle);
  const promptParts = [
    "professional game character concept art",
    "one single character",
    "full body visible from head to toe",
    "three-quarter front view",
    "neutral standing pose",
    "plain neutral studio background",
    "clear silhouette",
    "model sheet quality design clarity",
    getRenderingDirection(brief),
    `${brief.characterType} character`,
    `presentation: ${brief.presentation}`,
    `age: ${brief.ageRange}`,
    `body: ${brief.bodyType}`,
    `proportions: ${brief.proportions}`,
    `face shape: ${brief.face.shape}`,
    `facial features: ${brief.face.features.join(", ")}`,
    `expression: ${brief.face.expression}`,
    `hair: ${brief.hair.style}, ${brief.hair.colour}`,
    formatList("clothing", brief.clothing),
    formatList("armour", brief.armour),
    formatList("accessories", brief.accessories),
    formatList("equipment", brief.equipment),
    `theme: ${brief.style.theme}`,
    `shape language: ${brief.style.shapeLanguage}`,
    `detail level: ${brief.style.detailLevel}`,
    `colour palette: ${brief.colours.primary}, ${brief.colours.secondary}, accent ${brief.colours.accent}`,
    styleProfile.materialGuidance,
    ...styleProfile.conceptPromptRules,
    `This candidate direction: ${variation.promptDirection}`,
    "consistent coherent costume",
    "riggable humanoid anatomy",
    "separable clothing and equipment",
    "high quality concept art",
  ].filter((value): value is string => Boolean(value));

  const negativePrompt = [
    "multiple characters",
    "character lineup",
    "cropped body",
    "out of frame",
    "action pose",
    "complex background",
    "text",
    "caption",
    "logo",
    "watermark",
    "extra limbs",
    "extra fingers",
    "missing fingers",
    "fused equipment",
    "inconsistent costume",
    "blurry",
    "low resolution",
    ...brief.negativeRequirements,
  ].join(", ");

  return {
    ...variation,
    positivePrompt: promptParts.join(", "),
    negativePrompt,
  };
}

export function compileAllCharacterConceptPrompts(
  brief: CharacterBrief
): CompiledCharacterConceptPrompt[] {
  return CHARACTER_CONCEPT_VARIATIONS.map((variation) =>
    compileCharacterConceptPrompt(brief, variation)
  );
}
