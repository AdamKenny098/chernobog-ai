import Link from "next/link";

import detailStyles from "./schematicDetailUx.module.css";
import type {
  VisualSchematicDetail,
  VisualViewerViewMode,
} from "../../visual-library/types";

type SchematicViewerControlBarProps = {
  schematic: VisualSchematicDetail;
  selectedLayer: number | null;
  viewMode: VisualViewerViewMode;
  highlightedBlockId: string;
};

export function SchematicViewerControlBar({
  schematic,
  selectedLayer,
  viewMode,
  highlightedBlockId,
}: SchematicViewerControlBarProps) {
  const maxLayer = Math.max(0, schematic.size.y - 1);
  const safeLayer = Math.min(Math.max(selectedLayer ?? 0, 0), maxLayer);
  const previousLayer = Math.max(0, safeLayer - 1);
  const nextLayer = Math.min(maxLayer, safeLayer + 1);
  const firstHighlightCandidate = schematic.highlightCandidates[0]?.blockId ?? "";

  return (
    <section className={detailStyles.viewerControlBar} aria-label="Viewer controls">
      <div className={detailStyles.controlGroup}>
        <span className={detailStyles.controlLabel}>View</span>
        <Link
          className={viewMode === "perspective" ? detailStyles.activeControlButton : detailStyles.controlButton}
          href={buildHref(schematic.id, {
            viewMode: "perspective",
            selectedLayer: null,
            highlightedBlockId,
          })}
        >
          Default
        </Link>
        <Link
          className={viewMode === "top-down" ? detailStyles.activeControlButton : detailStyles.controlButton}
          href={buildHref(schematic.id, {
            viewMode: "top-down",
            selectedLayer,
            highlightedBlockId,
          })}
        >
          Top-down
        </Link>
        <Link
          className={viewMode === "layer" ? detailStyles.activeControlButton : detailStyles.controlButton}
          href={buildHref(schematic.id, {
            viewMode: "layer",
            selectedLayer: selectedLayer ?? 0,
            highlightedBlockId,
          })}
        >
          Layer
        </Link>
      </div>

      <div className={detailStyles.controlGroup}>
        <span className={detailStyles.controlLabel}>Layer</span>
        <Link
          className={detailStyles.controlButton}
          href={buildHref(schematic.id, {
            viewMode: "layer",
            selectedLayer: previousLayer,
            highlightedBlockId,
          })}
        >
          Previous
        </Link>
        <span className={detailStyles.controlReadout}>
          Y {selectedLayer === null ? "all" : safeLayer} / {maxLayer}
        </span>
        <Link
          className={detailStyles.controlButton}
          href={buildHref(schematic.id, {
            viewMode: "layer",
            selectedLayer: nextLayer,
            highlightedBlockId,
          })}
        >
          Next
        </Link>
      </div>

      <div className={detailStyles.controlGroup}>
        <span className={detailStyles.controlLabel}>Highlight</span>
        {firstHighlightCandidate ? (
          <Link
            className={highlightedBlockId ? detailStyles.controlButton : detailStyles.activeControlButton}
            href={buildHref(schematic.id, {
              viewMode,
              selectedLayer,
              highlightedBlockId: firstHighlightCandidate,
            })}
          >
            Top block
          </Link>
        ) : null}
        <Link
          className={detailStyles.controlButton}
          href={buildHref(schematic.id, {
            viewMode,
            selectedLayer,
            highlightedBlockId: "",
          })}
        >
          Clear highlight
        </Link>
        <Link
          className={detailStyles.controlButton}
          href={buildHref(schematic.id, {
            viewMode: "perspective",
            selectedLayer: null,
            highlightedBlockId: "",
          })}
        >
          Reset camera
        </Link>
      </div>
    </section>
  );
}

function buildHref(
  schematicId: string,
  options: {
    viewMode: VisualViewerViewMode;
    selectedLayer: number | null;
    highlightedBlockId: string;
  },
): string {
  const params = new URLSearchParams();

  if (options.viewMode !== "perspective") {
    params.set("view", options.viewMode);
  }

  if (options.selectedLayer !== null) {
    params.set("layer", String(options.selectedLayer));
  }

  if (options.highlightedBlockId) {
    params.set("highlight", options.highlightedBlockId);
  }

  const query = params.toString();
  const basePath = `/schematics/${encodeURIComponent(schematicId)}`;

  return query ? `${basePath}?${query}` : basePath;
}
