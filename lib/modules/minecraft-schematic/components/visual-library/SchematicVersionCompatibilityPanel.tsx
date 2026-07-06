import type { VisualSchematicDetail } from "../../visual-library/types";
import styles from "./schematicVisualLibrary.module.css";

type SchematicVersionCompatibilityPanelProps = {
  schematic: VisualSchematicDetail;
};

export function SchematicVersionCompatibilityPanel({
  schematic,
}: SchematicVersionCompatibilityPanelProps) {
  const compatibility = schematic.versionCompatibility;
  const statusClassName =
    compatibility.level === "compatible"
      ? `${styles.pill} ${styles.statusOk}`
      : compatibility.level === "incompatible" || compatibility.level === "warning"
        ? `${styles.pill} ${styles.statusWarning}`
        : `${styles.pill} ${styles.statusNeutral}`;

  return (
    <section className={styles.panel}>
      <div className={styles.panelHeaderRow}>
        <h2 className={styles.panelTitle}>Version Compatibility</h2>
        <span className={statusClassName}>{compatibility.level}</span>
      </div>

      <div className={styles.metadataGrid}>
        <MetadataRow label="Target" value={compatibility.targetVersion} />
        <MetadataRow
          label="Required mods"
          value={
            compatibility.requiredMods.length > 0
              ? compatibility.requiredMods.join(", ")
              : "None recorded"
          }
        />
      </div>

      <p className={styles.statusLine}>{compatibility.message}</p>

      {compatibility.warnings.length > 0 ? (
        <ul className={styles.warningList}>
          {compatibility.warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      ) : (
        <div className={styles.overlayPlaceholder}>
          <strong>Future hook:</strong>
          <span>
            Detailed block-by-block version validation can attach here once the block registry and target-version rules are stricter.
          </span>
        </div>
      )}
    </section>
  );
}

function MetadataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.metadataRow}>
      <span className={styles.metadataKey}>{label}</span>
      <span className={styles.metadataValue}>{value}</span>
    </div>
  );
}
