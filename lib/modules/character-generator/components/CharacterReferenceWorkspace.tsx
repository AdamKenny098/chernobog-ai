"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

import type {
  CharacterProjectStatus,
  CharacterReferenceSheet,
} from "../types";
import styles from "./characterForge.module.css";

type ProviderStatus = {
  provider: "comfyui";
  ready: boolean;
  endpoint: string;
  checkpoint: string | null;
  availableCheckpointCount: number;
  error?: string;
};

type ReferenceResponse = {
  ok: boolean;
  error?: string;
  provider?: ProviderStatus;
  project?: {
    status: CharacterProjectStatus;
    referenceSheet: CharacterReferenceSheet | null;
  };
};

const REFERENCE_STATUSES = new Set<CharacterProjectStatus>([
  "design_approved",
  "reference_sheet_generating",
  "reference_sheet_review",
  "reference_sheet_ready",
  "model_generating",
  "model_ready",
  "rigged",
  "validated",
  "exported",
]);

async function parseResponse(response: Response): Promise<ReferenceResponse> {
  const result = (await response.json()) as ReferenceResponse;

  if (!response.ok || !result.ok) {
    throw new Error(result.error ?? "Reference sheet request failed.");
  }

  return result;
}

async function createImageFingerprint(url: string): Promise<number[]> {
  const image = new window.Image();
  image.decoding = "async";
  image.src = url;
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("A reference image could not be analysed."));
  });

  const canvas = document.createElement("canvas");
  canvas.width = 24;
  canvas.height = 24;
  const context = canvas.getContext("2d", { willReadFrequently: true });

  if (!context) {
    throw new Error("Reference image analysis is unavailable in this browser.");
  }

  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
  const fingerprint: number[] = [];

  for (let index = 0; index < pixels.length; index += 4) {
    fingerprint.push(
      (pixels[index] * 0.299 +
        pixels[index + 1] * 0.587 +
        pixels[index + 2] * 0.114) /
        255
    );
  }

  return fingerprint;
}

function fingerprintDifference(left: number[], right: number[]): number {
  return (
    left.reduce(
      (difference, value, index) =>
        difference + Math.abs(value - (right[index] ?? value)),
      0
    ) / left.length
  );
}

export function CharacterReferenceWorkspace({
  projectId,
  initialStatus,
  initialReferenceSheet,
}: {
  projectId: string;
  initialStatus: CharacterProjectStatus;
  initialReferenceSheet: CharacterReferenceSheet | null;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [sheet, setSheet] = useState(initialReferenceSheet);
  const [provider, setProvider] = useState<ProviderStatus | null>(null);
  const [operation, setOperation] = useState<
    "check" | "generate" | "reset" | "rebuild" | "approve" | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [approvalConfirmed, setApprovalConfirmed] = useState(false);
  const [qualityState, setQualityState] = useState<
    "idle" | "checking" | "complete" | "failed"
  >("idle");
  const [qualityWarnings, setQualityWarnings] = useState<string[]>([]);
  const endpoint = `/api/character-generator/projects/${projectId}/reference-sheet`;
  const busy = operation !== null;

  useEffect(() => {
    if (status !== "design_approved") {
      return;
    }

    let cancelled = false;

    async function check() {
      setOperation("check");

      try {
        const result = await parseResponse(
          await fetch(endpoint, { method: "GET" })
        );

        if (!cancelled && result.provider) {
          setProvider(result.provider);
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Reference provider check failed."
          );
        }
      } finally {
        if (!cancelled) {
          setOperation(null);
        }
      }
    }

    void check();
    return () => {
      cancelled = true;
    };
  }, [endpoint, status]);

  useEffect(() => {
    if (
      status !== "reference_sheet_review" ||
      !sheet ||
      sheet.views.length !== 4
    ) {
      return;
    }

    let cancelled = false;

    async function analyseViews() {
      setQualityState("checking");
      setQualityWarnings([]);

      try {
        const fingerprints = await Promise.all(
          sheet!.views.map((view) =>
            createImageFingerprint(
              `/api/character-generator/projects/${encodeURIComponent(projectId)}/reference-sheet/${encodeURIComponent(view.id)}/image?v=${encodeURIComponent(view.updatedAt)}`
            )
          )
        );
        const warnings: string[] = [];

        for (let left = 0; left < fingerprints.length; left += 1) {
          for (let right = left + 1; right < fingerprints.length; right += 1) {
            if (
              fingerprintDifference(
                fingerprints[left],
                fingerprints[right]
              ) < 0.035
            ) {
              warnings.push(
                `${sheet!.views[left].label} and ${sheet!.views[right].label} appear nearly identical.`
              );
            }
          }
        }

        if (!cancelled) {
          setQualityWarnings(warnings);
          setQualityState("complete");
        }
      } catch (analysisError) {
        if (!cancelled) {
          setQualityWarnings([
            analysisError instanceof Error
              ? analysisError.message
              : "Automatic reference analysis failed.",
          ]);
          setQualityState("failed");
        }
      }
    }

    void analyseViews();
    return () => {
      cancelled = true;
    };
  }, [projectId, sheet, status]);

  if (!REFERENCE_STATUSES.has(status)) {
    return null;
  }

  function applyProject(result: ReferenceResponse) {
    if (!result.project) {
      throw new Error("Chernobog returned no character project.");
    }

    setStatus(result.project.status);
    setSheet(result.project.referenceSheet);
    setApprovalConfirmed(false);
  }

  async function checkProvider() {
    setOperation("check");
    setError(null);
    setSuccess(null);

    try {
      const result = await parseResponse(
        await fetch(endpoint, { method: "GET" })
      );

      if (result.provider) {
        setProvider(result.provider);
        setSuccess(
          result.provider.ready ? "ComfyUI is ready for turnaround generation." : null
        );
      }
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Reference provider check failed."
      );
    } finally {
      setOperation(null);
    }
  }

  async function generate() {
    setOperation("generate");
    setError(null);
    setSuccess(null);

    try {
      const result = await parseResponse(
        await fetch(endpoint, { method: "POST" })
      );
      applyProject(result);

      if (result.provider) {
        setProvider(result.provider);
      }

      setSuccess(
        "Four isolated reference views generated. Inspect and approve the set before 3D production."
      );
      router.refresh();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Reference generation failed."
      );
    } finally {
      setOperation(null);
    }
  }

  async function runAction(
    action: "reset-generation" | "rebuild" | "approve"
  ) {
    setOperation(
      action === "rebuild"
        ? "rebuild"
        : action === "approve"
          ? "approve"
          : "reset"
    );
    setError(null);
    setSuccess(null);

    try {
      const result = await parseResponse(
        await fetch(endpoint, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        })
      );
      applyProject(result);
      setSuccess(
        action === "rebuild"
          ? "Reference set cleared. You can generate a fresh turnaround."
          : action === "approve"
            ? "Turnaround approved. The 3D-generation input is now unlocked."
            : "Interrupted reference generation reset safely."
      );
      router.refresh();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Reference action failed."
      );
    } finally {
      setOperation(null);
    }
  }

  if (status === "design_approved") {
    return (
      <section className={styles.conceptPanel} id="reference-sheet">
        <div className={styles.conceptGenerationGrid}>
          <div>
            <p className={styles.eyebrow}>Stage 05 / Reference production</p>
            <h2 className={styles.briefTitle}>Build Model-ready Turnaround</h2>
            <p className={styles.mutedText}>
              Character Forge will generate four isolated construction views
              using the approved design definition and one shared identity
              seed: front, left profile, back, and three-quarter.
            </p>
          </div>

          <div className={styles.providerCard} data-ready={provider?.ready ?? false}>
            <span className={styles.fieldLabel}>Reference provider</span>
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
              onClick={checkProvider}
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
            Four single-view jobs run sequentially; keep this page open
          </span>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={generate}
            disabled={busy || provider?.ready !== true}
          >
            {operation === "generate"
              ? "Generating turnaround..."
              : "Generate Reference Set"}
          </button>
        </div>
      </section>
    );
  }

  if (status === "reference_sheet_generating") {
    return (
      <section className={styles.conceptPanel} id="reference-sheet">
        <p className={styles.eyebrow}>Stage 05 / Reference production</p>
        <h2 className={styles.briefTitle}>Reference Generation Interrupted</h2>
        <p className={styles.mutedText}>
          The project still carries an incomplete turnaround job. Reset it to
          the approved design checkpoint, then generate the set again.
        </p>
        {error ? <div className={styles.errorMessage}>{error}</div> : null}
        <div className={styles.conceptActionBar}>
          <span className={styles.gateMarker}>Partial reference images will be removed</span>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() => runAction("reset-generation")}
            disabled={busy}
          >
            {operation === "reset" ? "Resetting..." : "Reset Interrupted Job"}
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.conceptPanel} id="reference-sheet">
      <div className={styles.briefHeader}>
        <div>
          <p className={styles.eyebrow}>Stage 05 / Reference production</p>
          <h2 className={styles.briefTitle}>Model-ready Turnaround Set</h2>
          <p className={styles.mutedText}>
            The selected design is now expressed as four construction views.
            Review consistency before continuing to 3D generation.
          </p>
        </div>
        <span className={styles.statusBadge}>
          {status === "reference_sheet_review"
            ? "review required"
            : "reference sheet approved"}
        </span>
      </div>

      {error ? <div className={styles.errorMessage}>{error}</div> : null}
      {success ? <div className={styles.successMessage}>{success}</div> : null}

      {status === "reference_sheet_review" ? (
        qualityState === "checking" ? (
          <div className={styles.approvalBanner}>
            Analysing the four views for repeated compositions...
          </div>
        ) : qualityWarnings.length > 0 ? (
          <div className={styles.errorMessage}>
            <strong>Quality review warning</strong>
            {qualityWarnings.map((warning) => (
              <div key={warning}>{warning}</div>
            ))}
          </div>
        ) : qualityState === "complete" ? (
          <div className={styles.successMessage}>
            Automatic comparison found four visually distinct compositions.
            Manual inspection is still required.
          </div>
        ) : null
      ) : null}

      <div className={styles.conceptGrid}>
        {(sheet?.views ?? []).map((view, index) => {
          const imageUrl = `/api/character-generator/projects/${encodeURIComponent(projectId)}/reference-sheet/${encodeURIComponent(view.id)}/image?v=${encodeURIComponent(view.updatedAt)}`;

          return (
            <article key={view.id} className={styles.conceptCard}>
              <div className={styles.conceptImageFrame}>
                <Image
                  src={imageUrl}
                  alt={`${view.label} character reference`}
                  width={view.width || 768}
                  height={view.height || 1024}
                  sizes="(max-width: 900px) 100vw, 50vw"
                  className={styles.conceptImage}
                  unoptimized
                />
                <span className={styles.conceptIndex}>
                  {String(index + 1).padStart(2, "0")}
                </span>
              </div>
              <div className={styles.conceptCardBody}>
                <div className={styles.conceptCardHeading}>
                  <div>
                    <h3>{view.label}</h3>
                    <p>{view.angle.replaceAll("-", " ")}</p>
                  </div>
                  <span className={styles.selectedBadge}>Ready</span>
                </div>
                <div className={styles.conceptMetadata}>
                  <span>Seed {view.seed}</span>
                  <span>{view.model}</span>
                </div>
                <details className={styles.promptDetails}>
                  <summary>Reference prompt</summary>
                  <p>{view.generationPrompt}</p>
                </details>
              </div>
            </article>
          );
        })}
      </div>

      {status === "reference_sheet_review" ? (
        <div className={styles.conceptActionBar}>
          <label className={styles.approvalCheck}>
            <input
              type="checkbox"
              checked={approvalConfirmed}
              onChange={(event) => setApprovalConfirmed(event.target.checked)}
              disabled={busy || qualityState === "checking"}
            />
            <span>
              I inspected all four images. Each contains one full-body character
              at the labelled angle, with a consistent identity and costume.
            </span>
          </label>
          <div className={styles.briefButtons}>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() => runAction("rebuild")}
              disabled={busy}
            >
              {operation === "rebuild" ? "Clearing..." : "Reject and Rebuild"}
            </button>
            <button
              type="button"
              className={styles.primaryButton}
              onClick={() => runAction("approve")}
              disabled={busy || !approvalConfirmed || qualityState === "checking"}
            >
              {operation === "approve" ? "Approving..." : "Approve Turnaround"}
            </button>
          </div>
        </div>
      ) : status === "reference_sheet_ready" ? (
        <div className={styles.conceptActionBar}>
          <span className={styles.gateMarker}>
            CF1G complete — 3D generation input unlocked
          </span>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() => runAction("rebuild")}
            disabled={busy}
          >
            {operation === "rebuild" ? "Clearing..." : "Rebuild Reference Set"}
          </button>
        </div>
      ) : null}
    </section>
  );
}
