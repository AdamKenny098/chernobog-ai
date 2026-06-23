import styles from "../saved-content-dashboard.module.css";

type SummaryBarProps = {
  summary: Record<string, number>;
};

const cards: Array<[keyof SummaryBarProps["summary"], string]> = [
  ["totalItems", "Total"],
  ["activeItems", "Active"],
  ["needsTranscript", "Needs Transcript"],
  ["readyToAnalyze", "Ready Analyze"],
  ["readyForReview", "Ready Review"],
  ["pendingReviews", "Pending Reviews"],
  ["duplicateGroups", "Duplicates"],
  ["ingestRuns", "Runs"],
];

export default function SummaryBar({ summary }: SummaryBarProps) {
  return (
    <section className={styles.summaryGrid}>
      {cards.map(([key, label]) => (
        <div className={styles.summaryCard} key={String(key)}>
          <span>{label}</span>
          <strong>{summary[key] ?? 0}</strong>
        </div>
      ))}
    </section>
  );
}
