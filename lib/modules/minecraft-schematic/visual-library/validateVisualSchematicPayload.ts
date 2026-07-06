import type {
  VisualSchematicSize,
  VisualViewerReliabilityReport,
  VisualVoxelBlock,
  VisualVoxelPayload,
} from "./types";
import {
  isWithinViewerCoordinateLimit,
  VISUAL_SCHEMATIC_VIEWER_LIMITS,
} from "./viewerLimits";

export function createViewerReliabilityReport(
  payload: Omit<VisualVoxelPayload, "reliability">,
): VisualViewerReliabilityReport {
  const warnings: string[] = [];
  const errors: string[] = [];
  const messages: string[] = [];

  if (!isRenderableSize(payload.size)) {
    errors.push(
      "The schematic has invalid or missing dimensions, so the viewer cannot safely frame it.",
    );
  }

  if (payload.size.x > VISUAL_SCHEMATIC_VIEWER_LIMITS.maxDimension) {
    warnings.push(
      `The schematic width exceeds the current safe preview dimension of ${VISUAL_SCHEMATIC_VIEWER_LIMITS.maxDimension}.`,
    );
  }

  if (payload.size.y > VISUAL_SCHEMATIC_VIEWER_LIMITS.maxDimension) {
    warnings.push(
      `The schematic height exceeds the current safe preview dimension of ${VISUAL_SCHEMATIC_VIEWER_LIMITS.maxDimension}.`,
    );
  }

  if (payload.size.z > VISUAL_SCHEMATIC_VIEWER_LIMITS.maxDimension) {
    warnings.push(
      `The schematic depth exceeds the current safe preview dimension of ${VISUAL_SCHEMATIC_VIEWER_LIMITS.maxDimension}.`,
    );
  }

  if (payload.totalAvailableVoxels >= VISUAL_SCHEMATIC_VIEWER_LIMITS.maxRawVoxelsToParse) {
    warnings.push(
      `The source contains more than ${VISUAL_SCHEMATIC_VIEWER_LIMITS.maxRawVoxelsToParse.toLocaleString()} voxels. The preview is intentionally capped to protect browser performance.`,
    );
  }

  if (payload.voxels.length > VISUAL_SCHEMATIC_VIEWER_LIMITS.maxRenderedVoxels) {
    warnings.push(
      `The render payload contains more than ${VISUAL_SCHEMATIC_VIEWER_LIMITS.maxRenderedVoxels.toLocaleString()} voxels. The client viewer will only render the safe subset.`,
    );
  }

  if (payload.capped) {
    warnings.push("This is a capped preview, not a full render of every block.");
  }

  if (payload.voxels.length === 0) {
    warnings.push("No renderable non-air voxels were found for this schematic preview.");
  }

  const unsafeVoxelCount = payload.voxels.filter((voxel) => !isSafeVisualVoxel(voxel)).length;

  if (unsafeVoxelCount > 0) {
    errors.push(
      `${unsafeVoxelCount.toLocaleString()} voxel(s) contain invalid coordinates or block identifiers.`,
    );
  }

  if (errors.length === 0 && warnings.length === 0) {
    messages.push("Viewer payload passed the current reliability checks.");
  }

  const blocked = errors.length > 0;
  const level = blocked ? "blocked" : warnings.length > 0 ? "warning" : "ok";

  return {
    level,
    blocked,
    messages,
    warnings,
    errors,
    renderedVoxelLimit: VISUAL_SCHEMATIC_VIEWER_LIMITS.maxRenderedVoxels,
    rawVoxelParseLimit: VISUAL_SCHEMATIC_VIEWER_LIMITS.maxRawVoxelsToParse,
    coordinateLimit: VISUAL_SCHEMATIC_VIEWER_LIMITS.maxCoordinateMagnitude,
  };
}

export function validateVisualVoxelPayload(
  payload: VisualVoxelPayload | null,
): VisualViewerReliabilityReport {
  if (!payload) {
    return {
      level: "blocked",
      blocked: true,
      messages: [],
      warnings: [],
      errors: ["No viewer payload was provided."],
      renderedVoxelLimit: VISUAL_SCHEMATIC_VIEWER_LIMITS.maxRenderedVoxels,
      rawVoxelParseLimit: VISUAL_SCHEMATIC_VIEWER_LIMITS.maxRawVoxelsToParse,
      coordinateLimit: VISUAL_SCHEMATIC_VIEWER_LIMITS.maxCoordinateMagnitude,
    };
  }

  return createViewerReliabilityReport(payload);
}

export function createViewerReliabilityMessages(
  report: VisualViewerReliabilityReport,
): string[] {
  return [...report.messages, ...report.warnings, ...report.errors];
}

export function normalizeVisualBlockId(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }

  const trimmed = value.trim().toLowerCase();

  if (!trimmed) {
    return "";
  }

  const normalized = trimmed
    .replace(/^block\./, "")
    .replace(/^minecraft\./, "minecraft:")
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9:_/.-]/g, "_");

  if (normalized.includes(":")) {
    return normalized;
  }

  return `minecraft:${normalized}`;
}

export function isVisualAirBlock(blockId: string): boolean {
  const normalized = normalizeVisualBlockId(blockId);

  return (
    normalized === "minecraft:air" ||
    normalized === "minecraft:cave_air" ||
    normalized === "minecraft:void_air" ||
    normalized.endsWith(":air") ||
    normalized.includes("air[")
  );
}

export function isSafeVisualVoxel(voxel: VisualVoxelBlock): boolean {
  return (
    isWithinViewerCoordinateLimit(voxel.x) &&
    isWithinViewerCoordinateLimit(voxel.y) &&
    isWithinViewerCoordinateLimit(voxel.z) &&
    Boolean(normalizeVisualBlockId(voxel.blockId)) &&
    !isVisualAirBlock(voxel.blockId)
  );
}

export function isRenderableSize(size: VisualSchematicSize): boolean {
  return (
    Number.isFinite(size.x) &&
    Number.isFinite(size.y) &&
    Number.isFinite(size.z) &&
    size.x > 0 &&
    size.y > 0 &&
    size.z > 0
  );
}

export function getLayerReliabilityMessage(
  layer: number | null,
  size: VisualSchematicSize,
): string | null {
  if (layer === null) {
    return null;
  }

  if (!Number.isInteger(layer) || layer < 0) {
    return "Layer selection is invalid. Use a non-negative whole number.";
  }

  if (layer > VISUAL_SCHEMATIC_VIEWER_LIMITS.maxLayerIndex) {
    return `Layer selection exceeds the hard safety limit of ${VISUAL_SCHEMATIC_VIEWER_LIMITS.maxLayerIndex}.`;
  }

  if (size.y > 0 && layer >= size.y) {
    return `Layer ${layer} is outside this schematic height. Valid layers are 0 to ${Math.max(0, size.y - 1)}.`;
  }

  return null;
}
