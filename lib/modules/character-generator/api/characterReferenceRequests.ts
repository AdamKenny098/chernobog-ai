import { CharacterProjectValidationError } from "../errors";

export type CharacterReferenceActionInput = {
  action: "reset-generation" | "rebuild" | "approve";
};

export function parseCharacterReferenceActionRequest(
  body: unknown
): CharacterReferenceActionInput {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new CharacterProjectValidationError(
      "Request body must be a JSON object."
    );
  }

  const value = body as Record<string, unknown>;
  const unknownKeys = Object.keys(value).filter((key) => key !== "action");

  if (unknownKeys.length > 0) {
    throw new CharacterProjectValidationError(
      `Unsupported request field${unknownKeys.length === 1 ? "" : "s"}: ${unknownKeys.join(", ")}.`
    );
  }

  if (
    value.action !== "reset-generation" &&
    value.action !== "rebuild" &&
    value.action !== "approve"
  ) {
    throw new CharacterProjectValidationError(
      "Reference action must be reset-generation, rebuild, or approve."
    );
  }

  return { action: value.action };
}
