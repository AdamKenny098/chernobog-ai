import { createHash } from "node:crypto";

import type { ItchDevlogPostType } from "../contract";
import type { ItchDevlogFeedItem } from "../types";
import { assertAllowedItchUrl, canonicalizeItchFeedUrl } from "../acquisition/canonicalizeItchUrl";
import { parseItchRssSource } from "../acquisition/parseRssSource";

export function buildItchDevlogFeedUrl(canonicalProjectUrl: string): string {
  const project = assertAllowedItchUrl(canonicalProjectUrl, "project");
  project.protocol = "https:";
  project.search = "";
  project.hash = "";
  project.pathname = `${project.pathname.replace(/\/$/, "")}/devlog.rss`;
  return canonicalizeItchFeedUrl(project.toString());
}

export function parseItchDevlogFeed(xml: string): ItchDevlogFeedItem[] {
  const feed = parseItchRssSource(xml);
  const items: ItchDevlogFeedItem[] = [];
  const seen = new Set<string>();

  for (const entry of feed.entries) {
    if (!entry.link) continue;
    let entryUrl: string;
    try {
      const url = assertAllowedItchUrl(entry.link, "feed");
      url.protocol = "https:";
      url.hash = "";
      entryUrl = url.toString();
    } catch {
      continue;
    }

    const entryGuid = (entry.guid ?? entryUrl).trim();
    if (!entryGuid || seen.has(entryGuid)) continue;
    seen.add(entryGuid);

    const postType = classifyItchDevlogPost(entry.title, entry.categories);
    const contentHash = hashDevlogContent([
      entryGuid,
      entryUrl,
      entry.title,
      entry.description ?? "",
      entry.publishedAt ?? "",
      postType,
    ].join("\n"));

    items.push({
      entryGuid,
      entryUrl,
      title: entry.title,
      summary: entry.description,
      publishedAt: entry.publishedAt ?? entry.updatedAt,
      postType,
      contentHash,
    });
  }

  return items.sort((a, b) =>
    (a.publishedAt ?? "").localeCompare(b.publishedAt ?? ""),
  );
}

export function classifyItchDevlogPost(
  title: string,
  categories: string[] = [],
): ItchDevlogPostType {
  const text = `${title} ${categories.join(" ")}`.toLowerCase();
  if (/\b(major update|major release|full release|version 1\.0|v1\.0|launch update)\b/.test(text)) {
    return "major-update";
  }
  if (/\b(update|patch|hotfix|changelog|version|build)\b/.test(text)) {
    return "update";
  }
  if (/\b(announcement|announcing|release date|news)\b/.test(text)) {
    return "announcement";
  }
  if (/\b(devlog|development log|progress report|developer diary|behind the scenes)\b/.test(text)) {
    return "long-form";
  }
  return "unknown";
}

export function hashDevlogContent(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}
