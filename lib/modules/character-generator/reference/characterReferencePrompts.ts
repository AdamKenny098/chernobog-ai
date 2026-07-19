import type {
  CharacterBrief,
  CharacterConcept,
  CharacterReferenceViewAngle,
} from "../types";

export type CharacterReferenceDirection = {
  angle: CharacterReferenceViewAngle;
  label: string;
  instruction: string;
};

export type CompiledCharacterReferencePrompt = CharacterReferenceDirection & {
  positivePrompt: string;
  negativePrompt: string;
};

export const CHARACTER_REFERENCE_DIRECTIONS: readonly CharacterReferenceDirection[] = [
  {
    angle: "front",
    label: "Front Orthographic",
    instruction:
      "exact straight-on front orthographic view, body and face symmetrical to camera",
  },
  {
    angle: "left-profile",
    label: "Left Profile",
    instruction:
      "exact left-side orthographic profile, head and body facing left, no perspective turn",
  },
  {
    angle: "back",
    label: "Back Orthographic",
    instruction:
      "exact straight-on back orthographic view, clearly show rear hair, costume, armour, and equipment construction",
  },
  {
    angle: "three-quarter",
    label: "Three-quarter Construction",
    instruction:
      "three-quarter front construction view, clearly reveal overlapping costume layers and equipment attachment points",
  },
] as const;

export function compileCharacterReferencePrompts(
  brief: CharacterBrief,
  concept: CharacterConcept
): CompiledCharacterReferencePrompt[] {
  const list = (label: string, values: string[]) =>
    values.length > 0 ? `${label}: ${values.join(", ")}` : null;
  const shared = [
    "one isolated game character",
    "exactly one character and exactly one view",
    "single full-body figure centered in frame",
    "body visible from head to toe with clear space around the silhouette",
    "neutral A-pose",
    "level shoulders",
    "hands relaxed and visible",
    "plain light grey seamless background",
    "even neutral studio lighting",
    "orthographic presentation",
    "clear clothing seams and material boundaries for 3D modelling",
    "preserve the approved character identity and construction",
    `${brief.characterType} character`,
    `presentation: ${brief.presentation}`,
    `age: ${brief.ageRange}`,
    `body type: ${brief.bodyType}`,
    `body proportions: ${brief.proportions}`,
    `face shape: ${brief.face.shape}`,
    `facial features: ${brief.face.features.join(", ")}`,
    `expression: ${brief.face.expression}`,
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
    `approved design direction: ${concept.label}; ${concept.variationNotes}`,
  ].filter((value): value is string => Boolean(value));
  const negativePrompt = [
    "character sheet",
    "turnaround sheet",
    "reference sheet",
    "model sheet",
    "concept sheet",
    "multiple views",
    "multiple poses",
    "multiple characters",
    "collage",
    "split screen",
    "panels",
    "inset image",
    "head close-up",
    "costume close-up",
    "colour swatches",
    "material swatches",
    "diagram",
    "animal companion",
    "creature companion",
    "cropped body",
    "action pose",
    "dynamic perspective",
    "foreshortening",
    "weapons covering body",
    "complex background",
    "text",
    "labels",
    "annotations",
    "logo",
    "watermark",
    "extra limbs",
    "missing limbs",
    "blur",
    ...brief.negativeRequirements,
  ].join(", ");

  return CHARACTER_REFERENCE_DIRECTIONS.map((direction) => ({
    ...direction,
    positivePrompt: [
      direction.instruction,
      ...shared,
      `mandatory camera angle: ${direction.instruction}`,
      "one image, one character, one pose, no additional panels",
    ].join(", "),
    negativePrompt,
  }));
}
