import detailStyles from "./schematicDetailUx.module.css";
import visualStyles from "./schematicVisualLibrary.module.css";
import type {
  VisualSchematicDetail,
  VisualViewerViewMode,
} from "../../visual-library/types";

type SchematicViewerDataPanelProps = {
  schematic: VisualSchematicDetail;
  selectedLayer: number | null;
  viewMode: VisualViewerViewMode;
  highlightedBlockId: string;
};

export function SchematicViewerDataPanel({
  schematic,
  selectedLayer,
  viewMode,
  highlightedBlockId,
}: SchematicViewerDataPanelProps) {
  if (schematic.viewer.kind !== "voxel") {
    return (
      <section className={visualStyles.panel}>
        <h2 className={visualStyles.panelTitle}>Viewer Data</h2>
        <p className={visualStyles.statusLine}>{schematic.viewer.message}</p>
      </section>
    );
  }

  const filteredVoxelCount = schematic.viewer.payload.voxels.filter((voxel) => {
    if (selectedLayer !== null && voxel.y !== selectedLayer) {
      return false;
    }

    if (highlightedBlockId && voxel.blockId !== highlightedBlockId) {
      return false;
    }

    return true;
  }).length;

  const reliability = schematic.viewer.payload.reliability;
  const reliabilityNoteCount =
    reliability.messages.length + reliability.warnings.length + reliability.errors.length;

  const uniqueMaterials = new Set(
    schematic.viewer.payload.voxels.map(
      (voxel) => voxel.material?.key ?? voxel.blockId,
    ),
  );

  return (
    <section className={visualStyles.panel}>
      <div className={detailStyles.panelTitleRowCompact}>
        <h2 className={visualStyles.panelTitle}>Viewer Data</h2>
        <span className={visualStyles.pill}>{reliability.level}</span>
      </div>

      <div className={visualStyles.metadataGrid}>
        <MetadataRow label="Source" value={schematic.viewer.payload.source} />
        <MetadataRow label="View mode" value={viewMode} />
        <MetadataRow
          label="Selected layer"
          value={selectedLayer === null ? "All layers" : `Y ${selectedLayer}`}
        />
        <MetadataRow
          label="Highlight"
          value={highlightedBlockId || "No block highlighted"}
        />
        <MetadataRow
          label="Visible voxels"
          value={filteredVoxelCount.toLocaleString()}
        />
        <MetadataRow
          label="Rendered payload"
          value={schematic.viewer.payload.voxels.length.toLocaleString()}
        />
        <MetadataRow
          label="Available voxels"
          value={schematic.viewer.payload.totalAvailableVoxels.toLocaleString()}
        />
        <MetadataRow
          label="Material groups"
          value={uniqueMaterials.size.toLocaleString()}
        />
        <MetadataRow
          label="Capped"
          value={schematic.viewer.payload.capped ? "Yes" : "No"}
        />
        <MetadataRow
          label="Render limit"
          value={reliability.renderedVoxelLimit.toLocaleString()}
        />
        <MetadataRow
          label="Parse limit"
          value={reliability.rawVoxelParseLimit.toLocaleString()}
        />
        <MetadataRow
          label="Notes"
          value={reliabilityNoteCount.toLocaleString()}
        />
      </div>

      <p className={visualStyles.statusLine}>{schematic.viewer.message}</p>
    </section>
  );
}

function MetadataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className={visualStyles.metadataRow}>
      <span className={visualStyles.metadataKey}>{label}</span>
      <span className={visualStyles.metadataValue}>{value}</span>
    </div>
  );
}
