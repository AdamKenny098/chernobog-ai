import type { CharacterProjectStatus } from "./types";

export type CharacterPipelineStage = {
  id:
    | "prompt"
    | "brief"
    | "concepts"
    | "design"
    | "source"
    | "model"
    | "rig"
    | "validation"
    | "export";
  label: string;
  description: string;
  statuses: readonly CharacterProjectStatus[];
};

export type CharacterPipelineStageState = "complete" | "current" | "pending";

export const CHARACTER_PIPELINE_STAGES: readonly CharacterPipelineStage[] = [
  {
    id: "prompt",
    label: "Prompt",
    description: "Character intent and production constraints.",
    statuses: ["draft"],
  },
  {
    id: "brief",
    label: "Brief",
    description: "Structured, editable character definition.",
    statuses: ["brief_draft", "brief_ready"],
  },
  {
    id: "concepts",
    label: "Concepts",
    description: "Multiple visually distinct design candidates.",
    statuses: ["concepts_generating", "concepts_ready"],
  },
  {
    id: "design",
    label: "Design",
    description: "Selected and explicitly approved concept.",
    statuses: ["concept_selected", "design_approved"],
  },
  {
    id: "source",
    label: "Source",
    description: "Approved identity anchor and canonical model input.",
    statuses: [
      "identity_anchor_draft",
      "identity_anchor_ready",
      "canonical_pose_generating",
      "canonical_pose_review",
      "canonical_pose_ready",
      "reference_sheet_generating",
      "reference_sheet_review",
      "reference_sheet_ready",
    ],
  },
  {
    id: "model",
    label: "Model",
    description: "Generated and production-cleaned 3D asset.",
    statuses: ["model_generating", "model_ready"],
  },
  {
    id: "rig",
    label: "Rig",
    description: "Skeleton, skin weights, and deformation setup.",
    statuses: ["rigged"],
  },
  {
    id: "validation",
    label: "Validate",
    description: "Geometry, deformation, and Unity checks.",
    statuses: ["validated"],
  },
  {
    id: "export",
    label: "Export",
    description: "Game-ready model and supporting assets.",
    statuses: ["exported"],
  },
] as const;

export function getCharacterPipelineStageIndex(
  status: CharacterProjectStatus
): number {
  const index = CHARACTER_PIPELINE_STAGES.findIndex((stage) =>
    stage.statuses.includes(status)
  );

  return index < 0 ? 0 : index;
}

export function getCharacterPipelineProgress(
  status: CharacterProjectStatus
): number {
  const stageIndex = getCharacterPipelineStageIndex(status);
  const finalIndex = CHARACTER_PIPELINE_STAGES.length - 1;

  return Math.round((stageIndex / finalIndex) * 100);
}

export function getCharacterPipelineStageState(
  stageIndex: number,
  status: CharacterProjectStatus
): CharacterPipelineStageState {
  const activeIndex = getCharacterPipelineStageIndex(status);

  if (stageIndex < activeIndex) {
    return "complete";
  }

  if (stageIndex === activeIndex) {
    return "current";
  }

  return "pending";
}
