import {
  CHARACTER_PIPELINE_STAGES,
  getCharacterPipelineProgress,
  getCharacterPipelineStageState,
} from "../pipelineStages";
import type { CharacterProjectStatus } from "../types";
import styles from "./characterForge.module.css";

export function CharacterProjectStageRail({
  status,
}: {
  status: CharacterProjectStatus;
}) {
  const progress = getCharacterPipelineProgress(status);

  return (
    <section className={styles.pipelinePanel} aria-label="Character pipeline">
      <div className={styles.sectionHeadingRow}>
        <div>
          <p className={styles.eyebrow}>Production pipeline</p>
          <h2 className={styles.sectionTitle}>Prompt to Unity Export</h2>
        </div>
        <div className={styles.progressReadout}>{progress}%</div>
      </div>

      <div className={styles.progressTrack} aria-hidden="true">
        <span style={{ width: `${progress}%` }} />
      </div>

      <ol className={styles.stageGrid}>
        {CHARACTER_PIPELINE_STAGES.map((stage, index) => {
          const stageState = getCharacterPipelineStageState(index, status);

          return (
            <li
              key={stage.id}
              className={styles.stageCard}
              data-state={stageState}
            >
              <div className={styles.stageNumber}>
                {String(index + 1).padStart(2, "0")}
              </div>
              <div>
                <div className={styles.stageLabel}>{stage.label}</div>
                <p className={styles.stageDescription}>{stage.description}</p>
              </div>
              <span className={styles.stageState}>{stageState}</span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
