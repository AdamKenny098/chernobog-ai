import { createHash } from "node:crypto";

import { parseEmbeddedListingMetadata } from "../domain/embeddedListingMetadata";
import type { ItchSource } from "../types";
import {
  canonicalizeItchProjectUrl,
  inferCreatorNameFromProjectUrl,
} from "./canonicalizeItchUrl";
import type {
  NormalizedItchRssEntry,
  ParsedItchRssEntry,
} from "./types";

export function normalizeItchRssEntry(
  source: ItchSource,
  entry: ParsedItchRssEntry,
): NormalizedItchRssEntry | null {
  const canonicalUrl = findCanonicalProjectUrl(entry);
  if (!canonicalUrl) {
    return null;
  }

  const rawTitle = normalizeTitle(entry.title);
  if (!rawTitle) {
    return null;
  }

  const embedded = parseEmbeddedListingMetadata(rawTitle);
  const title = embedded.cleanTitle;
  const categories = normalizeCategories([
    ...entry.categories,
    ...embedded.tags,
    ...extractTagHintsFromSourceUrl(source.sourceUrl),
  ]);
  const sourceGuid = normalizeOptionalText(entry.guid);
  const dedupeMaterial = sourceGuid || canonicalUrl;

  return {
    canonicalUrl,
    title,
    rawTitle,
    creatorName:
      normalizeOptionalText(entry.creatorName) ??
      inferCreatorNameFromProjectUrl(canonicalUrl),
    shortDescription: normalizeDescription(entry.description),
    coverImageUrl: normalizeImageUrl(entry.imageUrl, canonicalUrl),
    inferredPrice: embedded.price,
    inferredPlatforms: embedded.platforms,
    publishedAt: entry.publishedAt,
    sourceUpdatedAt: entry.updatedAt ?? entry.publishedAt,
    sourceGuid,
    categories,
    dedupeKey: `${source.id}:${sha256(dedupeMaterial)}`,
  };
}

function findCanonicalProjectUrl(entry: ParsedItchRssEntry): string | null {
  const candidates = [entry.link, entry.guid].filter(
    (value): value is string => Boolean(value),
  );

  for (const candidate of candidates) {
    const canonicalUrl = canonicalizeItchProjectUrl(candidate);
    if (canonicalUrl) {
      return canonicalUrl;
    }
  }

  return null;
}

function normalizeTitle(value: string): string {
  return value.replace(/\s+/g, " ").trim().slice(0, 300);
}

function normalizeDescription(value: string | undefined): string | undefined {
  const cleaned = normalizeOptionalText(value);
  if (!cleaned) {
    return undefined;
  }

  return cleaned.length > 600 ? `${cleaned.slice(0, 597).trimEnd()}...` : cleaned;
}

function normalizeOptionalText(value: string | undefined): string | undefined {
  const cleaned = value?.replace(/\s+/g, " ").trim();
  return cleaned || undefined;
}

function normalizeCategories(values: string[]): string[] {
  const normalized = values
    .map((value) =>
      value
        .trim()
        .toLowerCase()
        .replace(/&/g, " and ")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, ""),
    )
    .filter(Boolean);

  return [...new Set(normalized)].sort();
}

function extractTagHintsFromSourceUrl(sourceUrl: string): string[] {
  const pathname = new URL(sourceUrl).pathname;
  const tags: string[] = [];

  for (const match of pathname.matchAll(/(?:^|\/)tag-([^/.]+)/gi)) {
    if (match[1]) {
      tags.push(decodeURIComponent(match[1]));
    }
  }

  return tags;
}

function normalizeImageUrl(
  value: string | undefined,
  baseUrl: string,
): string | undefined {
  if (!value) {
    return undefined;
  }

  try {
    const url = new URL(value, baseUrl);
    const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
    if (
      url.protocol !== "https:" &&
      url.protocol !== "http:"
    ) {
      return undefined;
    }
    if (
      hostname !== "itch.io" &&
      !hostname.endsWith(".itch.io") &&
      hostname !== "itch.zone" &&
      !hostname.endsWith(".itch.zone")
    ) {
      return undefined;
    }
    if (url.protocol === "http:") {
      url.protocol = "https:";
    }
    url.hash = "";
    return url.toString();
  } catch {
    return undefined;
  }
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}
