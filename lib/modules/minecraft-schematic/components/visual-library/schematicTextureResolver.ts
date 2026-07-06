import type { VisualBlockMaterialInfo } from "../../visual-library/types";

const MINECRAFT_TEXTURE_LAYOUTS = [
  "/schematic-textures/minecraft/{name}.png",
  "/schematic-textures/minecraft/block/{name}.png",
  "/schematic-textures/minecraft/blocks/{name}.png",
  "/schematic-textures/minecraft/textures/block/{name}.png",
  "/schematic-textures/minecraft/textures/blocks/{name}.png",
  "/schematic-textures/minecraft/assets/minecraft/textures/block/{name}.png",
  "/schematic-textures/minecraft/assets/minecraft/textures/blocks/{name}.png",
];

const MODDED_TEXTURE_LAYOUTS = [
  "/schematic-textures/modded/{namespace}/{name}.png",
  "/schematic-textures/modded/{namespace}/block/{name}.png",
  "/schematic-textures/modded/{namespace}/blocks/{name}.png",
  "/schematic-textures/modded/{namespace}/textures/block/{name}.png",
  "/schematic-textures/modded/{namespace}/textures/blocks/{name}.png",
  "/schematic-textures/modded/{namespace}/assets/{namespace}/textures/block/{name}.png",
  "/schematic-textures/modded/{namespace}/assets/{namespace}/textures/blocks/{name}.png",
];

const TEXTURE_ALIASES = new Map<string, string[]>([
  ["water", ["water_still", "water_flow"]],
  ["lava", ["lava_still", "lava_flow"]],
  ["grass_block", ["grass_block_top", "grass_block_side", "grass_top", "grass_side"]],
  ["grass_block_top", ["grass_block", "grass_top"]],
  ["grass_block_side", ["grass_side", "grass_side_overlay"]],
  ["dirt_path", ["dirt_path_top", "grass_path_top", "grass_path_side"]],
  ["farmland", ["farmland_dry", "farmland_wet"]],
  ["bricks", ["brick"]],
  ["brick_block", ["bricks", "brick"]],
  ["stone_bricks", ["stonebrick"]],
  ["mossy_stone_bricks", ["mossy_stonebrick"]],
  ["cracked_stone_bricks", ["stonebrick_cracked"]],
  ["chiseled_stone_bricks", ["stonebrick_carved"]],
  ["glass_pane", ["glass"]],
  ["white_stained_glass_pane", ["white_stained_glass"]],
  ["orange_stained_glass_pane", ["orange_stained_glass"]],
  ["magenta_stained_glass_pane", ["magenta_stained_glass"]],
  ["light_blue_stained_glass_pane", ["light_blue_stained_glass"]],
  ["yellow_stained_glass_pane", ["yellow_stained_glass"]],
  ["lime_stained_glass_pane", ["lime_stained_glass"]],
  ["pink_stained_glass_pane", ["pink_stained_glass"]],
  ["gray_stained_glass_pane", ["gray_stained_glass"]],
  ["light_gray_stained_glass_pane", ["light_gray_stained_glass"]],
  ["cyan_stained_glass_pane", ["cyan_stained_glass"]],
  ["purple_stained_glass_pane", ["purple_stained_glass"]],
  ["blue_stained_glass_pane", ["blue_stained_glass"]],
  ["brown_stained_glass_pane", ["brown_stained_glass"]],
  ["green_stained_glass_pane", ["green_stained_glass"]],
  ["red_stained_glass_pane", ["red_stained_glass"]],
  ["black_stained_glass_pane", ["black_stained_glass"]],
  ["oak_wood", ["oak_log", "oak_log_top"]],
  ["spruce_wood", ["spruce_log", "spruce_log_top"]],
  ["birch_wood", ["birch_log", "birch_log_top"]],
  ["jungle_wood", ["jungle_log", "jungle_log_top"]],
  ["acacia_wood", ["acacia_log", "acacia_log_top"]],
  ["dark_oak_wood", ["dark_oak_log", "dark_oak_log_top"]],
  ["mangrove_wood", ["mangrove_log", "mangrove_log_top"]],
  ["cherry_wood", ["cherry_log", "cherry_log_top"]],
  ["redstone_lamp", ["redstone_lamp_off", "redstone_lamp_on"]],
  ["crafting_table", ["crafting_table_top", "crafting_table_front", "crafting_table_side"]],
  ["furnace", ["furnace_front", "furnace_side", "furnace_top"]],
  ["lit_furnace", ["furnace_front_on", "furnace_front"]],
  ["chest", ["chest_front", "chest_side", "chest_top"]],
  ["torch", ["torch_on"]],
  ["soul_torch", ["soul_torch"]],
]);

export type SchematicTextureCandidate = {
  url: string;
  source: "primary" | "minecraft-layout" | "modded-layout" | "alias";
};

export function getSchematicTextureCandidateUrls(
  materialInfo: VisualBlockMaterialInfo,
): string[] {
  return getSchematicTextureCandidates(materialInfo).map((candidate) => candidate.url);
}

export function getSchematicTextureCandidates(
  materialInfo: VisualBlockMaterialInfo,
): SchematicTextureCandidate[] {
  const namespace = getNamespace(materialInfo.key);
  const primaryUrl = normalizePublicTextureUrl(materialInfo.texturePath);
  const primaryTextureName = getTextureNameFromUrl(primaryUrl);
  const blockName = getBlockName(materialInfo.key);
  const textureNames = createTextureNameList(blockName, primaryTextureName);
  const candidates: SchematicTextureCandidate[] = [];

  if (primaryUrl) {
    candidates.push({ url: primaryUrl, source: "primary" });
  }

  const layouts = namespace === "minecraft" ? MINECRAFT_TEXTURE_LAYOUTS : MODDED_TEXTURE_LAYOUTS;
  const layoutSource = namespace === "minecraft" ? "minecraft-layout" : "modded-layout";

  for (const textureName of textureNames) {
    for (const layout of layouts) {
      const url = layout
        .replaceAll("{namespace}", namespace)
        .replaceAll("{name}", textureName);

      candidates.push({
        url,
        source: textureName === primaryTextureName || textureName === blockName ? layoutSource : "alias",
      });
    }
  }

  return dedupeCandidates(candidates);
}

export function textureUrlToPublicRelativePath(url: string): string | null {
  const normalizedUrl = normalizePublicTextureUrl(url);

  if (!normalizedUrl.startsWith("/")) {
    return null;
  }

  if (normalizedUrl.includes("..")) {
    return null;
  }

  return normalizedUrl.replace(/^\/+/, "");
}

function createTextureNameList(blockName: string, primaryTextureName: string): string[] {
  const names = [primaryTextureName, blockName];
  const aliasKeys = [primaryTextureName, blockName].filter(Boolean);

  for (const aliasKey of aliasKeys) {
    names.push(...(TEXTURE_ALIASES.get(aliasKey) ?? []));
  }

  return dedupeStrings(names)
    .map(sanitizeTextureName)
    .filter((name) => name.length > 0);
}

function normalizePublicTextureUrl(texturePath: string): string {
  const trimmed = texturePath.trim();

  if (!trimmed) {
    return "";
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  const withoutPublic = trimmed.replace(/^public[\\/]/, "");
  const normalizedSlashes = withoutPublic.replaceAll("\\", "/");

  return normalizedSlashes.startsWith("/") ? normalizedSlashes : `/${normalizedSlashes}`;
}

function getNamespace(blockId: string): string {
  const normalized = blockId.trim().toLowerCase();
  const [namespace] = normalized.split(":");

  if (!namespace || namespace === normalized) {
    return "minecraft";
  }

  return sanitizeNamespace(namespace);
}

function getBlockName(blockId: string): string {
  const normalized = blockId.trim().toLowerCase();
  const blockName = normalized.split(":").at(-1) ?? normalized;
  const withoutState = blockName.split("[")[0] ?? blockName;

  return sanitizeTextureName(withoutState);
}

function getTextureNameFromUrl(url: string): string {
  if (!url) {
    return "";
  }

  const withoutQuery = url.split("?")[0] ?? url;
  const fileName = withoutQuery.split("/").at(-1) ?? withoutQuery;
  const withoutExtension = fileName.replace(/\.png$/i, "");

  return sanitizeTextureName(withoutExtension);
}

function sanitizeNamespace(value: string): string {
  return value.replace(/[^a-z0-9_-]/g, "_");
}

function sanitizeTextureName(value: string): string {
  return value.replace(/[^a-z0-9_/-]/g, "_").replace(/^\/+|\/+$/g, "");
}

function dedupeCandidates(
  candidates: SchematicTextureCandidate[],
): SchematicTextureCandidate[] {
  const seen = new Set<string>();
  const deduped: SchematicTextureCandidate[] = [];

  for (const candidate of candidates) {
    if (!candidate.url || seen.has(candidate.url)) {
      continue;
    }

    seen.add(candidate.url);
    deduped.push(candidate);
  }

  return deduped;
}

function dedupeStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const deduped: string[] = [];

  for (const value of values) {
    const normalized = value.trim();

    if (!normalized || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    deduped.push(normalized);
  }

  return deduped;
}
