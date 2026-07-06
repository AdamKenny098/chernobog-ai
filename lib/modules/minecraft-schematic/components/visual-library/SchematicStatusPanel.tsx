import type { VisualSchematicDetail } from "../../visual-library/types";
import styles from "./schematicVisualLibrary.module.css";

type SchematicStatusPanelProps = {
  schematic: VisualSchematicDetail;
};

export function SchematicStatusPanel({ schematic }: SchematicStatusPanelProps) {
  const summary = schematic.validationSummary;

  return (
    <section className={styles.panel}>
      <h2 className={styles.panelTitle}>Validation / Status</h2>

      <div className={styles.statusSummaryGrid}>
        <StatusMetric label="Metadata" value={schematic.status} />
        <StatusMetric label="Validation" value={summary.level} />
        <StatusMetric label="Warnings" value={String(summary.warningCount)} />
        <StatusMetric label="Errors" value={String(summary.errorCount)} />
      </div>

      <p className={styles.statusLine}>
        <strong>{schematic.status}</strong>: {schematic.statusMessage}
      </p>

      {schematic.validationMessages.map((message) => (
        <p key={message} className={styles.statusLine}>
          {message}
        </p>
      ))}

      <div className={styles.overlayPlaceholder}>
        <strong>Overlay hooks ready</strong>
        <span>
          Future passes can map these validation messages to block highlighting,
          version warnings, layer markers, and viewer overlays.
        </span>
      </div>
    </section>
  );
}

function StatusMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.statusMetric}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
