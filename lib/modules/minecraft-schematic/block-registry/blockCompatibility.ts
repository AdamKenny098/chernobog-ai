// lib/modules/minecraft-schematic/block-registry/blockCompatibility.ts

import { MINECRAFT_BLOCK_REGISTRY_BY_ID } from "./blockRegistry";
import type {
  BlockResolutionResult,
  MinecraftBlockRegistryEntry,
} from "./blockRegistryTypes";
import { isMinecraftVersionAtLeast } from "./minecraftVersion";

export function canonicalizeMinecraftBlockId(blockId: string): string {
  const trimmed = blockId.trim();

  if (!trimmed) {
    return "minecraft:air";
  }

  const withoutState = trimmed.split("[")[0] ?? trimmed;
  const withoutLegacyData = withoutState.split("{")[0] ?? withoutState;

  if (withoutLegacyData.includes(":")) {
    return withoutLegacyData;
  }

  return `minecraft:${withoutLegacyData}`;
}

export function getMinecraftBlockRegistryEntry(
  blockId: string,
): MinecraftBlockRegistryEntry | undefined {
  return MINECRAFT_BLOCK_REGISTRY_BY_ID.get(canonicalizeMinecraftBlockId(blockId));
}

export function isBlockAllowedInVersion(
  blockId: string,
  targetMinecraftVersion: string | undefined,
): boolean {
  if (!targetMinecraftVersion) {
    return true;
  }

  const canonicalBlockId = canonicalizeMinecraftBlockId(blockId);
  const entry = MINECRAFT_BLOCK_REGISTRY_BY_ID.get(canonicalBlockId);

  if (!entry) {
    return false;
  }

  return isMinecraftVersionAtLeast(targetMinecraftVersion, entry.introducedIn);
}

export function resolveBlockForVersion(
  blockId: string,
  targetMinecraftVersion: string | undefined,
): BlockResolutionResult {
  const requestedBlockId = canonicalizeMinecraftBlockId(blockId);

  if (!targetMinecraftVersion) {
    return {
      requestedBlockId,
      resolvedBlockId: requestedBlockId,
      targetMinecraftVersion: "latest",
      allowed: true,
      substituted: false,
      omitted: false,
      reason: "No target Minecraft version was provided.",
      chain: [requestedBlockId],
    };
  }

  return resolveBlockForVersionInner({
    requestedBlockId,
    currentBlockId: requestedBlockId,
    targetMinecraftVersion,
    visited: new Set<string>(),
    chain: [],
  });
}

function resolveBlockForVersionInner(args: {
  requestedBlockId: string;
  currentBlockId: string;
  targetMinecraftVersion: string;
  visited: Set<string>;
  chain: string[];
}): BlockResolutionResult {
  const {
    requestedBlockId,
    currentBlockId,
    targetMinecraftVersion,
    visited,
    chain,
  } = args;

  const canonicalBlockId = canonicalizeMinecraftBlockId(currentBlockId);
  const nextChain = [...chain, canonicalBlockId];

  if (visited.has(canonicalBlockId)) {
    return {
      requestedBlockId,
      resolvedBlockId: canonicalBlockId,
      targetMinecraftVersion,
      allowed: false,
      substituted: requestedBlockId !== canonicalBlockId,
      omitted: false,
      reason: `Substitution cycle detected for ${requestedBlockId}.`,
      chain: nextChain,
    };
  }

  visited.add(canonicalBlockId);

  const entry = MINECRAFT_BLOCK_REGISTRY_BY_ID.get(canonicalBlockId);

  if (!entry) {
    return {
      requestedBlockId,
      resolvedBlockId: canonicalBlockId,
      targetMinecraftVersion,
      allowed: false,
      substituted: requestedBlockId !== canonicalBlockId,
      omitted: false,
      reason: `Block is not present in the Minecraft block registry: ${canonicalBlockId}`,
      chain: nextChain,
    };
  }

  const allowed = isMinecraftVersionAtLeast(
    targetMinecraftVersion,
    entry.introducedIn,
  );

  if (allowed) {
    return {
      requestedBlockId,
      resolvedBlockId: canonicalBlockId,
      targetMinecraftVersion,
      allowed: true,
      substituted: requestedBlockId !== canonicalBlockId,
      omitted: false,
      reason:
        requestedBlockId === canonicalBlockId
          ? `${canonicalBlockId} is available in Minecraft ${targetMinecraftVersion}.`
          : `${requestedBlockId} was substituted with ${canonicalBlockId} for Minecraft ${targetMinecraftVersion}.`,
      chain: nextChain,
    };
  }

  for (const substitution of entry.substitutions ?? []) {
    const resolved = resolveBlockForVersionInner({
      requestedBlockId,
      currentBlockId: substitution,
      targetMinecraftVersion,
      visited,
      chain: nextChain,
    });

    if (resolved.allowed || resolved.omitted) {
      return resolved;
    }
  }

  if (entry.omitWhenUnavailable) {
    return {
      requestedBlockId,
      resolvedBlockId: "minecraft:air",
      targetMinecraftVersion,
      allowed: true,
      substituted: true,
      omitted: true,
      reason: `${requestedBlockId} is too modern for Minecraft ${targetMinecraftVersion} and was omitted.`,
      chain: [...nextChain, "minecraft:air"],
    };
  }

  return {
    requestedBlockId,
    resolvedBlockId: canonicalBlockId,
    targetMinecraftVersion,
    allowed: false,
    substituted: false,
    omitted: false,
    reason: `${canonicalBlockId} was introduced in Minecraft ${entry.introducedIn}, which is newer than target ${targetMinecraftVersion}. No compatible fallback was found.`,
    chain: nextChain,
  };
}
