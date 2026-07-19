import { createHash, randomInt } from "node:crypto";

import {
  CharacterCanonicalPoseGenerationError,
  CharacterProjectStateError,
} from "../errors";
import {
  readCharacterProject,
  writeCharacterProject,
} from "../projects/characterProjectStore";
import type { CharacterConcept, CharacterProject } from "../types";
import {
  clearCharacterCanonicalPoseImage,
  readCharacterCanonicalPoseImage,
  writeCharacterCanonicalPoseImage,
} from "./characterCanonicalPoseAssetStore";
import { compileCharacterCanonicalPosePrompt } from "./characterCanonicalPosePrompts";
import { readCharacterIdentityAnchorImage } from "./characterIdentityAnchorAssetStore";
import {
  createCharacterCanonicalPoseProvider,
  type CharacterCanonicalPoseProviderClient,
  type CharacterCanonicalPoseProviderStatus,
} from "./comfyUiCanonicalPoseProvider";

function nowIso(): string {
  return new Date().toISOString();
}

function requireGenerationSource(project: CharacterProject): CharacterConcept {
  if (!project.identityAnchor?.approvedAt) {
    throw new CharacterProjectStateError(
      "Canonical A-pose generation requires an approved identity anchor.",
    );
  }

  if (!project.brief) {
    throw new CharacterProjectStateError(
      "Canonical A-pose generation requires the approved character brief.",
    );
  }

  const concept = project.concepts.find(
    (candidate) => candidate.id === project.selectedConceptId,
  );

  if (!concept || concept.status !== "ready") {
    throw new CharacterProjectStateError(
      "Canonical A-pose generation requires the approved concept record.",
    );
  }

  return concept;
}

function requireMatchingApprovedIdentity(project: CharacterProject): void {
  if (!project.identityAnchor?.approvedAt) {
    throw new CharacterProjectStateError(
      "Canonical pose production requires an approved identity anchor.",
    );
  }

  if (
    project.canonicalPose?.sourceIdentityAnchorSha256 !==
    project.identityAnchor.sha256
  ) {
    throw new CharacterProjectStateError(
      "The canonical pose was not generated from the current approved identity anchor.",
    );
  }
}

export async function getCharacterCanonicalPoseProviderStatus(
  provider: CharacterCanonicalPoseProviderClient = createCharacterCanonicalPoseProvider(),
): Promise<CharacterCanonicalPoseProviderStatus> {
  return provider.getStatus();
}

export async function generateCharacterCanonicalPose(
  projectId: string,
  provider: CharacterCanonicalPoseProviderClient = createCharacterCanonicalPoseProvider(),
): Promise<CharacterProject | null> {
  const project = await readCharacterProject(projectId);

  if (!project) {
    return null;
  }

  if (
    project.status !== "identity_anchor_ready" &&
    project.status !== "canonical_pose_review" &&
    project.status !== "canonical_pose_ready"
  ) {
    throw new CharacterProjectStateError(
      "Canonical A-pose generation can only start from an approved identity anchor or replace a completed pose.",
    );
  }

  const concept = requireGenerationSource(project);
  const identityAnchor = project.identityAnchor!;
  const identityImage = await readCharacterIdentityAnchorImage({
    projectId: project.id,
    imagePath: identityAnchor.imagePath,
  });

  if (!identityImage?.length) {
    throw new CharacterProjectStateError(
      "The approved identity-anchor image is missing from local storage.",
    );
  }

  const identitySha256 = createHash("sha256")
    .update(identityImage)
    .digest("hex");

  if (identitySha256 !== identityAnchor.sha256) {
    throw new CharacterProjectStateError(
      "The stored identity-anchor image no longer matches its approved SHA-256.",
    );
  }

  const prompts = compileCharacterCanonicalPosePrompt(project.brief!, concept);
  const seed = randomInt(1, 2_147_483_647);
  const previousStatus = project.status;
  const previousPose = project.canonicalPose;

  await writeCharacterProject({
    ...project,
    status: "canonical_pose_generating",
  });

  try {
    const image = await provider.generate({
      projectId: project.id,
      identityImage,
      identityMimeType: identityAnchor.imageMimeType,
      identityWidth: identityAnchor.width,
      identityHeight: identityAnchor.height,
      positivePrompt: prompts.positivePrompt,
      negativePrompt: prompts.negativePrompt,
      seed,
    });
    const imagePath = await writeCharacterCanonicalPoseImage({
      projectId: project.id,
      bytes: image.bytes,
      mimeType: image.mimeType,
    });
    const timestamp = nowIso();

    return writeCharacterProject({
      ...project,
      status: "canonical_pose_review",
      canonicalPose: {
        id: "canonical-a-pose",
        sourceIdentityAnchorSha256: identityAnchor.sha256,
        imagePath,
        imageMimeType: image.mimeType,
        width: image.width,
        height: image.height,
        seed,
        provider: image.provider,
        checkpoint: image.checkpoint,
        ipAdapterModel: image.ipAdapterModel,
        clipVisionModel: image.clipVisionModel,
        controlNetModel: image.controlNetModel,
        workflowVersion: 1,
        poseGuideSha256: image.poseGuideSha256,
        ipAdapterWeight: image.ipAdapterWeight,
        controlNetStrength: image.controlNetStrength,
        steps: image.steps,
        cfg: image.cfg,
        sampler: image.sampler,
        scheduler: image.scheduler,
        generationPrompt: prompts.positivePrompt,
        negativePrompt: prompts.negativePrompt,
        sha256: createHash("sha256").update(image.bytes).digest("hex"),
        approvedAt: null,
        createdAt: previousPose?.createdAt ?? timestamp,
        updatedAt: timestamp,
      },
    });
  } catch (error) {
    await writeCharacterProject({
      ...project,
      status: previousStatus,
      canonicalPose: previousPose,
    });

    if (error instanceof CharacterCanonicalPoseGenerationError) {
      throw error;
    }

    throw new CharacterCanonicalPoseGenerationError(
      error instanceof Error
        ? `Canonical A-pose generation failed: ${error.message}`
        : "Canonical A-pose generation failed.",
    );
  }
}

export async function approveCharacterCanonicalPose(
  projectId: string,
): Promise<CharacterProject | null> {
  const project = await readCharacterProject(projectId);

  if (!project) {
    return null;
  }

  if (project.status !== "canonical_pose_review" || !project.canonicalPose) {
    throw new CharacterProjectStateError(
      "Only a generated canonical A-pose awaiting review can be approved.",
    );
  }

  requireMatchingApprovedIdentity(project);
  const image = await readCharacterCanonicalPoseImage({
    projectId,
    imagePath: project.canonicalPose.imagePath,
  });

  if (!image || image.length === 0) {
    throw new CharacterProjectStateError(
      "The generated canonical A-pose image is missing from local storage.",
    );
  }

  const approvedAt = nowIso();
  return writeCharacterProject({
    ...project,
    status: "canonical_pose_ready",
    canonicalPose: {
      ...project.canonicalPose,
      approvedAt,
      updatedAt: approvedAt,
    },
  });
}

export async function rejectCharacterCanonicalPose(
  projectId: string,
): Promise<CharacterProject | null> {
  const project = await readCharacterProject(projectId);

  if (!project) {
    return null;
  }

  if (
    project.status !== "canonical_pose_review" &&
    project.status !== "canonical_pose_ready"
  ) {
    throw new CharacterProjectStateError(
      "Only a completed canonical A-pose can be rejected.",
    );
  }

  await clearCharacterCanonicalPoseImage(project.id);
  return writeCharacterProject({
    ...project,
    status: "identity_anchor_ready",
    canonicalPose: null,
  });
}

export async function resetInterruptedCharacterCanonicalPoseGeneration(
  projectId: string,
): Promise<CharacterProject | null> {
  const project = await readCharacterProject(projectId);

  if (!project) {
    return null;
  }

  if (project.status !== "canonical_pose_generating") {
    throw new CharacterProjectStateError(
      "Only an interrupted canonical-pose generation can be reset.",
    );
  }

  await clearCharacterCanonicalPoseImage(project.id);
  return writeCharacterProject({
    ...project,
    status: "identity_anchor_ready",
    canonicalPose: null,
  });
}
