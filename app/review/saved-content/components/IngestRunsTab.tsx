import ActionButton from "./ActionButton";
import StatusBadge from "./StatusBadge";

type IngestRun = {
  id: string;
  kind: string;
  status: string;
  platform?: string;
  archivePath?: string;
  createdAt: string;
  completedAt?: string;
  candidatesFound: number;
  queueItems: number;
};

type IngestRunsTabProps = {
  runs: IngestRun[];
  runAction: (command: string) => Promise<void>;
};

export default function IngestRunsTab({ runs, runAction }: IngestRunsTabProps) {
  return (
    <div>
      <h2 style={styles.heading}>Ingest Runs</h2>
      <p style={styles.muted}>
        Scan/import records created by V5.6N.
      </p>

      <div style={styles.actionRow}>
        <ActionButton command="show content ingest runs" runAction={runAction}>
          Refresh runs
        </ActionButton>
        <ActionButton command="show latest content ingest run" runAction={runAction}>
          Latest run
        </ActionButton>
      </div>

      <div style={styles.list}>
        {runs.length === 0 ? (
          <p style={styles.muted}>No ingest runs found yet.</p>
        ) : (
          runs.map((run) => (
            <article key={run.id} style={styles.card}>
              <div style={styles.cardTop}>
                <div>
                  <h3 style={styles.cardTitle}>{run.id}</h3>
                  <p style={styles.meta}>
                    {run.platform ?? "mixed"} / {run.kind}
                  </p>
                </div>
                <StatusBadge value={run.status} />
              </div>

              <dl style={styles.grid}>
                <div>
                  <dt>Candidates</dt>
                  <dd>{run.candidatesFound}</dd>
                </div>
                <div>
                  <dt>Queue Items</dt>
                  <dd>{run.queueItems}</dd>
                </div>
                <div>
                  <dt>Created</dt>
                  <dd>{run.createdAt}</dd>
                </div>
                <div>
                  <dt>Archive</dt>
                  <dd>{run.archivePath ?? "none"}</dd>
                </div>
              </dl>

              <div style={styles.actionRow}>
                <ActionButton command={`show content ingest run ${run.id}`} runAction={runAction}>
                  Show run
                </ActionButton>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  heading: {
    margin: 0,
    fontSize: "20px",
  },
  muted: {
    color: "#8F9CA3",
  },
  actionRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
    margin: "12px 0",
  },
  list: {
    display: "grid",
    gap: "12px",
  },
  card: {
    border: "1px solid #26323A",
    background: "#10161A",
    borderRadius: "12px",
    padding: "14px",
  },
  cardTop: {
    display: "flex",
    justifyContent: "space-between",
    gap: "16px",
  },
  cardTitle: {
    margin: 0,
    fontSize: "15px",
  },
  meta: {
    margin: "6px 0",
    color: "#8F9CA3",
    fontSize: "13px",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: "10px",
    margin: "12px 0",
  },
};
