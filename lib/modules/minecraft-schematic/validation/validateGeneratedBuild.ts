import { getBaseBlockId, getBlockEntityNbtId, isBarrelBlockId, isChestBlockId, isSignBlockId } from "../block-entities/blockEntitySupport";
import { getBlockRegistryProfile } from "../block-registry/blockRegistry";
import type { GeneratedSchematicBuild, SchematicBlockEntity, SchematicValidationResult } from "../types";

const REQUIRED_FEATURES_BY_GENERATOR: Record<string, string[]> = {
  house: ["foundation", "walls", "roof", "door", "windows", "chimney", "interior_zones"],
  bridge: ["supports", "railings", "road_deck", "lamps"],
  gatehouse: ["two_towers", "central_gate", "wall_segments", "battlements", "portcullis_bars", "walkway"],
  factory: ["large_hall", "chimney", "loading_door", "big_windows", "industrial_roof", "catwalks", "pipes"],
  train_station: ["platform", "rails", "canopy"],
};

function inBounds(build: GeneratedSchematicBuild, x: number, y: number, z: number): boolean {
  return x >= 0 && y >= 0 && z >= 0 && x < build.size.x && y < build.size.y && z < build.size.z;
}

function getNamespace(blockState: string): string {
  const baseBlockId = getBaseBlockId(blockState);
  return baseBlockId.includes(":") ? baseBlockId.split(":")[0] : "";
}

function isValidBlockStateText(blockState: string): boolean {
  return /^[a-z0-9_.-]+:[a-z0-9_./-]+(\[[a-z0-9_,=.:-]+\])?$/.test(blockState);
}

type NamespacedBlockId = `${string}:${string}`;

function isNamespacedBlockId(value: string): value is NamespacedBlockId {
  return /^[a-z0-9_.-]+:[a-z0-9_./-]+$/.test(value);
}

function isAllowedByBlockRegistry(blockState: string, build: GeneratedSchematicBuild): boolean {
  const profile = getBlockRegistryProfile(build.profile);
  const allowModdedBlocks = build.allowModdedBlocks ?? profile.allowModdedBlocksDefault;
  const baseBlockIdRaw = getBaseBlockId(blockState);
  const namespace = getNamespace(blockState);

  if (namespace === "minecraft") {
    return true;
  }

  if (!allowModdedBlocks) {
    return false;
  }

  if (!isNamespacedBlockId(baseBlockIdRaw)) {
    return false;
  }

  return profile.allowedNamespaces.includes(namespace) && profile.supportedModdedBlocks.includes(baseBlockIdRaw);
}

function validateBlockEntities(
  build: GeneratedSchematicBuild,
  blockEntities: SchematicBlockEntity[],
  warnings: string[],
  errors: string[],
): void {
  for (const entity of blockEntities) {
    const key = `${entity.x},${entity.y},${entity.z}`;

    if (!inBounds(build, entity.x, entity.y, entity.z)) {
      errors.push(`Block entity ${entity.id} is out of bounds at ${key}.`);
      continue;
    }

    const placedBlock = build.blocks.find(
      (block) => block.x === entity.x && block.y === entity.y && block.z === entity.z,
    );

    if (!placedBlock) {
      warnings.push(`Block entity ${entity.id} at ${key} has no matching placed block and will remain metadata-only.`);
      continue;
    }

    const placedBaseRaw = getBaseBlockId(placedBlock.block);
    const entityBase = getBaseBlockId(entity.id);
    const nbtId = entity.nbtId ?? getBlockEntityNbtId(entity, placedBlock.block);
    const placedBase = isNamespacedBlockId(placedBaseRaw) ? placedBaseRaw : null;

    if (entity.kind === "chest" && (!placedBase || !isChestBlockId(placedBase))) {
      warnings.push(`Chest block entity at ${key} is attached to ${placedBlock.block} and will remain metadata-only.`);
    }

    if (entity.kind === "barrel" && (!placedBase || !isBarrelBlockId(placedBase))) {
      warnings.push(`Barrel block entity at ${key} is attached to ${placedBlock.block} and will remain metadata-only.`);
    }

    if (entity.kind === "sign") {
      if (!placedBase || !isSignBlockId(placedBase)) {
        warnings.push(`Sign block entity at ${key} is attached to ${placedBlock.block} and will remain metadata-only.`);
      }

      const originalLines = entity.text ?? [];
      if (originalLines.length > 4) {
        warnings.push(`Sign block entity at ${key} has ${originalLines.length} text lines. Only the first 4 are exported to NBT.`);
      }

      if (originalLines.some((line) => line.length > 90)) {
        warnings.push(`Sign block entity at ${key} has long text lines. Lines are trimmed to 90 characters during NBT export.`);
      }
    }

    if (entity.kind === "placeholder") {
      warnings.push(`Placeholder block entity at ${key} is metadata-only by design.`);
    }

    if (entityBase.length === 0) {
      errors.push(`Block entity at ${key} is missing a valid id.`);
    }

    if (!nbtId && entity.kind !== "placeholder") {
      warnings.push(`Block entity ${entity.kind} at ${key} does not have a supported NBT id yet.`);
    }

    if (entity.nbtStatus === "metadata_only") {
      warnings.push(`Block entity ${entity.kind} at ${key} is metadata-only and was not written as NBT.`);
    }
  }

  if (build.blockEntityExport) {
    const summary = build.blockEntityExport;
    if (summary.total !== blockEntities.length) {
      warnings.push(`Block entity export summary total ${summary.total} does not match metadata count ${blockEntities.length}.`);
    }

    for (const warning of summary.warnings) {
      warnings.push(warning);
    }
  }
}

function validateRequiredFeatures(build: GeneratedSchematicBuild, warnings: string[]): void {
  const requiredFeatures = REQUIRED_FEATURES_BY_GENERATOR[build.generatorName] ?? [];
  const features = new Set(build.features ?? []);

  for (const feature of requiredFeatures) {
    if (!features.has(feature)) {
      warnings.push(`Generator ${build.generatorName} did not report required feature: ${feature}.`);
    }
  }
}

export function validateGeneratedBuild(build: GeneratedSchematicBuild): SchematicValidationResult {
  const warnings: string[] = [];
  const errors: string[] = [];
  const seen = new Set<string>();
  const profile = getBlockRegistryProfile(build.profile);

  if (build.profile && build.profile !== profile.id) {
    warnings.push(`Unknown block registry profile ${build.profile}; using ${profile.id}.`);
  }

  if (build.size.x <= 0 || build.size.y <= 0 || build.size.z <= 0) {
    errors.push("Build size must be greater than zero on all axes.");
  }

  if (!build.palette.includes("minecraft:air")) {
    errors.push("Palette must include minecraft:air.");
  }

  if (build.blocks.length === 0) {
    errors.push("Build contains no placed blocks.");
  }

  if (build.blockCount !== build.blocks.length) {
    warnings.push(
      `Block count mismatch. Metadata count is ${build.blockCount}, actual block list count is ${build.blocks.length}.`,
    );
  }

  for (const block of build.blocks) {
    const key = `${block.x},${block.y},${block.z}`;

    if (seen.has(key)) {
      errors.push(`Duplicate block coordinate found at ${key}.`);
    }

    seen.add(key);

    if (!inBounds(build, block.x, block.y, block.z)) {
      errors.push(`Block out of bounds at ${key}.`);
    }

    if (!isValidBlockStateText(block.block)) {
      errors.push(`Block ${block.block} at ${key} is not a valid namespaced block/state string.`);
    }

    if (!build.palette.includes(block.block)) {
      errors.push(`Block ${block.block} at ${key} is missing from palette.`);
    }

    if (!isAllowedByBlockRegistry(block.block, build)) {
      errors.push(`Block ${block.block} at ${key} is not allowed by profile ${profile.id}.`);
    }

    if (block.block === "minecraft:air") {
      warnings.push(`Explicit air block found at ${key}. Air should usually be implicit.`);
    }
  }

  for (const paletteBlock of build.palette) {
    if (!isValidBlockStateText(paletteBlock)) {
      errors.push(`Palette contains invalid block/state string: ${paletteBlock}.`);
    }

    if (!isAllowedByBlockRegistry(paletteBlock, build)) {
      errors.push(`Palette contains block ${paletteBlock}, which is not allowed by profile ${profile.id}.`);
    }
  }

  validateBlockEntities(build, build.blockEntities ?? [], warnings, errors);
  validateRequiredFeatures(build, warnings);

  if (build.blockRegistryReport) {
    if (build.blockRegistryReport.unsupportedBlocks.length > 0) {
      for (const unsupported of build.blockRegistryReport.unsupportedBlocks) {
        errors.push(`Unsupported block registry entry ${unsupported.block}: ${unsupported.reason}`);
      }
    }
  } else {
    warnings.push("No block registry report was recorded for this build.");
  }

  for (const warning of build.placementWarnings ?? []) {
    warnings.push(warning);
  }

  for (const warning of build.unsupportedBlockWarnings ?? []) {
    warnings.push(warning);
  }

  const totalVolume = build.size.x * build.size.y * build.size.z;

  if (build.blocks.length >= totalVolume) {
    warnings.push("Build appears fully solid. Check whether the intended hollow interior exists.");
  }

  return {
    ok: errors.length === 0,
    warnings,
    errors,
  };
}
