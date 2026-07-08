import { applyBlockRegistryToBuild } from "../block-registry/blockRegistry";
import type { GeneratedSchematicBuild, MinecraftBlockName } from "../types";

import { allPaletteBlocks } from "./paletteLibrary";
import type {
  PaletteApplyOptions,
  PaletteCompatibilityIssue,
  PaletteCompatibilityResult,
  SchematicPaletteDefinition,
} from "./paletteTypes";

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function asMinecraftBlockName(block: string): MinecraftBlockName {
  return block as MinecraftBlockName;
}

function getReplacementPairs(report: unknown): Array<{ original: string; replacement: string }> {
  if (!report || typeof report !== "object") {
    return [];
  }

  const record = report as Record<string, unknown>;
  const candidates = [
    record.replacements,
    record.fallbackReplacements,
    record.blockReplacements,
    record.fallbacks,
  ];

  const pairs: Array<{ original: string; replacement: string }> = [];

  for (const candidate of candidates) {
    if (!Array.isArray(candidate)) {
      continue;
    }

    for (const entry of candidate) {
      if (!entry || typeof entry !== "object") {
        continue;
      }

      const item = entry as Record<string, unknown>;
      const original = item.originalBlock ?? item.original ?? item.from ?? item.block;
      const replacement = item.replacementBlock ?? item.replacement ?? item.to ?? item.fallback;

      if (typeof original === "string" && typeof replacement === "string") {
        pairs.push({ original, replacement });
      }
    }
  }

  return pairs;
}

function getUnsupportedBlocks(report: unknown): string[] {
  if (!report || typeof report !== "object") {
    return [];
  }

  const record = report as Record<string, unknown>;
  const candidates = [record.unsupportedBlocks, record.unsupported, record.invalidBlocks];
  const blocks: string[] = [];

  for (const candidate of candidates) {
    if (!Array.isArray(candidate)) {
      continue;
    }

    for (const entry of candidate) {
      if (typeof entry === "string") {
        blocks.push(entry);
      } else if (entry && typeof entry === "object") {
        const block = (entry as Record<string, unknown>).block;
        if (typeof block === "string") {
          blocks.push(block);
        }
      }
    }
  }

  return unique(blocks);
}

function getReportNumber(report: unknown, keys: string[]): number {
  if (!report || typeof report !== "object") {
    return 0;
  }

  const record = report as Record<string, unknown>;

  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
  }

  return 0;
}

function makePaletteValidationBuild(
  palette: SchematicPaletteDefinition,
  options: PaletteApplyOptions,
): GeneratedSchematicBuild {
  const paletteBlocks = allPaletteBlocks(palette);
  const targetMinecraftVersion =
    options.targetMinecraftVersion ?? palette.targetMinecraftVersion ?? palette.minecraftVersion;
  const profile = options.profile ?? palette.profile ?? "vanilla";

  return {
    buildId: `palette-${palette.id}`,
    generatorName: "palette-validator",
    variant: "palette",
    profile,
    targetMinecraftVersion,
    minecraftVersion: targetMinecraftVersion,
    prompt: `validate palette ${palette.id}`,
    command: `validate palette ${palette.id}`,
    generatedAt: new Date().toISOString(),
    size: { x: Math.max(1, paletteBlocks.length), y: 1, z: 1 },
    palette: paletteBlocks,
    blocks: paletteBlocks.map((block, index) => ({ x: index, y: 0, z: 0, block })),
    blockCount: paletteBlocks.length,
  } as GeneratedSchematicBuild;
}

export function finalizePaletteForTarget(
  palette: SchematicPaletteDefinition,
  options: PaletteApplyOptions = {},
): PaletteCompatibilityResult {
  const validationBuild = makePaletteValidationBuild(palette, options);
  const targetMinecraftVersion =
    options.targetMinecraftVersion ?? palette.targetMinecraftVersion ?? palette.minecraftVersion;
  const profile = options.profile ?? palette.profile ?? "vanilla";

  const finalizedBuild = applyBlockRegistryToBuild(validationBuild, {
    targetMinecraftVersion,
    profile,
    allowModdedBlocks: options.allowModdedBlocks ?? palette.allowModdedBlocks ?? profile !== "vanilla",
    fallbackToVanilla: options.fallbackToVanilla ?? palette.fallbackToVanilla ?? true,
  }) as GeneratedSchematicBuild;

  const report = finalizedBuild.blockRegistryReport;
  const replacementPairs = getReplacementPairs(report);
  const replacementMap = new Map<string, string>(replacementPairs.map((pair) => [pair.original, pair.replacement]));
  const unsupportedBlocks = getUnsupportedBlocks(report);

  const finalizedPalette: SchematicPaletteDefinition = JSON.parse(
    JSON.stringify({
      ...palette,
      targetMinecraftVersion,
      profile,
    }),
  ) as SchematicPaletteDefinition;

  for (const [role, block] of Object.entries(finalizedPalette.roles)) {
    finalizedPalette.roles[role as keyof typeof finalizedPalette.roles] = asMinecraftBlockName(
      replacementMap.get(block) ?? block,
    );
  }

  for (const entries of Object.values(finalizedPalette.textures ?? {})) {
    for (const entry of entries ?? []) {
      entry.block = asMinecraftBlockName(replacementMap.get(entry.block) ?? entry.block);
    }
  }

  const issues: PaletteCompatibilityIssue[] = [];

  for (const pair of replacementPairs) {
    issues.push({
      severity: "warning",
      message: `${pair.original} was replaced with ${pair.replacement}.`,
      block: asMinecraftBlockName(pair.original),
      replacement: asMinecraftBlockName(pair.replacement),
    });
  }

  for (const block of unsupportedBlocks) {
    issues.push({
      severity: "error",
      message: `${block} is unsupported for this palette target.`,
      block: asMinecraftBlockName(block),
    });
  }

  const changedBlocks = replacementPairs.length;
  const changedBlockCount = getReportNumber(report, ["changedBlocks", "changedBlockCount"]) || changedBlocks;
  const unsupportedBlockCount = getReportNumber(report, ["unsupportedBlockCount", "unsupportedBlocksCount"]);
  const fallbackBlockCount = getReportNumber(report, ["fallbackBlocks", "fallbackReplacementCount", "replacementCount"]);

  return {
    ok: unsupportedBlocks.length === 0,
    paletteId: palette.id,
    targetMinecraftVersion,
    profile,
    changedBlocks: changedBlockCount,
    fallbackBlocks: fallbackBlockCount || changedBlocks,
    unsupportedBlocks: unsupportedBlockCount || unsupportedBlocks.length,
    issues,
    blockRegistryReport: report,
    finalizedPalette,
  };
}
