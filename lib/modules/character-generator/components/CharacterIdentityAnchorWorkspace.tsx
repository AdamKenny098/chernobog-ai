"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import type {
  CharacterConcept,
  CharacterIdentityAnchor,
  CharacterProjectStatus,
} from "../types";
import styles from "./characterForge.module.css";

type NormalizedSelection = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type AnchorOperation = "save" | "approve" | "clear" | "retire";

type AnchorApiResponse = {
  ok: boolean;
  error?: string;
  project?: {
    status: CharacterProjectStatus;
    identityAnchor: CharacterIdentityAnchor | null;
  };
};

const DEFAULT_SELECTION: NormalizedSelection = {
  x: 0.03,
  y: 0.04,
  width: 0.3,
  height: 0.92,
};

const LEGACY_REFERENCE_STATUSES = new Set<CharacterProjectStatus>([
  "reference_sheet_generating",
  "reference_sheet_review",
  "reference_sheet_ready",
]);

const ANCHOR_STATUSES = new Set<CharacterProjectStatus>([
  "design_approved",
  "identity_anchor_draft",
  "identity_anchor_ready",
  ...LEGACY_REFERENCE_STATUSES,
]);

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

async function readAnchorResponse(response: Response): Promise<AnchorApiResponse> {
  const result = (await response.json()) as AnchorApiResponse;

  if (!response.ok || !result.ok) {
    throw new Error(result.error ?? "Identity anchor request failed.");
  }

  return result;
}

export function CharacterIdentityAnchorWorkspace({
  projectId,
  initialStatus,
  selectedConcept,
  initialIdentityAnchor,
}: {
  projectId: string;
  initialStatus: CharacterProjectStatus;
  selectedConcept: CharacterConcept | null;
  initialIdentityAnchor: CharacterIdentityAnchor | null;
}) {
  const router = useRouter();
  const imageRef = useRef<HTMLImageElement | null>(null);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const [status, setStatus] = useState(initialStatus);
  const [anchor, setAnchor] = useState(initialIdentityAnchor);
  const [selection, setSelection] =
    useState<NormalizedSelection>(DEFAULT_SELECTION);
  const [editing, setEditing] = useState(initialStatus === "design_approved");
  const [approvalConfirmed, setApprovalConfirmed] = useState(false);
  const [retirementConfirmed, setRetirementConfirmed] = useState(false);
  const [operation, setOperation] = useState<AnchorOperation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!ANCHOR_STATUSES.has(status)) {
    return null;
  }

  const endpoint = `/api/character-generator/projects/${encodeURIComponent(projectId)}/identity-anchor`;
  const conceptImageUrl = selectedConcept
    ? `/api/character-generator/projects/${encodeURIComponent(projectId)}/concepts/${encodeURIComponent(selectedConcept.id)}/image`
    : "";
  const anchorImageUrl = `${endpoint}/image${anchor ? `?v=${anchor.sha256.slice(0, 12)}` : ""}`;
  const busy = operation !== null;

  function beginOperation(nextOperation: AnchorOperation) {
    setOperation(nextOperation);
    setError(null);
    setSuccess(null);
  }

  function applyProject(result: AnchorApiResponse) {
    if (!result.project) {
      throw new Error("Chernobog returned no character project.");
    }

    setStatus(result.project.status);
    setAnchor(result.project.identityAnchor);
    setApprovalConfirmed(false);
    setRetirementConfirmed(false);
  }

  function updateSelectionFromPointer(
    clientX: number,
    clientY: number,
    element: HTMLDivElement
  ) {
    const start = dragStartRef.current;

    if (!start) {
      return;
    }

    const bounds = element.getBoundingClientRect();
    const currentX = clamp((clientX - bounds.left) / bounds.width, 0, 1);
    const currentY = clamp((clientY - bounds.top) / bounds.height, 0, 1);

    setSelection({
      x: Math.min(start.x, currentX),
      y: Math.min(start.y, currentY),
      width: Math.abs(currentX - start.x),
      height: Math.abs(currentY - start.y),
    });
  }

  function finishSelection(element: HTMLDivElement, pointerId: number) {
    dragStartRef.current = null;

    if (element.hasPointerCapture(pointerId)) {
      element.releasePointerCapture(pointerId);
    }

    setSelection((current) =>
      current.width < 0.04 || current.height < 0.04
        ? DEFAULT_SELECTION
        : current
    );
  }

  async function handleSaveCrop() {
    const sourceImage = imageRef.current;

    if (!sourceImage || !sourceImage.complete || sourceImage.naturalWidth === 0) {
      setError("Wait for the approved concept image to finish loading.");
      return;
    }

    const sourceWidth = sourceImage.naturalWidth;
    const sourceHeight = sourceImage.naturalHeight;
    const x = Math.round(selection.x * sourceWidth);
    const y = Math.round(selection.y * sourceHeight);
    const width = Math.min(
      sourceWidth - x,
      Math.round(selection.width * sourceWidth)
    );
    const height = Math.min(
      sourceHeight - y,
      Math.round(selection.height * sourceHeight)
    );

    if (width < 64 || height < 64) {
      setError("Draw a larger box around one complete full-body figure.");
      return;
    }

    beginOperation("save");

    try {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");

      if (!context) {
        throw new Error("This browser could not prepare the crop canvas.");
      }

      context.drawImage(
        sourceImage,
        x,
        y,
        width,
        height,
        0,
        0,
        width,
        height
      );

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (result) =>
            result
              ? resolve(result)
              : reject(new Error("The crop could not be encoded as PNG.")),
          "image/png"
        );
      });
      const formData = new FormData();
      formData.append("image", blob, "identity-anchor.png");
      formData.append(
        "metadata",
        JSON.stringify({
          width,
          height,
          crop: { x, y, width, height, sourceWidth, sourceHeight },
        })
      );

      const response = await fetch(endpoint, {
        method: "POST",
        body: formData,
      });
      const result = await readAnchorResponse(response);
      applyProject(result);
      setEditing(false);
      setSuccess(
        "Identity anchor saved. Inspect the crop carefully before approval."
      );
      router.refresh();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Identity anchor crop failed."
      );
    } finally {
      setOperation(null);
    }
  }

  async function runAction(action: "approve" | "clear" | "retire-legacy") {
    const nextOperation: AnchorOperation =
      action === "approve" ? "approve" : action === "clear" ? "clear" : "retire";
    beginOperation(nextOperation);

    try {
      const response = await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const result = await readAnchorResponse(response);
      applyProject(result);

      if (action === "approve") {
        setEditing(false);
        setSuccess(
          "Identity anchor approved. The canonical A-pose stage can now use this exact identity."
        );
      } else if (action === "clear") {
        setEditing(true);
        setSelection(DEFAULT_SELECTION);
        setSuccess("Identity anchor cleared. Draw a new crop when ready.");
      } else {
        setEditing(true);
        setSuccess(
          "Legacy turnaround images retired. Your approved concept is intact."
        );
      }

      router.refresh();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Identity anchor action failed."
      );
    } finally {
      setOperation(null);
    }
  }

  if (LEGACY_REFERENCE_STATUSES.has(status)) {
    return (
      <section className={styles.conceptPanel} id="identity-anchor">
        <div className={styles.briefHeader}>
          <div>
            <p className={styles.eyebrow}>CF1G-R1 / Pipeline correction</p>
            <h2 className={styles.briefTitle}>Retire Legacy Turnaround Set</h2>
            <p className={styles.mutedText}>
              The existing generated sheets contain invented characters and
              inconsistent views. They are not safe 3D input. Retire only those
              generated sheets; your approved concept and brief remain intact.
            </p>
          </div>
          <span className={styles.statusBadge}>Action required</span>
        </div>

        <div className={styles.warningMessage}>
          This permanently deletes the old generated turnaround image files
          from this project. It does not delete your selected concept.
        </div>
        {error ? <div className={styles.errorMessage}>{error}</div> : null}

        <div className={styles.conceptActionBar}>
          <label className={styles.approvalCheck}>
            <input
              type="checkbox"
              checked={retirementConfirmed}
              onChange={(event) => setRetirementConfirmed(event.target.checked)}
              disabled={busy}
            />
            <span>I understand the legacy turnaround images will be deleted.</span>
          </label>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={() => runAction("retire-legacy")}
            disabled={busy || !retirementConfirmed}
          >
            {operation === "retire" ? "Retiring legacy set..." : "Retire Legacy Set"}
          </button>
        </div>
      </section>
    );
  }

  if (!selectedConcept) {
    return (
      <section className={styles.conceptPanel} id="identity-anchor">
        <p className={styles.eyebrow}>CF1G-R1 / Identity source</p>
        <h2 className={styles.briefTitle}>Approved Concept Missing</h2>
        <div className={styles.errorMessage}>
          This project has no readable selected concept. Return to the design
          gate before creating an identity anchor.
        </div>
      </section>
    );
  }

  return (
    <section className={styles.conceptPanel} id="identity-anchor">
      <div className={styles.briefHeader}>
        <div>
          <p className={styles.eyebrow}>Stage 05 / Identity source</p>
          <h2 className={styles.briefTitle}>Create the Identity Anchor</h2>
          <p className={styles.mutedText}>
            Crop exactly one complete figure from the approved concept. This
            image preserves character identity; it is not yet the canonical
            A-pose used for mesh generation.
          </p>
        </div>
        <span className={styles.statusBadge}>
          {status === "identity_anchor_ready"
            ? "anchor approved"
            : status === "identity_anchor_draft"
              ? "review required"
              : "crop required"}
        </span>
      </div>

      {error ? <div className={styles.errorMessage}>{error}</div> : null}
      {success ? <div className={styles.successMessage}>{success}</div> : null}

      {editing ? (
        <div className={styles.cropWorkspace}>
          <div>
            <div
              className={styles.cropFrame}
              onPointerDown={(event) => {
                const bounds = event.currentTarget.getBoundingClientRect();
                dragStartRef.current = {
                  x: clamp((event.clientX - bounds.left) / bounds.width, 0, 1),
                  y: clamp((event.clientY - bounds.top) / bounds.height, 0, 1),
                };
                event.currentTarget.setPointerCapture(event.pointerId);
                updateSelectionFromPointer(
                  event.clientX,
                  event.clientY,
                  event.currentTarget
                );
              }}
              onPointerMove={(event) =>
                updateSelectionFromPointer(
                  event.clientX,
                  event.clientY,
                  event.currentTarget
                )
              }
              onPointerUp={(event) =>
                finishSelection(event.currentTarget, event.pointerId)
              }
              onPointerCancel={(event) =>
                finishSelection(event.currentTarget, event.pointerId)
              }
            >
              <Image
                ref={imageRef}
                src={conceptImageUrl}
                alt={`Approved ${selectedConcept.label} concept; drag to crop one figure`}
                width={selectedConcept.width || 768}
                height={selectedConcept.height || 1024}
                sizes="(max-width: 900px) 100vw, 70vw"
                className={styles.cropSourceImage}
                draggable={false}
                unoptimized
              />
              <span
                className={styles.cropSelection}
                style={{
                  left: `${selection.x * 100}%`,
                  top: `${selection.y * 100}%`,
                  width: `${selection.width * 100}%`,
                  height: `${selection.height * 100}%`,
                }}
                aria-hidden="true"
              />
            </div>
            <p className={styles.cropHint}>
              Drag anywhere on the image to redraw the orange box. Include the
              entire head, hands, feet, clothing, and equipment of one figure.
            </p>
          </div>

          <aside className={styles.cropChecklist}>
            <span className={styles.fieldLabel}>Crop quality gate</span>
            <ul>
              <li>One character only</li>
              <li>Full body visible</li>
              <li>No colour swatches or text</li>
              <li>No second pose inside the box</li>
            </ul>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() => setSelection(DEFAULT_SELECTION)}
              disabled={busy}
            >
              Reset Box
            </button>
            <button
              type="button"
              className={styles.primaryButton}
              onClick={handleSaveCrop}
              disabled={busy}
            >
              {operation === "save" ? "Saving crop..." : "Save Identity Crop"}
            </button>
          </aside>
        </div>
      ) : anchor ? (
        <div className={styles.anchorReviewGrid}>
          <div className={styles.anchorPreviewFrame}>
            <Image
              src={anchorImageUrl}
              alt="Saved character identity anchor"
              width={anchor.width}
              height={anchor.height}
              sizes="(max-width: 900px) 100vw, 50vw"
              className={styles.anchorPreviewImage}
              unoptimized
            />
          </div>

          <aside className={styles.cropChecklist}>
            <span className={styles.fieldLabel}>Saved anchor</span>
            <strong>{anchor.width} × {anchor.height} px</strong>
            <span className={styles.anchorHash}>
              SHA-256 {anchor.sha256.slice(0, 16)}…
            </span>
            <p className={styles.mutedText}>
              {status === "identity_anchor_ready"
                ? "Approved and locked as the identity source for canonical A-pose preparation."
                : "Inspect this crop. If it includes multiple figures, text, or cut-off anatomy, replace it before approval."}
            </p>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() => {
                setEditing(true);
                setError(null);
                setSuccess(null);
              }}
              disabled={busy}
            >
              Choose Different Crop
            </button>
            <button
              type="button"
              className={styles.textButton}
              onClick={() => runAction("clear")}
              disabled={busy}
            >
              {operation === "clear" ? "Clearing..." : "Clear Saved Anchor"}
            </button>
          </aside>
        </div>
      ) : null}

      {!editing && anchor ? (
        <div className={styles.conceptActionBar}>
          {status === "identity_anchor_draft" ? (
            <label className={styles.approvalCheck}>
              <input
                type="checkbox"
                checked={approvalConfirmed}
                onChange={(event) => setApprovalConfirmed(event.target.checked)}
                disabled={busy}
              />
              <span>
                I confirm this crop shows one complete version of the approved
                character and should define model identity.
              </span>
            </label>
          ) : (
            <span className={styles.gateMarker}>
              Identity gate complete / canonical A-pose is next
            </span>
          )}

          {status === "identity_anchor_draft" ? (
            <button
              type="button"
              className={styles.primaryButton}
              onClick={() => runAction("approve")}
              disabled={busy || !approvalConfirmed}
            >
              {operation === "approve" ? "Approving..." : "Approve Identity Anchor"}
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
