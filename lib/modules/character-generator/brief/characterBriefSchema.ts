import { z } from "zod";

import { CharacterProjectValidationError } from "../errors";
import {
  CHARACTER_RENDERING_STYLES,
  type CharacterBrief,
} from "../types";

const requiredText = (maximumLength: number) =>
  z.string().trim().min(1).max(maximumLength);

const textList = (maximumItems: number) =>
  z.array(requiredText(180)).max(maximumItems);

export const CHARACTER_BRIEF_SCHEMA = z
  .object({
    characterType: z.enum(["human", "humanoid"]),
    presentation: requiredText(120),
    ageRange: requiredText(120),
    bodyType: requiredText(180),
    proportions: requiredText(400),
    face: z
      .object({
        shape: requiredText(180),
        features: textList(16).min(1),
        expression: requiredText(180),
      })
      .strict(),
    hair: z
      .object({
        style: requiredText(180),
        colour: requiredText(120),
      })
      .strict(),
    clothing: textList(20),
    armour: textList(20),
    accessories: textList(20),
    equipment: textList(20),
    style: z
      .object({
        renderingStyle: z.enum(CHARACTER_RENDERING_STYLES),
        theme: requiredText(400),
        shapeLanguage: requiredText(300),
        detailLevel: z.enum(["low", "medium", "high"]),
      })
      .strict(),
    colours: z
      .object({
        primary: requiredText(120),
        secondary: requiredText(120),
        accent: requiredText(120),
      })
      .strict(),
    technical: z
      .object({
        intendedEngine: z.literal("unity"),
        cameraPerspective: z.enum([
          "first-person",
          "third-person",
          "isometric",
        ]),
        targetPlatform: z.enum(["mobile", "desktop", "console"]),
        triangleBudget: z.number().int().min(5_000).max(250_000),
        textureResolution: z.union([
          z.literal(1024),
          z.literal(2048),
          z.literal(4096),
        ]),
      })
      .strict(),
    negativeRequirements: textList(24),
  })
  .strict();

function describeValidationIssue(error: z.ZodError): string {
  const issue = error.issues[0];

  if (!issue) {
    return "The structured brief is invalid.";
  }

  const field = issue.path.length > 0 ? ` at ${issue.path.join(".")}` : "";
  return `Invalid structured brief${field}: ${issue.message}`;
}

export function parseCharacterBrief(value: unknown): CharacterBrief {
  const result = CHARACTER_BRIEF_SCHEMA.safeParse(value);

  if (!result.success) {
    throw new CharacterProjectValidationError(
      describeValidationIssue(result.error)
    );
  }

  return result.data;
}
