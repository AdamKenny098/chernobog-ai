import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ScenePackManifest } from "./types";
import { writeLatestScenePackReview } from "./reviewScenePack";

export type ScenePackRepairResult = {
  ok: boolean;
  packId?: string;
  status?: string;
  repaired: boolean;
  changedFields: string[];
  summary: string;
  data?: unknown;
};

function toAbs(relativeOrAbsolute: string): string {
  return path.isAbsolute(relativeOrAbsolute)
    ? relativeOrAbsolute
    : path.join(process.cwd(), relativeOrAbsolute);
}

async function writeJson(filePath: string, value: unknown): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function calculateStatus(generated: number, total: number): ScenePackManifest["status"] {
  if (total <= 0) {
    return "failed";
  }

  if (generated === total) {
    return "generated";
  }

  if (generated > 0) {
    return "partial";
  }

  return "failed";
}

export async function repairLatestScenePack(): Promise<ScenePackRepairResult> {
  const review = await writeLatestScenePackReview();

  if (!review.manifest || !review.latest || !review.outputRoot || !review.packJson) {
    return {
      ok: false,
      packId: review.packId,
      status: review.status,
      repaired: false,
      changedFields: [],
      summary: [
        "Scene pack repair failed",
        "",
        review.summary,
      ].join("\n"),
      data: review,
    };
  }

  const changedFields: string[] = [];
  const outputRootAbs = toAbs(review.outputRoot);
  const packJsonAbs = toAbs(review.packJson);
  const generatedCount = review.structures.filter((structure) => structure.schematicExists).length;
  const nextStatus = calculateStatus(generatedCount, review.structures.length);

  const repairedManifest: ScenePackManifest = {
    ...review.manifest,
    status: nextStatus,
    generatedSchematicCount: generatedCount,
    structures: review.manifest.structures.map((structure) => {
      const reviewed = review.structures.find((entry) => entry.structureId === structure.structureId);

      if (!reviewed) {
        return structure;
      }

      return {
        ...structure,
        status: reviewed.schematicExists ? "generated" : structure.status === "generated" ? "failed" : structure.status,
        warnings: Array.from(new Set([
          ...structure.warnings,
          ...reviewed.qualityFlags.map((flag) => `Review flag: ${flag}`),
        ])),
      };
    }),
    warnings: Array.from(new Set([
      ...review.manifest.warnings,
      ...review.qualityFlags.map((flag) => `Review flag: ${flag}`),
    ])),
    notes: Array.from(new Set([
      ...review.manifest.notes,
      "M6-G safe repair refreshed pack status, structure status, latest pointer, and review reports without changing schematic block data.",
    ])),
  };

  if (repairedManifest.status !== review.manifest.status) {
    changedFields.push("pack.status");
  }

  if (repairedManifest.generatedSchematicCount !== review.manifest.generatedSchematicCount) {
    changedFields.push("pack.generatedSchematicCount");
  }

  changedFields.push("metadata/review-report.json");
  changedFields.push("pack-review.md");
  changedFields.push("exports/schematic-packs/latest.json");

  await writeJson(packJsonAbs, repairedManifest);
  await writeJson(path.join(process.cwd(), "exports", "schematic-packs", "latest.json"), {
    packId: repairedManifest.packId,
    status: repairedManifest.status,
    outputRoot: repairedManifest.outputRoot,
    createdAt: repairedManifest.createdAt,
    sceneType: repairedManifest.sceneType,
    biomeHint: repairedManifest.biomeHint,
    scale: repairedManifest.scale,
    structureCount: repairedManifest.structureCount,
    generatedSchematicCount: repairedManifest.generatedSchematicCount,
    packJson: review.packJson,
  });
  await writeJson(path.join(outputRootAbs, "metadata", "repair-report.json"), {
    packId: repairedManifest.packId,
    status: repairedManifest.status,
    generatedSchematicCount: repairedManifest.generatedSchematicCount,
    structureCount: repairedManifest.structureCount,
    changedFields,
    qualityFlags: review.qualityFlags,
    recommendedActions: review.recommendedActions,
  });

  return {
    ok: true,
    packId: repairedManifest.packId,
    status: repairedManifest.status,
    repaired: true,
    changedFields,
    summary: [
      "Scene pack repaired",
      "",
      `Pack ID: ${repairedManifest.packId}`,
      `Status: ${repairedManifest.status}`,
      `Generated schematics: ${repairedManifest.generatedSchematicCount}/${repairedManifest.structureCount}`,
      "",
      "Changed fields/files:",
      ...changedFields.map((field) => `- ${field}`),
      "",
      "Safe repair note:",
      "- No schematic block data was changed.",
      "- This only refreshed metadata, latest pointer, and review/repair reports.",
    ].join("\n"),
    data: {
      manifest: repairedManifest,
      review,
      changedFields,
    },
  };
}
