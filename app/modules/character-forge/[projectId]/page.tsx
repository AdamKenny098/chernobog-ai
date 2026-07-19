import Link from "next/link";
import { notFound } from "next/navigation";

import { ChernobogShell } from "@/components/chernobog-ui/ChernobogShell";
import { CharacterBriefWorkspace } from "@/lib/modules/character-generator/components/CharacterBriefWorkspace";
import { CharacterConceptWorkspace } from "@/lib/modules/character-generator/components/CharacterConceptWorkspace";
import { CharacterCanonicalPoseWorkspace } from "@/lib/modules/character-generator/components/CharacterCanonicalPoseWorkspace";
import { CharacterIdentityAnchorWorkspace } from "@/lib/modules/character-generator/components/CharacterIdentityAnchorWorkspace";
import { CharacterModelWorkspace } from "@/lib/modules/character-generator/components/CharacterModelWorkspace";
import { CharacterProjectEditor } from "@/lib/modules/character-generator/components/CharacterProjectEditor";
import { CharacterProjectStageRail } from "@/lib/modules/character-generator/components/CharacterProjectStageRail";
import styles from "@/lib/modules/character-generator/components/characterForge.module.css";
import {
  CharacterProjectValidationError,
  readCharacterProject,
} from "@/lib/modules/character-generator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DATE_FORMATTER = new Intl.DateTimeFormat("en-IE", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const LEGACY_REFERENCE_STATUSES = new Set([
  "reference_sheet_generating",
  "reference_sheet_review",
  "reference_sheet_ready",
]);

type CharacterProjectPageProps = {
  params: Promise<{
    projectId: string;
  }>;
};

export default async function CharacterProjectPage({
  params,
}: CharacterProjectPageProps) {
  const { projectId: encodedProjectId } = await params;
  let projectId: string;

  try {
    projectId = decodeURIComponent(encodedProjectId);
  } catch (error) {
    if (error instanceof URIError) {
      notFound();
    }

    throw error;
  }

  let project;

  try {
    project = await readCharacterProject(projectId);
  } catch (error) {
    if (error instanceof CharacterProjectValidationError) {
      notFound();
    }

    throw error;
  }

  if (!project) {
    notFound();
  }

  const briefState = project.brief
    ? project.status === "brief_draft"
      ? "Draft — review required"
      : "Approved"
    : "Not generated";
  const selectedConcept =
    project.concepts.find(
      (concept) => concept.id === project.selectedConceptId,
    ) ?? null;

  const nextGate =
    project.status === "draft"
      ? {
          title: "Structured Brief",
          description:
            "Generate the editable production definition from the source prompt, then review it field by field.",
          marker: "Ready to generate",
        }
      : project.status === "brief_draft"
        ? {
            title: "Brief Approval",
            description:
              "Confirm the identity, rendering direction, equipment, and Unity targets before approving the brief.",
            marker: "User approval required",
          }
        : project.status === "brief_ready"
          ? {
              title: "Concept Generation",
              description:
                "The brief gate is complete. Generate four visually distinct candidates from the approved production definition.",
              marker: "Ready to generate",
            }
          : project.status === "concepts_generating"
            ? {
                title: "Concept Generation",
                description:
                  "ComfyUI is producing the candidate set. Keep the workspace open until all four images are stored.",
                marker: "Generation in progress",
              }
            : project.status === "concepts_ready"
              ? {
                  title: "Design Selection",
                  description:
                    "Compare the four candidates and select the direction that should drive production.",
                  marker: "User selection required",
                }
              : project.status === "concept_selected"
                ? {
                    title: "Design Approval",
                    description:
                      "Review the selected candidate once more and explicitly approve it as the production source.",
                    marker: "User approval required",
                  }
                : project.status === "design_approved"
                  ? {
                      title: "Identity Anchor",
                      description:
                        "Crop one complete figure from the approved concept. This becomes the persistent identity source for canonical pose preparation.",
                      marker: "User crop required",
                    }
                  : project.status === "identity_anchor_draft"
                    ? {
                        title: "Identity Approval",
                        description:
                          "Inspect the saved crop and confirm it contains exactly one complete version of the approved character.",
                        marker: "User approval required",
                      }
                    : project.status === "identity_anchor_ready"
                      ? {
                          title: "Canonical A-pose Setup",
                          description:
                            "Verify that local ComfyUI has the SDXL, IP-Adapter, CLIP Vision, and OpenPose components required for controlled pose preparation.",
                          marker: "Provider check required",
                        }
                      : project.status === "canonical_pose_generating"
                        ? {
                            title: "Canonical A-pose",
                            description:
                              "ComfyUI is preparing the single mesh-facing character source.",
                            marker: "Generation in progress",
                          }
                        : project.status === "canonical_pose_review"
                          ? {
                              title: "Canonical Pose Approval",
                              description:
                                "Inspect identity, symmetry, full-body framing, limb separation, and the fixed A-pose before approval.",
                              marker: "User approval required",
                            }
                          : project.status === "canonical_pose_ready"
                            ? {
                                title: "Local 3D Readiness",
                                description:
                                  "Verify the isolated Stable Fast 3D backend before sending the identity-locked A-pose to mesh generation.",
                                marker: "Provider check required",
                              }
                            : project.status === "model_generating"
                              ? {
                                  title: "Local 3D Reconstruction",
                                  description:
                                    "Stable Fast 3D is reconstructing and texture-baking the approved canonical source locally.",
                                  marker: "Generation in progress",
                                }
                              : project.status === "model_ready" &&
                                  !project.modelAsset?.approvedAt
                                ? {
                                    title: "Model Approval",
                                    description:
                                      "Orbit the textured GLB, inspect every side, and explicitly approve or reject it before rigging.",
                                    marker: "User approval required",
                                  }
                                : project.status === "model_ready"
                                  ? {
                                      title: "Automatic Rigging",
                                      description:
                                        "The generated model is approved and locked as the source for skeleton and skin-weight generation.",
                                      marker: "Ready for next patch",
                                    }
                            : LEGACY_REFERENCE_STATUSES.has(project.status)
                              ? {
                                  title: "Pipeline Correction",
                                  description:
                                    "Retire the inconsistent legacy turnaround images, then create a single identity anchor from the approved concept.",
                                  marker: "Action required",
                                }
                              : {
                                  title: "Production Pipeline",
                                  description:
                                    "This character has progressed beyond reference production.",
                                  marker: "In production",
                                };

  return (
    <ChernobogShell currentArea={`Character Forge / ${project.name}`}>
      <main className={styles.page}>
        <section className={styles.workspaceHeader}>
          <div>
            <p className={styles.eyebrow}>Character project workspace</p>
            <h1 className={styles.workspaceTitle}>{project.name}</h1>
            <p className={styles.workspaceId}>{project.id}</p>
          </div>

          <div className={styles.workspaceActions}>
            <Link
              href="/modules/character-forge"
              className={styles.secondaryButton}
            >
              Project Library
            </Link>
            <Link
              href="/modules/character-forge/new"
              className={styles.primaryButton}
            >
              New Character
            </Link>
          </div>
        </section>

        <section className={styles.metadataGrid} aria-label="Project metadata">
          <div className={styles.metadataItem}>
            <div className={styles.metadataLabel}>Status</div>
            <div className={styles.metadataValue}>
              {project.status.replaceAll("_", " ")}
            </div>
          </div>
          <div className={styles.metadataItem}>
            <div className={styles.metadataLabel}>Created</div>
            <div className={styles.metadataValue}>
              {DATE_FORMATTER.format(new Date(project.createdAt))}
            </div>
          </div>
          <div className={styles.metadataItem}>
            <div className={styles.metadataLabel}>Updated</div>
            <div className={styles.metadataValue}>
              {DATE_FORMATTER.format(new Date(project.updatedAt))}
            </div>
          </div>
          <div className={styles.metadataItem}>
            <div className={styles.metadataLabel}>Concepts</div>
            <div className={styles.metadataValue}>
              {project.concepts.length}
            </div>
          </div>
        </section>

        <CharacterProjectStageRail status={project.status} />

        <section className={styles.workspaceGrid}>
          <CharacterProjectEditor
            key={project.updatedAt}
            projectId={project.id}
            initialName={project.name}
            initialPrompt={project.originalPrompt}
            status={project.status}
          />

          <aside className={styles.workspaceSidebar}>
            <section className={styles.nextStagePanel}>
              <p className={styles.eyebrow}>Next production gate</p>
              <h2 className={styles.sectionTitle}>{nextGate.title}</h2>
              <p className={styles.mutedText}>{nextGate.description}</p>
              <span className={styles.lockedMarker}>{nextGate.marker}</span>
            </section>

            <section className={styles.metadataPanel}>
              <p className={styles.eyebrow}>Asset state</p>
              <h2 className={styles.sectionTitle}>Production Inventory</h2>
              <div className={styles.detailList}>
                <div className={styles.detailRow}>
                  <span>Brief</span>
                  <strong>{briefState}</strong>
                </div>
                <div className={styles.detailRow}>
                  <span>Concept candidates</span>
                  <strong>{project.concepts.length}</strong>
                </div>
                <div className={styles.detailRow}>
                  <span>Selected concept</span>
                  <strong>{project.selectedConceptId ?? "None"}</strong>
                </div>
                <div className={styles.detailRow}>
                  <span>Identity anchor</span>
                  <strong>
                    {project.identityAnchor?.approvedAt
                      ? "Approved"
                      : project.identityAnchor
                        ? "Draft"
                        : "None"}
                  </strong>
                </div>
                <div className={styles.detailRow}>
                  <span>Canonical A-pose</span>
                  <strong>
                    {project.canonicalPose?.approvedAt
                      ? "Approved"
                      : project.canonicalPose
                        ? "Review"
                        : "None"}
                  </strong>
                </div>
                <div className={styles.detailRow}>
                  <span>Generated model</span>
                  <strong>
                    {project.modelAsset?.approvedAt
                      ? "Approved"
                      : project.modelAsset
                        ? "Review"
                        : "None"}
                  </strong>
                </div>
                <div className={styles.detailRow}>
                  <span>Legacy reference views</span>
                  <strong>{project.referenceSheet?.views.length ?? 0}</strong>
                </div>
                <div className={styles.detailRow}>
                  <span>Unity target</span>
                  <strong>Planned</strong>
                </div>
              </div>
            </section>
          </aside>
        </section>

        <CharacterBriefWorkspace
          projectId={project.id}
          projectName={project.name}
          sourcePrompt={project.originalPrompt}
          initialBrief={project.brief}
          initialStatus={project.status}
        />

        <CharacterConceptWorkspace
          projectId={project.id}
          initialConcepts={project.concepts}
          initialSelectedConceptId={project.selectedConceptId}
          initialStatus={project.status}
        />

        <CharacterIdentityAnchorWorkspace
          projectId={project.id}
          initialStatus={project.status}
          selectedConcept={selectedConcept}
          initialIdentityAnchor={project.identityAnchor ?? null}
        />

        <CharacterCanonicalPoseWorkspace
          projectId={project.id}
          initialStatus={project.status}
          initialIdentityAnchor={project.identityAnchor ?? null}
          initialCanonicalPose={project.canonicalPose ?? null}
        />

        <CharacterModelWorkspace
          projectId={project.id}
          projectName={project.name}
          initialStatus={project.status}
          initialCanonicalPose={project.canonicalPose ?? null}
          initialModelAsset={project.modelAsset ?? null}
        />
      </main>
    </ChernobogShell>
  );
}
