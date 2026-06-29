import type { SchematicScenePlan } from "../scenes/types";
import type { ExportScenePlanPackResult } from "../packs/types";
import type { ScenePackReviewResult } from "../packs/reviewScenePack";
import type { ScenePackRepairResult } from "../packs/repairScenePack";
import type { VanillaPreviewPackResult } from "../packs/exportVanillaPreviewPack";

export type BuildDepartmentAction =
  | "status"
  | "plan"
  | "generate"
  | "review"
  | "repair"
  | "preview"
  | "full_pipeline";

export type BuildDepartmentRoleName =
  | "planner"
  | "architect"
  | "compiler"
  | "inspector"
  | "repairer"
  | "exporter";

export type BuildDepartmentRoleStatus = {
  role: BuildDepartmentRoleName;
  label: string;
  status: "online" | "limited" | "offline";
  responsibility: string;
  backedBy: string[];
};

export type BuildDepartmentStatus = {
  ok: boolean;
  milestone: "M6-I";
  estimatedMilestoneCompletionPercent: number;
  roles: BuildDepartmentRoleStatus[];
  latestPack?: {
    packId: string;
    status: string;
    outputRoot: string;
    sceneType: string;
    biomeHint: string;
    scale: string;
    structureCount: number;
    generatedSchematicCount: number;
    packJson: string;
  } | null;
  warnings: string[];
  nextRecommendedAction: string;
};

export type BuildDepartmentPlanResult = {
  ok: boolean;
  action: "plan";
  plan: SchematicScenePlan;
  planPath: string;
  placementGuidePath: string;
  summary: string;
};

export type BuildDepartmentGenerateResult = {
  ok: boolean;
  action: "generate" | "full_pipeline";
  pack: ExportScenePlanPackResult;
  review?: ScenePackReviewResult;
  preview?: VanillaPreviewPackResult;
  summary: string;
};

export type BuildDepartmentReviewResult = {
  ok: boolean;
  action: "review";
  review: ScenePackReviewResult;
  summary: string;
};

export type BuildDepartmentRepairResult = {
  ok: boolean;
  action: "repair";
  repair: ScenePackRepairResult;
  summary: string;
};

export type BuildDepartmentPreviewResult = {
  ok: boolean;
  action: "preview";
  preview: VanillaPreviewPackResult;
  summary: string;
};

export type BuildDepartmentCommandResult =
  | {
      ok: boolean;
      action: "status";
      status: BuildDepartmentStatus;
      summary: string;
    }
  | BuildDepartmentPlanResult
  | BuildDepartmentGenerateResult
  | BuildDepartmentReviewResult
  | BuildDepartmentRepairResult
  | BuildDepartmentPreviewResult;
