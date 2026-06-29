import { useMemo } from "react";

import QueueItemRow from "./QueueItemRow";
import styles from "../saved-content-dashboard.module.css";

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
  lane: string;
  thumbnail?: {
    thumbnailUrl?: string;
    fallbackUrl?: string;
    status: string;
  };
};

type QueueWorkbenchProps = {
  items: QueueItem[];
  filter: string;
  selectedItemId: string | null;
  setSelectedItemId: (id: string) => void;
  runAction: (request: unknown) => Promise<void>;
};

const closed = new Set(["watched", "analyzed", "archived", "dismissed"]);

export default function QueueWorkbench({
  items,
  filter,
  selectedItemId,
  setSelectedItemId,
  runAction,
}: QueueWorkbenchProps) {
  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (filter === "all") return true;
      if (filter === "active") return !closed.has(item.queueStatus);
      if (filter === "youtube" || filter === "tiktok") return item.platform === filter;
      if (filter === "archived" || filter === "dismissed") return item.queueStatus === filter;
      return item.lane === filter;
    });
  }, [filter, items]);

  return (
    <div>
      <div className={styles.workbenchHeader}>
        <div>
          <h2 className={styles.workbenchTitle}>Queue Workbench</h2>
          <p className={styles.workbenchSubtitle}>
            Filter: {filter}{" // Items: "}{filtered.length}
          </p>
        </div>
      </div>

      <div className={styles.queueList}>
        {filtered.length === 0 ? (
          <div className={styles.emptyState}>No saved-content items match this operation filter.</div>
        ) : (
          filtered.map((item) => (
            <QueueItemRow
              key={item.id}
              item={item}
              selected={selectedItemId === item.id}
              setSelectedItemId={setSelectedItemId}
              runAction={runAction}
            />
          ))
        )}
      </div>
    </div>
  );
}
