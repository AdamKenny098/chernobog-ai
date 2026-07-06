import Link from "next/link";

import type {
  VisualSchematicSummary,
  VisualValidationLevel,
} from "../../visual-library/types";
import { SchematicPreviewPlaceholder } from "./SchematicPreviewPlaceholder";
import styles from "./schematicVisualLibrary.module.css";

type SchematicLibraryCardProps = {
  schematic: VisualSchematicSummary;
};

export function SchematicLibraryCard({ schematic }: SchematicLibraryCardProps) {
  const createdDate = formatDate(schematic.createdAt);
  const statusClassName =
    schematic.status === "ok"
      ? `${styles.pill} ${styles.statusOk}`
      : `${styles.pill} ${styles.statusWarning}`;
  const validationClassName = `${styles.pill} ${getValidationClassName(
    schematic.validationSummary.level,
  )}`;

  return (
    <article className={styles.card}>
      <div className={styles.cardHeader}>
        <div className={styles.titleRow}>
          <h2 className={styles.cardTitle}>{schematic.name}</h2>
          <span className={statusClassName}>{schematic.status}</span>
        </div>

        <div className={styles.tagRow}>
          <span className={styles.pill}>{schematic.category}</span>
          <span className={styles.pill}>{schematic.theme}</span>
          <span className={validationClassName}>
            {formatValidationLabel(schematic.validationSummary.level)}
          </span>
        </div>
      </div>

      <SchematicPreviewPlaceholder schematic={schematic} />

      <div className={styles.metaRows}>
        <div className={styles.metaRow}>
          <span className={styles.metaLabel}>Version</span>
          <span>{schematic.targetMinecraftVersion}</span>
        </div>

        <div className={styles.metaRow}>
          <span className={styles.metaLabel}>Size</span>
          <span>
            {schematic.size.x} × {schematic.size.y} × {schematic.size.z}
          </span>
        </div>

        <div className={styles.metaRow}>
          <span className={styles.metaLabel}>Blocks</span>
          <span>{schematic.blockCount.toLocaleString()}</span>
        </div>

        <div className={styles.metaRow}>
          <span className={styles.metaLabel}>Validation</span>
          <span>{formatValidationSummary(schematic)}</span>
        </div>

        <div className={styles.metaRow}>
          <span className={styles.metaLabel}>Created</span>
          <span>{createdDate}</span>
        </div>
      </div>

      {schematic.tags.length > 0 ? (
        <div className={styles.tagRow}>
          {schematic.tags.slice(0, 8).map((tag) => (
            <Link
              key={tag}
              className={styles.tag}
              href={`/schematics?tag=${encodeURIComponent(tag)}`}
            >
              {tag}
            </Link>
          ))}
        </div>
      ) : null}

      <Link
        className={styles.cardOpen}
        href={`/schematics/${encodeURIComponent(schematic.id)}`}
      >
        Open schematic
      </Link>
    </article>
  );
}

function formatDate(value: string | null): string {
  if (!value) {
    return "Unknown";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-IE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
}

function getValidationClassName(level: VisualValidationLevel): string {
  switch (level) {
    case "passed":
      return styles.statusOk;
    case "warning":
      return styles.statusWarning;
    case "failed":
      return styles.statusDanger;
    case "unknown":
    default:
      return styles.statusNeutral;
  }
}

function formatValidationLabel(level: VisualValidationLevel): string {
  switch (level) {
    case "passed":
      return "validation passed";
    case "warning":
      return "warnings";
    case "failed":
      return "failed";
    case "unknown":
    default:
      return "not validated";
  }
}

function formatValidationSummary(schematic: VisualSchematicSummary): string {
  const summary = schematic.validationSummary;

  if (summary.level === "unknown") {
    return "Pending";
  }

  if (summary.errorCount > 0) {
    return `${summary.errorCount} error(s)`;
  }

  if (summary.warningCount > 0) {
    return `${summary.warningCount} warning(s)`;
  }

  return summary.messageCount > 0
    ? `${summary.messageCount} message(s)`
    : "Clean";
}
