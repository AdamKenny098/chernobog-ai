import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { BlockGrid } from "../core/BlockGrid";
import type { DebugSchematicDocument } from "../core/types";

export type DebugSchematicWriteResult = {
  fileName: string;
  relativePath: string;
  absolutePath: string;
  document: DebugSchematicDocument;
};

function safeFilePart(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function writeDebugSchematic(
  grid: BlockGrid,
  options: {
    command: string;
    name: string;
  }
): Promise<DebugSchematicWriteResult> {
  const outputDirectory = path.join(
    process.cwd(),
    "exports",
    "schematics",
    "debug"
  );

  await mkdir(outputDirectory, {
    recursive: true,
  });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const fileName = `${safeFilePart(options.name)}-${timestamp}.json`;
  const absolutePath = path.join(outputDirectory, fileName);
  const relativePath = path
    .join("exports", "schematics", "debug", fileName)
    .replace(/\\/g, "/");

  const document = grid.toDebugDocument(options.command);

  await writeFile(absolutePath, JSON.stringify(document, null, 2), "utf8");

  return {
    fileName,
    relativePath,
    absolutePath,
    document,
  };
}