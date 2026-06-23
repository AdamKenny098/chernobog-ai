import {
  executeSavedContentCommand,
  getActiveSavedContentItems,
} from "@/lib/modules/saved-content";

import {
  createContentReviewFromSavedContentIndex,
} from "@/lib/modules/content-review";

export async function processSavedContentBatch(limit = 5) {
  const active = await getActiveSavedContentItems(limit);
  const processed: Array<{
    itemId: string;
    title: string;
    steps: string[];
    warnings: string[];
  }> = [];

  for (let index = 0; index < active.length; index += 1) {
    const item = active[index];
    const activeIndex = index + 1;
    const steps: string[] = [];
    const warnings: string[] = [];

    const commands = [
      `fetch transcript for saved content ${activeIndex}`,
      `chunk transcript for saved content ${activeIndex}`,
      `summarize saved content ${activeIndex}`,
      `why did I save content ${activeIndex}`,
      `extract candidates from saved content ${activeIndex}`,
    ];

    for (const command of commands) {
      try {
        const result = await executeSavedContentCommand(command);

        if (result.ok) {
          steps.push(command);
        } else {
          warnings.push(`${command}: ${result.message}`);
        }
      } catch (error) {
        warnings.push(`${command}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    processed.push({
      itemId: item.id,
      title: item.title,
      steps,
      warnings,
    });
  }

  return {
    requested: limit,
    processed,
  };
}

export async function createReviewsForAnalyzedContent(limit = 10) {
  const active = await getActiveSavedContentItems(limit);
  const created: Array<{
    itemIndex: number;
    reviewId: string;
    title: string;
  }> = [];
  const skipped: Array<{
    itemIndex: number;
    title: string;
    reason: string;
  }> = [];

  for (let index = 0; index < active.length; index += 1) {
    const item = active[index];
    const activeIndex = index + 1;
    const hasAnalysis =
      item.analysisStatus === "complete" ||
      Boolean(item.summary) ||
      Boolean(item.possibleReasonSaved) ||
      (item.extractedTasks?.length ?? 0) > 0 ||
      (item.extractedIdeas?.length ?? 0) > 0;

    if (!hasAnalysis) {
      skipped.push({
        itemIndex: activeIndex,
        title: item.title,
        reason: "no analysis/candidates found",
      });
      continue;
    }

    try {
      const result = await createContentReviewFromSavedContentIndex(activeIndex);

      if (result) {
        created.push({
          itemIndex: activeIndex,
          reviewId: result.review.id,
          title: result.review.title,
        });
      } else {
        skipped.push({
          itemIndex: activeIndex,
          title: item.title,
          reason: "review creation returned no result",
        });
      }
    } catch (error) {
      skipped.push({
        itemIndex: activeIndex,
        title: item.title,
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return {
    created,
    skipped,
  };
}
