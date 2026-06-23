import styles from "../saved-content-dashboard.module.css";

type FilterRailProps = {
  activeView: string;
  activeFilter: string;
  setView: (view: "queue" | "reviews" | "ingest" | "diagnostics") => void;
  setFilter: (filter: string) => void;
};

const views = [
  ["queue", "Queue"],
  ["reviews", "Reviews"],
  ["ingest", "Import / Runs"],
  ["diagnostics", "Diagnostics"],
] as const;

const filters = [
  ["active", "Active"],
  ["inbox", "Inbox"],
  ["needs-transcript", "Needs Transcript"],
  ["ready-to-analyze", "Ready Analyze"],
  ["ready-for-review", "Ready Review"],
  ["needs-approval", "Needs Approval"],
  ["youtube", "YouTube"],
  ["tiktok", "TikTok"],
  ["archived", "Archived"],
  ["dismissed", "Dismissed"],
  ["all", "All"],
];

export default function FilterRail({
  activeView,
  activeFilter,
  setView,
  setFilter,
}: FilterRailProps) {
  return (
    <aside className={styles.filterRail}>
      <div className={styles.railSection}>
        <div className={styles.railTitle}>Operation</div>
        {views.map(([id, label]) => (
          <button
            className={`${styles.railButton} ${
              activeView === id ? styles.railButtonActive : ""
            }`}
            key={id}
            onClick={() => setView(id)}
            type="button"
          >
            {label}
          </button>
        ))}
      </div>

      <div className={styles.railSection}>
        <div className={styles.railTitle}>Queue Filters</div>
        {filters.map(([id, label]) => (
          <button
            className={`${styles.railButton} ${
              activeFilter === id ? styles.railButtonActive : ""
            }`}
            key={id}
            onClick={() => setFilter(id)}
            type="button"
          >
            {label}
          </button>
        ))}
      </div>
    </aside>
  );
}
