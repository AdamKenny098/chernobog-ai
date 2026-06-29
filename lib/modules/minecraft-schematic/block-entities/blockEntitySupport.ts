import type {
  GeneratedSchematicBuild,
  MinecraftBlockName,
  SchematicBlock,
  SchematicBlockEntity,
  SchematicBlockEntityExportSummary,
} from "../types";

const SIGN_LINE_LIMIT = 4;
const SIGN_LINE_CHAR_LIMIT = 90;

export function getBaseBlockId(blockState: string): string {
  const bracketIndex = blockState.indexOf("[");
  return bracketIndex === -1 ? blockState : blockState.slice(0, bracketIndex);
}

export function getPlacedBlockAt(
  build: Pick<GeneratedSchematicBuild, "blocks">,
  entity: Pick<SchematicBlockEntity, "x" | "y" | "z">,
): SchematicBlock | undefined {
  return build.blocks.find((block) => block.x === entity.x && block.y === entity.y && block.z === entity.z);
}

export function isSignBlockId(blockId: string): boolean {
  const base = getBaseBlockId(blockId);
  return base.endsWith("_sign") || base.endsWith("_wall_sign") || base.endsWith("_hanging_sign") || base.endsWith("_wall_hanging_sign");
}

export function isChestBlockId(blockId: string): boolean {
  return getBaseBlockId(blockId) === "minecraft:chest";
}

export function isBarrelBlockId(blockId: string): boolean {
  return getBaseBlockId(blockId) === "minecraft:barrel";
}

export function getBlockEntityNbtId(entity: SchematicBlockEntity, placedBlockState?: string): MinecraftBlockName | null {
  const placedBase = placedBlockState ? getBaseBlockId(placedBlockState) : undefined;

  if (entity.kind === "chest") {
    return "minecraft:chest";
  }

  if (entity.kind === "barrel") {
    return "minecraft:barrel";
  }

  if (entity.kind === "sign") {
    const sourceId = placedBase ?? getBaseBlockId(entity.id);
    return sourceId.includes("hanging_sign") ? "minecraft:hanging_sign" : "minecraft:sign";
  }

  return null;
}

export function normalizeSignTextLines(text: string[] | undefined, fallbackLabel?: string): [string, string, string, string] {
  const source = text?.length ? text : fallbackLabel ? [fallbackLabel] : [];
  const lines = source.slice(0, SIGN_LINE_LIMIT).map((line) => line.slice(0, SIGN_LINE_CHAR_LIMIT));

  while (lines.length < SIGN_LINE_LIMIT) {
    lines.push("");
  }

  return lines as [string, string, string, string];
}

function isEntityWritable(entity: SchematicBlockEntity, placedBlockState?: string): boolean {
  if (!placedBlockState) {
    return false;
  }

  const placedBase = getBaseBlockId(placedBlockState);

  if (entity.kind === "chest") {
    return isChestBlockId(placedBase);
  }

  if (entity.kind === "barrel") {
    return isBarrelBlockId(placedBase);
  }

  if (entity.kind === "sign") {
    return isSignBlockId(placedBase);
  }

  return false;
}

function warningForNonWritableEntity(entity: SchematicBlockEntity, placedBlockState?: string): string {
  const label = entity.label ? ` (${entity.label})` : "";
  const location = `${entity.x},${entity.y},${entity.z}`;

  if (!placedBlockState) {
    return `Block entity ${entity.kind}${label} at ${location} is metadata-only because no placed block exists at that coordinate.`;
  }

  return `Block entity ${entity.kind}${label} at ${location} is metadata-only because the placed block is ${placedBlockState}.`;
}

export function normalizeBlockEntitiesForBuild(build: GeneratedSchematicBuild): {
  build: GeneratedSchematicBuild;
  summary: SchematicBlockEntityExportSummary;
} {
  const rawEntities = build.blockEntities ?? [];
  const warnings: string[] = [];
  let signs = 0;
  let chests = 0;
  let barrels = 0;
  let placeholders = 0;
  let nbtWritten = 0;
  let metadataOnly = 0;

  const normalizedEntities = rawEntities.map((entity): SchematicBlockEntity => {
    const placedBlock = getPlacedBlockAt(build, entity);
    const nbtId = getBlockEntityNbtId(entity, placedBlock?.block) ?? undefined;
    const writable = isEntityWritable(entity, placedBlock?.block);
    const nbtWarnings = [...(entity.nbtWarnings ?? [])];

    if (entity.kind === "sign") signs += 1;
    if (entity.kind === "chest") chests += 1;
    if (entity.kind === "barrel") barrels += 1;
    if (entity.kind === "placeholder") placeholders += 1;

    if (writable && nbtId) {
      nbtWritten += 1;
      return {
        ...entity,
        nbtId,
        nbtStatus: "written",
        text: entity.kind === "sign" ? normalizeSignTextLines(entity.text, entity.label) : entity.text,
        nbtWarnings,
      };
    }

    metadataOnly += 1;
    const warning = warningForNonWritableEntity(entity, placedBlock?.block);
    warnings.push(warning);
    nbtWarnings.push(warning);

    return {
      ...entity,
      nbtId,
      nbtStatus: "metadata_only",
      text: entity.kind === "sign" ? normalizeSignTextLines(entity.text, entity.label) : entity.text,
      nbtWarnings,
    };
  });

  const summary: SchematicBlockEntityExportSummary = {
    total: rawEntities.length,
    signs,
    chests,
    barrels,
    placeholders,
    nbtWritten,
    metadataOnly,
    warnings,
  };

  return {
    build: {
      ...build,
      blockEntities: normalizedEntities,
      blockEntityExport: summary,
      placementWarnings: build.placementWarnings,
    },
    summary,
  };
}

export function getWritableBlockEntities(build: GeneratedSchematicBuild): SchematicBlockEntity[] {
  return (build.blockEntities ?? []).filter((entity) => entity.nbtStatus === "written" && Boolean(entity.nbtId));
}
