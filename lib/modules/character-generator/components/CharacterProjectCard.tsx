import Link from "next/link";

import { getCharacterPipelineProgress } from "../pipelineStages";
import type { CharacterProjectSummary } from "../types";
import styles from "./characterForge.module.css";

const DATE_FORMATTER = new Intl.DateTimeFormat("en-IE", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

function formatStatus(status: string): string {
  return status.replaceAll("_", " ");
}

export function CharacterProjectCard({
  project,
}: {
  project: CharacterProjectSummary;
}) {
  const progress = getCharacterPipelineProgress(project.status);

  return (
    <Link
      href={`/modules/character-forge/${project.id}`}
      className={styles.projectCard}
    >
      <div className={styles.projectCardTopline}>
        <span className={styles.statusBadge}>{formatStatus(project.status)}</span>
        <span className={styles.projectProgress}>{progress}%</span>
      </div>

      <div>
        <h2 className={styles.projectCardTitle}>{project.name}</h2>
        <p className={styles.projectId}>{project.id}</p>
      </div>

      <div className={styles.projectCardTrack} aria-hidden="true">
        <span style={{ width: `${progress}%` }} />
      </div>

      <div className={styles.projectCardFooter}>
        <span>Updated {DATE_FORMATTER.format(new Date(project.updatedAt))}</span>
        <span>{project.selectedConceptId ? "Concept selected" : "No concept yet"}</span>
      </div>
    </Link>
  );
}
