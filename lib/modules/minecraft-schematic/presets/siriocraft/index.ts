import { createStarterFactoryPreset } from "./create_starter_factory";
import { factionGatehousePreset } from "./faction_gatehouse";
import { factionWatchtowerPreset } from "./faction_watchtower";
import { factoryWithYardPreset } from "./factory_with_yard";
import { industrialStorageYardPreset } from "./industrial_storage_yard";
import { machineHousePreset } from "./machine_house";
import { pipeworksYardPreset } from "./pipeworks_yard";
import { railLoadingFactoryPreset } from "./rail_loading_factory";
import { roadsideCheckpointPreset } from "./roadside_checkpoint";
import { ruinedOutpostPreset } from "./ruined_outpost";
import { smallHousePreset } from "./small_house";
import { smallWorkshopPreset } from "./small_workshop";
import { spawnMarketStallPreset } from "./spawn_market_stall";
import { stoneBridgePreset } from "./stone_bridge";
import { storageShedPreset } from "./storage_shed";
import { townBridgePreset } from "./town_bridge";
import { townHousePreset } from "./town_house";
import { trainStationSmallPreset } from "./train_station_small";
import { warehouseSmallPreset } from "./warehouse_small";
import { watchPostPreset } from "./watch_post";
import type { SirioCraftPresetCategory, SirioCraftSchematicPreset } from "./types";

export const siriocraftPresetCategories = [
  "spawn",
  "town",
  "faction",
  "industrial",
  "transport",
  "ruins",
  "utility",
] as const satisfies readonly SirioCraftPresetCategory[];

export const siriocraftPresets = [
  createStarterFactoryPreset,
  industrialStorageYardPreset,
  smallWorkshopPreset,
  machineHousePreset,
  factoryWithYardPreset,
  railLoadingFactoryPreset,
  warehouseSmallPreset,
  pipeworksYardPreset,
  trainStationSmallPreset,
  stoneBridgePreset,
  townBridgePreset,
  smallHousePreset,
  townHousePreset,
  spawnMarketStallPreset,
  factionGatehousePreset,
  factionWatchtowerPreset,
  watchPostPreset,
  roadsideCheckpointPreset,
  ruinedOutpostPreset,
  storageShedPreset,
] as const satisfies readonly SirioCraftSchematicPreset[];

function normalizePresetText(value: string): string {
  return value.trim().replace(/[_-]+/g, " ").replace(/\s+/g, " ").toLowerCase();
}

export function isSirioCraftPresetCategory(value: string): value is SirioCraftPresetCategory {
  return (siriocraftPresetCategories as readonly string[]).includes(value);
}

export function normalizePresetId(value: string): string {
  return value.trim().replace(/\s+/g, "_").replace(/-+/g, "_").toLowerCase();
}

export function getSirioCraftPreset(id: string): SirioCraftSchematicPreset | undefined {
  const normalized = normalizePresetId(id);
  return siriocraftPresets.find((preset) => preset.id === normalized);
}

export function listSirioCraftPresets(category?: string): SirioCraftSchematicPreset[] {
  const normalizedCategory = category ? normalizePresetText(category) : undefined;

  return [...siriocraftPresets]
    .filter((preset) => !normalizedCategory || preset.category === normalizedCategory)
    .sort((a, b) => `${a.category}:${a.displayName}`.localeCompare(`${b.category}:${b.displayName}`));
}

export function getSirioCraftPresetCategories(): Array<{ category: SirioCraftPresetCategory; count: number }> {
  return siriocraftPresetCategories.map((category) => ({
    category,
    count: siriocraftPresets.filter((preset) => preset.category === category).length,
  }));
}


export type SirioCraftPresetSearchResult = {
  preset: SirioCraftSchematicPreset;
  score: number;
  reasons: string[];
};

const presetSearchAliases: Record<string, string[]> = {
  create: ["industrial", "factory", "workshop", "machine", "pipe", "cog", "starter"],
  factory: ["industrial", "create", "machine", "warehouse", "loading", "yard"],
  workshop: ["industrial", "factory", "utility", "starter", "create"],
  machine: ["industrial", "factory", "create", "utility", "mechanical"],
  warehouse: ["storage", "cargo", "industrial", "loading"],
  storage: ["warehouse", "cargo", "shed", "yard", "utility"],
  cargo: ["warehouse", "storage", "rail", "loading", "yard"],
  rail: ["train", "station", "transport", "loading", "cargo"],
  railway: ["rail", "train", "station", "transport", "loading"],
  station: ["train", "rail", "transport", "platform"],
  bridge: ["road", "transport", "river", "crossing", "town"],
  faction: ["defense", "gate", "checkpoint", "watch", "outpost", "tower"],
  checkpoint: ["faction", "road", "gate", "defense", "border"],
  gate: ["gatehouse", "faction", "checkpoint", "defense"],
  gatehouse: ["gate", "faction", "defense", "checkpoint"],
  outpost: ["ruined", "faction", "frontier", "abandoned", "compound"],
  ruin: ["ruined", "abandoned", "outpost", "broken"],
  ruined: ["abandoned", "outpost", "broken", "ruin"],
  spawn: ["town", "market", "stall", "shop"],
  market: ["spawn", "stall", "shop", "town"],
  stall: ["market", "spawn", "shop", "town"],
  house: ["town", "settlement", "home", "cottage"],
  shed: ["storage", "utility", "small", "supply"],
  pipe: ["pipeworks", "industrial", "utility", "yard"],
  pipes: ["pipeworks", "industrial", "utility", "yard"],
  yard: ["storage", "industrial", "factory", "cargo", "loading"],
};

function tokenizePresetText(value: string): string[] {
  return normalizePresetText(value)
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);
}

function expandPresetQueryTokens(tokens: string[]): string[] {
  const expanded = new Set(tokens);

  for (const token of tokens) {
    const aliases = presetSearchAliases[token] ?? [];
    for (const alias of aliases) {
      expanded.add(alias);
    }
  }

  return [...expanded];
}

function presetSearchCorpus(preset: SirioCraftSchematicPreset): string[] {
  return [
    preset.id,
    preset.displayName,
    preset.description,
    preset.category,
    preset.generator,
    String(preset.variant),
    preset.profile,
    preset.recommendedUse,
    ...preset.features,
    ...preset.tags,
    ...preset.promptHints,
  ];
}

function scorePresetForQuery(preset: SirioCraftSchematicPreset, query: string): SirioCraftPresetSearchResult | null {
  const normalizedQuery = normalizePresetText(query);
  const rawTokens = tokenizePresetText(query);
  const expandedTokens = expandPresetQueryTokens(rawTokens);
  const corpusItems = presetSearchCorpus(preset).map((item) => normalizePresetText(item));
  const corpus = corpusItems.join(" ");
  const reasons = new Set<string>();
  let score = 0;

  if (normalizedQuery.length === 0) {
    return null;
  }

  if (normalizePresetText(preset.id) === normalizedQuery) {
    score += 200;
    reasons.add("exact preset id");
  }

  if (normalizePresetText(preset.displayName) === normalizedQuery) {
    score += 160;
    reasons.add("exact display name");
  }

  if (corpusItems.some((item) => item.includes(normalizedQuery))) {
    score += 80 + Math.min(normalizedQuery.length, 40);
    reasons.add("phrase match");
  }

  for (const token of rawTokens) {
    if (normalizePresetText(preset.id).split(" ").includes(token)) {
      score += 22;
      reasons.add(`id token: ${token}`);
    }

    if (normalizePresetText(preset.displayName).split(" ").includes(token)) {
      score += 18;
      reasons.add(`name token: ${token}`);
    }

    if (preset.category === token) {
      score += 16;
      reasons.add(`category: ${token}`);
    }

    if (preset.tags.some((tag) => normalizePresetText(tag) === token)) {
      score += 14;
      reasons.add(`tag: ${token}`);
    }

    if (preset.promptHints.some((hint) => normalizePresetText(hint).includes(token))) {
      score += 10;
      reasons.add(`hint: ${token}`);
    }

    if (corpus.includes(token)) {
      score += 4;
    }
  }

  for (const token of expandedTokens) {
    if (rawTokens.includes(token)) {
      continue;
    }

    if (preset.tags.some((tag) => normalizePresetText(tag) === token) || preset.category === token || corpus.includes(token)) {
      score += 3;
      reasons.add(`related: ${token}`);
    }
  }

  if (score <= 0) {
    return null;
  }

  return {
    preset,
    score,
    reasons: [...reasons].slice(0, 5),
  };
}

export function searchSirioCraftPresets(query: string, options?: { category?: string; tag?: string; limit?: number }): SirioCraftPresetSearchResult[] {
  const normalizedCategory = options?.category ? normalizePresetText(options.category) : undefined;
  const normalizedTag = options?.tag ? normalizePresetText(options.tag) : undefined;
  const limit = options?.limit ?? 10;

  return siriocraftPresets
    .filter((preset) => !normalizedCategory || preset.category === normalizedCategory)
    .filter((preset) => !normalizedTag || preset.tags.some((tag) => normalizePresetText(tag) === normalizedTag))
    .map((preset) => scorePresetForQuery(preset, query))
    .filter((result): result is SirioCraftPresetSearchResult => Boolean(result))
    .sort((a, b) => b.score - a.score || a.preset.displayName.localeCompare(b.preset.displayName))
    .slice(0, limit);
}

export function recommendSirioCraftPresets(query: string, limit = 5): SirioCraftPresetSearchResult[] {
  return searchSirioCraftPresets(query, { limit });
}

export function listSirioCraftPresetsByTag(tag: string): SirioCraftSchematicPreset[] {
  const normalizedTag = normalizePresetText(tag);

  return [...siriocraftPresets]
    .filter((preset) => preset.tags.some((presetTag) => normalizePresetText(presetTag) === normalizedTag))
    .sort((a, b) => `${a.category}:${a.displayName}`.localeCompare(`${b.category}:${b.displayName}`));
}

export function getSirioCraftPresetTags(): Array<{ tag: string; count: number }> {
  const counts = new Map<string, number>();

  for (const preset of siriocraftPresets) {
    for (const tag of preset.tags) {
      const normalizedTag = normalizePresetText(tag);
      counts.set(normalizedTag, (counts.get(normalizedTag) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => a.tag.localeCompare(b.tag));
}

export function findSirioCraftPresetByPrompt(prompt: string): SirioCraftSchematicPreset | undefined {
  const normalized = normalizePresetText(prompt);
  const exactId = getSirioCraftPreset(prompt);

  if (exactId) {
    return exactId;
  }

  const candidates = siriocraftPresets.flatMap((preset) => [
    { preset, hint: normalizePresetText(preset.id), exactBoost: 4 },
    { preset, hint: normalizePresetText(preset.displayName), exactBoost: 3 },
    ...preset.promptHints.map((hint) => ({ preset, hint: normalizePresetText(hint), exactBoost: 2 })),
  ]);

  const scored = candidates
    .filter((candidate) => candidate.hint.length > 0 && normalized.includes(candidate.hint))
    .map((candidate) => ({
      ...candidate,
      score: candidate.hint === normalized ? candidate.hint.length + 100 + candidate.exactBoost : candidate.hint.length + candidate.exactBoost,
    }))
    .sort((a, b) => b.score - a.score);

  if (scored[0]?.preset) {
    return scored[0].preset;
  }

  const fuzzy = recommendSirioCraftPresets(prompt, 1)[0];
  return fuzzy && fuzzy.score >= 20 ? fuzzy.preset : undefined;
}

export type { SirioCraftPresetCategory, SirioCraftSchematicPreset } from "./types";
