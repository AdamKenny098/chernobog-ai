import Link from "next/link";
import { notFound } from "next/navigation";

import { SchematicDetailHeader } from "@/lib/modules/minecraft-schematic/components/visual-library/SchematicDetailHeader";
import { SchematicDetailSummaryPanel } from "@/lib/modules/minecraft-schematic/components/visual-library/SchematicDetailSummaryPanel";
import { SchematicFutureHooksPanel } from "@/lib/modules/minecraft-schematic/components/visual-library/SchematicFutureHooksPanel";
import { SchematicMaterialCostPanel } from "@/lib/modules/minecraft-schematic/components/visual-library/SchematicMaterialCostPanel";
import { SchematicMetadataPanel } from "@/lib/modules/minecraft-schematic/components/visual-library/SchematicMetadataPanel";
import { SchematicPaletteInspector } from "@/lib/modules/minecraft-schematic/components/visual-library/SchematicPaletteInspector";
import { SchematicRawDebugPanel } from "@/lib/modules/minecraft-schematic/components/visual-library/SchematicRawDebugPanel";
import { SchematicStatusPanel } from "@/lib/modules/minecraft-schematic/components/visual-library/SchematicStatusPanel";
import { SchematicVersionCompatibilityPanel } from "@/lib/modules/minecraft-schematic/components/visual-library/SchematicVersionCompatibilityPanel";
import { SchematicViewerControlBar } from "@/lib/modules/minecraft-schematic/components/visual-library/SchematicViewerControlBar";
import { SchematicViewerDataPanel } from "@/lib/modules/minecraft-schematic/components/visual-library/SchematicViewerDataPanel";
import { SchematicVoxelViewer } from "@/lib/modules/minecraft-schematic/components/visual-library/SchematicVoxelViewer";
import detailStyles from "@/lib/modules/minecraft-schematic/components/visual-library/schematicDetailUx.module.css";
import styles from "@/lib/modules/minecraft-schematic/components/visual-library/schematicVisualLibrary.module.css";
import { readVisualSchematicDetail } from "@/lib/modules/minecraft-schematic/visual-library/readVisualSchematicLibrary";
import { normalizeVisualBlockId } from "@/lib/modules/minecraft-schematic/visual-library/validateVisualSchematicPayload";
import type { VisualViewerViewMode } from "@/lib/modules/minecraft-schematic/visual-library/types";

export const dynamic = "force-dynamic";

type SchematicDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<{
    view?: string | string[];
    layer?: string | string[];
    highlight?: string | string[];
    panel?: string | string[];
  }>;
};

export default async function SchematicDetailPage({
  params,
  searchParams,
}: SchematicDetailPageProps) {
  const { id } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const schematic = await readVisualSchematicDetail(decodeURIComponent(id));

  if (!schematic) {
    notFound();
  }

  const viewMode = normalizeViewMode(firstParam(resolvedSearchParams.view));
  const selectedLayer = normalizeLayer(firstParam(resolvedSearchParams.layer));
  const highlightedBlockId = normalizeVisualBlockId(
    firstParam(resolvedSearchParams.highlight),
  );
  const activePanel = normalizePanel(firstParam(resolvedSearchParams.panel));

  return (
    <main className={styles.page}>
      <Link href="/schematics" className={styles.backLink}>
        ← Back to schematic library
      </Link>

      <SchematicDetailHeader
        schematic={schematic}
        selectedLayer={selectedLayer}
        viewMode={viewMode}
        highlightedBlockId={highlightedBlockId}
      />

      <section className={detailStyles.detailShell}>
        <div className={detailStyles.viewerColumn}>
          <SchematicViewerControlBar
            schematic={schematic}
            selectedLayer={selectedLayer}
            viewMode={viewMode}
            highlightedBlockId={highlightedBlockId}
          />

          <div className={styles.viewerStage}>
            <SchematicVoxelViewer
              schematic={schematic}
              layer={selectedLayer}
              viewMode={viewMode}
              highlightedBlockId={highlightedBlockId}
            />
          </div>
        </div>

        <aside className={detailStyles.detailAside}>
          <SchematicDetailSummaryPanel
            schematic={schematic}
            selectedLayer={selectedLayer}
            viewMode={viewMode}
            highlightedBlockId={highlightedBlockId}
          />
          <SchematicViewerDataPanel
            schematic={schematic}
            selectedLayer={selectedLayer}
            viewMode={viewMode}
            highlightedBlockId={highlightedBlockId}
          />
          <SchematicMetadataPanel schematic={schematic} />
          <SchematicVersionCompatibilityPanel schematic={schematic} />
          <SchematicStatusPanel schematic={schematic} />
        </aside>
      </section>

      <section className={detailStyles.lowerWorkbench}>
        <div className={detailStyles.sectionTabs} aria-label="Detail sections">
          <Link
            className={activePanel === "palette" ? detailStyles.activeTab : detailStyles.tab}
            href={buildDetailHref(schematic.id, {
              viewMode,
              selectedLayer,
              highlightedBlockId,
              panel: "palette",
            })}
          >
            Palette
          </Link>
          <Link
            className={activePanel === "materials" ? detailStyles.activeTab : detailStyles.tab}
            href={buildDetailHref(schematic.id, {
              viewMode,
              selectedLayer,
              highlightedBlockId,
              panel: "materials",
            })}
          >
            Materials
          </Link>
          <Link
            className={activePanel === "hooks" ? detailStyles.activeTab : detailStyles.tab}
            href={buildDetailHref(schematic.id, {
              viewMode,
              selectedLayer,
              highlightedBlockId,
              panel: "hooks",
            })}
          >
            Future Hooks
          </Link>
          <Link
            className={activePanel === "debug" ? detailStyles.activeTab : detailStyles.tab}
            href={buildDetailHref(schematic.id, {
              viewMode,
              selectedLayer,
              highlightedBlockId,
              panel: "debug",
            })}
          >
            Debug
          </Link>
        </div>

        <div className={detailStyles.lowerGrid}>
          {activePanel === "palette" ? (
            <SchematicPaletteInspector
              schematic={schematic}
              highlightedBlockId={highlightedBlockId}
            />
          ) : null}

          {activePanel === "materials" ? (
            <SchematicMaterialCostPanel schematic={schematic} />
          ) : null}

          {activePanel === "hooks" ? (
            <SchematicFutureHooksPanel schematic={schematic} />
          ) : null}

          {activePanel === "debug" ? (
            <SchematicRawDebugPanel
              schematic={schematic}
              selectedLayer={selectedLayer}
              viewMode={viewMode}
              highlightedBlockId={highlightedBlockId}
            />
          ) : null}
        </div>
      </section>
    </main>
  );
}

function normalizeViewMode(value: string): VisualViewerViewMode {
  if (value === "top-down" || value === "layer") {
    return value;
  }

  return "perspective";
}

function normalizeLayer(value: string): number | null {
  if (!value) {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 0) {
    return null;
  }

  return parsed;
}

function normalizePanel(value: string): "palette" | "materials" | "hooks" | "debug" {
  if (value === "materials" || value === "hooks" || value === "debug") {
    return value;
  }

  return "palette";
}

function firstParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0]?.trim() ?? "";
  }

  return value?.trim() ?? "";
}

function buildDetailHref(
  schematicId: string,
  options: {
    viewMode: VisualViewerViewMode;
    selectedLayer: number | null;
    highlightedBlockId: string;
    panel: string;
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

  if (options.panel !== "palette") {
    params.set("panel", options.panel);
  }

  const query = params.toString();
  const basePath = `/schematics/${encodeURIComponent(schematicId)}`;

  return query ? `${basePath}?${query}` : basePath;
}
