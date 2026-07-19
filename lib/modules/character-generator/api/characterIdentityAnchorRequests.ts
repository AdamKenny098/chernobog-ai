import { CharacterProjectValidationError } from "../errors";
import type { CharacterIdentityAnchorCrop } from "../types";

export type CharacterIdentityAnchorActionInput = {
  action: "approve" | "clear" | "retire-legacy";
};

export type CharacterIdentityAnchorMetadataInput = {
  width: number;
  height: number;
  crop: CharacterIdentityAnchorCrop;
};

function requireExactKeys(
  value: Record<string, unknown>,
  allowedKeys: readonly string[]
): void {
  const unknownKeys = Object.keys(value).filter(
    (key) => !allowedKeys.includes(key)
  );

  if (unknownKeys.length > 0) {
    throw new CharacterProjectValidationError(
      `Unsupported request field${unknownKeys.length === 1 ? "" : "s"}: ${unknownKeys.join(", ")}.`
    );
  }
}

export function parseCharacterIdentityAnchorActionRequest(
  body: unknown
): CharacterIdentityAnchorActionInput {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new CharacterProjectValidationError(
      "Request body must be a JSON object."
    );
  }

  const value = body as Record<string, unknown>;
  requireExactKeys(value, ["action"]);

  if (
    value.action !== "approve" &&
    value.action !== "clear" &&
    value.action !== "retire-legacy"
  ) {
    throw new CharacterProjectValidationError(
      "Identity anchor action must be approve, clear, or retire-legacy."
    );
  }

  return { action: value.action };
}

export function parseCharacterIdentityAnchorMetadata(
  value: string
): CharacterIdentityAnchorMetadataInput {
  let parsed: unknown;

  try {
    parsed = JSON.parse(value) as unknown;
  } catch {
    throw new CharacterProjectValidationError(
      "Identity anchor metadata must contain valid JSON."
    );
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new CharacterProjectValidationError(
      "Identity anchor metadata must be a JSON object."
    );
  }

  const metadata = parsed as Record<string, unknown>;
  requireExactKeys(metadata, ["width", "height", "crop"]);

  if (!metadata.crop || typeof metadata.crop !== "object" || Array.isArray(metadata.crop)) {
    throw new CharacterProjectValidationError(
      "Identity anchor metadata must include crop coordinates."
    );
  }

  const crop = metadata.crop as Record<string, unknown>;
  requireExactKeys(crop, [
    "x",
    "y",
    "width",
    "height",
    "sourceWidth",
    "sourceHeight",
  ]);

  const requiredNumbers = [
    metadata.width,
    metadata.height,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    crop.sourceWidth,
    crop.sourceHeight,
  ];

  if (requiredNumbers.some((entry) => typeof entry !== "number")) {
    throw new CharacterProjectValidationError(
      "Identity anchor dimensions must be numeric."
    );
  }

  return {
    width: metadata.width as number,
    height: metadata.height as number,
    crop: {
      x: crop.x as number,
      y: crop.y as number,
      width: crop.width as number,
      height: crop.height as number,
      sourceWidth: crop.sourceWidth as number,
      sourceHeight: crop.sourceHeight as number,
    },
  };
}
