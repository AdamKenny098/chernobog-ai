import styles from "../saved-content-watch.module.css";

type WatchStatsProps = {
  stats: {
    total: number;
    currentPosition: number;
    pending: number;
    watched: number;
    analyzeLater: number;
    skipped: number;
    dismissed: number;
    progressPercent: number;
  } | null;
  session: {
    title: string;
    status: string;
  } | null;
};

export default function WatchStats({ stats, session }: WatchStatsProps) {
  const cards = [
    ["Session", session?.status ?? "none"],
    ["Total", String(stats?.total ?? 0)],
    ["Position", `${stats?.currentPosition ?? 0}/${stats?.total ?? 0}`],
    ["Progress", `${stats?.progressPercent ?? 0}%`],
    ["Pending", String(stats?.pending ?? 0)],
    ["Watched", String(stats?.watched ?? 0)],
    ["Analyze", String(stats?.analyzeLater ?? 0)],
    ["Dismissed", String(stats?.dismissed ?? 0)],
  ];

  return (
    <section className={styles.statsGrid}>
      {cards.map(([label, value]) => (
        <div className={styles.statCard} key={label}>
          <span>{label}</span>
          <strong>{value}</strong>
        </div>
      ))}
    </section>
  );
}
