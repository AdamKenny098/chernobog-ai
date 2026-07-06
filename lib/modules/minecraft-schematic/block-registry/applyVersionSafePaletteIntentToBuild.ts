import type {
  GeneratedSchematicBuild,
  MinecraftBlockName,
  SchematicBlock,
  SchematicBlockEntity,
} from "../types";
import { canonicalizeMinecraftBlockId, resolveBlockForVersion } from "./blockCompatibility";

export type VersionSafePaletteReplacementRecord = {
  from: MinecraftBlockName;
  to: MinecraftBlockName;
  count: number;
  reason: string;
  chain: string[];
};

export type VersionSafePaletteUnresolvedRecord = {
  block: MinecraftBlockName;
  count: number;
  reason: string;
  chain: string[];
};

export type VersionSafePaletteIntentReport = {
  targetMinecraftVersion: string;
  totalBlockPositionsChecked: number;
  uniqueBlocksChecked: number;
  replacements: VersionSafePaletteReplacementRecord[];
  omissions: VersionSafePaletteReplacementRecord[];
  unresolvedBlocks: VersionSafePaletteUnresolvedRecord[];
  warnings: string[];
};

type BlockUseCounter = Map<MinecraftBlockName, number>;

type ResolvedBlockDecision = {
  original: MinecraftBlockName;
  resolved: MinecraftBlockName;
  allowed: boolean;
  omitted: boolean;
  substituted: boolean;
  reason: string;
  chain: string[];
};

function asMinecraftBlockName(blockId: string): MinecraftBlockName {
  return canonicalizeMinecraftBlockId(blockId) as MinecraftBlockName;
}

function incrementCounter(counter: BlockUseCounter, blockId: MinecraftBlockName, amount = 1): void {
  counter.set(blockId, (counter.get(blockId) ?? 0) + amount);
}

function collectBlockUseCounts(build: GeneratedSchematicBuild): BlockUseCounter {
  const counter: BlockUseCounter = new Map();

  for (const block of build.blocks) {
    incrementCounter(counter, asMinecraftBlockName(block.block));
  }

  for (const paletteEntry of build.palette) {
    const canonical = asMinecraftBlockName(paletteEntry);
    if (!counter.has(canonical)) {
      counter.set(canonical, 0);
    }
  }

  for (const blockEntity of build.blockEntities ?? []) {
    incrementCounter(counter, asMinecraftBlockName(blockEntity.id), 0);
    if (blockEntity.nbtId) {
      incrementCounter(counter, asMinecraftBlockName(blockEntity.nbtId), 0);
    }
  }

  return counter;
}

function resolveDecision(
  blockId: MinecraftBlockName,
  targetMinecraftVersion: string,
): ResolvedBlockDecision {
  const resolution = resolveBlockForVersion(blockId, targetMinecraftVersion);
  const resolved = asMinecraftBlockName(resolution.resolvedBlockId);

  return {
    original: asMinecraftBlockName(resolution.requestedBlockId),
    resolved,
    allowed: resolution.allowed,
    omitted: resolution.omitted || resolved === "minecraft:air",
    substituted: resolution.substituted || resolved !== blockId,
    reason: resolution.reason,
    chain: resolution.chain,
  };
}

function formatReplacementWarning(record: VersionSafePaletteReplacementRecord): string {
  return `${record.from} -> ${record.to} (${record.count} use${record.count === 1 ? "" : "s"})`;
}

function buildReport(
  targetMinecraftVersion: string,
  useCounts: BlockUseCounter,
  decisions: Map<MinecraftBlockName, ResolvedBlockDecision>,
): VersionSafePaletteIntentReport {
  const replacementByKey = new Map<string, VersionSafePaletteReplacementRecord>();
  const omissionByKey = new Map<string, VersionSafePaletteReplacementRecord>();
  const unresolvedByKey = new Map<string, VersionSafePaletteUnresolvedRecord>();

  for (const [blockId, count] of useCounts) {
    const decision = decisions.get(blockId);
    if (!decision) {
      continue;
    }

    if (!decision.allowed) {
      unresolvedByKey.set(blockId, {
        block: blockId,
        count,
        reason: decision.reason,
        chain: decision.chain,
      });
      continue;
    }

    if (decision.omitted) {
      omissionByKey.set(`${decision.original}->${decision.resolved}`, {
        from: decision.original,
        to: decision.resolved,
        count,
        reason: decision.reason,
        chain: decision.chain,
      });
      continue;
    }

    if (decision.substituted && decision.original !== decision.resolved) {
      replacementByKey.set(`${decision.original}->${decision.resolved}`, {
        from: decision.original,
        to: decision.resolved,
        count,
        reason: decision.reason,
        chain: decision.chain,
      });
    }
  }

  const replacements = Array.from(replacementByKey.values()).sort((a, b) =>
    a.from.localeCompare(b.from),
  );
  const omissions = Array.from(omissionByKey.values()).sort((a, b) =>
    a.from.localeCompare(b.from),
  );
  const unresolvedBlocks = Array.from(unresolvedByKey.values()).sort((a, b) =>
    a.block.localeCompare(b.block),
  );

  const warnings = [
    `9C version-safe palette pass checked ${useCounts.size} unique block palette entr${useCounts.size === 1 ? "y" : "ies"} for Minecraft ${targetMinecraftVersion}.`,
    ...(replacements.length > 0
      ? [
          `9C replacements: ${replacements
            .slice(0, 12)
            .map(formatReplacementWarning)
            .join(", ")}${replacements.length > 12 ? `, and ${replacements.length - 12} more` : ""}.`,
        ]
      : []),
    ...(omissions.length > 0
      ? [
          `9C omissions: ${omissions
            .slice(0, 12)
            .map(formatReplacementWarning)
            .join(", ")}${omissions.length > 12 ? `, and ${omissions.length - 12} more` : ""}.`,
        ]
      : []),
    ...(unresolvedBlocks.length > 0
      ? [
          `9C unresolved blocks still require the registry/export validator: ${unresolvedBlocks
            .slice(0, 12)
            .map((record) => record.block)
            .join(", ")}${unresolvedBlocks.length > 12 ? `, and ${unresolvedBlocks.length - 12} more` : ""}.`,
        ]
      : []),
  ];

  return {
    targetMinecraftVersion,
    totalBlockPositionsChecked: Array.from(useCounts.values()).reduce((total, count) => total + count, 0),
    uniqueBlocksChecked: useCounts.size,
    replacements,
    omissions,
    unresolvedBlocks,
    warnings,
  };
}

function applyDecisionToBlock(
  block: SchematicBlock,
  decisions: Map<MinecraftBlockName, ResolvedBlockDecision>,
): SchematicBlock | null {
  const original = asMinecraftBlockName(block.block);
  const decision = decisions.get(original);

  if (!decision || !decision.allowed) {
    return { ...block, block: original };
  }

  if (decision.omitted || decision.resolved === "minecraft:air") {
    return null;
  }

  return { ...block, block: decision.resolved };
}

function applyDecisionToBlockEntity(
  blockEntity: SchematicBlockEntity,
  decisions: Map<MinecraftBlockName, ResolvedBlockDecision>,
): SchematicBlockEntity {
  const id = asMinecraftBlockName(blockEntity.id);
  const idDecision = decisions.get(id);
  const resolvedId = idDecision?.allowed && !idDecision.omitted ? idDecision.resolved : id;

  if (!blockEntity.nbtId) {
    return { ...blockEntity, id: resolvedId };
  }

  const nbtId = asMinecraftBlockName(blockEntity.nbtId);
  const nbtDecision = decisions.get(nbtId);
  const resolvedNbtId = nbtDecision?.allowed && !nbtDecision.omitted ? nbtDecision.resolved : nbtId;

  return { ...blockEntity, id: resolvedId, nbtId: resolvedNbtId };
}

function buildPalette(
  blocks: SchematicBlock[],
  blockEntities: SchematicBlockEntity[] | undefined,
): MinecraftBlockName[] {
  const palette = new Set<MinecraftBlockName>();

  for (const block of blocks) {
    const canonical = asMinecraftBlockName(block.block);
    if (canonical !== "minecraft:air") {
      palette.add(canonical);
    }
  }

  for (const blockEntity of blockEntities ?? []) {
    const id = asMinecraftBlockName(blockEntity.id);
    if (id !== "minecraft:air") {
      palette.add(id);
    }
    if (blockEntity.nbtId) {
      const nbtId = asMinecraftBlockName(blockEntity.nbtId);
      if (nbtId !== "minecraft:air") {
        palette.add(nbtId);
      }
    }
  }

  return Array.from(palette).sort();
}

export function createVersionSafePaletteIntentReport(
  build: GeneratedSchematicBuild,
): VersionSafePaletteIntentReport | null {
  const targetMinecraftVersion = build.targetMinecraftVersion?.trim();
  if (!targetMinecraftVersion) {
    return null;
  }

  const useCounts = collectBlockUseCounts(build);
  const decisions = new Map<MinecraftBlockName, ResolvedBlockDecision>();

  for (const blockId of useCounts.keys()) {
    decisions.set(blockId, resolveDecision(blockId, targetMinecraftVersion));
  }

  return buildReport(targetMinecraftVersion, useCounts, decisions);
}

export function applyVersionSafePaletteIntentToBuild(
  build: GeneratedSchematicBuild,
): GeneratedSchematicBuild {
  const targetMinecraftVersion = build.targetMinecraftVersion?.trim();
  if (!targetMinecraftVersion) {
    return build;
  }

  const useCounts = collectBlockUseCounts(build);
  const decisions = new Map<MinecraftBlockName, ResolvedBlockDecision>();

  for (const blockId of useCounts.keys()) {
    decisions.set(blockId, resolveDecision(blockId, targetMinecraftVersion));
  }

  const report = buildReport(targetMinecraftVersion, useCounts, decisions);
  const blocks = build.blocks
    .map((block) => applyDecisionToBlock(block, decisions))
    .filter((block): block is SchematicBlock => block !== null);
  const blockEntities = build.blockEntities?.map((blockEntity) =>
    applyDecisionToBlockEntity(blockEntity, decisions),
  );
  const palette = buildPalette(blocks, blockEntities);

  return {
    ...build,
    blocks,
    blockEntities,
    palette,
    blockCount: blocks.length,
    features: Array.from(new Set([...(build.features ?? []), "version_safe_palette_9c"])),
    placementWarnings: [...(build.placementWarnings ?? []), ...report.warnings],
    unsupportedBlockWarnings: [
      ...(build.unsupportedBlockWarnings ?? []),
      ...report.unresolvedBlocks.map(
        (record) =>
          `9C unresolved for Minecraft ${targetMinecraftVersion}: ${record.block} (${record.count} use${record.count === 1 ? "" : "s"}) — ${record.reason}`,
      ),
    ],
  };
}
