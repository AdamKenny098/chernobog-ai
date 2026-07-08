import { allPaletteBlocks, type PaletteLibraryEntry } from "./paletteLibrary";
import type { PaletteCompatibilityResult, SchematicPaletteDefinition } from "./paletteTypes";

export function formatPaletteList(entries: PaletteLibraryEntry[]): string {
  if (entries.length === 0) {
    return "No schematic palettes found. Try: generate palette medieval castle 1.8.8";
  }

  return entries
    .map((entry) => {
      const version = entry.targetMinecraftVersion ?? entry.minecraftVersion ?? entry.profile ?? "vanilla";
      const tags = entry.tags.length > 0 ? ` | tags: ${entry.tags.join(", ")}` : "";
      return `- ${entry.id} (${version}) — ${entry.displayName}${tags}`;
    })
    .join("\n");
}

export function formatPalette(palette: SchematicPaletteDefinition): string {
  const header = [
    `Palette: ${palette.displayName}`,
    `ID: ${palette.id}`,
    `Target: ${palette.targetMinecraftVersion ?? palette.minecraftVersion ?? palette.profile ?? "vanilla"}`,
    palette.description ? `Description: ${palette.description}` : undefined,
  ].filter(Boolean);

  const roles = Object.entries(palette.roles)
    .map(([role, block]) => `- ${role}: ${block}`)
    .join("\n");

  const textures = Object.entries(palette.textures ?? {})
    .map(([role, entries]) => {
      const body = (entries ?? [])
        .map((entry) => `  - ${entry.block}: ${entry.weight}`)
        .join("\n");
      return `${role}:\n${body}`;
    })
    .join("\n");

  return [
    header.join("\n"),
    "",
    "Roles:",
    roles,
    textures ? "\nWeighted Textures:" : undefined,
    textures || undefined,
    "",
    `Unique blocks: ${allPaletteBlocks(palette).join(", ")}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export function formatPaletteCompatibility(result: PaletteCompatibilityResult): string {
  const status = result.ok ? "VALID" : "INVALID";
  const header = [
    `Palette validation: ${status}`,
    `Palette: ${result.paletteId}`,
    `Target: ${result.targetMinecraftVersion ?? result.profile ?? "vanilla"}`,
    `Changed blocks: ${result.changedBlocks}`,
    `Fallback blocks: ${result.fallbackBlocks}`,
    `Unsupported blocks: ${result.unsupportedBlocks}`,
  ];

  if (result.issues.length === 0) {
    return [...header, "No compatibility issues found."].join("\n");
  }

  const issues = result.issues.map((issue) => `- ${issue.severity.toUpperCase()}: ${issue.message}`);
  return [...header, "", "Issues:", ...issues].join("\n");
}
