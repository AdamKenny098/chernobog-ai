import ActionButton from "./ActionButton";

type DiagnosticsTabProps = {
  diagnostics: Record<string, unknown>;
  runAction: (command: string) => Promise<void>;
};

export default function DiagnosticsTab({ diagnostics, runAction }: DiagnosticsTabProps) {
  return (
    <div>
      <h2 style={styles.heading}>Diagnostics</h2>
      <p style={styles.muted}>
        Visual wrapper around J/K/N diagnostics and reports.
      </p>

      <div style={styles.actionRow}>
        <ActionButton command="show saved content diagnostics" runAction={runAction}>
          Saved diagnostics
        </ActionButton>
        <ActionButton command="show source reliability report" runAction={runAction}>
          Source reliability
        </ActionButton>
        <ActionButton command="show saved content lifecycle report" runAction={runAction}>
          Lifecycle
        </ActionButton>
        <ActionButton command="show saved content duplicates" runAction={runAction}>
          Duplicates
        </ActionButton>
        <ActionButton command="close completed saved content" runAction={runAction}>
          Close completed
        </ActionButton>
      </div>

      <pre style={styles.pre}>{JSON.stringify(diagnostics, null, 2)}</pre>
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
  pre: {
    whiteSpace: "pre-wrap",
    color: "#BFCAD0",
    background: "#080B0D",
    padding: "12px",
    borderRadius: "8px",
    overflow: "auto",
    maxHeight: "520px",
  },
};
