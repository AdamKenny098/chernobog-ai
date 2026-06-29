import ActionButton from "./ActionButton";
import StatusBadge from "./StatusBadge";
import ThumbnailFrame from "./ThumbnailFrame";
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
    thumbnailUrls?: string[];
    status: string;
  };
};

type QueueItemRowProps = {
  item: QueueItem;
  selected: boolean;
  setSelectedItemId: (id: string) => void;
  runAction: (request: unknown) => Promise<void>;
};

export default function QueueItemRow({
  item,
  selected,
  setSelectedItemId,
  runAction,
}: QueueItemRowProps) {
  return (
    <article
      className={`${styles.queueRow} ${selected ? styles.queueRowSelected : ""}`}
      onClick={() => setSelectedItemId(item.id)}
    >
      <ThumbnailFrame
        title={item.title}
        platform={item.platform}
        thumbnail={item.thumbnail}
      />

      <div>
        <h3 className={styles.rowTitle}>{item.title}</h3>
        <div className={styles.rowMeta}>
          {item.platform}{" // "}{item.sourceType}
          {item.creator ? ` // ${item.creator}` : ""}
        </div>

        <div className={styles.badgeRow}>
          <StatusBadge value={item.lane} />
          <StatusBadge value={item.queueStatus} />
          <StatusBadge value={item.analysisStatus} />
          <StatusBadge value={item.transcriptStatus} />
          <StatusBadge value={item.thumbnail?.status ?? "no-thumbnail"} />
        </div>

        <div className={styles.actionRow} onClick={(event) => event.stopPropagation()}>
          <ActionButton
            request={{ type: "queue-action", action: "fetch-transcript", itemId: item.id }}
            runAction={runAction}
          >
            Transcript
          </ActionButton>
          <ActionButton
            request={{ type: "queue-action", action: "summarize", itemId: item.id }}
            runAction={runAction}
          >
            Summarize
          </ActionButton>
          <ActionButton
            request={{ type: "queue-action", action: "extract-candidates", itemId: item.id }}
            runAction={runAction}
          >
            Extract
          </ActionButton>
          <ActionButton
            request={{ type: "queue-action", action: "create-review", itemId: item.id }}
            runAction={runAction}
          >
            Review
          </ActionButton>
          <ActionButton
            request={{ type: "queue-action", action: "archive", itemId: item.id }}
            runAction={runAction}
          >
            Archive
          </ActionButton>
          <ActionButton
            request={{ type: "queue-action", action: "dismiss", itemId: item.id }}
            runAction={runAction}
            danger
          >
            Dismiss
          </ActionButton>
        </div>
      </div>
    </article>
  );
}
