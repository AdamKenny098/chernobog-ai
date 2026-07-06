import type { VisualSchematicDetail } from "../../visual-library/types";
import styles from "./schematicVisualLibrary.module.css";

type SchematicFutureHooksPanelProps = {
  schematic: VisualSchematicDetail;
};

export function SchematicFutureHooksPanel({
  schematic,
}: SchematicFutureHooksPanelProps) {
  const hooks = [
    {
      label: "Layer slicing",
      ready: schematic.layerSummary.length > 0,
      detail: `${schematic.layerSummary.length.toLocaleString()} layer summaries`,
    },
    {
      label: "Top-down view",
      ready: schematic.viewer.kind === "voxel",
      detail: "URL-driven viewer mode",
    },
    {
      label: "Block highlighting",
      ready: schematic.highlightCandidates.length > 0,
      detail: `${schematic.highlightCandidates.length.toLocaleString()} candidates`,
    },
    {
      label: "Material costs",
      ready: schematic.materialCostSummary.items.length > 0,
      detail: `${schematic.materialCostSummary.estimatedStacks.toLocaleString()} estimated stacks`,
    },
    {
      label: "Palette view",
      ready: schematic.palette.length > 0,
      detail: `${schematic.palette.length.toLocaleString()} palette entries`,
    },
    {
      label: "Version warnings",
      ready: schematic.versionCompatibility.level !== "unknown",
      detail: schematic.versionCompatibility.level,
    },
  ];

  return (
    <section className={styles.panel}>
      <h2 className={styles.panelTitle}>Future Hook Readiness</h2>
      <div className={styles.hookGrid}>
        {hooks.map((hook) => (
          <div key={hook.label} className={hook.ready ? styles.hookReady : styles.hookPending}>
            <strong>{hook.label}</strong>
            <span>{hook.detail}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
