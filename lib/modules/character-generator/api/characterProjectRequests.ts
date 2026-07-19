import { CharacterProjectValidationError } from "../errors";
import type {
  CreateCharacterProjectInput,
  UpdateCharacterProjectInput,
} from "../types";

type JsonObject = Record<string, unknown>;

const CREATE_KEYS = new Set(["name", "prompt"]);
const UPDATE_KEYS = new Set(["name", "originalPrompt"]);

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertOnlyKnownKeys(
  body: JsonObject,
  allowedKeys: Set<string>
): void {
  const unknownKeys = Object.keys(body).filter((key) => !allowedKeys.has(key));

  if (unknownKeys.length > 0) {
    throw new CharacterProjectValidationError(
      `Unsupported request field${unknownKeys.length === 1 ? "" : "s"}: ${unknownKeys.join(", ")}.`
    );
  }
}

function readRequiredString(
  body: JsonObject,
  key: string,
  maximumLength: number
): string {
  const value = body[key];

  if (typeof value !== "string" || value.trim().length === 0) {
    throw new CharacterProjectValidationError(
      `Request body requires a non-empty ${key}.`
    );
  }

  const normalized = value.trim();

  if (normalized.length > maximumLength) {
    throw new CharacterProjectValidationError(
      `${key} must be ${maximumLength} characters or fewer.`
    );
  }

  return normalized;
}

function readOptionalString(
  body: JsonObject,
  key: string,
  maximumLength: number
): string | undefined {
  if (!(key in body)) {
    return undefined;
  }

  return readRequiredString(body, key, maximumLength);
}

export function parseCreateCharacterProjectRequest(
  body: unknown
): CreateCharacterProjectInput {
  if (!isJsonObject(body)) {
    throw new CharacterProjectValidationError(
      "Request body must be a JSON object."
    );
  }

  assertOnlyKnownKeys(body, CREATE_KEYS);

  return {
    name: readOptionalString(body, "name", 120),
    prompt: readRequiredString(body, "prompt", 8_000),
  };
}

export function parseUpdateCharacterProjectRequest(
  body: unknown
): UpdateCharacterProjectInput {
  if (!isJsonObject(body)) {
    throw new CharacterProjectValidationError(
      "Request body must be a JSON object."
    );
  }

  assertOnlyKnownKeys(body, UPDATE_KEYS);

  const update: UpdateCharacterProjectInput = {
    name: readOptionalString(body, "name", 120),
    originalPrompt: readOptionalString(body, "originalPrompt", 8_000),
  };

  if (update.name === undefined && update.originalPrompt === undefined) {
    throw new CharacterProjectValidationError(
      "Request body must provide name or originalPrompt."
    );
  }

  return update;
}
