import { access, readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import type { LatestScenePackPointer } from "./getLatestScenePack";
import { getLatestScenePack } from "./getLatestScenePack";
import type { ScenePackManifest, ScenePackStructureExport } from "./types";

export type ScenePackQualityFlag =
  | "missing_latest_pointer"
  | "missing_pack_json"
  | "missing_schematic"
  | "manifest_count_mismatch"
  | "planned_slot_not_generated"
  | "failed_structure"
  | "fallback_geometry"
  | "create_preview_limitation"
  | "missing_generation_report"
  | "metadata_only_issue";

export type ReviewedScenePackStructure = {
  structureId: string;
  displayName: string;
  schematicName: string;
  status: ScenePackStructureExport["status"];
  schematicPath: string;
  schematicExists: boolean;
  generatorHint: string;
  priority: number;
  qualityFlags: ScenePackQualityFlag[];
  warnings: string[];
  recommendedAction: string;
};

export type ScenePackReviewResult = {
  ok: boolean;
  packId?: string;
  status?: string;
  outputRoot?: string;
  packJson?: string;
  score: number;
  generatedSchematicCount: number;
  structureCount: number;
  structures: ReviewedScenePackStructure[];
  qualityFlags: ScenePackQualityFlag[];
  warnings: string[];
  recommendedActions: string[];
  manifest?: ScenePackManifest;
  latest?: LatestScenePackPointer;
  reviewMarkdown: string;
  summary: string;
};

type GenerationRecord = {
  structureId?: unknown;
  status?: unknown;
  schemPath?: unknown;
  validationOk?: unknown;
  readBackOk?: unknown;
  errors?: unknown;
  warnings?: unknown;
};

type GenerationReport = {
  records?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toAbs(relativeOrAbsolute: string): string {
  return path.isAbsolute(relativeOrAbsolute)
    ? relativeOrAbsolute
    : path.join(process.cwd(), relativeOrAbsolute);
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readJson<T>(filePath: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(filePath, "utf8")) as T;
  } catch {
    return null;
  }
}

function getGenerationRecords(report: GenerationReport | null): GenerationRecord[] {
  if (!report || !Array.isArray(report.records)) {
    return [];
  }

  return report.records.filter(isRecord) as GenerationRecord[];
}

function getRecordWarnings(record: GenerationRecord | undefined): string[] {
  if (!record || !Array.isArray(record.warnings)) {
    return [];
  }

  return record.warnings.filter((warning): warning is string => typeof warning === "string");
}

function getRecordErrors(record: GenerationRecord | undefined): string[] {
  if (!record || !Array.isArray(record.errors)) {
    return [];
  }

  return record.errors.filter((error): error is string => typeof error === "string");
}

function isFallbackGeometry(structure: ScenePackStructureExport): boolean {
  const text = [
    structure.structureId,
    structure.displayName,
    structure.kind,
    structure.generatorHint,
    structure.schematicName,
    ...structure.warnings,
  ]
    .join(" ")
    .toLowerCase();

  return (
    text.includes("fallback") ||
    text.includes("yard_paths") ||
    text.includes("road_segment") ||
    text.includes("decorations")
  );
}

function isCreatePreviewLimited(structure: ScenePackStructureExport): boolean {
  const text = [
    structure.structureId,
    structure.displayName,
    structure.kind,
    structure.generatorHint,
    structure.schematicName,
  ]
    .join(" ")
    .toLowerCase();

  return text.includes("create") || text.includes("press") || text.includes("mixer") || text.includes("machine");
}

function uniqueFlags(flags: ScenePackQualityFlag[]): ScenePackQualityFlag[] {
  return Array.from(new Set(flags));
}

function getRecommendedAction(
  structure: ScenePackStructureExport,
  flags: ScenePackQualityFlag[],
): string {
  if (flags.includes("missing_schematic")) {
    return `Regenerate structure ${structure.structureId}.`;
  }

  if (flags.includes("failed_structure")) {
    return `Repair or regenerate structure ${structure.structureId}.`;
  }

  if (flags.includes("fallback_geometry")) {
    return `Upgrade ${structure.structureId} to a dedicated high-quality generator when available.`;
  }

  if (flags.includes("create_preview_limitation")) {
    return "Preview in a Create-enabled Minecraft instance rather than Schemat.io.";
  }

  return "No immediate action needed.";
}

function calculateScore(structures: ReviewedScenePackStructure[], globalFlags: ScenePackQualityFlag[]): number {
  let score = 100;

  for (const flag of globalFlags) {
    switch (flag) {
      case "missing_latest_pointer":
      case "missing_pack_json":
        score -= 60;
        break;
      case "manifest_count_mismatch":
        score -= 10;
        break;
      case "missing_generation_report":
        score -= 5;
        break;
      default:
        score -= 3;
        break;
    }
  }

  for (const structure of structures) {
    for (const flag of structure.qualityFlags) {
      switch (flag) {
        case "missing_schematic":
        case "failed_structure":
          score -= 18;
          break;
        case "planned_slot_not_generated":
          score -= 12;
          break;
        case "fallback_geometry":
          score -= 6;
          break;
        case "create_preview_limitation":
          score -= 1;
          break;
        default:
          score -= 3;
          break;
      }
    }
  }

  return Math.max(0, Math.min(100, score));
}

function renderReviewMarkdown(review: Omit<ScenePackReviewResult, "reviewMarkdown" | "summary">): string {
  return [
    `# Scene Pack Review — ${review.packId ?? "unknown"}`,
    "",
    "## Summary",
    "",
    `- Status: ${review.status ?? "unknown"}`,
    `- Score: ${review.score}/100`,
    `- Output root: ${review.outputRoot ?? "unknown"}`,
    `- Structures: ${review.generatedSchematicCount}/${review.structureCount} generated`,
    "",
    "## Quality Flags",
    "",
    ...(review.qualityFlags.length ? review.qualityFlags.map((flag) => `- ${flag}`) : ["- none"]),
    "",
    "## Structures",
    "",
    ...review.structures.map((structure) => [
      `### ${structure.displayName}`,
      "",
      `- ID: ${structure.structureId}`,
      `- Schematic: ${structure.schematicName}`,
      `- Status: ${structure.status}`,
      `- Exists: ${structure.schematicExists ? "yes" : "no"}`,
      `- Flags: ${structure.qualityFlags.length ? structure.qualityFlags.join(", ") : "none"}`,
      `- Recommended action: ${structure.recommendedAction}`,
      "",
    ].join("\n")),
    "## Recommended Actions",
    "",
    ...(review.recommendedActions.length ? review.recommendedActions.map((action) => `- ${action}`) : ["- No immediate action needed."]),
    "",
    "## Warnings",
    "",
    ...(review.warnings.length ? review.warnings.map((warning) => `- ${warning}`) : ["- none"]),
    "",
  ].join("\n");
}

function renderSummary(review: Omit<ScenePackReviewResult, "reviewMarkdown" | "summary">): string {
  return [
    "Scene pack review",
    "",
    `Pack ID: ${review.packId ?? "unknown"}`,
    `Status: ${review.status ?? "unknown"}`,
    `Score: ${review.score}/100`,
    `Output root: ${review.outputRoot ?? "unknown"}`,
    `Generated schematics: ${review.generatedSchematicCount}/${review.structureCount}`,
    "",
    "Quality flags:",
    ...(review.qualityFlags.length ? review.qualityFlags.map((flag) => `- ${flag}`) : ["- none"]),
    "",
    "Structure review:",
    ...review.structures
      .sort((left, right) => left.priority - right.priority)
      .map((structure) => `- ${structure.schematicName}: ${structure.status}, exists=${structure.schematicExists ? "yes" : "no"}, flags=${structure.qualityFlags.length ? structure.qualityFlags.join(",") : "none"}`),
    "",
    "Recommended actions:",
    ...(review.recommendedActions.length ? review.recommendedActions.map((action) => `- ${action}`) : ["- No immediate action needed."]),
  ].join("\n");
}

export async function reviewLatestScenePack(): Promise<ScenePackReviewResult> {
  const latest = await getLatestScenePack();

  if (!latest) {
    const partial = {
      ok: false,
      score: 0,
      generatedSchematicCount: 0,
      structureCount: 0,
      structures: [],
      qualityFlags: ["missing_latest_pointer"] as ScenePackQualityFlag[],
      warnings: ["No exports/schematic-packs/latest.json file was found."],
      recommendedActions: ["Generate a scene pack first."],
      latest: undefined,
      manifest: undefined,
    };

    const reviewMarkdown = renderReviewMarkdown(partial);
    const summary = renderSummary(partial);

    return {
      ...partial,
      reviewMarkdown,
      summary,
    };
  }

  const packJsonAbs = toAbs(latest.packJson);
  const manifest = await readJson<ScenePackManifest>(packJsonAbs);

  if (!manifest) {
    const partial = {
      ok: false,
      packId: latest.packId,
      status: latest.status,
      outputRoot: latest.outputRoot,
      packJson: latest.packJson,
      score: 0,
      generatedSchematicCount: latest.generatedSchematicCount,
      structureCount: latest.structureCount,
      structures: [],
      qualityFlags: ["missing_pack_json"] as ScenePackQualityFlag[],
      warnings: [`Could not read pack manifest: ${latest.packJson}`],
      recommendedActions: ["Regenerate the scene pack or repair the latest pointer."],
      latest,
      manifest: undefined,
    };

    const reviewMarkdown = renderReviewMarkdown(partial);
    const summary = renderSummary(partial);

    return {
      ...partial,
      reviewMarkdown,
      summary,
    };
  }

  const outputRootAbs = toAbs(manifest.outputRoot);
  const generationReportPath = path.join(outputRootAbs, "metadata", "generation-report.json");
  const generationReport = await readJson<GenerationReport>(generationReportPath);
  const records = getGenerationRecords(generationReport);
  const globalFlags: ScenePackQualityFlag[] = [];

  if (!generationReport) {
    globalFlags.push("missing_generation_report");
  }

  if (manifest.generatedSchematicCount !== latest.generatedSchematicCount) {
    globalFlags.push("manifest_count_mismatch");
  }

  const reviewedStructures: ReviewedScenePackStructure[] = [];

  for (const structure of manifest.structures) {
    const record = records.find((candidate) => candidate.structureId === structure.structureId);
    const schematicPath = typeof record?.schemPath === "string" ? record.schemPath : structure.plannedSchematicPath;
    const schematicExists = await pathExists(toAbs(schematicPath));
    const flags: ScenePackQualityFlag[] = [];

    if (!schematicExists) {
      flags.push("missing_schematic");
    }

    if (structure.status === "planned" || structure.status === "skipped") {
      flags.push("planned_slot_not_generated");
    }

    if (structure.status === "failed" || record?.status === "failed") {
      flags.push("failed_structure");
    }

    if (isFallbackGeometry(structure)) {
      flags.push("fallback_geometry");
    }

    if (isCreatePreviewLimited(structure)) {
      flags.push("create_preview_limitation");
    }

    if (record && record.validationOk === false) {
      flags.push("failed_structure");
    }

    const warnings = [
      ...structure.warnings,
      ...getRecordWarnings(record),
      ...getRecordErrors(record),
    ];

    reviewedStructures.push({
      structureId: structure.structureId,
      displayName: structure.displayName,
      schematicName: structure.schematicName,
      status: structure.status,
      schematicPath,
      schematicExists,
      generatorHint: structure.generatorHint,
      priority: structure.priority,
      qualityFlags: uniqueFlags(flags),
      warnings,
      recommendedAction: getRecommendedAction(structure, flags),
    });
  }

  const generatedSchematicCount = reviewedStructures.filter((structure) => structure.schematicExists).length;
  const structureCount = reviewedStructures.length;

  if (generatedSchematicCount !== manifest.generatedSchematicCount) {
    globalFlags.push("manifest_count_mismatch", "metadata_only_issue");
  }

  const allFlags = uniqueFlags([
    ...globalFlags,
    ...reviewedStructures.flatMap((structure) => structure.qualityFlags),
  ]);

  const recommendedActions = Array.from(new Set([
    ...reviewedStructures
      .map((structure) => structure.recommendedAction)
      .filter((action) => action !== "No immediate action needed."),
    ...(allFlags.includes("metadata_only_issue") ? ["Run schematic repair pack latest to refresh manifest/latest metadata."] : []),
    ...(allFlags.includes("fallback_geometry") ? ["Prioritize a dedicated road/path generator after pack review is stable."] : []),
  ]));

  const score = calculateScore(reviewedStructures, globalFlags);

  const resultWithoutText = {
    ok: !allFlags.includes("missing_pack_json") && !allFlags.includes("missing_latest_pointer"),
    packId: manifest.packId,
    status: manifest.status,
    outputRoot: manifest.outputRoot,
    packJson: latest.packJson,
    score,
    generatedSchematicCount,
    structureCount,
    structures: reviewedStructures,
    qualityFlags: allFlags,
    warnings: [
      ...manifest.warnings,
      ...reviewedStructures.flatMap((structure) => structure.warnings.map((warning) => `${structure.structureId}: ${warning}`)),
    ],
    recommendedActions,
    manifest,
    latest,
  };

  const reviewMarkdown = renderReviewMarkdown(resultWithoutText);
  const summary = renderSummary(resultWithoutText);

  return {
    ...resultWithoutText,
    reviewMarkdown,
    summary,
  };
}

export async function writeLatestScenePackReview(): Promise<ScenePackReviewResult> {
  const review = await reviewLatestScenePack();

  if (!review.outputRoot) {
    return review;
  }

  const outputRootAbs = toAbs(review.outputRoot);
  await mkdir(path.join(outputRootAbs, "metadata"), { recursive: true });
  await writeFile(path.join(outputRootAbs, "pack-review.md"), review.reviewMarkdown, "utf8");
  await writeFile(path.join(outputRootAbs, "metadata", "review-report.json"), `${JSON.stringify({
    packId: review.packId,
    status: review.status,
    score: review.score,
    generatedSchematicCount: review.generatedSchematicCount,
    structureCount: review.structureCount,
    qualityFlags: review.qualityFlags,
    structures: review.structures,
    warnings: review.warnings,
    recommendedActions: review.recommendedActions,
  }, null, 2)}\n`, "utf8");

  return review;
}
