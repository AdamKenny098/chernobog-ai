import styles from "../saved-content-dashboard.module.css";

type StatusBadgeProps = {
  value?: string;
};

export default function StatusBadge({ value }: StatusBadgeProps) {
  const normalized = value ?? "unknown";
  const green = ["complete", "available", "applied", "analyzed", "derived", "scraped"].includes(normalized);
  const blue = ["processing", "watch-next", "analyze-next", "ready-to-analyze", "ready-for-review"].includes(normalized);
  const red = ["failed", "unavailable", "rejected", "dismissed"].includes(normalized);

  return (
    <span
      className={`${styles.badge} ${green ? styles.badgeGreen : ""} ${
        blue ? styles.badgeBlue : ""
      } ${red ? styles.badgeRed : ""}`}
    >
      {normalized}
    </span>
  );
}
