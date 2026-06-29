import { promises as fs } from "fs";
import path from "path";

import { latestRecordPath } from "../paths";
import type { LatestSchematicRecord, SchematicMetadata } from "../types";

export async function writeLatestBuildRecord(metadata: SchematicMetadata): Promise<void> {
  const absolutePath = latestRecordPath();
  await fs.mkdir(path.dirname(absolutePath), { recursive: true });

  const record: LatestSchematicRecord = {
    buildId: metadata.buildId,
    generatedAt: metadata.generatedAt,
    metadataJsonPath: metadata.outputPaths.metadataJsonPath,
    debugJsonPath: metadata.outputPaths.debugJsonPath,
    schemPath: metadata.outputPaths.schemPath,
    vaultNotePath: metadata.outputPaths.vaultNotePath,
  };

  await fs.writeFile(absolutePath, JSON.stringify(record, null, 2), "utf8");
}

export async function readLatestBuildRecord(): Promise<LatestSchematicRecord | null> {
  try {
    const absolutePath = latestRecordPath();
    const raw = await fs.readFile(absolutePath, "utf8");
    return JSON.parse(raw) as LatestSchematicRecord;
  } catch {
    return null;
  }
}