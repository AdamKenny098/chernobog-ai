import { CharacterProjectValidationError } from "../errors";

export type CharacterModelGenerateInput = {
  action: "generate";
};

export type CharacterModelActionInput = {
  action: "approve" | "reject" | "reset-generation";
};

function requireObject(body: unknown): Record<string, unknown> {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new CharacterProjectValidationError(
      "Request body must be a JSON object.",
    );
  }

  return body as Record<string, unknown>;
}

function rejectUnknownKeys(value: Record<string, unknown>): void {
  const unknownKeys = Object.keys(value).filter((key) => key !== "action");

  if (unknownKeys.length > 0) {
    throw new CharacterProjectValidationError(
      `Unsupported request field${unknownKeys.length === 1 ? "" : "s"}: ${unknownKeys.join(", ")}.`,
    );
  }
}

export function parseCharacterModelGenerateRequest(
  body: unknown,
): CharacterModelGenerateInput {
  const value = requireObject(body);
  rejectUnknownKeys(value);

  if (value.action !== "generate") {
    throw new CharacterProjectValidationError(
      "Character model generation action must be generate.",
    );
  }

  return { action: "generate" };
}

export function parseCharacterModelActionRequest(
  body: unknown,
): CharacterModelActionInput {
  const value = requireObject(body);
  rejectUnknownKeys(value);

  if (
    value.action !== "approve" &&
    value.action !== "reject" &&
    value.action !== "reset-generation"
  ) {
    throw new CharacterProjectValidationError(
      "Character model action must be approve, reject, or reset-generation.",
    );
  }

  return { action: value.action };
}
