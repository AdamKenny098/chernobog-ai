import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import { CharacterProjectValidationError } from "../errors";
import { getCharacterProjectDirectory } from "../projects/characterProjectStore";

const CHARACTER_CONCEPT_ID_PATTERN = /^concept-[a-zA-Z0-9._-]+$/;

type CharacterConceptMimeType = "image/png" | "image/jpeg" | "image/webp";

function assertConceptId(conceptId: string): void {
  if (!CHARACTER_CONCEPT_ID_PATTERN.test(conceptId)) {
    throw new CharacterProjectValidationError(
      `Invalid Character Forge concept id: ${conceptId}`
    );
  }
}

function getExtension(mimeType: CharacterConceptMimeType): string {
  switch (mimeType) {
    case "image/jpeg":
      return ".jpg";
    case "image/webp":
      return ".webp";
    case "image/png":
    default:
      return ".png";
  }
}

export function getCharacterConceptDirectory(projectId: string): string {
  return path.join(getCharacterProjectDirectory(projectId), "concepts");
}

export async function writeCharacterConceptImage({
  projectId,
  conceptId,
  bytes,
  mimeType,
}: {
  projectId: string;
  conceptId: string;
  bytes: Uint8Array;
  mimeType: CharacterConceptMimeType;
}): Promise<string> {
  assertConceptId(conceptId);

  if (bytes.length === 0) {
    throw new CharacterProjectValidationError(
      "A generated concept image cannot be empty."
    );
  }

  const directory = getCharacterConceptDirectory(projectId);
  const filename = `${conceptId}${getExtension(mimeType)}`;
  const destination = path.join(directory, filename);
  const temporary = `${destination}.${randomUUID()}.tmp`;

  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(temporary, bytes);
  await fs.rename(temporary, destination);

  return path.posix.join("concepts", filename);
}

export async function readCharacterConceptImage({
  projectId,
  conceptId,
  imagePath,
}: {
  projectId: string;
  conceptId: string;
  imagePath: string;
}) {
  assertConceptId(conceptId);

  const projectDirectory = getCharacterProjectDirectory(projectId);
  const resolvedProjectDirectory = path.resolve(projectDirectory);
  const resolvedImagePath = path.resolve(projectDirectory, imagePath);

  if (
    !resolvedImagePath.startsWith(`${resolvedProjectDirectory}${path.sep}`) ||
    path.basename(resolvedImagePath).split(".", 1)[0] !== conceptId
  ) {
    throw new CharacterProjectValidationError(
      "The stored concept image path is invalid."
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

export async function clearCharacterConceptImages(
  projectId: string
): Promise<void> {
  await fs.rm(getCharacterConceptDirectory(projectId), {
    recursive: true,
    force: true,
  });
}
