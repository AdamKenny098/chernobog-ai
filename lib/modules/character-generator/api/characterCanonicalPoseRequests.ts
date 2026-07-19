import { CharacterProjectValidationError } from "../errors";

export type CharacterCanonicalPoseActionInput = {
  action: "approve" | "reject" | "reset-generation";
};

export type CharacterCanonicalPoseGenerateInput = {
  action: "generate";
};

function requireObject(body: unknown): Record<string, unknown> {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new CharacterProjectValidationError(
      "Request body must be a JSON object.",
    );
  }

  return body as Record<string, unknown>;
}

function rejectUnknownKeys(
  value: Record<string, unknown>,
  supported: readonly string[],
): void {
  const unknownKeys = Object.keys(value).filter(
    (key) => !supported.includes(key),
  );

  if (unknownKeys.length > 0) {
    throw new CharacterProjectValidationError(
      `Unsupported request field${unknownKeys.length === 1 ? "" : "s"}: ${unknownKeys.join(", ")}.`,
    );
  }
}

export function parseCharacterCanonicalPoseGenerateRequest(
  body: unknown,
): CharacterCanonicalPoseGenerateInput {
  const value = requireObject(body);
  rejectUnknownKeys(value, ["action"]);

  if (value.action !== "generate") {
    throw new CharacterProjectValidationError(
      "Canonical pose generation action must be generate.",
    );
  }

  return { action: "generate" };
}

export function parseCharacterCanonicalPoseActionRequest(
  body: unknown,
): CharacterCanonicalPoseActionInput {
  const value = requireObject(body);
  rejectUnknownKeys(value, ["action"]);

  if (
    value.action !== "approve" &&
    value.action !== "reject" &&
    value.action !== "reset-generation"
  ) {
    throw new CharacterProjectValidationError(
      "Canonical pose action must be approve, reject, or reset-generation.",
    );
  }

  return { action: value.action };
}
