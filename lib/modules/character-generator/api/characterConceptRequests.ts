import { CharacterProjectValidationError } from "../errors";
type JsonObject = Record<string, unknown>;

export type CharacterConceptActionInput =
  | { action: "select"; conceptId: string }
  | {
      action: "clear-selection" | "approve" | "reset-generation";
    };

const CONCEPT_ID_PATTERN = /^concept-[a-zA-Z0-9_-]+$/;

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseCharacterConceptActionRequest(
  body: unknown
): CharacterConceptActionInput {
  if (!isJsonObject(body)) {
    throw new CharacterProjectValidationError(
      "Request body must be a JSON object."
    );
  }

  const allowedKeys = new Set(["action", "conceptId"]);
  const unknownKeys = Object.keys(body).filter((key) => !allowedKeys.has(key));

  if (unknownKeys.length > 0) {
    throw new CharacterProjectValidationError(
      `Unsupported request field${unknownKeys.length === 1 ? "" : "s"}: ${unknownKeys.join(", ")}.`
    );
  }

  if (
    body.action !== "select" &&
    body.action !== "clear-selection" &&
    body.action !== "approve" &&
    body.action !== "reset-generation"
  ) {
    throw new CharacterProjectValidationError(
      "Concept action must be select, clear-selection, approve, or reset-generation."
    );
  }

  if (body.action === "select") {
    if (
      typeof body.conceptId !== "string" ||
      !CONCEPT_ID_PATTERN.test(body.conceptId)
    ) {
      throw new CharacterProjectValidationError(
        "Selecting a concept requires a valid conceptId."
      );
    }

    return {
      action: "select",
      conceptId: body.conceptId,
    };
  }

  if ("conceptId" in body) {
    throw new CharacterProjectValidationError(
      `${body.action} does not accept a conceptId.`
    );
  }

  return { action: body.action };
}
