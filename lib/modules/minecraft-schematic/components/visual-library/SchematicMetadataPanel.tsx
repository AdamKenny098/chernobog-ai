import type { VisualSchematicDetail } from "../../visual-library/types";
import styles from "./schematicVisualLibrary.module.css";

type SchematicMetadataPanelProps = {
  schematic: VisualSchematicDetail;
};

export function SchematicMetadataPanel({
  schematic,
}: SchematicMetadataPanelProps) {
  return (
    <section className={styles.panel}>
      <h2 className={styles.panelTitle}>Metadata</h2>

      <div className={styles.metadataGrid}>
        <MetadataRow label="ID" value={schematic.id} />
        <MetadataRow label="Name" value={schematic.name} />
        <MetadataRow label="Category" value={schematic.category} />
        <MetadataRow label="Theme" value={schematic.theme} />
        <MetadataRow
          label="Target version"
          value={schematic.targetMinecraftVersion}
        />
        <MetadataRow
          label="Size"
          value={`${schematic.size.x} × ${schematic.size.y} × ${schematic.size.z}`}
        />
        <MetadataRow
          label="Block count"
          value={schematic.blockCount.toLocaleString()}
        />
        <MetadataRow
          label="Required mods"
          value={
            schematic.requiredMods.length > 0
              ? schematic.requiredMods.join(", ")
              : "None recorded"
          }
        />
        <MetadataRow
          label="Tags"
          value={
            schematic.tags.length > 0
              ? schematic.tags.join(", ")
              : "None recorded"
          }
        />
      </div>
    </section>
  );
}

function MetadataRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className={styles.metadataRow}>
      <span className={styles.metadataKey}>{label}</span>
      <span className={styles.metadataValue}>{value}</span>
    </div>
  );
}
