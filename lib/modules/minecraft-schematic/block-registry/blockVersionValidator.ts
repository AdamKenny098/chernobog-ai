// lib/modules/minecraft-schematic/block-registry/blockVersionValidator.ts
// Milestone 9D — block-by-block Minecraft version validation.

import type {
  BlockRegistryReport,
  GeneratedSchematicBuild,
  MinecraftBlockName,
} from "../types";

import {
  canonicalizeMinecraftBlockId,
  getMinecraftBlockRegistryEntry,
  isBlockAllowedInVersion,
  resolveBlockForVersion,
} from "./blockCompatibility";

import { normalizeMinecraftVersion } from "./minecraftVersion";

export type BlockVersionValidationStatus = "passed" | "failed" | "skipped";

export interface BlockVersionValidationCoordinate {
  x: number;
  y: number;
  z: number;
}

export interface BlockVersionValidationIssue {
  blockId: MinecraftBlockName;
  targetMinecraftVersion: string;
  introducedIn?: string;
  occurrences: number;
  coordinates: BlockVersionValidationCoordinate[];
  reason: string;
  suggestedReplacement?: MinecraftBlockName;
}

export interface BlockVersionValidationReport {
  milestone: "9D";
  status: BlockVersionValidationStatus;
  ok: boolean;
  targetMinecraftVersion?: string;
  checkedBlockCount: number;
  checkedDistinctBlockCount: number;
  validBlockCount: number;
  invalidBlockCount: number;
  invalidBlockTypeCount: number;
  invalidBlocks: BlockVersionValidationIssue[];
  blockCounts: Record<string, number>;
  summary: string;
}

interface MutableIssueRecord {
  blockId: MinecraftBlockName;
  targetMinecraftVersion: string;
  introducedIn?: string;
  occurrences: number;
  coordinates: BlockVersionValidationCoordinate[];
  reason: string;
  suggestedReplacement?: MinecraftBlockName;
}

const COORDINATE_DISPLAY_LIMIT = 8;
const ISSUE_DISPLAY_LIMIT = 25;

function asMinecraftBlockName(blockId: string): MinecraftBlockName {
  return canonicalizeMinecraftBlockId(blockId) as MinecraftBlockName;
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values));
}

function readTargetMinecraftVersion(
  build: Pick<GeneratedSchematicBuild, "targetMinecraftVersion" | "profile" | "blockRegistryReport">,
  overrideTargetMinecraftVersion?: string,
): string | undefined {
  const raw =
    overrideTargetMinecraftVersion ??
    build.targetMinecraftVersion ??
    inferTargetVersionFromProfile(build.profile);

  if (!raw) {
    return undefined;
  }

  try {
    return normalizeMinecraftVersion(raw).replace(/\.0$/, "");
  } catch {
    return raw.trim();
  }
}

function inferTargetVersionFromProfile(profile: GeneratedSchematicBuild["profile"]): string | undefined {
  if (typeof profile !== "string") {
    return undefined;
  }

  const direct = profile.match(/^(\d+\.\d+(?:\.\d+)?)$/);
  if (direct?.[1]) {
    return direct[1];
  }

  const versionProfile = profile.match(/^vanilla-(\d+)-(\d+)(?:-(\d+))?$/i);
  if (!versionProfile) {
    return undefined;
  }

  const [, major, minor, patch] = versionProfile;
  return `${major}.${minor}${patch ? `.${patch}` : ""}`;
}


function formatCoordinates(coordinates: BlockVersionValidationCoordinate[]): string {
  const shown = coordinates
    .slice(0, COORDINATE_DISPLAY_LIMIT)
    .map((coordinate) => `${coordinate.x},${coordinate.y},${coordinate.z}`);

  const hidden = coordinates.length - shown.length;
  return hidden > 0 ? `${shown.join("; ")} (+${hidden} more)` : shown.join("; ");
}

function makeIssueReason(args: {
  blockId: MinecraftBlockName;
  targetMinecraftVersion: string;
  introducedIn?: string;
  coordinates: BlockVersionValidationCoordinate[];
}): string {
  const { blockId, targetMinecraftVersion, introducedIn, coordinates } = args;
  const locationSummary = coordinates.length > 0 ? ` Coordinates: ${formatCoordinates(coordinates)}.` : "";

  if (!introducedIn) {
    return `Block ${blockId} is not present in the Minecraft block registry for target ${targetMinecraftVersion}.${locationSummary}`;
  }

  return `Block ${blockId} was introduced in Minecraft ${introducedIn}, which is newer than target ${targetMinecraftVersion}.${locationSummary}`;
}

function suggestedReplacementFor(blockId: MinecraftBlockName, targetMinecraftVersion: string): MinecraftBlockName | undefined {
  const resolved = resolveBlockForVersion(blockId, targetMinecraftVersion);

  if (!resolved.allowed || resolved.resolvedBlockId === blockId) {
    return undefined;
  }

  return resolved.resolvedBlockId as MinecraftBlockName;
}

export function createBlockVersionValidationReport(
  build: GeneratedSchematicBuild,
  overrideTargetMinecraftVersion?: string,
): BlockVersionValidationReport {
  const targetMinecraftVersion = readTargetMinecraftVersion(build, overrideTargetMinecraftVersion);

  if (!targetMinecraftVersion) {
    return {
      milestone: "9D",
      status: "skipped",
      ok: true,
      checkedBlockCount: 0,
      checkedDistinctBlockCount: 0,
      validBlockCount: 0,
      invalidBlockCount: 0,
      invalidBlockTypeCount: 0,
      invalidBlocks: [],
      blockCounts: {},
      summary: "9D block-by-block version validation skipped because no target Minecraft version was provided.",
    };
  }

  const blockCounts: Record<string, number> = {};
  const invalidByBlock = new Map<MinecraftBlockName, MutableIssueRecord>();
  let validBlockCount = 0;
  let invalidBlockCount = 0;

  for (const block of build.blocks) {
    const blockId = asMinecraftBlockName(block.block);
    blockCounts[blockId] = (blockCounts[blockId] ?? 0) + 1;

    const entry = getMinecraftBlockRegistryEntry(blockId);
    const allowed = entry ? isBlockAllowedInVersion(blockId, targetMinecraftVersion) : false;

    if (allowed) {
      validBlockCount += 1;
      continue;
    }

    invalidBlockCount += 1;
    const existing = invalidByBlock.get(blockId);
    const coordinate = { x: block.x, y: block.y, z: block.z };

    if (existing) {
      existing.occurrences += 1;
      existing.coordinates.push(coordinate);
      existing.reason = makeIssueReason({
        blockId,
        targetMinecraftVersion,
        introducedIn: existing.introducedIn,
        coordinates: existing.coordinates,
      });
      continue;
    }

    const coordinates = [coordinate];
    const issue: MutableIssueRecord = {
      blockId,
      targetMinecraftVersion,
      introducedIn: entry?.introducedIn,
      occurrences: 1,
      coordinates,
      reason: makeIssueReason({
        blockId,
        targetMinecraftVersion,
        introducedIn: entry?.introducedIn,
        coordinates,
      }),
      suggestedReplacement: suggestedReplacementFor(blockId, targetMinecraftVersion),
    };

    invalidByBlock.set(blockId, issue);
  }

  const invalidBlocks = Array.from(invalidByBlock.values()).sort((a, b) => {
    if (b.occurrences !== a.occurrences) {
      return b.occurrences - a.occurrences;
    }

    return a.blockId.localeCompare(b.blockId);
  });

  const checkedBlockCount = build.blocks.length;
  const checkedDistinctBlockCount = Object.keys(blockCounts).length;
  const ok = invalidBlockCount === 0;
  const status: BlockVersionValidationStatus = ok ? "passed" : "failed";
  const summary = ok
    ? `9D block-by-block version validation passed for Minecraft ${targetMinecraftVersion}: ${checkedBlockCount} placed block(s), ${checkedDistinctBlockCount} distinct block type(s), 0 incompatible block(s).`
    : `9D block-by-block version validation failed for Minecraft ${targetMinecraftVersion}: ${invalidBlockCount} incompatible placed block(s) across ${invalidBlocks.length} block type(s).`;

  return {
    milestone: "9D",
    status,
    ok,
    targetMinecraftVersion,
    checkedBlockCount,
    checkedDistinctBlockCount,
    validBlockCount,
    invalidBlockCount,
    invalidBlockTypeCount: invalidBlocks.length,
    invalidBlocks,
    blockCounts,
    summary,
  };
}

export function formatBlockVersionValidationReport(report: BlockVersionValidationReport): string[] {
  const lines = [
    `Version Validation: ${report.status}`,
    ...(report.targetMinecraftVersion ? [`Target Minecraft Version: ${report.targetMinecraftVersion}`] : []),
    `Placed Blocks Checked: ${report.checkedBlockCount}`,
    `Distinct Block Types Checked: ${report.checkedDistinctBlockCount}`,
    `Invalid Placed Blocks: ${report.invalidBlockCount}`,
    `Invalid Block Types: ${report.invalidBlockTypeCount}`,
  ];

  if (report.invalidBlocks.length === 0) {
    return lines;
  }

  return [
    ...lines,
    "Incompatible Blocks:",
    ...report.invalidBlocks.slice(0, ISSUE_DISPLAY_LIMIT).map((issue) => {
      const replacement = issue.suggestedReplacement ? ` Suggested replacement: ${issue.suggestedReplacement}.` : "";
      return `- ${issue.blockId} x${issue.occurrences}: ${issue.reason}${replacement}`;
    }),
    ...(report.invalidBlocks.length > ISSUE_DISPLAY_LIMIT
      ? [`- ...${report.invalidBlocks.length - ISSUE_DISPLAY_LIMIT} more incompatible block type(s).`]
      : []),
  ];
}

function makeBlockRegistryUnsupportedRecords(report: BlockVersionValidationReport): BlockRegistryReport["unsupportedBlocks"] {
  return report.invalidBlocks.map((issue) => {
    const replacement = issue.suggestedReplacement ? ` Suggested replacement: ${issue.suggestedReplacement}.` : "";

    return {
      block: issue.blockId,
      reason: `9D version validation failed for target ${issue.targetMinecraftVersion}. ${issue.reason}${replacement}`,
    };
  });
}

function makeUnsupportedWarnings(report: BlockVersionValidationReport): string[] {
  return report.invalidBlocks.slice(0, ISSUE_DISPLAY_LIMIT).map((issue) => {
    const replacement = issue.suggestedReplacement ? ` Suggested replacement: ${issue.suggestedReplacement}.` : "";
    return `9D incompatible block ${issue.blockId} x${issue.occurrences}: ${issue.reason}${replacement}`;
  });
}

function mergeBlockRegistryReport(
  existing: BlockRegistryReport | undefined,
  validationReport: BlockVersionValidationReport,
): BlockRegistryReport | undefined {
  if (!existing) {
    return existing;
  }

  const existingUnsupported = existing.unsupportedBlocks ?? [];
  const validationUnsupported = makeBlockRegistryUnsupportedRecords(validationReport);
  const existingWarnings = existing.warnings ?? [];

  return {
    ...existing,
    unsupportedBlocks: [...existingUnsupported, ...validationUnsupported],
    warnings: uniqueStrings([...existingWarnings, validationReport.summary]),
  };
}

export function applyBlockVersionValidationToBuild<TBuild extends GeneratedSchematicBuild>(
  build: TBuild,
  overrideTargetMinecraftVersion?: string,
): TBuild & { blockVersionValidationReport: BlockVersionValidationReport } {
  const report = createBlockVersionValidationReport(build, overrideTargetMinecraftVersion);

  if (report.status === "skipped") {
    return {
      ...build,
      blockVersionValidationReport: report,
    };
  }

  const features = uniqueStrings([
    ...(build.features ?? []),
    "version_block_validator_9d",
    report.ok ? "version_block_validation_passed" : "version_block_validation_failed",
  ]);

  const placementWarnings = uniqueStrings([...(build.placementWarnings ?? []), report.summary]);
  const unsupportedBlockWarnings = report.ok
    ? build.unsupportedBlockWarnings ?? []
    : uniqueStrings([...(build.unsupportedBlockWarnings ?? []), ...makeUnsupportedWarnings(report)]);

  return {
    ...build,
    features,
    placementWarnings,
    unsupportedBlockWarnings,
    blockRegistryReport: mergeBlockRegistryReport(build.blockRegistryReport, report),
    blockVersionValidationReport: report,
  };
}

export function runBlockVersionValidatorSelfTest(): string[] {
  const baseBuild: GeneratedSchematicBuild = {
    buildId: "schematic-9d-selftest",
    displayName: "Schematic 9D Self Test",
    generatorName: "tower",
    variant: "default",
    profile: "vanilla",
    allowModdedBlocks: false,
    fallbackToVanilla: true,
    prompt: "9D self test",
    command: "schematic 9d self test",
    minecraftVersion: "1.20.1",
    targetMinecraftVersion: "1.8.8",
    generatedAt: new Date(0).toISOString(),
    size: { x: 4, y: 4, z: 4 },
    palette: ["minecraft:air", "minecraft:stone_bricks", "minecraft:lantern"],
    blocks: [
      { x: 0, y: 0, z: 0, block: "minecraft:stone_bricks" },
      { x: 1, y: 0, z: 0, block: "minecraft:lantern" },
      { x: 2, y: 0, z: 0, block: "minecraft:lantern" },
    ],
    blockCount: 3,
    blockRegistryReport: {
      profileId: "vanilla",
      profileDisplayName: "Vanilla",
      allowModdedBlocks: false,
      fallbackToVanilla: true,
      allowedNamespaces: ["minecraft"],
      supportedModdedBlocks: [],
      totalBlocksChecked: 3,
      totalPaletteEntriesChecked: 3,
      changedBlocks: 0,
      fallbackBlocks: 0,
      unsupportedBlocks: [],
      replacements: [],
      warnings: [],
    },
  };

  const failedReport = createBlockVersionValidationReport(baseBuild);
  if (failedReport.ok || failedReport.invalidBlockCount !== 2 || failedReport.invalidBlockTypeCount !== 1) {
    throw new Error("9D self test expected lantern to fail for Minecraft 1.8.8.");
  }

  const patched = applyBlockVersionValidationToBuild(baseBuild);
  if (!patched.blockRegistryReport?.unsupportedBlocks.length) {
    throw new Error("9D self test expected invalid blocks to be promoted into blockRegistryReport.unsupportedBlocks.");
  }

  const passingReport = createBlockVersionValidationReport({
    ...baseBuild,
    palette: ["minecraft:air", "minecraft:stone_bricks", "minecraft:oak_planks"],
    blocks: [
      { x: 0, y: 0, z: 0, block: "minecraft:stone_bricks" },
      { x: 1, y: 0, z: 0, block: "minecraft:oak_planks" },
    ],
    blockCount: 2,
  });

  if (!passingReport.ok || passingReport.invalidBlockCount !== 0) {
    throw new Error("9D self test expected stone bricks/oak planks to pass for Minecraft 1.8.8.");
  }

  return [
    "PASS 9D failed-report detects modern block coordinates",
    "PASS 9D promotes invalid blocks into blockRegistryReport.unsupportedBlocks",
    "PASS 9D passing-report accepts legacy-safe blocks",
  ];
}
