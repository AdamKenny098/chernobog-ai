// lib/modules/minecraft-schematic/block-registry/minecraftVersion.ts

export type MinecraftVersionTuple = readonly [number, number, number];

export function normalizeMinecraftVersion(version: string): string {
  const trimmed = version.trim();

  if (!trimmed) {
    throw new Error("Minecraft version cannot be empty.");
  }

  const withoutPrefix = trimmed.replace(/^minecraft[_\s-]*/i, "");
  const releaseOnly = withoutPrefix.split("-")[0]?.trim() ?? withoutPrefix;
  const parts = releaseOnly.split(".").map((part) => part.trim());

  if (parts.length < 2 || parts.length > 3) {
    throw new Error(`Unsupported Minecraft version format: ${version}`);
  }

  const numericParts = parts.map((part) => {
    if (!/^\d+$/.test(part)) {
      throw new Error(`Unsupported Minecraft version format: ${version}`);
    }

    return Number(part);
  });

  const [major, minor, patch = 0] = numericParts;

  return `${major}.${minor}.${patch}`;
}

export function parseMinecraftVersion(version: string): MinecraftVersionTuple {
  const normalized = normalizeMinecraftVersion(version);
  const [majorRaw, minorRaw, patchRaw] = normalized.split(".");

  const major = Number(majorRaw);
  const minor = Number(minorRaw);
  const patch = Number(patchRaw);

  return [major, minor, patch] as const;
}

export function compareMinecraftVersions(a: string, b: string): number {
  const left = parseMinecraftVersion(a);
  const right = parseMinecraftVersion(b);

  for (let index = 0; index < 3; index += 1) {
    if (left[index] < right[index]) return -1;
    if (left[index] > right[index]) return 1;
  }

  return 0;
}

export function isMinecraftVersionAtLeast(
  targetVersion: string,
  requiredVersion: string,
): boolean {
  return compareMinecraftVersions(targetVersion, requiredVersion) >= 0;
}

export function isMinecraftVersionBefore(
  targetVersion: string,
  comparisonVersion: string,
): boolean {
  return compareMinecraftVersions(targetVersion, comparisonVersion) < 0;
}
