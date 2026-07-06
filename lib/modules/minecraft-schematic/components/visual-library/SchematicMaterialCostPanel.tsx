import type { VisualSchematicDetail } from "../../visual-library/types";
import styles from "./schematicVisualLibrary.module.css";

type SchematicMaterialCostPanelProps = {
  schematic: VisualSchematicDetail;
};

export function SchematicMaterialCostPanel({
  schematic,
}: SchematicMaterialCostPanelProps) {
  const summary = schematic.materialCostSummary;

  return (
    <section className={styles.panel}>
      <div className={styles.panelHeaderRow}>
        <h2 className={styles.panelTitle}>Material Cost</h2>
        <span className={styles.pill}>{summary.uniqueBlocks.toLocaleString()} block types</span>
      </div>

      <div className={styles.costSummaryGrid}>
        <CostMetric label="Blocks" value={summary.totalBlocks.toLocaleString()} />
        <CostMetric label="Stacks" value={summary.estimatedStacks.toLocaleString()} />
        <CostMetric label="Shulkers" value={summary.estimatedShulkerBoxes.toLocaleString()} />
      </div>

      {summary.items.length > 0 ? (
        <ul className={styles.costList}>
          {summary.items.slice(0, 18).map((item) => (
            <li key={item.blockId} className={styles.costItem}>
              <span
                className={styles.swatch}
                style={{ backgroundColor: item.color }}
              />
              <span className={styles.paletteTextBlock}>
                <span className={styles.palettePrimaryText}>{item.blockId}</span>
                <span className={styles.paletteSecondaryText}>
                  {item.displayName} · {item.materialKind} · {item.stackCount.toLocaleString()} stacks
                </span>
              </span>
              <span>{item.count.toLocaleString()}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.statusLine}>
          No material cost data is available yet. The panel is ready for deeper schematic extraction.
        </p>
      )}
    </section>
  );
}

function CostMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.costMetric}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
