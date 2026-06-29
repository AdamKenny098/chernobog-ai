import {
  renderPackRepairSummary,
  renderPackReviewSummary,
  repairLatestScenePack,
  writeLatestScenePackReview,
} from "../packs";
import type { Milestone6PackReviewParsedCommand } from "./parseMilestone6PackReviewCommand";

export type Milestone6PackReviewExecutionResult = {
  ok: boolean;
  kind: "milestone6_pack_review_result";
  summary: string;
  data?: unknown;
};

export async function executeMilestone6PackReviewCommand(
  command: Milestone6PackReviewParsedCommand,
): Promise<Milestone6PackReviewExecutionResult> {
  if (command.action === "repair") {
    const repair = await repairLatestScenePack();

    return {
      ok: repair.ok,
      kind: "milestone6_pack_review_result",
      summary: renderPackRepairSummary(repair),
      data: repair.data,
    };
  }

  const review = await writeLatestScenePackReview();

  return {
    ok: review.ok,
    kind: "milestone6_pack_review_result",
    summary: renderPackReviewSummary(review),
    data: review,
  };
}
