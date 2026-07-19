"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import type {
  CharacterCanonicalPose,
  CharacterIdentityAnchor,
  CharacterProjectStatus,
} from "../types";
import type { CharacterCanonicalPoseProviderStatus } from "../source/comfyUiCanonicalPoseProvider";
import styles from "./characterForge.module.css";

type PoseOperation = "check" | "generate" | "approve" | "reject" | "reset";

type PoseApiResponse = {
  ok: boolean;
  error?: string;
  provider?: CharacterCanonicalPoseProviderStatus;
  project?: {
    status: CharacterProjectStatus;
    canonicalPose: CharacterCanonicalPose | null;
  };
};

const POSE_STATUSES = new Set<CharacterProjectStatus>([
  "identity_anchor_ready",
  "canonical_pose_generating",
  "canonical_pose_review",
  "canonical_pose_ready",
]);

async function readPoseResponse(response: Response): Promise<PoseApiResponse> {
  const result = (await response.json()) as PoseApiResponse;

  if (!response.ok || !result.ok) {
    throw new Error(result.error ?? "Canonical pose request failed.");
  }

  return result;
}

export function CharacterCanonicalPoseWorkspace({
  projectId,
  initialStatus,
  initialIdentityAnchor,
  initialCanonicalPose,
}: {
  projectId: string;
  initialStatus: CharacterProjectStatus;
  initialIdentityAnchor: CharacterIdentityAnchor | null;
  initialCanonicalPose: CharacterCanonicalPose | null;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [pose, setPose] = useState(initialCanonicalPose);
  const [provider, setProvider] =
    useState<CharacterCanonicalPoseProviderStatus | null>(null);
  const [operation, setOperation] = useState<PoseOperation | null>(null);
  const [approvalConfirmed, setApprovalConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const endpoint = `/api/character-generator/projects/${encodeURIComponent(projectId)}/canonical-pose`;
  const poseImageUrl = `${endpoint}/image${pose ? `?v=${pose.sha256.slice(0, 12)}` : ""}`;
  const busy = operation !== null;

  useEffect(() => {
    if (status !== "identity_anchor_ready") {
      return;
    }

    let cancelled = false;

    async function checkProvider() {
      setOperation("check");
      setError(null);

      try {
        const result = await readPoseResponse(
          await fetch(endpoint, { method: "GET" }),
        );

        if (!cancelled && result.provider) {
          setProvider(result.provider);
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Canonical-pose provider check failed.",
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

  if (!POSE_STATUSES.has(status)) {
    return null;
  }

  function beginOperation(nextOperation: PoseOperation) {
    setOperation(nextOperation);
    setError(null);
    setSuccess(null);
  }

  function applyProject(result: PoseApiResponse) {
    if (!result.project) {
      throw new Error("Chernobog returned no character project.");
    }

    setStatus(result.project.status);
    setPose(result.project.canonicalPose);
    setApprovalConfirmed(false);
  }

  async function handleProviderCheck() {
    beginOperation("check");

    try {
      const result = await readPoseResponse(
        await fetch(endpoint, { method: "GET" }),
      );

      if (result.provider) {
        setProvider(result.provider);
        setSuccess(
          result.provider.ready
            ? "Every local canonical-pose dependency is ready."
            : "Readiness refreshed. Missing components are listed below.",
        );
      }
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Canonical-pose provider check failed.",
      );
    } finally {
      setOperation(null);
    }
  }

  async function runAction(action: "approve" | "reject" | "reset-generation") {
    beginOperation(
      action === "approve"
        ? "approve"
        : action === "reject"
          ? "reject"
          : "reset",
    );

    try {
      const result = await readPoseResponse(
        await fetch(endpoint, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        }),
      );
      applyProject(result);

      if (action === "approve") {
        setSuccess(
          "Canonical A-pose approved and locked as the future mesh source.",
        );
      } else if (action === "reject") {
        setSuccess(
          "Canonical A-pose rejected. The approved identity anchor remains intact.",
        );
      } else {
        setSuccess(
          "Interrupted pose generation reset. The identity anchor remains approved.",
        );
      }

      router.refresh();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Canonical-pose action failed.",
      );
    } finally {
      setOperation(null);
    }
  }

  async function handleGeneration() {
    beginOperation("generate");

    try {
      const result = await readPoseResponse(
        await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "generate" }),
        }),
      );
      applyProject(result);
      setSuccess(
        pose
          ? "A replacement canonical A-pose was generated. Review it before approval."
          : "Canonical A-pose generated. Review identity and anatomy before approval.",
      );
      router.refresh();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Canonical A-pose generation failed.",
      );
    } finally {
      setOperation(null);
    }
  }

  if (status === "identity_anchor_ready") {
    return (
      <section className={styles.conceptPanel} id="canonical-pose">
        <div className={styles.briefHeader}>
          <div>
            <p className={styles.eyebrow}>CF1G-R2B / Local generation</p>
            <h2 className={styles.briefTitle}>Generate Canonical A-pose</h2>
            <p className={styles.mutedText}>
              Chernobog is inspecting the running ComfyUI instance for every
              node and model required to preserve identity while enforcing one
              fixed, front-facing A-pose. Generation runs once at 768 × 1024,
              batch size one, and remains completely local.
            </p>
          </div>
          <span className={styles.statusBadge}>
            {operation === "check"
              ? "checking"
              : provider?.ready
                ? "stack ready"
                : "setup required"}
          </span>
        </div>

        {initialIdentityAnchor?.approvedAt ? (
          <div className={styles.approvalBanner}>
            Identity source locked / SHA-256{" "}
            {initialIdentityAnchor.sha256.slice(0, 16)}…
          </div>
        ) : (
          <div className={styles.errorMessage}>
            The identity anchor is not approved. Canonical pose production is
            blocked.
          </div>
        )}

        {error ? <div className={styles.errorMessage}>{error}</div> : null}
        {success ? (
          <div className={styles.successMessage}>{success}</div>
        ) : null}
        {provider?.error ? (
          <div className={styles.errorMessage}>{provider.error}</div>
        ) : null}

        <div className={styles.dependencyGrid}>
          {provider?.dependencies.map((entry) => (
            <article
              key={entry.id}
              className={styles.dependencyCard}
              data-ready={entry.ready}
            >
              <div className={styles.dependencyHeading}>
                <span>{entry.label}</span>
                <strong>{entry.ready ? "Ready" : "Missing"}</strong>
              </div>
              <p>{entry.selected ?? entry.detail}</p>
              {entry.selected ? <small>{entry.detail}</small> : null}
              {entry.installLocation && !entry.ready ? (
                <code>{entry.installLocation}</code>
              ) : null}
            </article>
          )) ?? (
            <div className={styles.dependencyPlaceholder}>
              {operation === "check"
                ? "Inspecting the local ComfyUI stack…"
                : "Run the readiness check to inspect local dependencies."}
            </div>
          )}
        </div>

        {provider && !provider.ready ? (
          <div className={styles.warningMessage}>
            Missing: {provider.missing.join(", ")}. Install only the reported
            components, restart ComfyUI, then recheck. The included R2A guide
            explains the exact folders.
          </div>
        ) : null}

        {provider?.ready ? (
          <div className={styles.successMessage}>
            The local stack is ready. Generation will combine the locked
            identity crop with IP-Adapter and the deterministic OpenPose guide.
          </div>
        ) : null}

        <div className={styles.conceptActionBar}>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={handleProviderCheck}
            disabled={busy}
          >
            {operation === "check"
              ? "Checking local stack…"
              : "Recheck Local Stack"}
          </button>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={handleGeneration}
            disabled={
              busy || !provider?.ready || !initialIdentityAnchor?.approvedAt
            }
          >
            {operation === "generate"
              ? "Generating locally…"
              : "Generate Canonical A-pose"}
          </button>
        </div>
      </section>
    );
  }

  if (status === "canonical_pose_generating") {
    return (
      <section className={styles.conceptPanel} id="canonical-pose">
        <p className={styles.eyebrow}>Stage 05 / Canonical pose</p>
        <h2 className={styles.briefTitle}>Pose Generation Interrupted</h2>
        <p className={styles.mutedText}>
          This project is marked as generating but ComfyUI did not return a
          completed review asset. Reset the job without changing the approved
          identity anchor.
        </p>
        {error ? <div className={styles.errorMessage}>{error}</div> : null}
        <div className={styles.conceptActionBar}>
          <span className={styles.gateMarker}>
            Incomplete pose data will be removed
          </span>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() => runAction("reset-generation")}
            disabled={busy}
          >
            {operation === "reset"
              ? "Resetting…"
              : "Reset Interrupted Pose Job"}
          </button>
        </div>
      </section>
    );
  }

  if (!pose) {
    return (
      <section className={styles.conceptPanel} id="canonical-pose">
        <p className={styles.eyebrow}>Stage 05 / Canonical pose</p>
        <h2 className={styles.briefTitle}>Canonical Pose Record Missing</h2>
        <div className={styles.errorMessage}>
          This project status expects a generated canonical A-pose, but its
          local record is missing. Return to the identity-anchor gate.
        </div>
      </section>
    );
  }

  return (
    <section className={styles.conceptPanel} id="canonical-pose">
      <div className={styles.briefHeader}>
        <div>
          <p className={styles.eyebrow}>Stage 05 / Canonical pose gate</p>
          <h2 className={styles.briefTitle}>Review Canonical A-pose</h2>
          <p className={styles.mutedText}>
            This is the single image that will drive local mesh generation.
            Reject it if identity drift, asymmetry, cropped anatomy, or an
            incorrect pose remains.
          </p>
        </div>
        <span className={styles.statusBadge}>
          {status === "canonical_pose_ready"
            ? "pose approved"
            : "review required"}
        </span>
      </div>

      {error ? <div className={styles.errorMessage}>{error}</div> : null}
      {success ? <div className={styles.successMessage}>{success}</div> : null}

      <div className={styles.anchorReviewGrid}>
        <div className={styles.anchorPreviewFrame}>
          <Image
            src={poseImageUrl}
            alt="Generated front-facing canonical character A-pose"
            width={pose.width}
            height={pose.height}
            sizes="(max-width: 900px) 100vw, 60vw"
            className={styles.anchorPreviewImage}
            unoptimized
          />
        </div>

        <aside className={styles.cropChecklist}>
          <span className={styles.fieldLabel}>Manual quality gate</span>
          <ul>
            <li>Same identity, clothing, colours, and equipment</li>
            <li>One complete front-facing character</li>
            <li>Arms lowered 35–45° from the torso</li>
            <li>Hands, legs, and feet clearly separated</li>
            <li>Plain background with no text or extra views</li>
          </ul>
          <strong>
            {pose.width} × {pose.height} px
          </strong>
          <span className={styles.anchorHash}>Seed {pose.seed}</span>
          <span className={styles.anchorHash}>
            SHA-256 {pose.sha256.slice(0, 16)}…
          </span>
          <details className={styles.promptDetails}>
            <summary>Generation provenance</summary>
            <p>Checkpoint: {pose.checkpoint}</p>
            <p>IP-Adapter: {pose.ipAdapterModel}</p>
            <p>CLIP Vision: {pose.clipVisionModel}</p>
            <p>OpenPose: {pose.controlNetModel}</p>
            <p>
              Workflow: R2B v{pose.workflowVersion} / {pose.steps} steps / CFG{" "}
              {pose.cfg}
            </p>
            <p>
              Conditioning: IP-Adapter {pose.ipAdapterWeight} / OpenPose{" "}
              {pose.controlNetStrength}
            </p>
            <p>
              Sampler: {pose.sampler} / {pose.scheduler}
            </p>
            <p>Pose guide SHA-256: {pose.poseGuideSha256}</p>
          </details>
        </aside>
      </div>

      <div className={styles.conceptActionBar}>
        {status === "canonical_pose_review" ? (
          <label className={styles.approvalCheck}>
            <input
              type="checkbox"
              checked={approvalConfirmed}
              onChange={(event) => setApprovalConfirmed(event.target.checked)}
              disabled={busy}
            />
            <span>
              I confirm this is the approved character in one complete,
              symmetric, front-facing A-pose suitable for mesh generation.
            </span>
          </label>
        ) : (
          <span className={styles.gateMarker}>
            Canonical source approved / local mesh generation is next
          </span>
        )}

        <div className={styles.briefButtons}>
          {status === "canonical_pose_review" ? (
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={handleGeneration}
              disabled={busy}
            >
              {operation === "generate"
                ? "Regenerating…"
                : "Generate Another Pose"}
            </button>
          ) : null}
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() => runAction("reject")}
            disabled={busy}
          >
            {operation === "reject" ? "Rejecting…" : "Reject Pose"}
          </button>
          {status === "canonical_pose_review" ? (
            <button
              type="button"
              className={styles.primaryButton}
              onClick={() => runAction("approve")}
              disabled={busy || !approvalConfirmed}
            >
              {operation === "approve"
                ? "Approving…"
                : "Approve Canonical A-pose"}
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
