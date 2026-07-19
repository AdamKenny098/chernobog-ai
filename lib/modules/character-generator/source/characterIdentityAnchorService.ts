import { createHash } from "node:crypto";

import {
  CharacterProjectStateError,
  CharacterProjectValidationError,
} from "../errors";
import {
  readCharacterProject,
  writeCharacterProject,
} from "../projects/characterProjectStore";
import { clearCharacterReferenceImages } from "../reference/characterReferenceAssetStore";
import type {
  CharacterConcept,
  CharacterIdentityAnchorCrop,
  CharacterProject,
} from "../types";
import {
  clearCharacterIdentityAnchorImage,
  writeCharacterIdentityAnchorImage,
} from "./characterIdentityAnchorAssetStore";
import { clearCharacterCanonicalPoseImage } from "./characterCanonicalPoseAssetStore";

const MAX_ANCHOR_BYTES = 20 * 1024 * 1024;
const LEGACY_REFERENCE_STATUSES = new Set([
  "reference_sheet_generating",
  "reference_sheet_review",
  "reference_sheet_ready",
]);

export type SaveCharacterIdentityAnchorInput = {
  bytes: Uint8Array;
  mimeType: "image/png" | "image/jpeg" | "image/webp";
  width: number;
  height: number;
  crop: CharacterIdentityAnchorCrop;
};

function nowIso(): string {
  return new Date().toISOString();
}

function requireApprovedConcept(project: CharacterProject): CharacterConcept {
  const concept = project.concepts.find(
    (candidate) => candidate.id === project.selectedConceptId
  );

  if (!concept || concept.status !== "ready" || !concept.imagePath) {
    throw new CharacterProjectStateError(
      "Identity anchoring requires a ready approved concept image."
    );
  }

  return concept;
}

function isPositiveInteger(value: number): boolean {
  return Number.isInteger(value) && value > 0;
}

function hasExpectedSignature(
  bytes: Uint8Array,
  mimeType: SaveCharacterIdentityAnchorInput["mimeType"]
): boolean {
  if (mimeType === "image/png") {
    const signature = [137, 80, 78, 71, 13, 10, 26, 10];
    return signature.every((byte, index) => bytes[index] === byte);
  }

  if (mimeType === "image/jpeg") {
    return bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  }

  return (
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  );
}

function validateAnchorInput(
  input: SaveCharacterIdentityAnchorInput,
  concept: CharacterConcept
): void {
  if (input.bytes.length === 0 || input.bytes.length > MAX_ANCHOR_BYTES) {
    throw new CharacterProjectValidationError(
      "The identity anchor image must be between 1 byte and 20 MB."
    );
  }

  if (!hasExpectedSignature(input.bytes, input.mimeType)) {
    throw new CharacterProjectValidationError(
      "The uploaded identity anchor does not match its declared image type."
    );
  }

  const { crop } = input;
  const dimensions = [
    input.width,
    input.height,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    crop.sourceWidth,
    crop.sourceHeight,
  ];

  if (dimensions.some((value) => !Number.isInteger(value) || value < 0)) {
    throw new CharacterProjectValidationError(
      "Identity anchor dimensions must be whole, non-negative pixel values."
    );
  }

  if (
    !isPositiveInteger(input.width) ||
    !isPositiveInteger(input.height) ||
    !isPositiveInteger(crop.width) ||
    !isPositiveInteger(crop.height) ||
    !isPositiveInteger(crop.sourceWidth) ||
    !isPositiveInteger(crop.sourceHeight)
  ) {
    throw new CharacterProjectValidationError(
      "Identity anchor width and height values must be greater than zero."
    );
  }

  if (
    input.width !== crop.width ||
    input.height !== crop.height ||
    input.width < 64 ||
    input.height < 64 ||
    input.width > 4096 ||
    input.height > 4096
  ) {
    throw new CharacterProjectValidationError(
      "The identity anchor crop must be 64–4096 pixels and match the uploaded image dimensions."
    );
  }

  if (
    crop.sourceWidth !== concept.width ||
    crop.sourceHeight !== concept.height ||
    crop.x + crop.width > crop.sourceWidth ||
    crop.y + crop.height > crop.sourceHeight
  ) {
    throw new CharacterProjectValidationError(
      "The identity anchor crop must remain inside the approved concept image."
    );
  }
}

export async function saveCharacterIdentityAnchor(
  projectId: string,
  input: SaveCharacterIdentityAnchorInput
): Promise<CharacterProject | null> {
  const project = await readCharacterProject(projectId);

  if (!project) {
    return null;
  }

  if (
    project.status !== "design_approved" &&
    project.status !== "identity_anchor_draft" &&
    project.status !== "identity_anchor_ready"
  ) {
    throw new CharacterProjectStateError(
      "Create the identity anchor only after design approval. Retire any legacy turnaround set first."
    );
  }

  const concept = requireApprovedConcept(project);
  validateAnchorInput(input, concept);
  const timestamp = nowIso();
  const previousAnchor = project.identityAnchor ?? null;

  await Promise.all([
    clearCharacterIdentityAnchorImage(project.id),
    clearCharacterCanonicalPoseImage(project.id),
  ]);
  const imagePath = await writeCharacterIdentityAnchorImage({
    projectId: project.id,
    bytes: input.bytes,
    mimeType: input.mimeType,
  });

  return writeCharacterProject({
    ...project,
    status: "identity_anchor_draft",
    identityAnchor: {
      id: "identity-anchor",
      sourceConceptId: concept.id,
      imagePath,
      imageMimeType: input.mimeType,
      width: input.width,
      height: input.height,
      crop: input.crop,
      sha256: createHash("sha256").update(input.bytes).digest("hex"),
      approvedAt: null,
      createdAt: previousAnchor?.createdAt ?? timestamp,
      updatedAt: timestamp,
    },
    canonicalPose: null,
    referenceSheet: null,
  });
}

export async function approveCharacterIdentityAnchor(
  projectId: string
): Promise<CharacterProject | null> {
  const project = await readCharacterProject(projectId);

  if (!project) {
    return null;
  }

  if (project.status !== "identity_anchor_draft" || !project.identityAnchor) {
    throw new CharacterProjectStateError(
      "Only a saved identity anchor awaiting review can be approved."
    );
  }

  const approvedAt = nowIso();
  return writeCharacterProject({
    ...project,
    status: "identity_anchor_ready",
    identityAnchor: {
      ...project.identityAnchor,
      approvedAt,
      updatedAt: approvedAt,
    },
  });
}

export async function clearCharacterIdentityAnchor(
  projectId: string
): Promise<CharacterProject | null> {
  const project = await readCharacterProject(projectId);

  if (!project) {
    return null;
  }

  if (
    project.status !== "identity_anchor_draft" &&
    project.status !== "identity_anchor_ready"
  ) {
    throw new CharacterProjectStateError(
      "There is no active identity anchor to clear."
    );
  }

  await Promise.all([
    clearCharacterIdentityAnchorImage(project.id),
    clearCharacterCanonicalPoseImage(project.id),
  ]);
  return writeCharacterProject({
    ...project,
    status: "design_approved",
    identityAnchor: null,
    canonicalPose: null,
  });
}

export async function retireLegacyCharacterReferenceSet(
  projectId: string
): Promise<CharacterProject | null> {
  const project = await readCharacterProject(projectId);

  if (!project) {
    return null;
  }

  if (!LEGACY_REFERENCE_STATUSES.has(project.status)) {
    throw new CharacterProjectStateError(
      "This project does not have a legacy turnaround state to retire."
    );
  }

  await Promise.all([
    clearCharacterReferenceImages(project.id),
    clearCharacterIdentityAnchorImage(project.id),
    clearCharacterCanonicalPoseImage(project.id),
  ]);

  return writeCharacterProject({
    ...project,
    status: "design_approved",
    identityAnchor: null,
    canonicalPose: null,
    referenceSheet: null,
  });
}
