import type { CharacterRenderingStyle } from "./types";

export type CharacterStyleProfile = {
  id: CharacterRenderingStyle;
  label: string;
  description: string;
  proportionGuidance: string;
  materialGuidance: string;
  conceptPromptRules: string[];
  defaultTriangleBudget: number;
  defaultTextureResolution: 1024 | 2048 | 4096;
};

export const CHARACTER_STYLE_PROFILES: Record<
  CharacterRenderingStyle,
  CharacterStyleProfile
> = {
  "stylised-realism": {
    id: "stylised-realism",
    label: "Stylised Realism",
    description:
      "Grounded anatomy and materials with a deliberately readable silhouette.",
    proportionGuidance:
      "Use believable anatomy with slightly exaggerated gameplay-readable features.",
    materialGuidance:
      "Use restrained PBR materials with clear separation between surfaces.",
    conceptPromptRules: [
      "Preserve believable anatomy.",
      "Prioritise a clear full-body silhouette.",
      "Keep clothing layers readable for later modelling.",
    ],
    defaultTriangleBudget: 60_000,
    defaultTextureResolution: 2048,
  },
  anime: {
    id: "anime",
    label: "Anime",
    description:
      "Graphic facial construction, simplified materials, and strongly designed shapes.",
    proportionGuidance:
      "Use anime facial proportions while preserving a riggable humanoid body.",
    materialGuidance:
      "Prefer clean colour regions suitable for cel-shaded or lightly shaded materials.",
    conceptPromptRules: [
      "Keep the face consistent across every view.",
      "Avoid physically ambiguous hair masses.",
      "Use clean, separable costume shapes.",
    ],
    defaultTriangleBudget: 45_000,
    defaultTextureResolution: 2048,
  },
  "low-poly": {
    id: "low-poly",
    label: "Low Poly",
    description:
      "Economical geometry, bold proportions, and texture-efficient construction.",
    proportionGuidance:
      "Use broad readable forms that remain recognisable with limited geometry.",
    materialGuidance:
      "Use simple materials and compact texture layouts with minimal micro-detail.",
    conceptPromptRules: [
      "Avoid details that require dense geometry.",
      "Use large colour blocks and simple accessories.",
      "Design hair as a small number of solid masses.",
    ],
    defaultTriangleBudget: 20_000,
    defaultTextureResolution: 1024,
  },
};

export function getCharacterStyleProfile(
  style: CharacterRenderingStyle
): CharacterStyleProfile {
  return CHARACTER_STYLE_PROFILES[style];
}
