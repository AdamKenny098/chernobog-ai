import styles from "../saved-content-watch.module.css";

type Platform = "all" | "youtube" | "tiktok";
type Filter =
  | "active"
  | "unwatched"
  | "unprocessed"
  | "needs-transcript"
  | "ready-to-analyze"
  | "all";
type Order = "oldest" | "newest" | "random";

type WatchControlsProps = {
  platform: Platform;
  setPlatform: (value: Platform) => void;
  filter: Filter;
  setFilter: (value: Filter) => void;
  order: Order;
  setOrder: (value: Order) => void;
  batchSize: number;
  setBatchSize: (value: number) => void;
  sourceLabel: string;
  setSourceLabel: (value: string) => void;
  createSession: () => Promise<void>;
  isBusy: boolean;
  sessions: Array<{
    id: string;
    title: string;
    status: string;
    itemCount: number;
    pendingCount: number;
    updatedAt: string;
  }>;
  loadSession: (sessionId?: string) => Promise<void>;
};

export default function WatchControls({
  platform,
  setPlatform,
  filter,
  setFilter,
  order,
  setOrder,
  batchSize,
  setBatchSize,
  sourceLabel,
  setSourceLabel,
  createSession,
  isBusy,
  sessions,
  loadSession,
}: WatchControlsProps) {
  return (
    <section>
      <div className={styles.panelTitle}>Session Builder</div>

      <div className={styles.formGroup}>
        <label className={styles.label}>
          Platform
          <select
            className={styles.select}
            value={platform}
            onChange={(event) => setPlatform(event.target.value as Platform)}
          >
            <option value="tiktok">TikTok</option>
            <option value="youtube">YouTube</option>
            <option value="all">All</option>
          </select>
        </label>
      </div>

      <div className={styles.formGroup}>
        <label className={styles.label}>
          Filter
          <select
            className={styles.select}
            value={filter}
            onChange={(event) => setFilter(event.target.value as Filter)}
          >
            <option value="active">Active</option>
            <option value="unwatched">Unwatched</option>
            <option value="unprocessed">Unprocessed</option>
            <option value="needs-transcript">Needs Transcript</option>
            <option value="ready-to-analyze">Ready To Analyze</option>
            <option value="all">All</option>
          </select>
        </label>
      </div>

      <div className={styles.formGroup}>
        <label className={styles.label}>
          Order
          <select
            className={styles.select}
            value={order}
            onChange={(event) => setOrder(event.target.value as Order)}
          >
            <option value="oldest">Oldest first</option>
            <option value="newest">Newest first</option>
            <option value="random">Random batch</option>
          </select>
        </label>
      </div>

      <div className={styles.formGroup}>
        <label className={styles.label}>
          Batch Size
          <select
            className={styles.select}
            value={batchSize}
            onChange={(event) => setBatchSize(Number(event.target.value))}
          >
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={250}>250</option>
            <option value={500}>500</option>
          </select>
        </label>
      </div>

      <div className={styles.formGroup}>
        <label className={styles.label}>
          Source Label
          <input
            className={styles.input}
            value={sourceLabel}
            onChange={(event) => setSourceLabel(event.target.value)}
          />
        </label>
      </div>

      <div className={styles.buttonStack}>
        <button
          className={styles.primaryButton}
          disabled={isBusy}
          onClick={() => void createSession()}
          type="button"
        >
          Start Watch Session
        </button>
      </div>

      <div className={styles.detailPanel}>
        <h3>Resume Sessions</h3>
        <div className={styles.sessionList}>
          {sessions.length === 0 ? (
            <p>No sessions yet.</p>
          ) : (
            sessions.slice(0, 8).map((session) => (
              <button
                className={styles.sessionButton}
                key={session.id}
                onClick={() => void loadSession(session.id)}
                type="button"
              >
                <strong>{session.title}</strong>
                <br />
                {session.status} // {session.itemCount} items // {session.pendingCount} pending
              </button>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
