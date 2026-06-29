import { readFile } from "node:fs/promises";
import path from "node:path";

export type LatestScenePackPointer = {
  packId: string;
  status: string;
  outputRoot: string;
  createdAt: string;
  sceneType: string;
  biomeHint: string;
  scale: string;
  structureCount: number;
  generatedSchematicCount: number;
  packJson: string;
};

export async function getLatestScenePack(): Promise<LatestScenePackPointer | null> {
  const latestPath = path.join(process.cwd(), "exports", "schematic-packs", "latest.json");

  try {
    return JSON.parse(await readFile(latestPath, "utf8")) as LatestScenePackPointer;
  } catch {
    return null;
  }
}
