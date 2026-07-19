import { CharacterProjectValidationError } from "../errors";
import { parseCharacterBrief } from "../brief/characterBriefSchema";
import type { CharacterBrief, CharacterBriefAction } from "../types";

type JsonObject = Record<string, unknown>;

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertOnlyKnownKeys(
  body: JsonObject,
  allowedKeys: readonly string[]
): void {
  const allowed = new Set(allowedKeys);
  const unknownKeys = Object.keys(body).filter((key) => !allowed.has(key));

  if (unknownKeys.length > 0) {
    throw new CharacterProjectValidationError(
      `Unsupported request field${unknownKeys.length === 1 ? "" : "s"}: ${unknownKeys.join(", ")}.`
    );
  }
}

export function parseCharacterBriefUpdateRequest(body: unknown): CharacterBrief {
  if (!isJsonObject(body)) {
    throw new CharacterProjectValidationError(
      "Request body must be a JSON object."
    );
  }

  assertOnlyKnownKeys(body, ["brief"]);

  if (!("brief" in body)) {
    throw new CharacterProjectValidationError(
      "Request body requires a structured brief."
    );
  }

  return parseCharacterBrief(body.brief);
}

export function parseCharacterBriefActionRequest(body: unknown): {
  action: CharacterBriefAction;
  brief?: CharacterBrief;
} {
  if (!isJsonObject(body)) {
    throw new CharacterProjectValidationError(
      "Request body must be a JSON object."
    );
  }

  assertOnlyKnownKeys(body, ["action", "brief"]);

  if (body.action !== "approve" && body.action !== "reopen") {
    throw new CharacterProjectValidationError(
      'Brief action must be "approve" or "reopen".'
    );
  }

  if (body.action === "approve") {
    if (!("brief" in body)) {
      throw new CharacterProjectValidationError(
        "Approving a brief requires the current structured brief."
      );
    }

    return {
      action: "approve",
      brief: parseCharacterBrief(body.brief),
    };
  }

  if ("brief" in body) {
    throw new CharacterProjectValidationError(
      "Reopening a brief does not accept brief content."
    );
  }

  return { action: "reopen" };
}
