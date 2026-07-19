import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import { CharacterProjectValidationError } from "../errors";
import { getCharacterProjectDirectory } from "../projects/characterProjectStore";

type CanonicalPoseMimeType = "image/png" | "image/jpeg" | "image/webp";

function extensionFor(mimeType: CanonicalPoseMimeType): string {
  return mimeType === "image/jpeg"
    ? ".jpg"
    : mimeType === "image/webp"
      ? ".webp"
      : ".png";
}

export function getCharacterCanonicalPoseDirectory(projectId: string): string {
  return path.join(getCharacterProjectDirectory(projectId), "canonical-pose");
}

export async function writeCharacterCanonicalPoseImage({
  projectId,
  bytes,
  mimeType,
}: {
  projectId: string;
  bytes: Uint8Array;
  mimeType: CanonicalPoseMimeType;
}): Promise<string> {
  if (bytes.length === 0) {
    throw new CharacterProjectValidationError(
      "The canonical pose image cannot be empty."
    );
  }

  const directory = getCharacterCanonicalPoseDirectory(projectId);
  const filename = `canonical-a-pose${extensionFor(mimeType)}`;
  const destination = path.join(directory, filename);
  const temporary = `${destination}.${randomUUID()}.tmp`;

  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(temporary, bytes);
  await fs.rename(temporary, destination);

  return path.posix.join("canonical-pose", filename);
}

export async function readCharacterCanonicalPoseImage({
  projectId,
  imagePath,
}: {
  projectId: string;
  imagePath: string;
}) {
  const projectDirectory = getCharacterProjectDirectory(projectId);
  const resolvedProjectDirectory = path.resolve(projectDirectory);
  const resolvedImagePath = path.resolve(projectDirectory, imagePath);

  if (
    !resolvedImagePath.startsWith(`${resolvedProjectDirectory}${path.sep}`) ||
    path.dirname(resolvedImagePath) !==
      path.resolve(projectDirectory, "canonical-pose") ||
    path.basename(resolvedImagePath).split(".", 1)[0] !== "canonical-a-pose"
  ) {
    throw new CharacterProjectValidationError(
      "The stored canonical pose image path is invalid."
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

export async function clearCharacterCanonicalPoseImage(
  projectId: string
): Promise<void> {
  await fs.rm(getCharacterCanonicalPoseDirectory(projectId), {
    recursive: true,
    force: true,
  });
}
