import { useMemo, useState } from "react";

import ActionButton from "./ActionButton";
import StatusBadge from "./StatusBadge";

type QueueItem = {
  id: string;
  title: string;
  platform: string;
  sourceType: string;
  creator?: string;
  url: string;
  queueStatus: string;
  analysisStatus: string;
  transcriptStatus?: string;
};

type QueueTabProps = {
  items: QueueItem[];
  runAction: (command: string) => Promise<void>;
};

const filters = [
  "all",
  "active",
  "unprocessed",
  "watch-next",
  "analyze-next",
  "needs-transcript",
  "youtube",
  "tiktok",
  "closed",
];

const closedStatuses = new Set(["watched", "analyzed", "archived", "dismissed"]);

export default function QueueTab({ items, runAction }: QueueTabProps) {
  const [filter, setFilter] = useState("active");

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (filter === "all") return true;
      if (filter === "active") return !closedStatuses.has(item.queueStatus);
      if (filter === "closed") return closedStatuses.has(item.queueStatus);
      if (filter === "needs-transcript") {
        return item.transcriptStatus !== "available";
      }
      if (filter === "youtube" || filter === "tiktok") {
        return item.platform === filter;
      }

      return item.queueStatus === filter;
    });
  }, [filter, items]);

  return (
    <div>
      <Header
        title="Saved Content Queue"
        description="Manage active YouTube/TikTok queue items without remembering commands."
      />

      <div style={styles.filterRow}>
        {filters.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setFilter(item)}
            style={{
              ...styles.filterButton,
              ...(filter === item ? styles.filterButtonActive : {}),
            }}
          >
            {item}
          </button>
        ))}
      </div>

      <div style={styles.list}>
        {filteredItems.length === 0 ? (
          <p style={styles.muted}>No queue items match this filter.</p>
        ) : (
          filteredItems.map((item, index) => (
            <article key={item.id} style={styles.card}>
              <div style={styles.cardTop}>
                <div>
                  <h3 style={styles.cardTitle}>{item.title}</h3>
                  <p style={styles.meta}>
                    {item.platform} / {item.sourceType}
                    {item.creator ? ` / ${item.creator}` : ""}
                  </p>
                  <a href={item.url} target="_blank" rel="noreferrer" style={styles.link}>
                    Open source
                  </a>
                </div>

                <div style={styles.badges}>
                  <StatusBadge value={item.queueStatus} />
                  <StatusBadge value={item.analysisStatus} />
                  <StatusBadge value={item.transcriptStatus} />
                </div>
              </div>

              <div style={styles.actions}>
                <ActionButton command={`watch next saved content ${index + 1}`} runAction={runAction}>
                  Watch next
                </ActionButton>
                <ActionButton command={`analyze next saved content ${index + 1}`} runAction={runAction}>
                  Analyze next
                </ActionButton>
                <ActionButton command={`fetch transcript for saved content ${index + 1}`} runAction={runAction}>
                  Fetch transcript
                </ActionButton>
                <ActionButton command={`summarize saved content ${index + 1}`} runAction={runAction}>
                  Summarize
                </ActionButton>
                <ActionButton command={`extract candidates from saved content ${index + 1}`} runAction={runAction}>
                  Extract candidates
                </ActionButton>
                <ActionButton command={`create saved content review for item ${index + 1}`} runAction={runAction}>
                  Create review
                </ActionButton>
                <ActionButton command={`archive saved content ${index + 1}`} runAction={runAction}>
                  Archive
                </ActionButton>
                <ActionButton command={`dismiss saved content ${index + 1}`} runAction={runAction}>
                  Dismiss
                </ActionButton>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}

function Header({ title, description }: { title: string; description: string }) {
  return (
    <div style={styles.header}>
      <h2 style={styles.heading}>{title}</h2>
      <p style={styles.muted}>{description}</p>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: {
    marginBottom: "14px",
  },
  heading: {
    margin: 0,
    fontSize: "20px",
  },
  muted: {
    color: "#8F9CA3",
  },
  filterRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
    marginBottom: "14px",
  },
  filterButton: {
    border: "1px solid #26323A",
    background: "#10161A",
    color: "#AEB9BF",
    padding: "7px 10px",
    borderRadius: "7px",
    cursor: "pointer",
    fontSize: "12px",
  },
  filterButtonActive: {
    background: "#25323B",
    color: "#FFFFFF",
    borderColor: "#4A5A64",
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
    alignItems: "flex-start",
  },
  cardTitle: {
    margin: 0,
    fontSize: "16px",
  },
  meta: {
    margin: "6px 0",
    color: "#8F9CA3",
    fontSize: "13px",
  },
  link: {
    color: "#9EC7E6",
    fontSize: "13px",
  },
  badges: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "flex-end",
    gap: "6px",
  },
  actions: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
    marginTop: "12px",
  },
};
