"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

import type {
  CharacterConcept,
  CharacterProjectStatus,
} from "../types";
import styles from "./characterForge.module.css";

type ConceptOperation =
  | "check"
  | "generate"
  | "select"
  | "clear"
  | "approve"
  | "reset";

type ProviderStatus = {
  provider: "comfyui";
  ready: boolean;
  endpoint: string;
  checkpoint: string | null;
  availableCheckpointCount: number;
  error?: string;
};

type ConceptApiResponse = {
  ok: boolean;
  error?: string;
  project?: {
    status: CharacterProjectStatus;
    concepts: CharacterConcept[];
    selectedConceptId: string | null;
  };
  provider?: ProviderStatus;
};

const CONCEPT_STAGE_STATUSES = new Set<CharacterProjectStatus>([
  "brief_ready",
  "concepts_generating",
  "concepts_ready",
  "concept_selected",
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
]);

const DESIGN_LOCKED_STATUSES = new Set<CharacterProjectStatus>([
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
]);

async function readConceptResponse(
  response: Response
): Promise<ConceptApiResponse> {
  const result = (await response.json()) as ConceptApiResponse;

  if (!response.ok || !result.ok) {
    throw new Error(result.error ?? "Character concept request failed.");
  }

  return result;
}

export function CharacterConceptWorkspace({
  projectId,
  initialConcepts,
  initialSelectedConceptId,
  initialStatus,
}: {
  projectId: string;
  initialConcepts: CharacterConcept[];
  initialSelectedConceptId: string | null;
  initialStatus: CharacterProjectStatus;
}) {
  const router = useRouter();
  const [concepts, setConcepts] = useState(initialConcepts);
  const [selectedConceptId, setSelectedConceptId] = useState(
    initialSelectedConceptId
  );
  const [status, setStatus] = useState(initialStatus);
  const [provider, setProvider] = useState<ProviderStatus | null>(null);
  const [operation, setOperation] = useState<ConceptOperation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [approvalConfirmed, setApprovalConfirmed] = useState(false);

  const endpoint = `/api/character-generator/projects/${projectId}/concepts`;
  const selectedConcept = useMemo(
    () => concepts.find((concept) => concept.id === selectedConceptId) ?? null,
    [concepts, selectedConceptId]
  );
  const designLocked = DESIGN_LOCKED_STATUSES.has(status);
  const busy = operation !== null;

  useEffect(() => {
    if (status !== "brief_ready") {
      return;
    }

    let cancelled = false;

    async function checkProvider() {
      setOperation("check");

      try {
        const response = await fetch(endpoint, { method: "GET" });
        const result = await readConceptResponse(response);

        if (!cancelled && result.provider) {
          setProvider(result.provider);
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Concept provider check failed."
          );
        }
      } finally {
        if (!cancelled) {
          setOperation(null);
        }
      }
    }

    void checkProvider();

    return () => {
      cancelled = true;
    };
  }, [endpoint, status]);

  if (!CONCEPT_STAGE_STATUSES.has(status)) {
    return null;
  }

  function beginOperation(nextOperation: ConceptOperation) {
    setOperation(nextOperation);
    setError(null);
    setSuccess(null);
  }

  function applyProject(result: ConceptApiResponse) {
    if (!result.project) {
      throw new Error("Chernobog returned no character project.");
    }

    setConcepts(result.project.concepts);
    setSelectedConceptId(result.project.selectedConceptId);
    setStatus(result.project.status);
    setApprovalConfirmed(false);
  }

  async function handleProviderCheck() {
    beginOperation("check");

    try {
      const response = await fetch(endpoint, { method: "GET" });
      const result = await readConceptResponse(response);

      if (result.provider) {
        setProvider(result.provider);
        setSuccess(
          result.provider.ready
            ? "ComfyUI is ready for concept generation."
            : null
        );
      }
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Concept provider check failed."
      );
    } finally {
      setOperation(null);
    }
  }

  async function handleGenerate() {
    beginOperation("generate");

    try {
      const response = await fetch(endpoint, { method: "POST" });
      const result = await readConceptResponse(response);
      applyProject(result);

      if (result.provider) {
        setProvider(result.provider);
      }

      setSuccess(
        "Four concept directions generated. Select one design to continue."
      );
      router.refresh();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Concept generation failed."
      );
    } finally {
      setOperation(null);
    }
  }

  async function runAction(
    action: "select" | "clear-selection" | "approve" | "reset-generation",
    conceptId?: string
  ) {
    const operationByAction: Record<typeof action, ConceptOperation> = {
      select: "select",
      "clear-selection": "clear",
      approve: "approve",
      "reset-generation": "reset",
    };
    beginOperation(operationByAction[action]);

    try {
      const response = await fetch(endpoint, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action,
          ...(conceptId ? { conceptId } : {}),
        }),
      });
      const result = await readConceptResponse(response);
      applyProject(result);

      switch (action) {
        case "select":
          setSuccess("Concept selected. Review it once more before approval.");
          break;
        case "clear-selection":
          setSuccess("Concept selection cleared.");
          break;
        case "approve":
          setSuccess(
            "Character design approved. The selected concept is now locked as the production source."
          );
          break;
        case "reset-generation":
          setSuccess("Interrupted generation reset. The brief remains approved.");
          break;
      }

      router.refresh();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Character concept action failed."
      );
    } finally {
      setOperation(null);
    }
  }

  if (status === "brief_ready") {
    return (
      <section className={styles.conceptPanel} id="concept-designs">
        <div className={styles.conceptGenerationGrid}>
          <div>
            <p className={styles.eyebrow}>Stage 03 / Concept generation</p>
            <h2 className={styles.briefTitle}>Generate Design Directions</h2>
            <p className={styles.mutedText}>
              Character Forge will create four full-body candidates from the
              approved brief: Vanguard, Specialist, Outlier, and Grounded. They
              share one identity but explore different production silhouettes.
            </p>
          </div>

          <div className={styles.providerCard} data-ready={provider?.ready ?? false}>
            <span className={styles.fieldLabel}>Image provider</span>
            <strong>
              {operation === "check"
                ? "Checking ComfyUI..."
                : provider?.ready
                  ? "ComfyUI ready"
                  : "ComfyUI not ready"}
            </strong>
            <span>
              {provider?.checkpoint ??
                provider?.error ??
                "Checking the local generation server."}
            </span>
            <button
              type="button"
              className={styles.textButton}
              onClick={handleProviderCheck}
              disabled={busy}
            >
              Recheck provider
            </button>
          </div>
        </div>

        {error ? <div className={styles.errorMessage}>{error}</div> : null}
        {success ? <div className={styles.successMessage}>{success}</div> : null}

        <div className={styles.conceptActionBar}>
          <span className={styles.gateMarker}>
            Four images generate sequentially; keep this page open
          </span>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={handleGenerate}
            disabled={busy || provider?.ready !== true}
          >
            {operation === "generate"
              ? "Generating four concepts..."
              : "Generate Concept Set"}
          </button>
        </div>
      </section>
    );
  }

  if (status === "concepts_generating") {
    return (
      <section className={styles.conceptPanel} id="concept-designs">
        <p className={styles.eyebrow}>Stage 03 / Concept generation</p>
        <h2 className={styles.briefTitle}>Generation Interrupted</h2>
        <p className={styles.mutedText}>
          This project is still marked as generating, usually because the page
          or server closed during a ComfyUI job. Reset the incomplete set, then
          start generation again.
        </p>
        {error ? <div className={styles.errorMessage}>{error}</div> : null}
        <div className={styles.conceptActionBar}>
          <span className={styles.gateMarker}>Incomplete images will be removed</span>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() => runAction("reset-generation")}
            disabled={busy}
          >
            {operation === "reset" ? "Resetting..." : "Reset Interrupted Generation"}
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.conceptPanel} id="concept-designs">
      <div className={styles.briefHeader}>
        <div>
          <p className={styles.eyebrow}>Stage 03–04 / Design gate</p>
          <h2 className={styles.briefTitle}>Choose the Character Design</h2>
          <p className={styles.mutedText}>
            Selection is reversible until approval. Approval locks one concept
            as the identity source for model production.
          </p>
        </div>
        <span className={styles.statusBadge}>
          {designLocked
            ? "design approved"
            : selectedConceptId
              ? "selection pending approval"
              : "selection required"}
        </span>
      </div>

      {designLocked && selectedConcept ? (
        <div className={styles.approvalBanner}>
          Approved production design: {selectedConcept.label}
        </div>
      ) : null}

      {error ? <div className={styles.errorMessage}>{error}</div> : null}
      {success ? <div className={styles.successMessage}>{success}</div> : null}

      <div className={styles.conceptGrid}>
        {concepts.map((concept) => {
          const selected = concept.id === selectedConceptId;
          const imageUrl = `/api/character-generator/projects/${encodeURIComponent(projectId)}/concepts/${encodeURIComponent(concept.id)}/image`;

          return (
            <article
              key={concept.id}
              className={styles.conceptCard}
              data-selected={selected}
            >
              <div className={styles.conceptImageFrame}>
                {concept.status === "ready" ? (
                  <Image
                    src={imageUrl}
                    alt={`${concept.label} concept for this character`}
                    width={concept.width || 768}
                    height={concept.height || 1024}
                    sizes="(max-width: 900px) 100vw, 50vw"
                    className={styles.conceptImage}
                    unoptimized
                  />
                ) : (
                  <div className={styles.conceptImagePlaceholder}>
                    {concept.status}
                  </div>
                )}
                <span className={styles.conceptIndex}>
                  {String(concepts.indexOf(concept) + 1).padStart(2, "0")}
                </span>
              </div>

              <div className={styles.conceptCardBody}>
                <div className={styles.conceptCardHeading}>
                  <div>
                    <h3>{concept.label}</h3>
                    <p>{concept.variationNotes}</p>
                  </div>
                  {selected ? (
                    <span className={styles.selectedBadge}>Selected</span>
                  ) : null}
                </div>

                <div className={styles.conceptMetadata}>
                  <span>Seed {concept.seed ?? "unknown"}</span>
                  <span>{concept.model || concept.provider}</span>
                </div>

                <details className={styles.promptDetails}>
                  <summary>Generation prompt</summary>
                  <p>{concept.generationPrompt}</p>
                </details>

                {!designLocked ? (
                  <button
                    type="button"
                    className={selected ? styles.secondaryButton : styles.primaryButton}
                    onClick={() => runAction("select", concept.id)}
                    disabled={busy || concept.status !== "ready"}
                  >
                    {operation === "select" && !selected
                      ? "Selecting..."
                      : selected
                        ? "Keep Selected"
                        : "Select This Direction"}
                  </button>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>

      <div className={styles.conceptActionBar}>
        {!designLocked && selectedConcept ? (
          <label className={styles.approvalCheck}>
            <input
              type="checkbox"
              checked={approvalConfirmed}
              onChange={(event) => setApprovalConfirmed(event.target.checked)}
              disabled={busy}
            />
            <span>
              I approve {selectedConcept.label} as the source design for
              identity anchoring, modelling, and rigging.
            </span>
          </label>
        ) : (
          <span className={styles.gateMarker}>
            {designLocked
              ? "Midpoint design gate complete"
              : "Select one candidate to open approval"}
          </span>
        )}

        <div className={styles.briefButtons}>
          {!designLocked && status === "concept_selected" ? (
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() => runAction("clear-selection")}
              disabled={busy}
            >
              {operation === "clear" ? "Clearing..." : "Clear Selection"}
            </button>
          ) : null}

          {!designLocked && selectedConcept ? (
            <button
              type="button"
              className={styles.primaryButton}
              onClick={() => runAction("approve")}
              disabled={busy || !approvalConfirmed}
            >
              {operation === "approve" ? "Approving..." : "Approve Selected Design"}
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
