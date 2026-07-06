import type { VisualSchematicLibraryStats as Stats } from "../../visual-library/types";
import styles from "./schematicVisualLibrary.module.css";

type SchematicLibraryStatsProps = {
  stats: Stats;
};

export function SchematicLibraryStats({ stats }: SchematicLibraryStatsProps) {
  return (
    <section className={styles.statsGrid} aria-label="Schematic library statistics">
      <StatCard
        label="Visible schematics"
        value={`${stats.filteredSchematics.toLocaleString()} / ${stats.totalSchematics.toLocaleString()}`}
      />
      <StatCard
        label="Visible blocks"
        value={stats.filteredBlocks.toLocaleString()}
      />
      <StatCard label="Healthy" value={stats.okCount.toLocaleString()} />
      <StatCard label="Needs review" value={stats.issueCount.toLocaleString()} />
      <StatCard
        label="Average size"
        value={stats.averageBlockCount.toLocaleString()}
      />
      <StatCard
        label="Largest visible"
        value={stats.largestSchematic?.name ?? "None"}
        secondary={
          stats.largestSchematic
            ? `${stats.largestSchematic.blockCount.toLocaleString()} blocks`
            : undefined
        }
      />
    </section>
  );
}

function StatCard({
  label,
  value,
  secondary,
}: {
  label: string;
  value: string;
  secondary?: string;
}) {
  return (
    <article className={styles.statCard}>
      <span className={styles.statLabel}>{label}</span>
      <strong className={styles.statValue}>{value}</strong>
      {secondary ? <span className={styles.statSecondary}>{secondary}</span> : null}
    </article>
  );
}
