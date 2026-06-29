import type { ScenePackReviewResult } from "./reviewScenePack";
import type { ScenePackRepairResult } from "./repairScenePack";

export function renderPackReviewSummary(review: ScenePackReviewResult): string {
  return review.summary;
}

export function renderPackRepairSummary(repair: ScenePackRepairResult): string {
  return repair.summary;
}
