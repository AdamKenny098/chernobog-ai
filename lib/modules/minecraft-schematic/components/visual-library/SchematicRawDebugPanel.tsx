import detailStyles from "./schematicDetailUx.module.css";
import visualStyles from "./schematicVisualLibrary.module.css";
import type {
  VisualSchematicDetail,
  VisualViewerViewMode,
} from "../../visual-library/types";

type SchematicRawDebugPanelProps = {
  schematic: VisualSchematicDetail;
  selectedLayer: number | null;
  viewMode: VisualViewerViewMode;
  highlightedBlockId: string;
};

export function SchematicRawDebugPanel({
  schematic,
  selectedLayer,
  viewMode,
  highlightedBlockId,
}: SchematicRawDebugPanelProps) {
  const debugPayload = buildDebugPayload({
    schematic,
    selectedLayer,
    viewMode,
    highlightedBlockId,
  });

  return (
    <section className={visualStyles.panel}>
      <h2 className={visualStyles.panelTitle}>Raw Debug Summary</h2>
      <p className={visualStyles.statusLine}>
        This is intentionally summarized. It avoids dumping the full voxel array
        into the page, which can get heavy fast on large schematics.
      </p>

      <details className={detailStyles.debugDetails}>
        <summary>Open debug JSON</summary>
        <pre className={detailStyles.debugPre}>
          {JSON.stringify(debugPayload, null, 2)}
        </pre>
      </details>
    </section>
  );
}

function buildDebugPayload({
  schematic,
  selectedLayer,
  viewMode,
  highlightedBlockId,
}: SchematicRawDebugPanelProps) {
  const viewerPayload = schematic.viewer.kind === "voxel" ? schematic.viewer.payload : null;

  return {
    id: schematic.id,
    name: schematic.name,
    status: schematic.status,
    statusMessage: schematic.statusMessage,
    category: schematic.category,
    theme: schematic.theme,
    targetMinecraftVersion: schematic.targetMinecraftVersion,
    size: schematic.size,
    blockCount: schematic.blockCount,
    requiredMods: schematic.requiredMods,
    tags: schematic.tags,
    activeViewerState: {
      viewMode,
      selectedLayer,
      highlightedBlockId,
    },
    thumbnail: schematic.thumbnail,
    validationSummary: schematic.validationSummary,
    versionCompatibility: schematic.versionCompatibility,
    materialCostSummary: {
      totalBlocks: schematic.materialCostSummary.totalBlocks,
      uniqueBlocks: schematic.materialCostSummary.uniqueBlocks,
      estimatedStacks: schematic.materialCostSummary.estimatedStacks,
      estimatedShulkerBoxes: schematic.materialCostSummary.estimatedShulkerBoxes,
      previewItems: schematic.materialCostSummary.items.slice(0, 12),
    },
    palettePreview: schematic.palette.slice(0, 16),
    layerSummaryPreview: schematic.layerSummary.slice(0, 16),
    highlightCandidates: schematic.highlightCandidates.slice(0, 20),
    viewer:
      viewerPayload === null
        ? schematic.viewer
        : {
            kind: schematic.viewer.kind,
            message: schematic.viewer.message,
            source: viewerPayload.source,
            capped: viewerPayload.capped,
            renderedVoxels: viewerPayload.voxels.length,
            totalAvailableVoxels: viewerPayload.totalAvailableVoxels,
            reliability: viewerPayload.reliability,
            voxelPreview: viewerPayload.voxels.slice(0, 20),
          },
  };
}
