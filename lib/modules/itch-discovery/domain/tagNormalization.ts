import type { ItchTagAliasRepository } from "../repositories/itchTagAliasRepository";
import type {
  ItchTagNormalization,
  ItchTagNormalizationBatch,
} from "../types";

export const ITCH_TAG_MAX_LENGTH = 80;

const DISPLAY_OVERRIDES: Readonly<Record<string, string>> = {
  "2d": "2D",
  "3d": "3D",
  "co-op": "Co-op",
  "fps": "FPS",
  "jrpg": "JRPG",
  "nsfw": "NSFW",
  "rpg": "RPG",
  "sci-fi": "Sci-Fi",
  "virtual-reality": "Virtual Reality",
};

export function normalizeItchTagLookupKey(value: string): string {
  let normalized = decodeCommonEntities(value)
    .normalize("NFKC")
    .trim()
    .toLocaleLowerCase("en-US");

  if (!normalized) {
    return "";
  }

  if (normalized === "c++") {
    return "c-plus-plus";
  }

  if (normalized === "c#") {
    return "c-sharp";
  }

  normalized = normalized
    .replace(/[’'`]/g, "")
    .replace(/&/g, " and ")
    .replace(/\+/g, " plus ")
    .replace(/#/g, " sharp ")
    .replace(/[–—−]/g, "-")
    .replace(/[\s_./\\|:]+/g, "-")
    .replace(/[^\p{L}\p{N}-]+/gu, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized;
}

export function formatItchCanonicalTagDisplayName(tag: string): string {
  const normalized = normalizeItchTagLookupKey(tag);
  const override = DISPLAY_OVERRIDES[normalized];
  if (override) {
    return override;
  }

  return normalized
    .split("-")
    .filter(Boolean)
    .map((part) => {
      const special = DISPLAY_OVERRIDES[part];
      return special ?? `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`;
    })
    .join(" ");
}

export function isValidItchCanonicalTag(tag: string): boolean {
  return (
    tag.length > 0 &&
    tag.length <= ITCH_TAG_MAX_LENGTH &&
    /[\p{L}\p{N}]/u.test(tag)
  );
}

export class ItchTagNormalizer {
  constructor(private readonly aliases: ItchTagAliasRepository) {}

  normalize(rawValue: string): ItchTagNormalization {
    const rawTag = rawValue.trim();
    const normalizedKey = normalizeItchTagLookupKey(rawTag);

    if (!isValidItchCanonicalTag(normalizedKey)) {
      return {
        rawTag,
        normalizedKey,
        resolution: "rejected",
        changed: false,
        reason: normalizedKey
          ? `tag-exceeds-${ITCH_TAG_MAX_LENGTH}-characters`
          : "tag-empty-after-normalization",
      };
    }

    const aliasResolution = this.aliases.resolveDetailed(rawTag);
    const canonicalTag = normalizeItchTagLookupKey(
      aliasResolution.canonicalTag,
    );

    if (!isValidItchCanonicalTag(canonicalTag)) {
      return {
        rawTag,
        normalizedKey,
        resolution: "rejected",
        changed: false,
        reason: "alias-resolved-to-invalid-tag",
      };
    }

    const resolution = aliasResolution.matched
      ? aliasResolution.aliasKey === canonicalTag
        ? "direct"
        : "alias"
      : canonicalTag === normalizedKey
        ? "generated"
        : "alias";

    return {
      rawTag,
      normalizedKey,
      canonicalTag,
      resolution,
      aliasSource: aliasResolution.source,
      changed:
        canonicalTag !== normalizedKey ||
        rawTag.toLocaleLowerCase("en-US") !== canonicalTag,
    };
  }

  normalizeMany(values: Iterable<string>): ItchTagNormalizationBatch {
    const items: ItchTagNormalization[] = [];
    const canonicalTags: string[] = [];
    const seen = new Set<string>();

    let aliasHits = 0;
    let generatedTags = 0;
    let rejectedTags = 0;
    let collisionsRemoved = 0;

    for (const value of values) {
      const item = this.normalize(value);
      items.push(item);

      if (item.resolution === "alias") {
        aliasHits += 1;
      } else if (item.resolution === "generated") {
        generatedTags += 1;
      } else if (item.resolution === "rejected") {
        rejectedTags += 1;
      }

      if (!item.canonicalTag) {
        continue;
      }

      if (seen.has(item.canonicalTag)) {
        collisionsRemoved += 1;
        continue;
      }

      seen.add(item.canonicalTag);
      canonicalTags.push(item.canonicalTag);
    }

    canonicalTags.sort((left, right) => left.localeCompare(right));

    return {
      items,
      canonicalTags,
      aliasHits,
      generatedTags,
      rejectedTags,
      collisionsRemoved,
    };
  }
}

function decodeCommonEntities(value: string): string {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&nbsp;/gi, " ");
}
