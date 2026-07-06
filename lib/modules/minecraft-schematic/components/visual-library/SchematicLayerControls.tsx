import Link from "next/link";

import type {
  VisualLayerSummary,
  VisualSchematicDetail,
  VisualViewerViewMode,
} from "../../visual-library/types";
import styles from "./schematicVisualLibrary.module.css";

type SchematicLayerControlsProps = {
  schematic: VisualSchematicDetail;
  selectedLayer: number | null;
  viewMode: VisualViewerViewMode;
  highlightedBlockId: string;
};

export function SchematicLayerControls({
  schematic,
  selectedLayer,
  viewMode,
  highlightedBlockId,
}: SchematicLayerControlsProps) {
  const layerOptions = createLayerOptions(schematic.layerSummary);
  const activeLayer =
    selectedLayer === null
      ? null
      : schematic.layerSummary.find((layer) => layer.y === selectedLayer) ?? null;

  return (
    <section className={styles.panel}>
      <div className={styles.panelHeaderRow}>
        <h2 className={styles.panelTitle}>Viewer Modes</h2>
        <span className={styles.pill}>8E hooks</span>
      </div>

      <div className={styles.modeButtonRow}>
        <Link
          className={viewMode === "perspective" ? styles.activeModeButton : styles.modeButton}
          href={createDetailHref(schematic.id, {
            view: "perspective",
            layer: selectedLayer,
            highlight: highlightedBlockId,
          })}
        >
          Perspective
        </Link>
        <Link
          className={viewMode === "top-down" ? styles.activeModeButton : styles.modeButton}
          href={createDetailHref(schematic.id, {
            view: "top-down",
            layer: selectedLayer,
            highlight: highlightedBlockId,
          })}
        >
          Top-down
        </Link>
        <Link
          className={viewMode === "layer" ? styles.activeModeButton : styles.modeButton}
          href={createDetailHref(schematic.id, {
            view: "layer",
            layer: selectedLayer ?? layerOptions[0]?.y ?? null,
            highlight: highlightedBlockId,
          })}
        >
          Layer
        </Link>
      </div>

      <div className={styles.layerStrip} aria-label="Layer selector">
        <Link
          className={selectedLayer === null ? styles.activeLayerButton : styles.layerButton}
          href={createDetailHref(schematic.id, {
            view: viewMode === "layer" ? "perspective" : viewMode,
            layer: null,
            highlight: highlightedBlockId,
          })}
        >
          All
        </Link>

        {layerOptions.map((layer) => (
          <Link
            key={layer.y}
            className={selectedLayer === layer.y ? styles.activeLayerButton : styles.layerButton}
            href={createDetailHref(schematic.id, {
              view: viewMode === "perspective" ? "layer" : viewMode,
              layer: layer.y,
              highlight: highlightedBlockId,
            })}
            title={`${layer.blockCount.toLocaleString()} blocks on Y ${layer.y}`}
          >
            Y{layer.y}
          </Link>
        ))}
      </div>

      {activeLayer ? (
        <div className={styles.layerSummaryBox}>
          <strong>Layer Y {activeLayer.y}</strong>
          <span>
            {activeLayer.blockCount.toLocaleString()} blocks · {activeLayer.uniqueBlockCount.toLocaleString()} unique
          </span>
          <div className={styles.miniBlockList}>
            {activeLayer.topBlocks.map((block) => (
              <span key={block.blockId}>
                {block.displayName}: {block.count.toLocaleString()}
              </span>
            ))}
          </div>
        </div>
      ) : (
        <p className={styles.statusLine}>
          Choose a layer to isolate one Y slice. This is the base contract for proper layer slicing and validation overlays.
        </p>
      )}
    </section>
  );
}

function createLayerOptions(layers: VisualLayerSummary[]): VisualLayerSummary[] {
  if (layers.length <= 16) {
    return layers;
  }

  const step = Math.max(1, Math.ceil(layers.length / 16));

  return layers.filter((_, index) => index % step === 0).slice(0, 16);
}

function createDetailHref(
  id: string,
  state: {
    view: VisualViewerViewMode;
    layer: number | null;
    highlight: string;
  },
): string {
  const params = new URLSearchParams();

  if (state.view !== "perspective") {
    params.set("view", state.view);
  }

  if (state.layer !== null) {
    params.set("layer", String(state.layer));
  }

  if (state.highlight) {
    params.set("highlight", state.highlight);
  }

  const query = params.toString();

  return `/schematics/${encodeURIComponent(id)}${query ? `?${query}` : ""}`;
}
