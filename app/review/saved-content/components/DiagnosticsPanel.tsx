import ActionButton from "./ActionButton";
import styles from "../saved-content-dashboard.module.css";

type DiagnosticsPanelProps = {
  diagnostics: Record<string, unknown>;
  runAction: (request: unknown) => Promise<void>;
};

export default function DiagnosticsPanel({ diagnostics, runAction }: DiagnosticsPanelProps) {
  const thumbnailStats = diagnostics.thumbnails as
    | { total?: number; available?: number; failed?: number }
    | undefined;

  return (
    <div>
      <div className={styles.workbenchHeader}>
        <div>
          <h2 className={styles.workbenchTitle}>Diagnostics</h2>
          <p className={styles.workbenchSubtitle}>
            Queue health, lifecycle, duplicates, source reliability, and thumbnail cache.
          </p>
        </div>
      </div>

      <div className={styles.diagnosticGrid}>
        <section className={styles.diagnosticCard}>
          <div className={styles.panelTitle}>Thumbnail Cache</div>
          <p>Total: {thumbnailStats?.total ?? 0}</p>
          <p>Available: {thumbnailStats?.available ?? 0}</p>
          <p>Failed: {thumbnailStats?.failed ?? 0}</p>
          <div className={styles.actionRow}>
            <ActionButton
              request={{ type: "refresh-thumbnails", limit: 100 }}
              runAction={runAction}
            >
              Refresh Thumbnails
            </ActionButton>
          </div>
        </section>

        <section className={styles.diagnosticCard}>
          <div className={styles.panelTitle}>Reports</div>
          <div className={styles.actionRow}>
            <ActionButton
              request={{ type: "command", command: "show saved content lifecycle report" }}
              runAction={runAction}
            >
              Lifecycle
            </ActionButton>
            <ActionButton
              request={{ type: "command", command: "show saved content duplicates" }}
              runAction={runAction}
            >
              Duplicates
            </ActionButton>
            <ActionButton
              request={{ type: "command", command: "show source reliability report" }}
              runAction={runAction}
            >
              Reliability
            </ActionButton>
            <ActionButton
              request={{ type: "command", command: "close completed saved content" }}
              runAction={runAction}
            >
              Close Completed
            </ActionButton>
          </div>
        </section>

        <section className={styles.diagnosticCard}>
          <div className={styles.panelTitle}>Raw Diagnostic State</div>
          <pre>{JSON.stringify(diagnostics, null, 2)}</pre>
        </section>
      </div>
    </div>
  );
}
