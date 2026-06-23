import {
  readSavedContentStore,
} from "@/lib/modules/saved-content";

import {
  DuplicateGroup,
} from "./types";

function pushGroup(groups: DuplicateGroup[], params: DuplicateGroup) {
  if (params.itemIds.length > 1) {
    groups.push(params);
  }
}

export async function getSavedContentDuplicateReport() {
  const store = await readSavedContentStore();
  const items = store.items ?? [];

  const byId = new Map<string, typeof items>();
  const byExternal = new Map<string, typeof items>();
  const byUrl = new Map<string, typeof items>();

  for (const item of items) {
    const idKey = item.id;
    const externalKey = `${item.platform}:${item.externalId}`;
    const urlKey = item.url?.toLowerCase();

    byId.set(idKey, [...(byId.get(idKey) ?? []), item]);
    byExternal.set(externalKey, [...(byExternal.get(externalKey) ?? []), item]);

    if (urlKey) {
      byUrl.set(urlKey, [...(byUrl.get(urlKey) ?? []), item]);
    }
  }

  const groups: DuplicateGroup[] = [];

  for (const [key, value] of byId) {
    pushGroup(groups, {
      key,
      reason: "id",
      itemIds: value.map((item) => item.id),
      titles: value.map((item) => item.title),
      urls: value.map((item) => item.url),
    });
  }

  for (const [key, value] of byExternal) {
    pushGroup(groups, {
      key,
      reason: "external-id",
      itemIds: value.map((item) => item.id),
      titles: value.map((item) => item.title),
      urls: value.map((item) => item.url),
    });
  }

  for (const [key, value] of byUrl) {
    pushGroup(groups, {
      key,
      reason: "url",
      itemIds: value.map((item) => item.id),
      titles: value.map((item) => item.title),
      urls: value.map((item) => item.url),
    });
  }

  return {
    generatedAt: new Date().toISOString(),
    totalItems: items.length,
    duplicateGroups: groups,
  };
}

export function formatDuplicateReport(report: Awaited<ReturnType<typeof getSavedContentDuplicateReport>>) {
  if (report.duplicateGroups.length === 0) {
    return [
      "Saved Content Duplicate Report",
      "",
      `Generated at: ${report.generatedAt}`,
      `Total items: ${report.totalItems}`,
      "",
      "No duplicate groups found.",
    ].join("\n");
  }

  return [
    "Saved Content Duplicate Report",
    "",
    `Generated at: ${report.generatedAt}`,
    `Total items: ${report.totalItems}`,
    `Duplicate groups: ${report.duplicateGroups.length}`,
    "",
    ...report.duplicateGroups.slice(0, 50).flatMap((group, index) => [
      `${index + 1}. ${group.key} (${group.reason})`,
      `   Item IDs: ${group.itemIds.join(", ")}`,
      `   Titles: ${Array.from(new Set(group.titles)).join(" | ")}`,
      "",
    ]),
  ].join("\n");
}

export async function repairSavedContentDuplicates() {
  const report = await getSavedContentDuplicateReport();

  return {
    report,
    repaired: 0,
    message:
      report.duplicateGroups.length === 0
        ? "No duplicate groups found. Nothing to repair."
        : "Duplicate groups found. Automatic destructive merge is disabled in V5.6N; review the report before manual cleanup.",
  };
}
