import styles from "../saved-content-watch.module.css";

type WatchQueueProps = {
  items: Array<{
    id: string;
    title: string;
    platform: string;
    decision: string;
    position: number;
  }>;
  currentItemId: string | null;
  pendingCount: number;
  sessionId: string | null;
  loadSession: (sessionId?: string) => Promise<void>;
};

export default function WatchQueue({
  items,
  currentItemId,
  pendingCount,
}: WatchQueueProps) {
  return (
    <section>
      <div className={styles.panelTitle}>Session Queue // Pending {pendingCount}</div>

      <div className={styles.queueList}>
        {items.length === 0 ? (
          <div className={styles.emptyState}>No watch items loaded.</div>
        ) : (
          items.map((item) => (
            <article
              className={`${styles.queueItem} ${
                currentItemId === item.id ? styles.queueItemCurrent : ""
              }`}
              key={item.id}
            >
              <div className={styles.queueIndex}>
                {String(item.position + 1).padStart(3, "0")}
              </div>
              <div>
                <p className={styles.queueTitle}>{item.title}</p>
                <div className={styles.queueMeta}>
                  {item.platform}{" // "}{item.decision}
                </div>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
