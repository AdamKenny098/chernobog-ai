import { createHash } from "node:crypto";

import type { ItchChangeConfidence, ItchChangeType } from "../contract";
import type { ItchGame, ItchGameSnapshot, ItchGameWatch } from "../types";

export type DetectedSnapshotChange = {
  type: ItchChangeType;
  confidence: ItchChangeConfidence;
  summary: string;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  dedupeKey: string;
};

export function detectItchSnapshotChanges(input: {
  game: ItchGame;
  watch: ItchGameWatch;
  before: ItchGameSnapshot;
  after: ItchGameSnapshot;
}): DetectedSnapshotChange[] {
  const { game, watch, before, after } = input;
  const changes: DetectedSnapshotChange[] = [];
  const push = (
    type: ItchChangeType,
    summary: string,
    beforeValue: Record<string, unknown>,
    afterValue: Record<string, unknown>,
    confidence: ItchChangeConfidence = "observed",
  ) => {
    const signature = createHash("sha256")
      .update(JSON.stringify([game.id, type, beforeValue, afterValue, after.id]))
      .digest("hex")
      .slice(0, 24);
    changes.push({
      type,
      confidence,
      summary,
      before: beforeValue,
      after: afterValue,
      dedupeKey: `snapshot:${game.id}:${type}:${signature}`,
    });
  };

  if (before.availability !== after.availability) {
    push(
      "availability",
      after.availability
        ? `${game.title} is available again on itch.io.`
        : `${game.title} is no longer publicly available on itch.io.`,
      { available: before.availability },
      { available: after.availability },
    );
  }

  if (
    watch.watchPrice &&
    (before.priceText !== after.priceText || before.isFree !== after.isFree)
  ) {
    push(
      "price",
      `${game.title} changed price from ${before.priceText ?? "unknown"} to ${after.priceText ?? "unknown"}.`,
      { priceText: before.priceText, isFree: before.isFree },
      { priceText: after.priceText, isFree: after.isFree },
    );
  }

  if (
    watch.watchSale &&
    (before.isOnSale !== after.isOnSale || before.saleText !== after.saleText)
  ) {
    push(
      "sale",
      after.isOnSale
        ? `${game.title} is now on sale${after.saleText ? `: ${after.saleText}` : "."}`
        : `${game.title}'s sale has ended.`,
      { isOnSale: before.isOnSale, saleText: before.saleText },
      { isOnSale: after.isOnSale, saleText: after.saleText },
    );
  }

  if (watch.watchPlatforms && !sameRecord(before.platforms, after.platforms)) {
    const added = Object.keys(after.platforms).filter(
      (key) => after.platforms[key as keyof typeof after.platforms] && !before.platforms[key as keyof typeof before.platforms],
    );
    const removed = Object.keys(before.platforms).filter(
      (key) => before.platforms[key as keyof typeof before.platforms] && !after.platforms[key as keyof typeof after.platforms],
    );
    const pieces = [
      added.length ? `added ${added.join(", ")}` : "",
      removed.length ? `removed ${removed.join(", ")}` : "",
    ].filter(Boolean);
    push(
      "platform",
      `${game.title} changed platform availability${pieces.length ? `: ${pieces.join("; ")}` : "."}`,
      { platforms: before.platforms },
      { platforms: after.platforms },
    );
  }

  if (watch.watchMetadata && !sameArray(before.tags, after.tags)) {
    const added = after.tags.filter((tag) => !before.tags.includes(tag));
    const removed = before.tags.filter((tag) => !after.tags.includes(tag));
    push(
      "tags",
      `${game.title} changed public tags${added.length ? `; added ${added.join(", ")}` : ""}${removed.length ? `; removed ${removed.join(", ")}` : ""}.`,
      { tags: before.tags },
      { tags: after.tags },
      "inferred",
    );
  }

  if (
    watch.watchMetadata &&
    (before.title !== after.title || before.shortDescriptionHash !== after.shortDescriptionHash)
  ) {
    push(
      "page",
      `${game.title}'s public project page content changed.`,
      { title: before.title, shortDescriptionHash: before.shortDescriptionHash },
      { title: after.title, shortDescriptionHash: after.shortDescriptionHash },
      "inferred",
    );
  }

  return changes;
}

function sameArray(a: string[], b: string[]): boolean {
  return [...a].sort().join("\u0000") === [...b].sort().join("\u0000");
}

function sameRecord(a: Record<string, boolean>, b: Record<string, boolean>): boolean {
  return Object.keys({ ...a, ...b }).every((key) => a[key] === b[key]);
}
