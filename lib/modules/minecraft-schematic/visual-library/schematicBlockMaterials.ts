import type {
  VisualBlockMaterialInfo,
  VisualBlockMaterialKind,
} from "./types";

type MaterialPreset = {
  color: string;
  secondaryColor?: string;
  transparent?: boolean;
  opacity?: number;
  roughness?: number;
  metalness?: number;
  kind?: VisualBlockMaterialKind;
  emissive?: string;
  emissiveIntensity?: number;
  textureName?: string;
};

const EXACT_PRESETS = new Map<string, MaterialPreset>([
  ["minecraft:stone", { color: "#7f7f7f", secondaryColor: "#9a9a9a" }],
  ["minecraft:cobblestone", { color: "#6f6f6f", secondaryColor: "#9a9a9a" }],
  ["minecraft:stone_bricks", { color: "#787878", secondaryColor: "#9d9d9d" }],
  ["minecraft:mossy_stone_bricks", { color: "#697461", secondaryColor: "#8b9a7d" }],
  ["minecraft:deepslate", { color: "#3f4044", secondaryColor: "#5a5b61" }],
  ["minecraft:cobbled_deepslate", { color: "#393a3f", secondaryColor: "#56575f" }],
  ["minecraft:blackstone", { color: "#2c282f", secondaryColor: "#47404d" }],
  ["minecraft:dirt", { color: "#806044", secondaryColor: "#a47b55" }],
  ["minecraft:coarse_dirt", { color: "#7a604a", secondaryColor: "#9d8061" }],
  ["minecraft:grass_block", { color: "#5f8f45", secondaryColor: "#8fbb55", textureName: "grass_block_top" }],
  ["minecraft:sand", { color: "#d8c27d", secondaryColor: "#f0df9a" }],
  ["minecraft:red_sand", { color: "#bd7544", secondaryColor: "#dc9257" }],
  ["minecraft:sandstone", { color: "#d5bd75", secondaryColor: "#efd992" }],
  ["minecraft:oak_planks", { color: "#b78048", secondaryColor: "#d19c61" }],
  ["minecraft:spruce_planks", { color: "#76502f", secondaryColor: "#93683f" }],
  ["minecraft:birch_planks", { color: "#c9b276", secondaryColor: "#e2cc91" }],
  ["minecraft:jungle_planks", { color: "#b87954", secondaryColor: "#d09269" }],
  ["minecraft:acacia_planks", { color: "#b86534", secondaryColor: "#d27b48" }],
  ["minecraft:dark_oak_planks", { color: "#4b301d", secondaryColor: "#6a462b" }],
  ["minecraft:mangrove_planks", { color: "#783b35", secondaryColor: "#954c44" }],
  ["minecraft:cherry_planks", { color: "#d49aa5", secondaryColor: "#edb6c1" }],
  ["minecraft:oak_log", { color: "#7b5a32", secondaryColor: "#a8814c" }],
  ["minecraft:spruce_log", { color: "#554127", secondaryColor: "#735a38" }],
  ["minecraft:birch_log", { color: "#d9d2b1", secondaryColor: "#f1e8c5" }],
  ["minecraft:glass", { color: "#86b6c9", secondaryColor: "#d4f3ff", transparent: true, opacity: 0.38, roughness: 0.18, kind: "transparent" }],
  ["minecraft:glass_pane", { color: "#86b6c9", secondaryColor: "#d4f3ff", transparent: true, opacity: 0.32, roughness: 0.14, kind: "transparent" }],
  ["minecraft:white_stained_glass", { color: "#dbeafe", secondaryColor: "#ffffff", transparent: true, opacity: 0.4, roughness: 0.16, kind: "transparent" }],
  ["minecraft:blue_stained_glass", { color: "#3f68b8", secondaryColor: "#81a8ff", transparent: true, opacity: 0.42, roughness: 0.16, kind: "transparent" }],
  ["minecraft:bricks", { color: "#9b3f32", secondaryColor: "#c85f4b" }],
  ["minecraft:brick_block", { color: "#9b3f32", secondaryColor: "#c85f4b", textureName: "bricks" }],
  ["minecraft:nether_bricks", { color: "#32151c", secondaryColor: "#5b2630" }],
  ["minecraft:iron_block", { color: "#c8c8c0", secondaryColor: "#f0f0e8", metalness: 0.18, roughness: 0.42 }],
  ["minecraft:gold_block", { color: "#e0b936", secondaryColor: "#ffdf5a", metalness: 0.24, roughness: 0.36 }],
  ["minecraft:copper_block", { color: "#b86f44", secondaryColor: "#df8b58", metalness: 0.12, roughness: 0.48 }],
  ["minecraft:oxidized_copper", { color: "#5f9f8a", secondaryColor: "#83c7ad", metalness: 0.08, roughness: 0.56 }],
  ["minecraft:coal_block", { color: "#171717", secondaryColor: "#2c2c2c", roughness: 0.7 }],
  ["minecraft:obsidian", { color: "#191326", secondaryColor: "#3a294f", roughness: 0.48 }],
  ["minecraft:water", { color: "#315f9f", secondaryColor: "#5b9dde", transparent: true, opacity: 0.54, roughness: 0.12, kind: "liquid" }],
  ["minecraft:lava", { color: "#d65b25", secondaryColor: "#ffbc38", kind: "emissive", emissive: "#ff6f22", emissiveIntensity: 0.9 }],
  ["minecraft:oak_leaves", { color: "#496f34", secondaryColor: "#6f9b4b", transparent: true, opacity: 0.76, kind: "foliage" }],
  ["minecraft:spruce_leaves", { color: "#304833", secondaryColor: "#547052", transparent: true, opacity: 0.78, kind: "foliage" }],
  ["minecraft:birch_leaves", { color: "#6f8f3f", secondaryColor: "#9bb95b", transparent: true, opacity: 0.78, kind: "foliage" }],
  ["minecraft:glowstone", { color: "#c9a34e", secondaryColor: "#ffe28a", kind: "emissive", emissive: "#ffd166", emissiveIntensity: 0.55 }],
  ["minecraft:sea_lantern", { color: "#b6d8d4", secondaryColor: "#e4fffb", kind: "emissive", emissive: "#bffcf4", emissiveIntensity: 0.48 }],
  ["minecraft:lantern", { color: "#b07b36", secondaryColor: "#ffd272", kind: "emissive", emissive: "#ffbf4d", emissiveIntensity: 0.42 }],
  ["minecraft:redstone_lamp", { color: "#6f3f24", secondaryColor: "#c98242", kind: "emissive", emissive: "#f97316", emissiveIntensity: 0.32 }],
]);

const PATTERN_PRESETS: Array<[RegExp, MaterialPreset]> = [
  [/air$/, { color: "#000000", secondaryColor: "#000000", transparent: true, opacity: 0, kind: "transparent" }],
  [/leaves?$/, { color: "#4f7d3a", secondaryColor: "#78a855", transparent: true, opacity: 0.76, kind: "foliage" }],
  [/glass(_pane)?$/, { color: "#86b6c9", secondaryColor: "#d4f3ff", transparent: true, opacity: 0.38, roughness: 0.16, kind: "transparent" }],
  [/water$/, { color: "#315f9f", secondaryColor: "#5b9dde", transparent: true, opacity: 0.54, roughness: 0.12, kind: "liquid" }],
  [/lava$/, { color: "#d65b25", secondaryColor: "#ffbc38", kind: "emissive", emissive: "#ff6f22", emissiveIntensity: 0.9 }],
  [/planks?$/, { color: "#a97843", secondaryColor: "#c89256" }],
  [/logs?$|wood$/, { color: "#755431", secondaryColor: "#9f7745" }],
  [/stone|andesite|granite|diorite|tuff/, { color: "#7d7d7d", secondaryColor: "#9b9b9b" }],
  [/deepslate|blackstone|basalt/, { color: "#383a3f", secondaryColor: "#575a62" }],
  [/brick/, { color: "#9b3f32", secondaryColor: "#c85f4b" }],
  [/sand/, { color: "#d8c27d", secondaryColor: "#f0df9a" }],
  [/dirt|mud/, { color: "#806044", secondaryColor: "#a47b55" }],
  [/grass/, { color: "#5f8f45", secondaryColor: "#8fbb55" }],
  [/copper/, { color: "#b86f44", secondaryColor: "#df8b58", metalness: 0.1, roughness: 0.5 }],
  [/iron|steel/, { color: "#bfc0bb", secondaryColor: "#e7e7df", metalness: 0.16, roughness: 0.44 }],
  [/gold/, { color: "#e0b936", secondaryColor: "#ffdf5a", metalness: 0.24, roughness: 0.36 }],
  [/wool/, { color: "#d7d7d7", secondaryColor: "#f5f5f5", roughness: 0.92 }],
  [/concrete/, { color: "#8b8f99", secondaryColor: "#b0b4bf", roughness: 0.86 }],
  [/terracotta/, { color: "#a35a3d", secondaryColor: "#c87958", roughness: 0.84 }],
  [/lantern|lamp|light|glow/, { color: "#c9a34e", secondaryColor: "#ffe28a", kind: "emissive", emissive: "#ffd166", emissiveIntensity: 0.5 }],
];

const DEFAULT_PRESET: MaterialPreset = {
  color: "#8b8f99",
  secondaryColor: "#b0b4bf",
  roughness: 0.82,
  metalness: 0.03,
  kind: "missing",
};

export function getSchematicBlockMaterial(
  blockId: string,
): VisualBlockMaterialInfo {
  const normalized = normalizeBlockId(blockId);
  const preset = findPreset(normalized);
  const color = preset.color;
  const secondaryColor = preset.secondaryColor ?? lightenHex(color, 0.18);
  const textureName = preset.textureName ?? getBlockName(normalized);

  return {
    key: normalized,
    displayName: formatBlockDisplayName(normalized),
    color,
    secondaryColor,
    texturePath: getTexturePath(normalized, textureName),
    transparent: preset.transparent ?? false,
    opacity: preset.opacity ?? 1,
    roughness: preset.roughness ?? 0.82,
    metalness: preset.metalness ?? 0.04,
    kind: preset.kind ?? "solid",
    emissive: preset.emissive,
    emissiveIntensity: preset.emissiveIntensity,
  };
}

export function normalizeBlockId(blockId: string): string {
  const trimmed = blockId.trim().toLowerCase();
  const withoutState = trimmed.split("[")[0] ?? trimmed;
  const safe = withoutState.replace(/[^a-z0-9:_/-]/g, "_");

  if (!safe) {
    return "minecraft:unknown";
  }

  if (safe.includes(":")) {
    return safe;
  }

  return `minecraft:${safe}`;
}

export function getBlockDisplayName(blockId: string): string {
  return formatBlockDisplayName(normalizeBlockId(blockId));
}

function findPreset(normalizedBlockId: string): MaterialPreset {
  const exact = EXACT_PRESETS.get(normalizedBlockId);

  if (exact) {
    return exact;
  }

  const blockName = getBlockName(normalizedBlockId);

  for (const [pattern, preset] of PATTERN_PRESETS) {
    if (pattern.test(blockName)) {
      return preset;
    }
  }

  return DEFAULT_PRESET;
}

function getTexturePath(normalizedBlockId: string, textureName: string): string {
  const [namespace = "minecraft"] = normalizedBlockId.split(":");
  const safeNamespace = namespace.replace(/[^a-z0-9_-]/g, "_");
  const safeTextureName = textureName.replace(/[^a-z0-9_/-]/g, "_");

  if (safeNamespace === "minecraft") {
    return `/schematic-textures/minecraft/${safeTextureName}.png`;
  }

  return `/schematic-textures/modded/${safeNamespace}/${safeTextureName}.png`;
}

function getBlockName(normalizedBlockId: string): string {
  return normalizedBlockId.split(":").at(-1) ?? normalizedBlockId;
}

function formatBlockDisplayName(normalizedBlockId: string): string {
  const blockName = getBlockName(normalizedBlockId);

  return blockName
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function lightenHex(hex: string, amount: number): string {
  const value = hex.replace("#", "");
  const parsed = Number.parseInt(value, 16);

  if (!Number.isFinite(parsed)) {
    return hex;
  }

  const r = (parsed >> 16) & 255;
  const g = (parsed >> 8) & 255;
  const b = parsed & 255;

  const nextR = Math.round(r + (255 - r) * amount);
  const nextG = Math.round(g + (255 - g) * amount);
  const nextB = Math.round(b + (255 - b) * amount);

  return `#${toHex(nextR)}${toHex(nextG)}${toHex(nextB)}`;
}

function toHex(value: number): string {
  return value.toString(16).padStart(2, "0");
}
