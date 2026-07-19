import Link from "next/link";

import { ChernobogShell } from "@/components/chernobog-ui/ChernobogShell";
import { CharacterProjectCard } from "@/lib/modules/character-generator/components/CharacterProjectCard";
import styles from "@/lib/modules/character-generator/components/characterForge.module.css";
import { listCharacterProjects } from "@/lib/modules/character-generator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function CharacterForgePage() {
  const projects = await listCharacterProjects();
  const activeProjects = projects.filter(
    (project) => project.status !== "exported",
  );
  const approvedDesigns = projects.filter((project) =>
    [
      "design_approved",
      "identity_anchor_draft",
      "identity_anchor_ready",
      "canonical_pose_generating",
      "canonical_pose_review",
      "canonical_pose_ready",
      "reference_sheet_generating",
      "reference_sheet_review",
      "reference_sheet_ready",
      "model_generating",
      "model_ready",
      "rigged",
      "validated",
      "exported",
    ].includes(project.status),
  );

  return (
    <ChernobogShell currentArea="Character Forge">
      <main className={styles.page}>
        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>Chernobog creative systems</p>
            <h1 className={styles.title}>Character Forge</h1>
            <p className={styles.heroText}>
              Direct characters from initial intent through concept approval,
              model production, rig validation, and Unity-ready export.
            </p>
          </div>

          <div className={styles.heroActions}>
            <span className={styles.systemMarker}>
              CF1H-A / Local 3D Readiness Online
            </span>
            <Link
              href="/modules/character-forge/new"
              className={styles.primaryButton}
            >
              New Character Project
            </Link>
          </div>
        </section>

        <section
          className={styles.metricGrid}
          aria-label="Character Forge summary"
        >
          <div className={styles.metric}>
            <div className={styles.metricValue}>{projects.length}</div>
            <div className={styles.metricLabel}>Total projects</div>
          </div>
          <div className={styles.metric}>
            <div className={styles.metricValue}>{activeProjects.length}</div>
            <div className={styles.metricLabel}>Active pipelines</div>
          </div>
          <div className={styles.metric}>
            <div className={styles.metricValue}>{approvedDesigns.length}</div>
            <div className={styles.metricLabel}>Approved designs</div>
          </div>
        </section>

        <section className={styles.contentSection}>
          <div className={styles.sectionHeadingRow}>
            <div>
              <p className={styles.eyebrow}>Project archive</p>
              <h2 className={styles.sectionTitle}>Character Projects</h2>
            </div>
            <span className={styles.systemMarker}>
              {projects.length === 1
                ? "1 record"
                : `${projects.length} records`}
            </span>
          </div>

          {projects.length > 0 ? (
            <div className={styles.projectGrid}>
              {projects.map((project) => (
                <CharacterProjectCard key={project.id} project={project} />
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>
              <div className={styles.emptyStateInner}>
                <h3 className={styles.emptyStateTitle}>The forge is empty</h3>
                <p className={styles.mutedText}>
                  Create the first project here or issue an explicit Character
                  Forge command through Chernobog.
                </p>
                <div style={{ marginTop: 20 }}>
                  <Link
                    href="/modules/character-forge/new"
                    className={styles.primaryButton}
                  >
                    Create First Character
                  </Link>
                </div>
              </div>
            </div>
          )}
        </section>
      </main>
    </ChernobogShell>
  );
}
