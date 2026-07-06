// lib/modules/minecraft-schematic/block-registry/blockVersionLimitReport.ts

import type { BlockVersionLimitReport } from "./blockRegistryTypes";
import {
  getMinecraftBlockRegistryEntry,
  resolveBlockForVersion,
} from "./blockCompatibility";

export function createBlockVersionLimitReport(args: {
  blockIds: readonly string[];
  targetMinecraftVersion: string;
}): BlockVersionLimitReport {
  const uniqueBlockIds = Array.from(new Set(args.blockIds));

  const allowedBlocks: string[] = [];
  const substitutedBlocks: BlockVersionLimitReport["substitutedBlocks"] = [];
  const omittedBlocks: string[] = [];
  const incompatibleBlocks: BlockVersionLimitReport["incompatibleBlocks"] = [];

  for (const blockId of uniqueBlockIds) {
    const resolution = resolveBlockForVersion(
      blockId,
      args.targetMinecraftVersion,
    );

    if (resolution.allowed && !resolution.substituted && !resolution.omitted) {
      allowedBlocks.push(resolution.resolvedBlockId);
      continue;
    }

    if (resolution.allowed && resolution.omitted) {
      omittedBlocks.push(resolution.requestedBlockId);
      continue;
    }

    if (resolution.allowed && resolution.substituted) {
      substitutedBlocks.push({
        from: resolution.requestedBlockId,
        to: resolution.resolvedBlockId,
        chain: resolution.chain,
      });
      continue;
    }

    const entry = getMinecraftBlockRegistryEntry(blockId);

    incompatibleBlocks.push({
      blockId: resolution.requestedBlockId,
      targetMinecraftVersion: args.targetMinecraftVersion,
      introducedIn: entry?.introducedIn,
      reason: resolution.reason,
      suggestedReplacement:
        resolution.substituted || resolution.omitted
          ? resolution.resolvedBlockId
          : undefined,
    });
  }

  return {
    targetMinecraftVersion: args.targetMinecraftVersion,
    checkedBlockCount: uniqueBlockIds.length,
    allowedBlocks: allowedBlocks.sort(),
    substitutedBlocks: substitutedBlocks.sort((a, b) =>
      a.from.localeCompare(b.from),
    ),
    omittedBlocks: omittedBlocks.sort(),
    incompatibleBlocks: incompatibleBlocks.sort((a, b) =>
      a.blockId.localeCompare(b.blockId),
    ),
  };
}
