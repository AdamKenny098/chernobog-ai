import type { Dirent } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";

import type {
  VisualBlockSummary,
  VisualHighlightCandidate,
  VisualLayerSummary,
  VisualMaterialCostSummary,
  VisualSchematicDetail,
  VisualSchematicSize,
  VisualSchematicStatus,
  VisualSchematicSummary,
  VisualSchematicThumbnail,
  VisualValidationSummary,
  VisualVersionCompatibilitySummary,
  VisualVoxelBlock,
  VisualVoxelPayload,
} from "./types";
import { getSchematicBlockMaterial } from "./schematicBlockMaterials";
import {
  createViewerReliabilityMessages,
  createViewerReliabilityReport,
  isSafeVisualVoxel,
  isVisualAirBlock,
  normalizeVisualBlockId,
} from "./validateVisualSchematicPayload";
import { VISUAL_SCHEMATIC_VIEWER_LIMITS } from "./viewerLimits";

type JsonRecord = Record<string, unknown>;

type InternalVisualSchematicRecord = VisualSchematicSummary & {
  sourceFilePath: string;
  rawMetadata: JsonRecord;
};

const DEFAULT_LIBRARY_DIRS = [
  ["exports"],
  ["exports", "minecraft-schematic"],
  ["exports", "minecraft-schematic", "assets"],
  ["exports", "minecraft-schematic", "library"],
  ["exports", "minecraft-schematic", "schematics"],
  ["exports", "schematics"],
  ["data", "minecraft-schematic", "assets"],
  ["data", "minecraft-schematic", "library"],
  ["data", "minecraft-schematic", "schematics"],
  ["data", "schematics"],
  ["content", "minecraft-schematic", "assets"],
  ["generated", "minecraft-schematic"],
  ["public", "schematics"],
];

const IGNORED_DIR_NAMES = new Set([
  ".git",
  ".next",
  "node_modules",
  "dist",
  "build",
  "coverage",
]);


export async function readVisualSchematicSummaries(): Promise<
  VisualSchematicSummary[]
> {
  const internalRecords = await readInternalVisualSchematicRecords();

  return internalRecords.map(stripInternalFields);
}

export async function readVisualSchematicDetail(
  id: string,
): Promise<VisualSchematicDetail | null> {
  const internalRecords = await readInternalVisualSchematicRecords();
  const record = internalRecords.find((item) => item.id === id);

  if (!record) {
    return null;
  }

  const summary = stripInternalFields(record);
  const palette = normalizePalette(record.rawMetadata);
  const viewerPayload = createViewerPayload(record.rawMetadata, summary, palette);
  const validationMessages = [
    ...normalizeValidationMessages(record.rawMetadata),
    ...createViewerReliabilityMessages(viewerPayload.reliability),
  ];

  return {
    ...summary,
    palette,
    validationMessages,
    viewer: {
      kind: "voxel",
      message:
        viewerPayload.source === "raw-block-data"
          ? "Voxel preview is using block data discovered in the managed schematic asset."
          : "Voxel preview is using a metadata scaffold. Real block extraction and layer tooling can build on this material-aware payload.",
      supportsVoxelPayload: true,
      payload: viewerPayload,
    },
    layerSummary: createLayerSummary(viewerPayload, palette),
    materialCostSummary: createMaterialCostSummary(palette, viewerPayload),
    versionCompatibility: createVersionCompatibilitySummary(summary),
    highlightCandidates: createHighlightCandidates(palette, viewerPayload),
  };
}

export function matchesVisualSchematicQuery(
  schematic: VisualSchematicSummary,
  query: string,
): boolean {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return true;
  }

  const haystack = [
    schematic.id,
    schematic.name,
    schematic.category,
    schematic.theme,
    schematic.targetMinecraftVersion,
    schematic.status,
    ...schematic.tags,
    ...schematic.requiredMods,
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(normalizedQuery);
}

async function readInternalVisualSchematicRecords(): Promise<
  InternalVisualSchematicRecord[]
> {
  const libraryDirs = await getExistingLibraryDirs();

  if (libraryDirs.length === 0) {
    return [];
  }

  const jsonFilesNested = await Promise.all(
    libraryDirs.map((libraryDir) => walkJsonFiles(libraryDir)),
  );

  const jsonFiles = jsonFilesNested.flat();
  const records: InternalVisualSchematicRecord[] = [];

  for (const jsonFile of jsonFiles) {
    const parsed = await safeReadJsonRecord(jsonFile);

    if (!parsed || !looksLikeSchematicMetadata(parsed)) {
      continue;
    }

    const normalized = normalizeSchematicMetadata(parsed, jsonFile);
    records.push(normalized);
  }

  const deduped = new Map<string, InternalVisualSchematicRecord>();

  for (const record of records) {
    deduped.set(record.id, record);
  }

  return Array.from(deduped.values()).sort((a, b) => {
    const aTime = a.createdAt ? Date.parse(a.createdAt) : 0;
    const bTime = b.createdAt ? Date.parse(b.createdAt) : 0;

    return bTime - aTime || a.name.localeCompare(b.name);
  });
}

async function getExistingLibraryDirs(): Promise<string[]> {
  const envOverride = process.env.CHERNOBOG_SCHEMATIC_LIBRARY_DIR?.trim();

  const candidates = [
    ...(envOverride ? [resolveLibraryDir(envOverride)] : []),
    ...DEFAULT_LIBRARY_DIRS.map((segments) =>
      path.join(process.cwd(), ...segments),
    ),
  ];

  const existing: string[] = [];

  for (const candidate of candidates) {
    if (await isDirectory(candidate)) {
      existing.push(candidate);
    }
  }

  return existing;
}

function resolveLibraryDir(input: string): string {
  if (path.isAbsolute(input)) {
    return input;
  }

  return path.join(process.cwd(), input);
}

async function isDirectory(targetPath: string): Promise<boolean> {
  try {
    const stat = await fs.stat(targetPath);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

async function walkJsonFiles(
  rootDir: string,
  depth = 0,
  maxDepth = 6,
): Promise<string[]> {
  if (depth > maxDepth) {
    return [];
  }

  let entries: Dirent[];

  try {
    entries = await fs.readdir(rootDir, { withFileTypes: true });
  } catch {
    return [];
  }

  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(rootDir, entry.name);

    if (entry.isDirectory()) {
      if (!IGNORED_DIR_NAMES.has(entry.name)) {
        files.push(...(await walkJsonFiles(fullPath, depth + 1, maxDepth)));
      }

      continue;
    }

    if (entry.isFile() && entry.name.toLowerCase().endsWith(".json")) {
      files.push(fullPath);
    }
  }

  return files;
}

async function safeReadJsonRecord(filePath: string): Promise<JsonRecord | null> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const parsed: unknown = JSON.parse(raw);

    return asRecord(parsed);
  } catch {
    return null;
  }
}

function looksLikeSchematicMetadata(record: JsonRecord): boolean {
  const assetRecord = asRecord(record.asset) ?? record;
  const metadataRecord =
    asRecord(record.metadata) ?? asRecord(assetRecord.metadata) ?? assetRecord;

  const hasIdentity = Boolean(
    readString([metadataRecord, assetRecord, record], [
      "id",
      "assetId",
      "schematicId",
      "slug",
      "name",
      "displayName",
      "title",
    ]),
  );

  const hasSchematicFields = Boolean(
    readString([metadataRecord, assetRecord, record], [
      "category",
      "theme",
      "targetMinecraftVersion",
      "minecraftVersion",
      "targetVersion",
    ]) ||
      readNumber([metadataRecord, assetRecord, record], ["blockCount"]) !==
        undefined ||
      asRecord(metadataRecord.size) ||
      asRecord(metadataRecord.dimensions) ||
      Array.isArray(metadataRecord.tags) ||
      Array.isArray(metadataRecord.requiredMods),
  );

  return hasIdentity && hasSchematicFields;
}

function normalizeSchematicMetadata(
  record: JsonRecord,
  sourceFilePath: string,
): InternalVisualSchematicRecord {
  const assetRecord = asRecord(record.asset) ?? record;
  const metadataRecord =
    asRecord(record.metadata) ?? asRecord(assetRecord.metadata) ?? assetRecord;

  const statsRecord: JsonRecord =
    asRecord(record.stats) ??
    asRecord(assetRecord.stats) ??
    asRecord(metadataRecord.stats) ??
    {};

  const fallbackId = createFallbackId(sourceFilePath);

  const id =
    readString([metadataRecord, assetRecord, record], [
      "id",
      "assetId",
      "schematicId",
      "slug",
    ]) ?? fallbackId;

  const name =
    readString([metadataRecord, assetRecord, record], [
      "name",
      "displayName",
      "title",
    ]) ?? id;

  const size = normalizeSize(metadataRecord, assetRecord, record);

  const blockCount =
    readNumber([statsRecord, metadataRecord, assetRecord, record], [
      "blockCount",
      "totalBlocks",
      "blocks",
    ]) ?? 0;

  const createdAt =
    readString([metadataRecord, assetRecord, record], [
      "createdAt",
      "created",
      "createdDate",
      "dateCreated",
      "updatedAt",
    ]) ?? null;

  const status = determineStatus(size, blockCount);
  const statusMessage = createStatusMessage(status);

  return {
    id,
    name,
    category:
      readString([metadataRecord, assetRecord, record], ["category", "type"]) ??
      "uncategorized",
    theme:
      readString([metadataRecord, assetRecord, record], ["theme", "style"]) ??
      "unassigned",
    targetMinecraftVersion:
      readString([metadataRecord, assetRecord, record], [
        "targetMinecraftVersion",
        "minecraftVersion",
        "targetVersion",
        "version",
      ]) ?? "unknown",
    size,
    blockCount,
    tags: readStringArray([metadataRecord, assetRecord, record], ["tags"]),
    requiredMods: readStringArray([metadataRecord, assetRecord, record], [
      "requiredMods",
      "mods",
      "modDependencies",
    ]),
    createdAt,
    status,
    statusMessage,
    thumbnail: normalizeThumbnail(metadataRecord, assetRecord, record, name),
    validationSummary: normalizeValidationSummary(record),
    sourceFilePath,
    rawMetadata: record,
  };
}

function stripInternalFields(
  record: InternalVisualSchematicRecord,
): VisualSchematicSummary {
  const { sourceFilePath, rawMetadata, ...summary } = record;

  void sourceFilePath;
  void rawMetadata;

  return summary;
}

function normalizeSize(
  metadataRecord: JsonRecord,
  assetRecord: JsonRecord,
  rootRecord: JsonRecord,
): VisualSchematicSize {
  const candidates = [
    metadataRecord.size,
    metadataRecord.dimensions,
    metadataRecord.bounds,
    assetRecord.size,
    assetRecord.dimensions,
    rootRecord.size,
    rootRecord.dimensions,
  ];

  for (const candidate of candidates) {
    const normalized = parseSize(candidate);

    if (normalized) {
      return normalized;
    }
  }

  return { x: 0, y: 0, z: 0 };
}

function parseSize(value: unknown): VisualSchematicSize | null {
  if (Array.isArray(value) && value.length >= 3) {
    const [x, y, z] = value.map(toNumber);

    if (x !== undefined && y !== undefined && z !== undefined) {
      return { x, y, z };
    }
  }

  const record = asRecord(value);

  if (!record) {
    return null;
  }

  const x =
    toNumber(record.x) ??
    toNumber(record.width) ??
    toNumber(record.w) ??
    toNumber(record.length);

  const y =
    toNumber(record.y) ?? toNumber(record.height) ?? toNumber(record.h);

  const z =
    toNumber(record.z) ??
    toNumber(record.depth) ??
    toNumber(record.d) ??
    toNumber(record.length);

  if (x === undefined || y === undefined || z === undefined) {
    return null;
  }

  return { x, y, z };
}

function determineStatus(
  size: VisualSchematicSize,
  blockCount: number,
): VisualSchematicStatus {
  if (size.x <= 0 || size.y <= 0 || size.z <= 0) {
    return "missing-data";
  }

  if (blockCount <= 0) {
    return "missing-data";
  }

  return "ok";
}

function createStatusMessage(status: VisualSchematicStatus): string {
  switch (status) {
    case "ok":
      return "Metadata loaded.";
    case "missing-data":
      return "Metadata was found, but size or block count data is missing.";
    case "corrupt-metadata":
      return "Metadata exists but could not be parsed correctly.";
    case "missing-library":
      return "No schematic library directory was found.";
    default:
      return "Unknown schematic status.";
  }
}

function normalizePalette(record: JsonRecord): VisualBlockSummary[] {
  const assetRecord = asRecord(record.asset) ?? record;
  const metadataRecord =
    asRecord(record.metadata) ?? asRecord(assetRecord.metadata) ?? assetRecord;

  const statsRecord: JsonRecord =
    asRecord(record.stats) ??
    asRecord(assetRecord.stats) ??
    asRecord(metadataRecord.stats) ??
    {};

  const candidates = [
    metadataRecord.palette,
    metadataRecord.blockPalette,
    metadataRecord.blockCounts,
    statsRecord.palette,
    statsRecord.blockPalette,
    statsRecord.blockCounts,
    record.palette,
  ];

  for (const candidate of candidates) {
    const palette = parsePalette(candidate);

    if (palette.length > 0) {
      return palette;
    }
  }

  return [];
}

function parsePalette(value: unknown): VisualBlockSummary[] {
  if (Array.isArray(value)) {
    return value
      .map((entry) => {
        const record = asRecord(entry);

        if (!record) {
          return null;
        }

        const blockId = normalizeVisualBlockId(
          readString([record], ["blockId", "id", "name", "type"]) ?? "unknown",
        );

        const count = readNumber([record], ["count", "total"]) ?? 0;

        const material = getSchematicBlockMaterial(blockId);

        return {
          blockId,
          count,
          color: material.color,
          material,
        };
      })
      .filter((entry): entry is VisualBlockSummary => Boolean(entry));
  }

  const record = asRecord(value);

  if (!record) {
    return [];
  }

  return Object.entries(record).map(([rawBlockId, rawValue]) => {
    const nested = asRecord(rawValue);
    const blockId = normalizeVisualBlockId(rawBlockId);

    const count =
      toNumber(rawValue) ??
      (nested ? readNumber([nested], ["count", "total"]) : undefined) ??
      0;

    const material = getSchematicBlockMaterial(blockId);

    return {
      blockId,
      count,
      color: material.color,
      material,
    };
  });
}


function normalizeThumbnail(
  metadataRecord: JsonRecord,
  assetRecord: JsonRecord,
  rootRecord: JsonRecord,
  name: string,
): VisualSchematicThumbnail {
  const src = readString([metadataRecord, assetRecord, rootRecord], [
    "thumbnail",
    "thumbnailPath",
    "thumbnailUrl",
    "previewImage",
    "previewImagePath",
  ]);

  if (src) {
    return {
      kind: "image",
      src,
      alt: `${name} schematic thumbnail`,
    };
  }

  return {
    kind: "generated-placeholder",
    src: null,
    alt: `${name} generated schematic preview placeholder`,
  };
}

function normalizeValidationSummary(record: JsonRecord): VisualValidationSummary {
  const messages = normalizeValidationMessages(record);
  const lowerMessages = messages.map((message) => message.toLowerCase());
  const warningCount = lowerMessages.filter(
    (message) =>
      message.includes("warning") ||
      message.includes("warn") ||
      message.includes("missing") ||
      message.includes("unknown"),
  ).length;
  const errorCount = lowerMessages.filter(
    (message) =>
      message.includes("error") ||
      message.includes("failed") ||
      message.includes("invalid") ||
      message.includes("corrupt"),
  ).length;

  const validationRecord: JsonRecord = asRecord(record.validation) ?? {};
  const explicitLevel = readString(
    [validationRecord, record],
    ["level", "status", "validationStatus"],
  )?.toLowerCase();

  if (explicitLevel === "failed" || explicitLevel === "error") {
    return {
      level: "failed",
      messageCount: messages.length,
      warningCount,
      errorCount: Math.max(1, errorCount),
    };
  }

  if (explicitLevel === "warning" || explicitLevel === "warn") {
    return {
      level: "warning",
      messageCount: messages.length,
      warningCount: Math.max(1, warningCount),
      errorCount,
    };
  }

  if (explicitLevel === "passed" || explicitLevel === "ok" || explicitLevel === "valid") {
    return {
      level: "passed",
      messageCount: messages.length,
      warningCount,
      errorCount,
    };
  }

  if (errorCount > 0) {
    return {
      level: "failed",
      messageCount: messages.length,
      warningCount,
      errorCount,
    };
  }

  if (warningCount > 0) {
    return {
      level: "warning",
      messageCount: messages.length,
      warningCount,
      errorCount,
    };
  }

  if (messages.length > 0 && !messages[0].includes("reserved for a later")) {
    return {
      level: "passed",
      messageCount: messages.length,
      warningCount,
      errorCount,
    };
  }

  return {
    level: "unknown",
    messageCount: 0,
    warningCount: 0,
    errorCount: 0,
  };
}

function normalizeValidationMessages(record: JsonRecord): string[] {
  const candidates = [
    record.validationMessages,
    record.validation,
    record.statusMessages,
    record.warnings,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate
        .map((item) => (typeof item === "string" ? item : null))
        .filter((item): item is string => Boolean(item));
    }

    const nested = asRecord(candidate);
    const messages = nested ? nested.messages : undefined;

    if (Array.isArray(messages)) {
      return messages
        .map((item) => (typeof item === "string" ? item : null))
        .filter((item): item is string => Boolean(item));
    }
  }

  return ["Validation overlays are reserved for a later Milestone 8 pass."];
}

function createViewerPayload(
  record: JsonRecord,
  schematic: VisualSchematicSummary,
  palette: VisualBlockSummary[],
): VisualVoxelPayload {
  const rawVoxels = extractRawVoxelBlocks(record, palette);

  if (rawVoxels.length > 0) {
    const cappedVoxels = rawVoxels.slice(
      0,
      VISUAL_SCHEMATIC_VIEWER_LIMITS.maxRenderedVoxels,
    );

    return attachViewerReliability({
      size: schematic.size,
      voxels: cappedVoxels,
      capped: rawVoxels.length > cappedVoxels.length,
      totalAvailableVoxels: rawVoxels.length,
      source: "raw-block-data",
    });
  }

  const scaffoldVoxels = createMetadataScaffoldVoxels(schematic, palette);

  return attachViewerReliability({
    size: schematic.size,
    voxels: scaffoldVoxels,
    capped: false,
    totalAvailableVoxels: scaffoldVoxels.length,
    source: "metadata-scaffold",
  });
}

function attachViewerReliability(
  payload: Omit<VisualVoxelPayload, "reliability">,
): VisualVoxelPayload {
  return {
    ...payload,
    reliability: createViewerReliabilityReport(payload),
  };
}

function extractRawVoxelBlocks(
  record: JsonRecord,
  palette: VisualBlockSummary[],
): VisualVoxelBlock[] {
  const assetRecord = asRecord(record.asset) ?? record;
  const schematicRecord =
    asRecord(record.schematic) ?? asRecord(assetRecord.schematic) ?? {};
  const dataRecord = asRecord(record.data) ?? asRecord(assetRecord.data) ?? {};
  const viewerRecord =
    asRecord(record.viewer) ?? asRecord(assetRecord.viewer) ?? {};
  const payloadRecord = asRecord(viewerRecord.payload) ?? {};

  const candidates = [
    payloadRecord.voxels,
    payloadRecord.blocks,
    viewerRecord.voxels,
    viewerRecord.blocks,
    record.voxels,
    record.blocks,
    assetRecord.voxels,
    assetRecord.blocks,
    schematicRecord.voxels,
    schematicRecord.blocks,
    dataRecord.voxels,
    dataRecord.blocks,
  ];

  for (const candidate of candidates) {
    if (!Array.isArray(candidate)) {
      continue;
    }

    const parsed: VisualVoxelBlock[] = [];
    const hardLimit = VISUAL_SCHEMATIC_VIEWER_LIMITS.maxRawVoxelsToParse;

    for (const entry of candidate) {
      if (parsed.length >= hardLimit) {
        break;
      }

      const voxel = parseVoxelBlock(entry, palette);

      if (voxel && isSafeVisualVoxel(voxel)) {
        parsed.push(voxel);
      }
    }

    if (parsed.length > 0) {
      return dedupeVoxels(parsed);
    }
  }

  return [];
}

function parseVoxelBlock(
  value: unknown,
  palette: VisualBlockSummary[],
): VisualVoxelBlock | null {
  const record = asRecord(value);

  if (!record) {
    return null;
  }

  const x = toNumber(record.x) ?? toNumber(record["0"]);
  const y = toNumber(record.y) ?? toNumber(record["1"]);
  const z = toNumber(record.z) ?? toNumber(record["2"]);

  if (x === undefined || y === undefined || z === undefined) {
    return null;
  }

  const rawBlockId = readString([record], [
    "blockId",
    "id",
    "name",
    "type",
    "state",
    "block",
  ]);

  const blockId = normalizeVisualBlockId(rawBlockId ?? "minecraft:stone");

  if (!blockId || isVisualAirBlock(blockId)) {
    return null;
  }

  const material = getPaletteAwareBlockMaterial(blockId, palette);

  return {
    x: Math.round(x),
    y: Math.round(y),
    z: Math.round(z),
    blockId,
    color: material.color,
    material,
  };
}

function createMetadataScaffoldVoxels(
  schematic: VisualSchematicSummary,
  palette: VisualBlockSummary[],
): VisualVoxelBlock[] {
  const size = clampSizeForScaffold(schematic.size);
  const blockIds = normalizeScaffoldBlockIds(palette);
  const voxels: VisualVoxelBlock[] = [];
  const floorStep = Math.max(1, Math.ceil((size.x * size.z) / 420));
  const heightStep = Math.max(1, Math.ceil(size.y / 12));

  for (let x = 0; x < size.x; x += floorStep) {
    for (let z = 0; z < size.z; z += floorStep) {
      pushVoxel(voxels, x, 0, z, blockIds[0], palette);
    }
  }

  for (let x = 0; x < size.x; x += floorStep) {
    pushVoxel(voxels, x, 1, 0, blockIds[1], palette);
    pushVoxel(voxels, x, 1, size.z - 1, blockIds[1], palette);
  }

  for (let z = 0; z < size.z; z += floorStep) {
    pushVoxel(voxels, 0, 1, z, blockIds[1], palette);
    pushVoxel(voxels, size.x - 1, 1, z, blockIds[1], palette);
  }

  const columnPoints = [
    [0, 0],
    [size.x - 1, 0],
    [0, size.z - 1],
    [size.x - 1, size.z - 1],
    [Math.floor(size.x / 2), Math.floor(size.z / 2)],
  ];

  for (const [x, z] of columnPoints) {
    for (let y = 0; y < size.y; y += heightStep) {
      pushVoxel(voxels, x, y, z, blockIds[2], palette);
    }
  }

  const accentHeight = Math.max(2, Math.floor(size.y * 0.45));
  const accentStep = Math.max(2, Math.floor(Math.min(size.x, size.z) / 5));

  for (let x = accentStep; x < size.x - 1; x += accentStep) {
    const z = Math.max(1, Math.min(size.z - 2, Math.floor((x * 1.7) % size.z)));

    for (let y = 1; y < accentHeight; y += heightStep) {
      pushVoxel(voxels, x, y, z, blockIds[3], palette);
    }
  }

  return dedupeVoxels(voxels).slice(
    0,
    VISUAL_SCHEMATIC_VIEWER_LIMITS.maxScaffoldVoxels,
  );
}

function clampSizeForScaffold(size: VisualSchematicSize): VisualSchematicSize {
  return {
    x: clampPositiveInteger(size.x, 12, 48),
    y: clampPositiveInteger(size.y, 6, 32),
    z: clampPositiveInteger(size.z, 12, 48),
  };
}

function clampPositiveInteger(
  value: number,
  fallback: number,
  max: number,
): number {
  if (!Number.isFinite(value) || value <= 0) {
    return fallback;
  }

  return Math.max(1, Math.min(max, Math.round(value)));
}

function normalizeScaffoldBlockIds(palette: VisualBlockSummary[]): string[] {
  const paletteIds = palette
    .filter((entry) => !isVisualAirBlock(entry.blockId))
    .sort((a, b) => b.count - a.count)
    .map((entry) => normalizeVisualBlockId(entry.blockId))
    .filter(Boolean);

  const fallbackIds = [
    "minecraft:stone_bricks",
    "minecraft:oak_planks",
    "minecraft:cobblestone",
    "minecraft:glass",
  ];

  return [...paletteIds, ...fallbackIds].slice(0, 4);
}

function pushVoxel(
  voxels: VisualVoxelBlock[],
  x: number,
  y: number,
  z: number,
  blockId: string,
  palette: VisualBlockSummary[],
): void {
  const normalizedBlockId = normalizeVisualBlockId(blockId);

  if (!normalizedBlockId || isVisualAirBlock(normalizedBlockId)) {
    return;
  }

  const material = getPaletteAwareBlockMaterial(normalizedBlockId, palette);

  voxels.push({
    x,
    y,
    z,
    blockId: normalizedBlockId,
    color: material.color,
    material,
  });
}

function dedupeVoxels(voxels: VisualVoxelBlock[]): VisualVoxelBlock[] {
  const deduped = new Map<string, VisualVoxelBlock>();

  for (const voxel of voxels) {
    deduped.set(`${voxel.x}:${voxel.y}:${voxel.z}`, voxel);
  }

  return Array.from(deduped.values());
}

function getPaletteAwareBlockMaterial(
  blockId: string,
  palette: VisualBlockSummary[],
) {
  const normalizedBlockId = normalizeVisualBlockId(blockId);
  const match = palette.find(
    (entry) => normalizeVisualBlockId(entry.blockId) === normalizedBlockId,
  );

  return match?.material ?? getSchematicBlockMaterial(normalizedBlockId || blockId);
}


function createLayerSummary(
  payload: VisualVoxelPayload,
  palette: VisualBlockSummary[],
): VisualLayerSummary[] {
  const byLayer = new Map<number, Map<string, number>>();

  for (const voxel of payload.voxels) {
    const y = Math.round(voxel.y);
    const blockCounts = byLayer.get(y) ?? new Map<string, number>();

    blockCounts.set(voxel.blockId, (blockCounts.get(voxel.blockId) ?? 0) + 1);
    byLayer.set(y, blockCounts);
  }

  return Array.from(byLayer.entries())
    .map(([y, blockCounts]) => {
      const topBlocks = Array.from(blockCounts.entries())
        .map(([blockId, count]) => {
          const material = getPaletteAwareBlockMaterial(blockId, palette);

          return {
            blockId,
            count,
            color: material.color,
            displayName: material.displayName,
          };
        })
        .sort((a, b) => b.count - a.count || a.blockId.localeCompare(b.blockId))
        .slice(0, 5);

      return {
        y,
        blockCount: sumLayerBlocks(blockCounts),
        uniqueBlockCount: blockCounts.size,
        topBlocks,
      };
    })
    .sort((a, b) => a.y - b.y);
}

function createMaterialCostSummary(
  palette: VisualBlockSummary[],
  payload: VisualVoxelPayload,
): VisualMaterialCostSummary {
  const paletteItems = palette.length > 0 ? palette : createPaletteFromPayload(payload);
  const items = paletteItems
    .filter((entry) => !isVisualAirBlock(entry.blockId))
    .sort((a, b) => b.count - a.count || a.blockId.localeCompare(b.blockId))
    .map((entry) => ({
      blockId: entry.blockId,
      displayName: entry.material.displayName,
      count: entry.count,
      stackCount: Math.ceil(entry.count / 64),
      shulkerBoxCount: Math.ceil(entry.count / 1728),
      color: entry.material.color,
      materialKind: entry.material.kind,
      texturePath: entry.material.texturePath,
    }));

  const totalBlocks = items.reduce((sum, item) => sum + item.count, 0);

  return {
    totalBlocks,
    uniqueBlocks: items.length,
    estimatedStacks: Math.ceil(totalBlocks / 64),
    estimatedShulkerBoxes: Math.ceil(totalBlocks / 1728),
    items,
  };
}

function createVersionCompatibilitySummary(
  schematic: VisualSchematicSummary,
): VisualVersionCompatibilitySummary {
  const targetVersion = schematic.targetMinecraftVersion.trim() || "unknown";
  const warnings: string[] = [];

  if (targetVersion === "unknown") {
    warnings.push("No target Minecraft version is recorded for this asset.");
  }

  if (schematic.requiredMods.length > 0) {
    warnings.push(
      "This schematic records required mods. Client/server compatibility should be checked before exporting or pasting it into a world.",
    );
  }

  if (/snapshot|pre|rc/i.test(targetVersion)) {
    warnings.push(
      "Snapshot/pre-release versions are flagged for manual compatibility review.",
    );
  }

  if (/1\.8|1\.9|1\.10|1\.11|1\.12/.test(targetVersion)) {
    warnings.push(
      "Older Minecraft targets may need legacy block ID handling before validation overlays are trusted.",
    );
  }

  if (targetVersion === "unknown") {
    return {
      level: "unknown",
      targetVersion,
      message: "Version compatibility checks are waiting for target-version metadata.",
      warnings,
      requiredMods: schematic.requiredMods,
    };
  }

  if (warnings.length > 0) {
    return {
      level: "warning",
      targetVersion,
      message: "Compatibility hooks are active, but this schematic needs review.",
      warnings,
      requiredMods: schematic.requiredMods,
    };
  }

  return {
    level: "compatible",
    targetVersion,
    message:
      "No compatibility warnings were detected by the current lightweight rules.",
    warnings,
    requiredMods: schematic.requiredMods,
  };
}

function createHighlightCandidates(
  palette: VisualBlockSummary[],
  payload: VisualVoxelPayload,
): VisualHighlightCandidate[] {
  const source = palette.length > 0 ? palette : createPaletteFromPayload(payload);

  return source
    .filter((entry) => !isVisualAirBlock(entry.blockId))
    .sort((a, b) => b.count - a.count || a.blockId.localeCompare(b.blockId))
    .slice(0, 36)
    .map((entry) => ({
      blockId: entry.blockId,
      count: entry.count,
      color: entry.material.color,
      displayName: entry.material.displayName,
    }));
}

function createPaletteFromPayload(payload: VisualVoxelPayload): VisualBlockSummary[] {
  const counts = new Map<string, number>();

  for (const voxel of payload.voxels) {
    counts.set(voxel.blockId, (counts.get(voxel.blockId) ?? 0) + 1);
  }

  return Array.from(counts.entries()).map(([blockId, count]) => {
    const material = getSchematicBlockMaterial(blockId);

    return {
      blockId,
      count,
      color: material.color,
      material,
    };
  });
}

function sumLayerBlocks(blockCounts: Map<string, number>): number {
  return Array.from(blockCounts.values()).reduce((sum, count) => sum + count, 0);
}

function createFallbackId(filePath: string): string {
  const parentName = path.basename(path.dirname(filePath));
  const fileName = path.basename(filePath, ".json");

  return `${parentName}-${fileName}`
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function readString(
  sources: JsonRecord[],
  keys: string[],
): string | undefined {
  for (const source of sources) {
    for (const key of keys) {
      const value = source[key];

      if (typeof value === "string" && value.trim()) {
        return value.trim();
      }

      if (typeof value === "number" && Number.isFinite(value)) {
        return String(value);
      }
    }
  }

  return undefined;
}

function readNumber(
  sources: JsonRecord[],
  keys: string[],
): number | undefined {
  for (const source of sources) {
    for (const key of keys) {
      const value = toNumber(source[key]);

      if (value !== undefined) {
        return value;
      }
    }
  }

  return undefined;
}

function readStringArray(sources: JsonRecord[], keys: string[]): string[] {
  for (const source of sources) {
    for (const key of keys) {
      const value = source[key];

      if (Array.isArray(value)) {
        return value
          .map((item) => (typeof item === "string" ? item.trim() : null))
          .filter((item): item is string => Boolean(item));
      }
    }
  }

  return [];
}

function toNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return undefined;
}

function asRecord(value: unknown): JsonRecord | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }

  return value as JsonRecord;
}

