import {
  readSavedContentStore,
  updateSavedContentItemById,
} from "@/lib/modules/saved-content";

import {
  LifecycleReport,
} from "./types";

const CLOSED = new Set(["watched", "analyzed", "archived", "dismissed"]);

export async function getSavedContentLifecycleReport(): Promise<LifecycleReport> {
  const store = await readSavedContentStore();
  const items = store.items ?? [];

  const activeItems = items.filter((item) => !CLOSED.has(item.queueStatus));
  const closedItems = items.filter((item) => CLOSED.has(item.queueStatus));

  const analyzedButActive = activeItems.filter((item) => item.analysisStatus === "complete").length;
  const completeButActive = activeItems.filter((item) => {
    return item.summary || item.possibleReasonSaved || (item.extractedTasks?.length ?? 0) > 0 || (item.extractedIdeas?.length ?? 0) > 0;
  }).length;

  const recommendations: string[] = [];

  if (analyzedButActive > 0) {
    recommendations.push("Some active items have complete analysis and may be ready to close or review.");
  }

  if (completeButActive > 0) {
    recommendations.push("Some active items contain generated intelligence but remain open.");
  }

  if (activeItems.length === 0) {
    recommendations.push("The active saved-content queue is dry.");
  }

  return {
    generatedAt: new Date().toISOString(),
    total: items.length,
    active: activeItems.length,
    closed: closedItems.length,
    analyzedButActive,
    completeButActive,
    recommendations,
  };
}

export function formatLifecycleReport(report: LifecycleReport) {
  return [
    "Saved Content Lifecycle Report",
    "",
    `Generated at: ${report.generatedAt}`,
    `Total: ${report.total}`,
    `Active: ${report.active}`,
    `Closed: ${report.closed}`,
    `Analyzed but active: ${report.analyzedButActive}`,
    `Complete but active: ${report.completeButActive}`,
    "",
    "Recommendations:",
    report.recommendations.length
      ? report.recommendations.map((item) => `- ${item}`).join("\n")
      : "- None",
  ].join("\n");
}

export async function closeCompletedSavedContent() {
  const store = await readSavedContentStore();
  const items = store.items ?? [];
  const changed: string[] = [];

  for (const item of items) {
    if (CLOSED.has(item.queueStatus)) {
      continue;
    }

    if (item.analysisStatus === "complete") {
      await updateSavedContentItemById({
        id: item.id,
        queueStatus: "analyzed",
        patch: {
          updatedAt: new Date().toISOString(),
        },
      });

      changed.push(item.id);
    }
  }

  return {
    closed: changed.length,
    itemIds: changed,
  };
}
