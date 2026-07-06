const THUMBNAIL_EXTENSIONS = ["png", "webp", "jpg", "jpeg"] as const;

export type SchematicThumbnailStatus =
  | "candidate"
  | "loaded"
  | "missing"
  | "fallback";

export type ResolvedSchematicThumbnail = {
  status: SchematicThumbnailStatus;
  candidates: string[];
  preferredUrl: string | null;
  alt: string;
};

export type SchematicThumbnailInput = {
  id: string;
  name: string;
};

export function resolveSchematicThumbnail(
  schematic: SchematicThumbnailInput,
): ResolvedSchematicThumbnail {
  const candidates = buildSchematicThumbnailCandidates(schematic.id);

  return {
    status: candidates.length > 0 ? "candidate" : "fallback",
    candidates,
    preferredUrl: candidates[0] ?? null,
    alt: `Thumbnail preview for ${schematic.name}`,
  };
}

export function buildSchematicThumbnailCandidates(id: string): string[] {
  const raw = id.trim();

  if (!raw) {
    return [];
  }

  const slug = slugifySchematicThumbnailId(raw);
  const encoded = encodeURIComponent(raw);
  const baseNames = uniqueValues([raw, encoded, slug]).filter(Boolean);
  const urls: string[] = [];

  for (const extension of THUMBNAIL_EXTENSIONS) {
    for (const baseName of baseNames) {
      urls.push(`/schematic-thumbnails/${baseName}.${extension}`);
    }
  }

  return uniqueValues(urls);
}

export function slugifySchematicThumbnailId(id: string): string {
  const normalized = id
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "schematic";
}

function uniqueValues(values: string[]): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];

  for (const value of values) {
    if (!value || seen.has(value)) {
      continue;
    }

    seen.add(value);
    unique.push(value);
  }

  return unique;
}
