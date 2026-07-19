import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import { CharacterProjectValidationError } from "../errors";
import { getCharacterProjectDirectory } from "../projects/characterProjectStore";
import type { CharacterReferenceViewAngle } from "../types";

type ReferenceMimeType = "image/png" | "image/jpeg" | "image/webp";

const VIEW_ID_PATTERN = /^reference-(front|left-profile|back|three-quarter)$/;

function assertViewId(viewId: string): void {
  if (!VIEW_ID_PATTERN.test(viewId)) {
    throw new CharacterProjectValidationError(
      `Invalid Character Forge reference view id: ${viewId}`
    );
  }
}

function extensionFor(mimeType: ReferenceMimeType): string {
  return mimeType === "image/jpeg"
    ? ".jpg"
    : mimeType === "image/webp"
      ? ".webp"
      : ".png";
}

export function getCharacterReferenceDirectory(projectId: string): string {
  return path.join(getCharacterProjectDirectory(projectId), "reference-sheet");
}

export async function writeCharacterReferenceImage({
  projectId,
  angle,
  bytes,
  mimeType,
}: {
  projectId: string;
  angle: CharacterReferenceViewAngle;
  bytes: Uint8Array;
  mimeType: ReferenceMimeType;
}): Promise<string> {
  const viewId = `reference-${angle}`;
  assertViewId(viewId);

  if (bytes.length === 0) {
    throw new CharacterProjectValidationError(
      "A generated reference image cannot be empty."
    );
  }

  const directory = getCharacterReferenceDirectory(projectId);
  const filename = `${viewId}${extensionFor(mimeType)}`;
  const destination = path.join(directory, filename);
  const temporary = `${destination}.${randomUUID()}.tmp`;

  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(temporary, bytes);
  await fs.rename(temporary, destination);

  return path.posix.join("reference-sheet", filename);
}

export async function readCharacterReferenceImage({
  projectId,
  viewId,
  imagePath,
}: {
  projectId: string;
  viewId: string;
  imagePath: string;
}) {
  assertViewId(viewId);

  const projectDirectory = getCharacterProjectDirectory(projectId);
  const resolvedProjectDirectory = path.resolve(projectDirectory);
  const resolvedImagePath = path.resolve(projectDirectory, imagePath);

  if (
    !resolvedImagePath.startsWith(`${resolvedProjectDirectory}${path.sep}`) ||
    path.basename(resolvedImagePath).split(".", 1)[0] !== viewId
  ) {
    throw new CharacterProjectValidationError(
      "The stored reference image path is invalid."
    );
  }

  try {
    return await fs.readFile(resolvedImagePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }

    throw error;
  }
}

export async function clearCharacterReferenceImages(
  projectId: string
): Promise<void> {
  await fs.rm(getCharacterReferenceDirectory(projectId), {
    recursive: true,
    force: true,
  });
}
