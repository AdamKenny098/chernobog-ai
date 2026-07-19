"use client";

import type { FormEvent, ReactNode } from "react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  CHARACTER_STYLE_PROFILES,
  type CharacterStyleProfile,
} from "../styleProfiles";
import type {
  CharacterBrief,
  CharacterProjectStatus,
  CharacterRenderingStyle,
} from "../types";
import styles from "./characterForge.module.css";

type BriefOperation = "generate" | "save" | "approve" | "reopen";

type BriefApiResponse = {
  ok: boolean;
  error?: string;
  project?: {
    brief: CharacterBrief | null;
    status: CharacterProjectStatus;
  };
  generation?: {
    source: "ollama" | "local-fallback";
    model: string;
    warning?: string;
  };
};

const STYLE_PROFILES = Object.values(
  CHARACTER_STYLE_PROFILES
) as CharacterStyleProfile[];

function listToLines(items: string[]): string {
  return items.join("\n");
}

function linesToList(value: string): string[] {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

async function readBriefResponse(response: Response): Promise<BriefApiResponse> {
  const result = (await response.json()) as BriefApiResponse;

  if (!response.ok || !result.ok) {
    throw new Error(result.error ?? "Character brief request failed.");
  }

  return result;
}

function BriefField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      {hint ? <span className={styles.fieldHint}>{hint}</span> : null}
      {children}
    </label>
  );
}

export function CharacterBriefWorkspace({
  projectId,
  projectName,
  sourcePrompt,
  initialBrief,
  initialStatus,
}: {
  projectId: string;
  projectName: string;
  sourcePrompt: string;
  initialBrief: CharacterBrief | null;
  initialStatus: CharacterProjectStatus;
}) {
  const router = useRouter();
  const [brief, setBrief] = useState(initialBrief);
  const [savedBrief, setSavedBrief] = useState(initialBrief);
  const [status, setStatus] = useState(initialStatus);
  const [operation, setOperation] = useState<BriefOperation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [approvalConfirmed, setApprovalConfirmed] = useState(false);

  const endpoint = `/api/character-generator/projects/${projectId}/brief`;
  const editable = status === "brief_draft";
  const canReopen = status === "brief_ready";
  const busy = operation !== null;
  const dirty = useMemo(
    () => JSON.stringify(brief) !== JSON.stringify(savedBrief),
    [brief, savedBrief]
  );

  function beginOperation(nextOperation: BriefOperation) {
    setOperation(nextOperation);
    setError(null);
    setSuccess(null);
    setWarning(null);
  }

  function applyProject(result: BriefApiResponse) {
    if (!result.project?.brief) {
      throw new Error("Chernobog returned no structured brief.");
    }

    setBrief(result.project.brief);
    setSavedBrief(result.project.brief);
    setStatus(result.project.status);
    setApprovalConfirmed(false);
  }

  function updateBrief(updater: (current: CharacterBrief) => CharacterBrief) {
    setBrief((current) => (current ? updater(current) : current));
    setError(null);
    setSuccess(null);
    setApprovalConfirmed(false);
  }

  async function handleGenerate() {
    beginOperation("generate");

    try {
      const response = await fetch(endpoint, {
        method: "POST",
      });
      const result = await readBriefResponse(response);
      applyProject(result);

      if (result.generation?.warning) {
        setWarning(result.generation.warning);
      } else {
        setSuccess(
          `Structured brief generated with ${result.generation?.model ?? "Chernobog"}. Review every field before approval.`
        );
      }

      router.refresh();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Character brief generation failed."
      );
    } finally {
      setOperation(null);
    }
  }

  async function handleSave(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();

    if (!brief) {
      return;
    }

    beginOperation("save");

    try {
      const response = await fetch(endpoint, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ brief }),
      });
      const result = await readBriefResponse(response);
      applyProject(result);
      setSuccess("Structured brief draft saved.");
      router.refresh();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Character brief save failed."
      );
    } finally {
      setOperation(null);
    }
  }

  async function handleApprove() {
    if (!brief || !approvalConfirmed) {
      return;
    }

    beginOperation("approve");

    try {
      const response = await fetch(endpoint, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "approve",
          brief,
        }),
      });
      const result = await readBriefResponse(response);
      applyProject(result);
      setSuccess(
        "Structured brief approved. Concept generation is now permitted."
      );
      router.refresh();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Character brief approval failed."
      );
    } finally {
      setOperation(null);
    }
  }

  async function handleReopen() {
    beginOperation("reopen");

    try {
      const response = await fetch(endpoint, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "reopen" }),
      });
      const result = await readBriefResponse(response);
      applyProject(result);
      setSuccess("Structured brief reopened for editing.");
      router.refresh();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Character brief could not be reopened."
      );
    } finally {
      setOperation(null);
    }
  }

  if (!brief) {
    return (
      <section className={styles.briefPanel} id="structured-brief">
        <div className={styles.briefEmptyState}>
          <div>
            <p className={styles.eyebrow}>Stage 02 / Structured brief</p>
            <h2 className={styles.briefTitle}>Translate Intent into Production</h2>
            <p className={styles.mutedText}>
              Chernobog will turn the source prompt into editable anatomy,
              costume, style, palette, equipment, and Unity constraints. The
              result remains a draft until you explicitly approve it.
            </p>
          </div>

          <div className={styles.sourcePreview}>
            <span className={styles.fieldLabel}>{projectName}</span>
            <p>{sourcePrompt}</p>
          </div>

          {error ? <div className={styles.errorMessage}>{error}</div> : null}

          <div className={styles.briefActionBar}>
            <span className={styles.gateMarker}>Approval required before concepts</span>
            <button
              type="button"
              className={styles.primaryButton}
              onClick={handleGenerate}
              disabled={busy || status !== "draft"}
            >
              {operation === "generate"
                ? "Generating brief..."
                : "Generate Structured Brief"}
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <form
      className={styles.briefPanel}
      id="structured-brief"
      onSubmit={handleSave}
    >
      <div className={styles.briefHeader}>
        <div>
          <p className={styles.eyebrow}>Stage 02 / Structured brief</p>
          <h2 className={styles.briefTitle}>Character Production Brief</h2>
          <p className={styles.mutedText}>
            {editable
              ? "Review and correct every field. Saving does not approve the brief."
              : "This approved brief is the production contract for later stages."}
          </p>
        </div>
        <span className={styles.statusBadge}>
          {editable ? "awaiting approval" : "approved"}
        </span>
      </div>

      {status === "brief_ready" ? (
        <div className={styles.approvalBanner}>
          Brief gate passed. Concept generation may use this definition.
        </div>
      ) : null}

      {error ? <div className={styles.errorMessage}>{error}</div> : null}
      {warning ? <div className={styles.warningMessage}>{warning}</div> : null}
      {success ? <div className={styles.successMessage}>{success}</div> : null}

      <fieldset className={styles.briefFieldset} disabled={!editable || busy}>
        <section className={styles.briefSection}>
          <div className={styles.briefSectionHeader}>
            <span>01</span>
            <h3>Identity and Anatomy</h3>
          </div>
          <div className={styles.briefGrid}>
            <BriefField label="Character type">
              <select
                className={styles.select}
                value={brief.characterType}
                onChange={(event) =>
                  updateBrief((current) => ({
                    ...current,
                    characterType: event.target.value as "human" | "humanoid",
                  }))
                }
              >
                <option value="human">Human</option>
                <option value="humanoid">Humanoid</option>
              </select>
            </BriefField>

            <BriefField label="Presentation">
              <input
                className={styles.input}
                value={brief.presentation}
                maxLength={120}
                onChange={(event) =>
                  updateBrief((current) => ({
                    ...current,
                    presentation: event.target.value,
                  }))
                }
              />
            </BriefField>

            <BriefField label="Age range">
              <input
                className={styles.input}
                value={brief.ageRange}
                maxLength={120}
                onChange={(event) =>
                  updateBrief((current) => ({
                    ...current,
                    ageRange: event.target.value,
                  }))
                }
              />
            </BriefField>

            <BriefField label="Body type">
              <input
                className={styles.input}
                value={brief.bodyType}
                maxLength={180}
                onChange={(event) =>
                  updateBrief((current) => ({
                    ...current,
                    bodyType: event.target.value,
                  }))
                }
              />
            </BriefField>

            <div className={styles.briefWideField}>
              <BriefField label="Proportion guidance">
                <textarea
                  className={`${styles.textarea} ${styles.compactTextarea}`}
                  value={brief.proportions}
                  maxLength={400}
                  onChange={(event) =>
                    updateBrief((current) => ({
                      ...current,
                      proportions: event.target.value,
                    }))
                  }
                />
              </BriefField>
            </div>
          </div>
        </section>

        <section className={styles.briefSection}>
          <div className={styles.briefSectionHeader}>
            <span>02</span>
            <h3>Face and Hair</h3>
          </div>
          <div className={styles.briefGrid}>
            <BriefField label="Face shape">
              <input
                className={styles.input}
                value={brief.face.shape}
                maxLength={180}
                onChange={(event) =>
                  updateBrief((current) => ({
                    ...current,
                    face: { ...current.face, shape: event.target.value },
                  }))
                }
              />
            </BriefField>

            <BriefField label="Default expression">
              <input
                className={styles.input}
                value={brief.face.expression}
                maxLength={180}
                onChange={(event) =>
                  updateBrief((current) => ({
                    ...current,
                    face: { ...current.face, expression: event.target.value },
                  }))
                }
              />
            </BriefField>

            <BriefField label="Hair style">
              <input
                className={styles.input}
                value={brief.hair.style}
                maxLength={180}
                onChange={(event) =>
                  updateBrief((current) => ({
                    ...current,
                    hair: { ...current.hair, style: event.target.value },
                  }))
                }
              />
            </BriefField>

            <BriefField label="Hair colour">
              <input
                className={styles.input}
                value={brief.hair.colour}
                maxLength={120}
                onChange={(event) =>
                  updateBrief((current) => ({
                    ...current,
                    hair: { ...current.hair, colour: event.target.value },
                  }))
                }
              />
            </BriefField>

            <div className={styles.briefWideField}>
              <BriefField label="Defining facial features" hint="One feature per line">
                <textarea
                  className={`${styles.textarea} ${styles.compactTextarea}`}
                  value={listToLines(brief.face.features)}
                  onChange={(event) =>
                    updateBrief((current) => ({
                      ...current,
                      face: {
                        ...current.face,
                        features: linesToList(event.target.value),
                      },
                    }))
                  }
                />
              </BriefField>
            </div>
          </div>
        </section>

        <section className={styles.briefSection}>
          <div className={styles.briefSectionHeader}>
            <span>03</span>
            <h3>Rendering Direction</h3>
          </div>
          <div className={styles.styleGrid}>
            {STYLE_PROFILES.map((profile) => (
              <label
                key={profile.id}
                className={styles.styleOption}
                data-selected={brief.style.renderingStyle === profile.id}
              >
                <input
                  type="radio"
                  name="renderingStyle"
                  value={profile.id}
                  checked={brief.style.renderingStyle === profile.id}
                  onChange={(event) =>
                    updateBrief((current) => ({
                      ...current,
                      style: {
                        ...current.style,
                        renderingStyle: event.target.value as CharacterRenderingStyle,
                      },
                    }))
                  }
                />
                <strong>{profile.label}</strong>
                <span>{profile.description}</span>
                <small>
                  {profile.defaultTriangleBudget.toLocaleString()} tris / {profile.defaultTextureResolution}px
                </small>
              </label>
            ))}
          </div>

          <div className={styles.briefGrid}>
            <BriefField label="Theme">
              <textarea
                className={`${styles.textarea} ${styles.compactTextarea}`}
                value={brief.style.theme}
                maxLength={400}
                onChange={(event) =>
                  updateBrief((current) => ({
                    ...current,
                    style: { ...current.style, theme: event.target.value },
                  }))
                }
              />
            </BriefField>

            <BriefField label="Shape language">
              <textarea
                className={`${styles.textarea} ${styles.compactTextarea}`}
                value={brief.style.shapeLanguage}
                maxLength={300}
                onChange={(event) =>
                  updateBrief((current) => ({
                    ...current,
                    style: {
                      ...current.style,
                      shapeLanguage: event.target.value,
                    },
                  }))
                }
              />
            </BriefField>

            <BriefField label="Detail level">
              <select
                className={styles.select}
                value={brief.style.detailLevel}
                onChange={(event) =>
                  updateBrief((current) => ({
                    ...current,
                    style: {
                      ...current.style,
                      detailLevel: event.target.value as "low" | "medium" | "high",
                    },
                  }))
                }
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </BriefField>
          </div>
        </section>

        <section className={styles.briefSection}>
          <div className={styles.briefSectionHeader}>
            <span>04</span>
            <h3>Costume and Equipment</h3>
          </div>
          <div className={styles.briefGrid}>
            {(
              [
                ["Clothing", "clothing"],
                ["Armour", "armour"],
                ["Accessories", "accessories"],
                ["Equipment", "equipment"],
              ] as const
            ).map(([label, field]) => (
              <BriefField key={field} label={label} hint="One item per line">
                <textarea
                  className={`${styles.textarea} ${styles.listTextarea}`}
                  value={listToLines(brief[field])}
                  onChange={(event) =>
                    updateBrief((current) => ({
                      ...current,
                      [field]: linesToList(event.target.value),
                    }))
                  }
                />
              </BriefField>
            ))}
          </div>
        </section>

        <section className={styles.briefSection}>
          <div className={styles.briefSectionHeader}>
            <span>05</span>
            <h3>Palette and Technical Target</h3>
          </div>
          <div className={styles.paletteGrid}>
            {(
              [
                ["Primary", "primary"],
                ["Secondary", "secondary"],
                ["Accent", "accent"],
              ] as const
            ).map(([label, field]) => (
              <BriefField key={field} label={`${label} colour`}>
                <input
                  className={styles.input}
                  value={brief.colours[field]}
                  maxLength={120}
                  onChange={(event) =>
                    updateBrief((current) => ({
                      ...current,
                      colours: {
                        ...current.colours,
                        [field]: event.target.value,
                      },
                    }))
                  }
                />
              </BriefField>
            ))}
          </div>

          <div className={styles.technicalGrid}>
            <BriefField label="Engine">
              <input className={styles.input} value="Unity" disabled />
            </BriefField>

            <BriefField label="Camera perspective">
              <select
                className={styles.select}
                value={brief.technical.cameraPerspective}
                onChange={(event) =>
                  updateBrief((current) => ({
                    ...current,
                    technical: {
                      ...current.technical,
                      cameraPerspective: event.target.value as CharacterBrief["technical"]["cameraPerspective"],
                    },
                  }))
                }
              >
                <option value="first-person">First person</option>
                <option value="third-person">Third person</option>
                <option value="isometric">Isometric</option>
              </select>
            </BriefField>

            <BriefField label="Target platform">
              <select
                className={styles.select}
                value={brief.technical.targetPlatform}
                onChange={(event) =>
                  updateBrief((current) => ({
                    ...current,
                    technical: {
                      ...current.technical,
                      targetPlatform: event.target.value as CharacterBrief["technical"]["targetPlatform"],
                    },
                  }))
                }
              >
                <option value="mobile">Mobile</option>
                <option value="desktop">Desktop</option>
                <option value="console">Console</option>
              </select>
            </BriefField>

            <BriefField label="Triangle budget" hint="5,000 to 250,000 triangles">
              <input
                type="number"
                className={styles.input}
                value={brief.technical.triangleBudget}
                min={5_000}
                max={250_000}
                step={1_000}
                onChange={(event) => {
                  const triangleBudget = event.target.valueAsNumber;

                  if (Number.isFinite(triangleBudget)) {
                    updateBrief((current) => ({
                      ...current,
                      technical: {
                        ...current.technical,
                        triangleBudget,
                      },
                    }));
                  }
                }}
              />
            </BriefField>

            <BriefField label="Texture resolution">
              <select
                className={styles.select}
                value={brief.technical.textureResolution}
                onChange={(event) =>
                  updateBrief((current) => ({
                    ...current,
                    technical: {
                      ...current.technical,
                      textureResolution: Number(event.target.value) as 1024 | 2048 | 4096,
                    },
                  }))
                }
              >
                <option value={1024}>1024 × 1024</option>
                <option value={2048}>2048 × 2048</option>
                <option value={4096}>4096 × 4096</option>
              </select>
            </BriefField>
          </div>
        </section>

        <section className={styles.briefSection}>
          <div className={styles.briefSectionHeader}>
            <span>06</span>
            <h3>Negative Requirements</h3>
          </div>
          <BriefField
            label="Production exclusions"
            hint="One prohibited feature or failure mode per line"
          >
            <textarea
              className={`${styles.textarea} ${styles.compactTextarea}`}
              value={listToLines(brief.negativeRequirements)}
              onChange={(event) =>
                updateBrief((current) => ({
                  ...current,
                  negativeRequirements: linesToList(event.target.value),
                }))
              }
            />
          </BriefField>
        </section>
      </fieldset>

      <div className={styles.briefActionBar}>
        {editable ? (
          <label className={styles.approvalCheck}>
            <input
              type="checkbox"
              checked={approvalConfirmed}
              onChange={(event) => setApprovalConfirmed(event.target.checked)}
              disabled={busy}
            />
            <span>
              I have reviewed the identity, visual direction, equipment, and
              technical target.
            </span>
          </label>
        ) : (
          <span className={styles.gateMarker}>
            {canReopen
              ? "Reopen before concept generation if revisions are required"
              : "Brief locked after concept production begins"}
          </span>
        )}

        <div className={styles.briefButtons}>
          {editable ? (
            <>
              <button
                type="submit"
                className={styles.secondaryButton}
                disabled={busy || !dirty}
              >
                {operation === "save" ? "Saving..." : "Save Draft"}
              </button>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={handleApprove}
                disabled={busy || !approvalConfirmed}
              >
                {operation === "approve" ? "Approving..." : "Approve Brief"}
              </button>
            </>
          ) : null}

          {canReopen ? (
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={handleReopen}
              disabled={busy}
            >
              {operation === "reopen" ? "Reopening..." : "Reopen Brief"}
            </button>
          ) : null}
        </div>
      </div>
    </form>
  );
}
