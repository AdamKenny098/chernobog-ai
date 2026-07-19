import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import { CharacterProjectValidationError } from "../errors";
import { getCharacterProjectDirectory } from "../projects/characterProjectStore";

const MODEL_FILENAME = "generated-character.glb";
const GLB_HEADER_LENGTH = 12;

function assertGlb(bytes: Uint8Array): void {
  if (bytes.byteLength < GLB_HEADER_LENGTH) {
    throw new CharacterProjectValidationError(
      "The generated model is too small to be a valid GLB file.",
    );
  }

  const header = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const magic = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);
  const version = header.getUint32(4, true);
  const declaredLength = header.getUint32(8, true);

  if (magic !== "glTF" || version !== 2) {
    throw new CharacterProjectValidationError(
      "The generated model must be a GLB 2.0 file.",
    );
  }

  if (declaredLength !== bytes.byteLength) {
    throw new CharacterProjectValidationError(
      "The generated GLB length header does not match the stored file.",
    );
  }
}

export function getCharacterModelDirectory(projectId: string): string {
  return path.join(getCharacterProjectDirectory(projectId), "model");
}

export async function writeCharacterModelGlb({
  projectId,
  bytes,
}: {
  projectId: string;
  bytes: Uint8Array;
}): Promise<string> {
  assertGlb(bytes);

  const directory = getCharacterModelDirectory(projectId);
  const destination = path.join(directory, MODEL_FILENAME);
  const temporary = `${destination}.${randomUUID()}.tmp`;

  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(temporary, bytes);
  await fs.rename(temporary, destination);

  return path.posix.join("model", MODEL_FILENAME);
}

export async function readCharacterModelGlb({
  projectId,
  filePath,
}: {
  projectId: string;
  filePath: string;
}): Promise<Buffer | null> {
  const projectDirectory = getCharacterProjectDirectory(projectId);
  const expectedPath = path.resolve(
    getCharacterModelDirectory(projectId),
    MODEL_FILENAME,
  );
  const resolvedPath = path.resolve(projectDirectory, filePath);

  if (resolvedPath !== expectedPath) {
    throw new CharacterProjectValidationError(
      "The stored character model path is invalid.",
    );
  }

  try {
    return await fs.readFile(resolvedPath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }

    throw error;
  }
}

export async function clearCharacterModelAsset(
  projectId: string,
): Promise<void> {
  await fs.rm(getCharacterModelDirectory(projectId), {
    recursive: true,
    force: true,
  });
}
