import type { CharacterBrief, CharacterConcept } from "../types";

export type CompiledCharacterCanonicalPosePrompt = {
  positivePrompt: string;
  negativePrompt: string;
};

function list(label: string, values: string[]): string | null {
  return values.length > 0 ? `${label}: ${values.join(", ")}` : null;
}

export function compileCharacterCanonicalPosePrompt(
  brief: CharacterBrief,
  concept: CharacterConcept,
): CompiledCharacterCanonicalPosePrompt {
  const positivePrompt = [
    "one isolated game character",
    "exactly one complete full-body figure",
    "strict straight-on front orthographic view",
    "neutral symmetrical A-pose",
    "arms lowered 40 degrees away from the torso",
    "level shoulders and straight elbows",
    "palms facing inward with fingers relaxed and visible",
    "legs straight and slightly separated",
    "feet parallel and fully visible",
    "head facing directly forward",
    "neutral expression",
    "plain light grey seamless studio background",
    "even neutral studio lighting",
    "clear space around the complete silhouette",
    "preserve the exact identity, face, hair, body proportions, costume, colours, armour, accessories, and equipment from the image reference",
    "rig-ready humanoid anatomy",
    "clear separation between limbs, clothing layers, and equipment",
    `${brief.characterType} character`,
    `presentation: ${brief.presentation}`,
    `age: ${brief.ageRange}`,
    `body type: ${brief.bodyType}`,
    `proportions: ${brief.proportions}`,
    `face: ${brief.face.shape}; ${brief.face.features.join(", ")}`,
    `hair: ${brief.hair.style}, ${brief.hair.colour}`,
    list("clothing", brief.clothing),
    list("armour", brief.armour),
    list("accessories", brief.accessories),
    list("equipment", brief.equipment),
    `rendering style: ${brief.style.renderingStyle}`,
    `theme: ${brief.style.theme}`,
    `shape language: ${brief.style.shapeLanguage}`,
    `detail level: ${brief.style.detailLevel}`,
    `palette: ${brief.colours.primary}, ${brief.colours.secondary}, ${brief.colours.accent}`,
    `approved design: ${concept.label}; ${concept.variationNotes}`,
  ]
    .filter((value): value is string => Boolean(value))
    .join(", ");

  const negativePrompt = [
    "character sheet",
    "turnaround sheet",
    "reference sheet",
    "model sheet",
    "multiple views",
    "multiple poses",
    "multiple characters",
    "duplicate character",
    "collage",
    "panels",
    "inset image",
    "portrait crop",
    "cropped head",
    "cropped hands",
    "cropped feet",
    "out of frame",
    "T-pose",
    "arms horizontal",
    "arms touching torso",
    "crossed limbs",
    "action pose",
    "contrapposto",
    "body twist",
    "side view",
    "three-quarter view",
    "back view",
    "perspective distortion",
    "foreshortening",
    "weapon covering body",
    "complex background",
    "floor clutter",
    "text",
    "labels",
    "annotations",
    "logo",
    "watermark",
    "extra limbs",
    "missing limbs",
    "fused limbs",
    "extra fingers",
    "missing fingers",
    "deformed hands",
    "asymmetrical costume",
    "identity drift",
    "different clothing",
    "different colours",
    "blur",
    "low resolution",
    ...brief.negativeRequirements,
  ].join(", ");

  return { positivePrompt, negativePrompt };
}
