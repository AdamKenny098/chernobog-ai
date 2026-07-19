import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import { CharacterProjectValidationError } from "../errors";
import { getCharacterProjectDirectory } from "../projects/characterProjectStore";

type IdentityAnchorMimeType = "image/png" | "image/jpeg" | "image/webp";

function extensionFor(mimeType: IdentityAnchorMimeType): string {
  return mimeType === "image/jpeg"
    ? ".jpg"
    : mimeType === "image/webp"
      ? ".webp"
      : ".png";
}

export function getCharacterIdentityAnchorDirectory(projectId: string): string {
  return path.join(getCharacterProjectDirectory(projectId), "identity-anchor");
}

export async function writeCharacterIdentityAnchorImage({
  projectId,
  bytes,
  mimeType,
}: {
  projectId: string;
  bytes: Uint8Array;
  mimeType: IdentityAnchorMimeType;
}): Promise<string> {
  if (bytes.length === 0) {
    throw new CharacterProjectValidationError(
      "The identity anchor image cannot be empty."
    );
  }

  const directory = getCharacterIdentityAnchorDirectory(projectId);
  const filename = `identity-anchor${extensionFor(mimeType)}`;
  const destination = path.join(directory, filename);
  const temporary = `${destination}.${randomUUID()}.tmp`;

  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(temporary, bytes);
  await fs.rename(temporary, destination);

  return path.posix.join("identity-anchor", filename);
}

export async function readCharacterIdentityAnchorImage({
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
      path.resolve(projectDirectory, "identity-anchor") ||
    path.basename(resolvedImagePath).split(".", 1)[0] !== "identity-anchor"
  ) {
    throw new CharacterProjectValidationError(
      "The stored identity anchor image path is invalid."
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

export async function clearCharacterIdentityAnchorImage(
  projectId: string
): Promise<void> {
  await fs.rm(getCharacterIdentityAnchorDirectory(projectId), {
    recursive: true,
    force: true,
  });
}
