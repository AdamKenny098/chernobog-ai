export const VISUAL_SCHEMATIC_VIEWER_LIMITS = {
  maxRenderedVoxels: 10_000,
  maxRawVoxelsToParse: 25_000,
  maxThumbnailVoxels: 2_000,
  maxScaffoldVoxels: 1_600,
  maxCoordinateMagnitude: 4_096,
  maxDimension: 512,
  maxLayerIndex: 1_024,
  edgeRenderVoxelLimit: 1_250,
  highlightedEdgeRenderVoxelLimit: 5_000,
} as const;

export type VisualSchematicViewerLimitKey = keyof typeof VISUAL_SCHEMATIC_VIEWER_LIMITS;

export function clampViewerInteger(
  value: number,
  fallback: number,
  min: number,
  max: number,
): number {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(min, Math.min(max, Math.round(value)));
}

export function isWithinViewerCoordinateLimit(value: number): boolean {
  return (
    Number.isFinite(value) &&
    Math.abs(value) <= VISUAL_SCHEMATIC_VIEWER_LIMITS.maxCoordinateMagnitude
  );
}
