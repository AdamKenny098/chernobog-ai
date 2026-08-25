const WORLD_STATE_IDENTIFIER_PATTERN = /^[a-z0-9]+(?:[._-][a-z0-9]+)*$/;
const WORLD_STATE_KEY_PATTERN = /^[a-z0-9]+(?:[._-][a-z0-9]+)+$/;

export const CHERNOBOG_WORLD_STATE_NAMESPACES = [
  "project",
  "repository",
  "service",
  "runtime",
  "model",
  "backup",
  "storage",
  "desktop",
  "execution",
  "system",
] as const;

export type ChernobogWorldStateNamespace =
  (typeof CHERNOBOG_WORLD_STATE_NAMESPACES)[number];

export function isValidWorldStateIdentifier(value: string): boolean {
  return WORLD_STATE_IDENTIFIER_PATTERN.test(value);
}

export function isValidWorldStateKey(value: string): boolean {
  return WORLD_STATE_KEY_PATTERN.test(value);
}

export function getWorldStateNamespace(key: string): string {
  const separator = key.indexOf(".");
  if (separator <= 0) {
    throw new Error(
      "worldState.key must be a lowercase namespaced identifier such as service.ollama.health.",
    );
  }
  return key.slice(0, separator);
}

export function createWorldStateKey(
  namespace: string,
  ...segments: string[]
): string {
  const normalizedNamespace = namespace.trim();

  if (!normalizedNamespace || !isValidWorldStateIdentifier(normalizedNamespace)) {
    throw new Error(
      "worldState.namespace must use lowercase letters, numbers, dots, underscores, or hyphens.",
    );
  }

  if (segments.length === 0) {
    throw new Error("worldState.key requires at least one segment after the namespace.");
  }

  const normalizedSegments = segments.map((segment) => segment.trim());

  for (const segment of normalizedSegments) {
    if (!segment || !isValidWorldStateIdentifier(segment)) {
      throw new Error(
        "worldState.key segments must use lowercase letters, numbers, dots, underscores, or hyphens.",
      );
    }
  }

  return [normalizedNamespace, ...normalizedSegments].join(".");
}
