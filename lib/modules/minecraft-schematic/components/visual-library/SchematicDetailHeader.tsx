import { SchematicThumbnail } from "./SchematicThumbnail";
import detailStyles from "./schematicDetailUx.module.css";
import visualStyles from "./schematicVisualLibrary.module.css";
import type {
  VisualSchematicDetail,
  VisualViewerViewMode,
} from "../../visual-library/types";

type SchematicDetailHeaderProps = {
  schematic: VisualSchematicDetail;
  selectedLayer: number | null;
  viewMode: VisualViewerViewMode;
  highlightedBlockId: string;
};

export function SchematicDetailHeader({
  schematic,
  selectedLayer,
  viewMode,
  highlightedBlockId,
}: SchematicDetailHeaderProps) {
  const viewerKind = schematic.viewer.kind;
  const reliabilityLevel =
    schematic.viewer.kind === "voxel"
      ? schematic.viewer.payload.reliability.level
      : "unknown";

  return (
    <section className={detailStyles.detailHero}>
      <div className={detailStyles.heroThumbnailWrap}>
        <SchematicThumbnail schematic={schematic} />
      </div>

      <div className={detailStyles.heroTextBlock}>
        <p className={visualStyles.eyebrow}>Schematic detail</p>
        <h1 className={visualStyles.title}>{schematic.name}</h1>
        <p className={visualStyles.muted}>
          Inspect the schematic as a Chernobog managed asset: view mode,
          current layer, highlighted block, material cost, palette data, and
          validation state are now visible from one page.
        </p>

        <div className={visualStyles.tagRow}>
          <span className={visualStyles.pill}>{schematic.category}</span>
          <span className={visualStyles.pill}>{schematic.theme}</span>
          <span className={visualStyles.pill}>{schematic.targetMinecraftVersion}</span>
          <span className={visualStyles.pill}>{viewerKind} viewer</span>
          <span className={visualStyles.pill}>reliability: {reliabilityLevel}</span>
          <span className={visualStyles.pill}>view: {viewMode}</span>
          {selectedLayer !== null ? (
            <span className={visualStyles.pill}>layer: Y {selectedLayer}</span>
          ) : null}
          {highlightedBlockId ? (
            <span className={visualStyles.pill}>highlight: {highlightedBlockId}</span>
          ) : null}
        </div>
      </div>

      <div className={detailStyles.heroStatRail}>
        <HeroStat label="Size" value={`${schematic.size.x} × ${schematic.size.y} × ${schematic.size.z}`} />
        <HeroStat label="Blocks" value={schematic.blockCount.toLocaleString()} />
        <HeroStat label="Palette" value={schematic.palette.length.toLocaleString()} />
        <HeroStat label="Status" value={schematic.status} />
      </div>
    </section>
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div className={detailStyles.heroStatCard}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
