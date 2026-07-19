import type { CharacterProjectStatus } from "./types";

const ALLOWED_STATUS_TRANSITIONS: Record<
  CharacterProjectStatus,
  readonly CharacterProjectStatus[]
> = {
  draft: ["brief_draft"],
  brief_draft: ["draft", "brief_ready"],
  brief_ready: ["brief_draft", "concepts_generating"],
  concepts_generating: ["brief_ready", "concepts_ready"],
  concepts_ready: ["brief_ready", "concept_selected"],
  concept_selected: ["concepts_ready", "design_approved"],
  design_approved: ["concept_selected", "identity_anchor_draft"],
  identity_anchor_draft: ["design_approved", "identity_anchor_ready"],
  identity_anchor_ready: ["identity_anchor_draft", "canonical_pose_generating"],
  canonical_pose_generating: ["identity_anchor_ready", "canonical_pose_review"],
  canonical_pose_review: ["identity_anchor_ready", "canonical_pose_ready"],
  canonical_pose_ready: ["identity_anchor_ready", "model_generating"],
  reference_sheet_generating: ["design_approved", "reference_sheet_review"],
  reference_sheet_review: ["design_approved"],
  reference_sheet_ready: ["design_approved"],
  model_generating: ["canonical_pose_ready", "model_ready"],
  model_ready: ["model_generating", "rigged"],
  rigged: ["model_ready", "validated"],
  validated: ["rigged", "exported"],
  exported: ["validated"],
};

export function getAllowedCharacterProjectTransitions(
  status: CharacterProjectStatus
): readonly CharacterProjectStatus[] {
  return ALLOWED_STATUS_TRANSITIONS[status];
}

export function canTransitionCharacterProjectStatus(
  from: CharacterProjectStatus,
  to: CharacterProjectStatus
): boolean {
  return from === to || ALLOWED_STATUS_TRANSITIONS[from].includes(to);
}

export function assertCharacterProjectStatusTransition(
  from: CharacterProjectStatus,
  to: CharacterProjectStatus
): void {
  if (!canTransitionCharacterProjectStatus(from, to)) {
    throw new Error(
      `Invalid Character Forge status transition: ${from} -> ${to}.`
    );
  }
}
