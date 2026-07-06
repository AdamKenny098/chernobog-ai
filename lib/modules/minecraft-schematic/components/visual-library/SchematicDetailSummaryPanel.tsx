import detailStyles from "./schematicDetailUx.module.css";
import visualStyles from "./schematicVisualLibrary.module.css";
import type {
  VisualSchematicDetail,
  VisualViewerViewMode,
} from "../../visual-library/types";

type SchematicDetailSummaryPanelProps = {
  schematic: VisualSchematicDetail;
  selectedLayer: number | null;
  viewMode: VisualViewerViewMode;
  highlightedBlockId: string;
};

export function SchematicDetailSummaryPanel({
  schematic,
  selectedLayer,
  viewMode,
  highlightedBlockId,
}: SchematicDetailSummaryPanelProps) {
  const viewerVoxelCount =
    schematic.viewer.kind === "voxel"
      ? schematic.viewer.payload.voxels.length
      : 0;

  const visibleVoxelCount =
    schematic.viewer.kind === "voxel"
      ? schematic.viewer.payload.voxels.filter((voxel) => {
          if (selectedLayer !== null && voxel.y !== selectedLayer) {
            return false;
          }

          if (highlightedBlockId && voxel.blockId !== highlightedBlockId) {
            return false;
          }

          return true;
        }).length
      : 0;

  return (
    <section className={visualStyles.panel}>
      <div className={detailStyles.panelTitleRowCompact}>
        <h2 className={visualStyles.panelTitle}>Inspection Summary</h2>
        <span className={visualStyles.pill}>{viewMode}</span>
      </div>

      <div className={detailStyles.summaryGridCompact}>
        <SummaryMetric label="Visible" value={visibleVoxelCount.toLocaleString()} />
        <SummaryMetric label="Payload" value={viewerVoxelCount.toLocaleString()} />
        <SummaryMetric label="Layers" value={schematic.layerSummary.length.toLocaleString()} />
        <SummaryMetric label="Materials" value={schematic.materialCostSummary.uniqueBlocks.toLocaleString()} />
      </div>

      <div className={detailStyles.activeStateBox}>
        <span>Active layer</span>
        <strong>{selectedLayer === null ? "All layers" : `Y ${selectedLayer}`}</strong>
      </div>

      <div className={detailStyles.activeStateBox}>
        <span>Active highlight</span>
        <strong>{highlightedBlockId || "None"}</strong>
      </div>
    </section>
  );
}

function SummaryMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className={detailStyles.summaryMetricCompact}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
