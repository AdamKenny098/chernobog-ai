import { createHash } from "node:crypto";

import {
  CharacterModelGenerationError,
  CharacterProjectStateError,
} from "../errors";
import {
  readCharacterProject,
  writeCharacterProject,
} from "../projects/characterProjectStore";
import { readCharacterCanonicalPoseImage } from "../source/characterCanonicalPoseAssetStore";
import type { CharacterModelAsset, CharacterProject } from "../types";
import {
  clearCharacterModelAsset,
  readCharacterModelGlb,
  writeCharacterModelGlb,
} from "./characterModelAssetStore";
import {
  createCharacterModelProvider,
  type CharacterModelProviderClient,
  type CharacterModelProviderStatus,
} from "./stableFast3dProvider";

const MODEL_STAGE_STATUSES = new Set([
  "canonical_pose_ready",
  "model_generating",
  "model_ready",
  "rigged",
  "validated",
  "exported",
]);
const ACTIVE_GENERATIONS = new Set<string>();
const FOREGROUND_RATIO = 0.85 as const;
const MINIMUM_TARGET_VERTICES = 2_500;
const MAXIMUM_TARGET_VERTICES = 20_000;

export type CharacterModelReadiness = {
  project: CharacterProject;
  provider: CharacterModelProviderStatus;
};

function nowIso(): string {
  return new Date().toISOString();
}

function requireApprovedCanonicalPose(project: CharacterProject): void {
  if (!project.canonicalPose?.approvedAt) {
    throw new CharacterProjectStateError(
      "The canonical A-pose must be approved before local 3D generation.",
    );
  }

  if (
    !project.identityAnchor?.approvedAt ||
    project.canonicalPose.sourceIdentityAnchorSha256 !==
      project.identityAnchor.sha256
  ) {
    throw new CharacterProjectStateError(
      "The approved canonical A-pose no longer matches the current identity anchor.",
    );
  }

  if (!project.brief) {
    throw new CharacterProjectStateError(
      "Local 3D generation requires the approved character brief.",
    );
  }
}

async function requireStoredModel(project: CharacterProject): Promise<Buffer> {
  if (!project.modelAsset) {
    throw new CharacterProjectStateError(
      "The generated character model record is missing.",
    );
  }

  const bytes = await readCharacterModelGlb({
    projectId: project.id,
    filePath: project.modelAsset.filePath,
  });

  if (!bytes?.length) {
    throw new CharacterProjectStateError(
      "The generated character model is missing from local storage.",
    );
  }

  const sha256 = createHash("sha256").update(bytes).digest("hex");
  if (sha256 !== project.modelAsset.sha256) {
    throw new CharacterProjectStateError(
      "The stored character model no longer matches its recorded SHA-256.",
    );
  }

  return bytes;
}

export async function getCharacterModelReadiness(
  projectId: string,
  provider: CharacterModelProviderClient = createCharacterModelProvider(),
): Promise<CharacterModelReadiness | null> {
  const project = await readCharacterProject(projectId);

  if (!project) {
    return null;
  }

  if (!MODEL_STAGE_STATUSES.has(project.status)) {
    throw new CharacterProjectStateError(
      "Approve the canonical A-pose before checking the local 3D stack.",
    );
  }

  requireApprovedCanonicalPose(project);

  return {
    project,
    provider: await provider.getStatus(),
  };
}

export async function generateCharacterModel(
  projectId: string,
  provider: CharacterModelProviderClient = createCharacterModelProvider(),
): Promise<CharacterProject | null> {
  if (ACTIVE_GENERATIONS.has(projectId)) {
    throw new CharacterProjectStateError(
      "A model generation request is already active for this project.",
    );
  }

  ACTIVE_GENERATIONS.add(projectId);

  try {
    const project = await readCharacterProject(projectId);

    if (!project) {
      return null;
    }

    if (project.status !== "canonical_pose_ready") {
      throw new CharacterProjectStateError(
        "Character model generation can only start from an approved canonical A-pose.",
      );
    }

    if (project.modelAsset) {
      throw new CharacterProjectStateError(
        "Reject the current generated model before creating a replacement.",
      );
    }

    requireApprovedCanonicalPose(project);
    const canonicalPose = project.canonicalPose!;
    const imageBytes = await readCharacterCanonicalPoseImage({
      projectId: project.id,
      imagePath: canonicalPose.imagePath,
    });

    if (!imageBytes?.length) {
      throw new CharacterProjectStateError(
        "The approved canonical A-pose image is missing from local storage.",
      );
    }

    const sourceSha256 = createHash("sha256")
      .update(imageBytes)
      .digest("hex");
    if (sourceSha256 !== canonicalPose.sha256) {
      throw new CharacterProjectStateError(
        "The stored canonical A-pose no longer matches its approved SHA-256.",
      );
    }

    const providerStatus = await provider.getStatus();
    if (!providerStatus.ready) {
      throw new CharacterModelGenerationError(
        providerStatus.error ??
          `The local 3D stack is not ready: ${providerStatus.missing.join(", ")}.`,
      );
    }

    const targetTriangleBudget = project.brief!.technical.triangleBudget;
    const targetVertexCount = Math.min(
      MAXIMUM_TARGET_VERTICES,
      Math.max(
        MINIMUM_TARGET_VERTICES,
        Math.round(targetTriangleBudget / 2),
      ),
    );
    // The first RTX 3080 profile deliberately uses SF3D's 1024 texture path.
    // The brief's higher final-export target remains intact for later baking.
    const textureResolution = 1024 as const;

    await writeCharacterProject({
      ...project,
      status: "model_generating",
      modelAsset: null,
    });

    try {
      const generated = await provider.generate({
        imageBytes,
        imageMimeType: canonicalPose.imageMimeType,
        sourceSha256,
        textureResolution,
        remeshMode: "triangle",
        targetVertexCount,
        foregroundRatio: FOREGROUND_RATIO,
      });

      if (
        generated.sourceSha256 !== sourceSha256 ||
        generated.textureResolution !== textureResolution ||
        generated.remeshMode !== "triangle" ||
        generated.targetVertexCount !== targetVertexCount ||
        generated.foregroundRatio !== FOREGROUND_RATIO
      ) {
        throw new CharacterModelGenerationError(
          "The local 3D artifact provenance does not match the locked generation request.",
        );
      }

      const filePath = await writeCharacterModelGlb({
        projectId: project.id,
        bytes: generated.bytes,
      });
      const timestamp = nowIso();
      const modelAsset: CharacterModelAsset = {
        id: "generated-model",
        sourceCanonicalPoseSha256: sourceSha256,
        filePath,
        format: "glb",
        mimeType: "model/gltf-binary",
        provider: generated.provider,
        providerVersion: generated.providerVersion,
        model: generated.model,
        textureResolution: generated.textureResolution,
        remeshMode: generated.remeshMode,
        targetTriangleBudget,
        targetVertexCount: generated.targetVertexCount,
        foregroundRatio: FOREGROUND_RATIO,
        generationSeconds: generated.generationSeconds,
        sha256: createHash("sha256")
          .update(generated.bytes)
          .digest("hex"),
        byteLength: generated.bytes.byteLength,
        topology: generated.topology,
        approvedAt: null,
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      return await writeCharacterProject({
        ...project,
        status: "model_ready",
        modelAsset,
      });
    } catch (error) {
      await clearCharacterModelAsset(project.id);
      await writeCharacterProject({
        ...project,
        status: "canonical_pose_ready",
        modelAsset: null,
      });

      if (error instanceof CharacterModelGenerationError) {
        throw error;
      }

      throw new CharacterModelGenerationError(
        error instanceof Error
          ? `Character model generation failed: ${error.message}`
          : "Character model generation failed.",
      );
    }
  } finally {
    ACTIVE_GENERATIONS.delete(projectId);
  }
}

export async function approveCharacterModel(
  projectId: string,
): Promise<CharacterProject | null> {
  const project = await readCharacterProject(projectId);

  if (!project) {
    return null;
  }

  if (project.status !== "model_ready" || !project.modelAsset) {
    throw new CharacterProjectStateError(
      "Only a generated model awaiting review can be approved.",
    );
  }

  requireApprovedCanonicalPose(project);

  if (
    project.modelAsset.sourceCanonicalPoseSha256 !==
    project.canonicalPose!.sha256
  ) {
    throw new CharacterProjectStateError(
      "The generated model does not match the current approved canonical A-pose.",
    );
  }

  await requireStoredModel(project);
  const approvedAt = nowIso();

  return writeCharacterProject({
    ...project,
    modelAsset: {
      ...project.modelAsset,
      approvedAt,
      updatedAt: approvedAt,
    },
  });
}

export async function rejectCharacterModel(
  projectId: string,
): Promise<CharacterProject | null> {
  const project = await readCharacterProject(projectId);

  if (!project) {
    return null;
  }

  if (project.status !== "model_ready" || !project.modelAsset) {
    throw new CharacterProjectStateError(
      "Only a completed generated model can be rejected.",
    );
  }

  await clearCharacterModelAsset(project.id);
  return writeCharacterProject({
    ...project,
    status: "canonical_pose_ready",
    modelAsset: null,
  });
}

export async function resetInterruptedCharacterModelGeneration(
  projectId: string,
): Promise<CharacterProject | null> {
  const project = await readCharacterProject(projectId);

  if (!project) {
    return null;
  }

  if (project.status !== "model_generating") {
    throw new CharacterProjectStateError(
      "Only an interrupted model generation can be reset.",
    );
  }

  await clearCharacterModelAsset(project.id);
  return writeCharacterProject({
    ...project,
    status: "canonical_pose_ready",
    modelAsset: null,
  });
}
