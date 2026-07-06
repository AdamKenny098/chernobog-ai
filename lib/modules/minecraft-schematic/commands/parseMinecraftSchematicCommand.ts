import type { ModuleCommandParser } from "../../types";
import { parseCreateMechanicalGraphCommand } from "./parseCreateMechanicalGraphCommand";
import { parseMilestone6CompatibilityCommand } from "./parseMilestone6CompatibilityCommands";
import { normalizeBlockRegistryProfileId } from "../block-registry/blockRegistry";
import { findSirioCraftPresetByPrompt, getSirioCraftPreset, normalizePresetId } from "../presets/siriocraft";
import type {
  MinecraftSchematicParsedCommand,
  SchematicGeneratorName,
  SchematicVariant,
  TowerVariant,
} from "../types";

import { parseSchematicLibraryCommand } from "../library/parseSchematicLibraryCommand";

type UnifiedParseResult = ReturnType<ModuleCommandParser>;
type UnifiedCommandLike = NonNullable<UnifiedParseResult>;

type PromptRoute = {
  generator: SchematicGeneratorName;
  variant: SchematicVariant;
  presetId?: string;
};






function getMilestone6FinalizationInfo(command: MinecraftSchematicParsedCommand): {
  action: "status" | "write_docs";
} | null {
  const maybeCommand = command as unknown as {
    kind?: string;
    action?: unknown;
  };

  if (maybeCommand.kind !== "milestone6_finalization") {
    return null;
  }

  return {
    action: maybeCommand.action === "write_docs" ? "write_docs" : "status",
  };
}

function getMilestone6BuildDepartmentInfo(command: MinecraftSchematicParsedCommand): {
  action: "status" | "plan" | "generate" | "review" | "repair" | "preview" | "full_pipeline";
  prompt: string;
} | null {
  const maybeCommand = command as unknown as {
    kind?: string;
    action?: unknown;
    prompt?: unknown;
    raw?: unknown;
  };

  if (maybeCommand.kind !== "milestone6_build_department") {
    return null;
  }

  const action =
    maybeCommand.action === "plan"
      ? "plan"
      : maybeCommand.action === "generate"
        ? "generate"
        : maybeCommand.action === "review"
          ? "review"
          : maybeCommand.action === "repair"
            ? "repair"
            : maybeCommand.action === "preview"
              ? "preview"
              : maybeCommand.action === "full_pipeline"
                ? "full_pipeline"
                : "status";

  const prompt =
    typeof maybeCommand.prompt === "string"
      ? maybeCommand.prompt
      : typeof maybeCommand.raw === "string"
        ? maybeCommand.raw
        : "";

  return { action, prompt };
}

function getMilestone6PreviewInfo(command: MinecraftSchematicParsedCommand): { action: "preview"; target: "latest" } | null {
  const maybeCommand = command as unknown as {
    kind?: string;
    action?: unknown;
    target?: unknown;
  };

  if (maybeCommand.kind !== "milestone6_preview_pack") {
    return null;
  }

  return { action: "preview", target: "latest" };
}

function getMilestone6PackReviewInfo(command: MinecraftSchematicParsedCommand): { action: "review" | "inspect" | "repair"; target: "latest" } | null {
  const maybeCommand = command as unknown as {
    kind?: string;
    action?: unknown;
    target?: unknown;
  };

  if (maybeCommand.kind !== "milestone6_pack_review") {
    return null;
  }

  const action =
    maybeCommand.action === "repair"
      ? "repair"
      : maybeCommand.action === "inspect"
        ? "inspect"
        : "review";

  return { action, target: "latest" };
}

function getMilestone6ScenePackInfo(command: MinecraftSchematicParsedCommand): { action: "generate" | "latest"; prompt: string } | null {
  const maybeCommand = command as unknown as {
    kind?: string;
    action?: unknown;
    prompt?: unknown;
    raw?: unknown;
  };

  if (maybeCommand.kind !== "milestone6_scene_pack") {
    return null;
  }

  const action = maybeCommand.action === "latest" ? "latest" : "generate";
  const prompt =
    typeof maybeCommand.prompt === "string"
      ? maybeCommand.prompt
      : typeof maybeCommand.raw === "string"
        ? maybeCommand.raw
        : "";

  return { action, prompt };
}

function getMilestone6CreatePreset(command: MinecraftSchematicParsedCommand): string | null {
  const maybeCommand = command as unknown as { kind?: string; preset?: unknown };

  if (maybeCommand.kind !== "milestone6_create_machine") {
    return null;
  }

  return typeof maybeCommand.preset === "string" ? maybeCommand.preset : null;
}

function normalize(input: string): string {
  return input.trim().replace(/[_-]+/g, " ").replace(/\s+/g, " ").toLowerCase();
}

function isMinecraftSchematicInput(normalized: string): boolean {
  return (
    normalized.startsWith("schematic") ||
    normalized.startsWith("minecraft schematic") ||
    normalized.startsWith("scene pack") ||
    normalized.startsWith("generate minecraft schematic") ||
    normalized.startsWith("generate create") ||
    normalized.startsWith("create ") ||
    normalized.includes("factory yard") ||
    normalized.includes("train platform") ||
    normalized.includes("faction outpost") ||
    normalized.includes("spawn market") ||
    normalized.includes("spawn marketplace") ||
    normalized.includes("ruined settlement") ||
    normalized.includes("build pack")
  );
}
function includesAny(text: string, terms: string[]): boolean {
  return terms.some((term) => text.includes(term));
}

function inferTowerVariantFromPrompt(prompt: string): TowerVariant {
  const normalizedPrompt = normalize(prompt);

  if (includesAny(normalizedPrompt, ["dark wizard", "wizard", "dark fantasy", "gothic", "necromancer", "evil", "shadow"])) {
    return "dark_fantasy";
  }

  if (includesAny(normalizedPrompt, ["create", "industrial", "factory", "copper", "brass", "steam", "gear", "cog"])) {
    return "create_industrial";
  }

  if (includesAny(normalizedPrompt, ["snow", "snowy", "frozen", "ice", "icy", "winter", "arctic"])) {
    return "snow";
  }

  if (includesAny(normalizedPrompt, ["ruin", "ruined", "abandoned", "collapsed", "broken", "damaged", "decayed", "outpost"])) {
    return "ruined";
  }

  if (includesAny(normalizedPrompt, ["deepslate", "blackstone", "deep stone"])) {
    return "deepslate";
  }

  if (includesAny(normalizedPrompt, ["wood", "wooden", "timber", "log", "palisade"])) {
    return "wooden";
  }

  if (includesAny(normalizedPrompt, ["medieval", "castle", "keep", "mossy", "old stone", "faction"])) {
    return "medieval";
  }

  return "default";
}

function inferStructureFromPrompt(prompt: string): PromptRoute {
  const normalizedPrompt = normalize(prompt);

  const matchedPreset = findSirioCraftPresetByPrompt(prompt);
  if (matchedPreset) {
    return {
      generator: matchedPreset.generator,
      variant: matchedPreset.variant,
      presetId: matchedPreset.id,
    };
  }

  // Keep this high in the routing table. In previous runs, ruined outpost could fall
  // back through generic ruined/tower handling depending on how Chernobog forwarded
  // the parsed command payload.
  if (includesAny(normalizedPrompt, ["ruined outpost", "abandoned outpost", "broken outpost", "outpost ruin", "outpost"])) {
    return { generator: "outpost", variant: "ruined_outpost", presetId: "ruined_outpost" };
  }

  if (includesAny(normalizedPrompt, ["create starter factory", "starter factory", "small create style starter factory"])) {
    return { generator: "factory", variant: "create_starter_factory", presetId: "create_starter_factory" };
  }

  if (includesAny(normalizedPrompt, ["industrial storage yard", "storage yard", "industrial yard", "cargo yard", "rail storage yard", "factory yard"])) {
    return { generator: "factory", variant: "industrial_storage_yard", presetId: "industrial_storage_yard" };
  }

  if (includesAny(normalizedPrompt, ["rail loading factory", "rail factory", "loading factory", "factory with rail", "rail siding factory"])) {
    return { generator: "factory", variant: "rail_loading_factory", presetId: "rail_loading_factory" };
  }

  if (includesAny(normalizedPrompt, ["factory with yard", "factory yard build", "yard factory", "large factory yard"])) {
    return { generator: "factory", variant: "factory_with_yard", presetId: "factory_with_yard" };
  }

  if (includesAny(normalizedPrompt, ["pipeworks yard", "pipe works yard", "pipe yard", "pipeworks", "pipe rack yard"])) {
    return { generator: "factory", variant: "pipeworks_yard", presetId: "pipeworks_yard" };
  }

  if (includesAny(normalizedPrompt, ["machine house", "machinehouse", "small machine hall", "machine building"])) {
    return { generator: "factory", variant: "machine_house", presetId: "machine_house" };
  }

  if (includesAny(normalizedPrompt, ["small warehouse", "warehouse small", "warehouse", "cargo warehouse"])) {
    return { generator: "factory", variant: "warehouse_small", presetId: "warehouse_small" };
  }

  if (includesAny(normalizedPrompt, ["small workshop", "workshop", "industrial workshop", "create workshop"])) {
    return { generator: "factory", variant: "small_workshop", presetId: "small_workshop" };
  }

  if (includesAny(normalizedPrompt, ["factory", "industrial hall", "create style", "create industrial"])) {
    return { generator: "factory", variant: "create_starter_factory", presetId: "create_starter_factory" };
  }

  if (includesAny(normalizedPrompt, ["train station", "rail station", "station small", "small train"])) {
    return { generator: "train_station", variant: "train_station_small", presetId: "train_station_small" };
  }

  if (includesAny(normalizedPrompt, ["gatehouse", "gate house", "castle gate", "town gate", "faction gate"])) {
    return { generator: "gatehouse", variant: "gatehouse" };
  }

  if (includesAny(normalizedPrompt, ["town bridge"])) {
    return { generator: "bridge", variant: "town_bridge", presetId: "town_bridge" };
  }

  if (includesAny(normalizedPrompt, ["stone bridge", "bridge", "river crossing"])) {
    return {
      generator: "bridge",
      variant: includesAny(normalizedPrompt, ["ruin", "ruined", "broken", "damaged"]) ? "ruined_bridge" : "stone_bridge",
      presetId: includesAny(normalizedPrompt, ["town"]) ? "town_bridge" : undefined,
    };
  }

  if (includesAny(normalizedPrompt, ["small house", "house", "cottage", "starter home", "home"])) {
    return { generator: "house", variant: "small_house" };
  }

  if (includesAny(normalizedPrompt, ["faction watchtower", "faction tower"])) {
    return { generator: "tower", variant: "medieval", presetId: "faction_watchtower" };
  }

  return { generator: "tower", variant: inferTowerVariantFromPrompt(prompt) };
}

function getPromptFromGenerateMinecraftCommand(input: string): string | null {
  const trimmed = input.trim();
  const match = trimmed.match(/^generate\s+minecraft\s+schematic\s*:?\s*(.+)$/i);

  if (!match?.[1]) {
    return null;
  }

  const prompt = match[1].trim();
  return prompt.length > 0 ? prompt : null;
}

function getPromptFromSchematicGenerateCommand(input: string): string | null {
  const trimmed = input.trim();
  const match = trimmed.match(/^schematic\s+generate\s*:?\s*(.+)$/i);

  if (!match?.[1]) {
    return null;
  }

  const prompt = match[1].trim();
  return prompt.length > 0 ? prompt : null;
}

function getPresetIdFromGeneratePresetCommand(input: string): string | null {
  const trimmed = input.trim();
  const patterns = [
    /^generate\s+minecraft\s+schematic\s+preset\s+([a-zA-Z0-9_. -]+)$/i,
    /^generate\s+minecraft\s+schematic\s+from\s+preset\s+([a-zA-Z0-9_. -]+)$/i,
    /^generate\s+minecraft\s+schematic\s*:\s*preset\s+([a-zA-Z0-9_. -]+)$/i,
    /^schematic\s+generate\s+preset\s+([a-zA-Z0-9_. -]+)$/i,
    /^schematic\s+generate\s+from\s+preset\s+([a-zA-Z0-9_. -]+)$/i,
  ];

  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match?.[1]) {
      const presetId = normalizePresetId(match[1]);
      return getSirioCraftPreset(presetId) ? presetId : presetId;
    }
  }

  return null;
}

function getPresetIdFromShowPresetCommand(input: string): string | null {
  const trimmed = input.trim();
  const match = trimmed.match(/^schematic\s+show\s+preset\s+([a-zA-Z0-9_. -]+)$/i);

  if (!match?.[1]) {
    return null;
  }

  return normalizePresetId(match[1]);
}

function getProfileIdFromShowProfileCommand(input: string): ReturnType<typeof normalizeBlockRegistryProfileId> | null {
  const trimmed = input.trim();
  const match = trimmed.match(/^schematic\s+show\s+(?:block\s+)?profile\s+([a-zA-Z0-9_. -]+)$/i);

  if (!match?.[1]) {
    return null;
  }

  return normalizeBlockRegistryProfileId(match[1]);
}

function getPresetListFilterFromListCommand(input: string): { category?: string; tag?: string } | null {
  const trimmed = input.trim();

  const explicitCategory = trimmed.match(/^schematic\s+list\s+presets\s+category\s+([a-zA-Z0-9_. -]+)$/i);
  if (explicitCategory?.[1]) {
    return { category: normalize(explicitCategory[1]) };
  }

  const explicitTag = trimmed.match(/^schematic\s+list\s+presets\s+tag\s+([a-zA-Z0-9_. -]+)$/i);
  if (explicitTag?.[1]) {
    return { tag: normalize(explicitTag[1]) };
  }

  const looseCategory = trimmed.match(/^schematic\s+list\s+presets\s+([a-zA-Z0-9_. -]+)$/i);
  if (looseCategory?.[1]) {
    return { category: normalize(looseCategory[1]) };
  }

  return null;
}

function getPresetSearchQuery(input: string): string | null {
  const trimmed = input.trim();
  const patterns = [
    /^schematic\s+search\s+presets\s+(.+)$/i,
    /^schematic\s+search\s+preset\s+(.+)$/i,
    /^schematic\s+find\s+presets\s+(.+)$/i,
    /^schematic\s+find\s+preset\s+(.+)$/i,
  ];

  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match?.[1]) {
      return match[1].trim();
    }
  }

  return null;
}

function getPresetRecommendQuery(input: string): string | null {
  const trimmed = input.trim();
  const patterns = [
    /^schematic\s+recommend\s+preset\s+(.+)$/i,
    /^schematic\s+recommend\s+presets\s+(.+)$/i,
    /^schematic\s+suggest\s+preset\s+(.+)$/i,
    /^schematic\s+suggest\s+presets\s+(.+)$/i,
  ];

  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match?.[1]) {
      return match[1].trim();
    }
  }

  return null;
}

function getBuildIdFromReviewCommand(input: string): string | null {
  const trimmed = input.trim();
  const match = trimmed.match(/^schematic\s+review\s+([a-zA-Z0-9_.-]+)$/i);

  if (!match?.[1] || match[1].toLowerCase() === "latest") {
    return null;
  }

  return match[1];
}

function getBuildIdFromShowCommand(input: string): string | null {
  const trimmed = input.trim();
  const match = trimmed.match(/^schematic\s+show\s+([a-zA-Z0-9_.-]+)$/i);

  if (!match?.[1] || match[1].toLowerCase() === "latest") {
    return null;
  }

  return match[1];
}

function getOpenFolderTarget(input: string): { buildId?: string; latest?: boolean } | null {
  const trimmed = input.trim();

  if (/^schematic\s+open\s+folder$/i.test(trimmed)) {
    return {};
  }

  if (/^schematic\s+open\s+folder\s+latest$/i.test(trimmed)) {
    return { latest: true };
  }

  const match = trimmed.match(/^schematic\s+open\s+folder\s+([a-zA-Z0-9_.-]+)$/i);

  if (!match?.[1]) {
    return null;
  }

  return { buildId: match[1] };
}

function getTargetForParsedCommand(command: MinecraftSchematicParsedCommand): string {
  const milestone6FinalizationInfo = getMilestone6FinalizationInfo(command);
  if (milestone6FinalizationInfo) {
    return "milestone-6";
  }

  const milestone6BuildDepartmentInfo = getMilestone6BuildDepartmentInfo(command);
  if (milestone6BuildDepartmentInfo) {
    return milestone6BuildDepartmentInfo.action === "status" ? "department" : "latest";
  }

  const milestone6PreviewInfo = getMilestone6PreviewInfo(command);
  if (milestone6PreviewInfo) {
    return "latest";
  }

  const milestone6PackReviewInfo = getMilestone6PackReviewInfo(command);
  if (milestone6PackReviewInfo) {
    return "latest";
  }

  const milestone6ScenePackInfo = getMilestone6ScenePackInfo(command);
  if (milestone6ScenePackInfo) {
    return milestone6ScenePackInfo.action === "latest" ? "latest" : "scene-pack";
  }

  const milestone6CreatePreset = getMilestone6CreatePreset(command);
  if (milestone6CreatePreset) {
    return milestone6CreatePreset;
  }

  switch (command.kind) {
    case "generate-tower":
      return "tower";

    case "generate-structure":
      return command.generator;

    case "show-latest":
    case "validate-latest":
    case "review-latest":
      return "latest";

    case "show-build":
    case "review-build":
      return command.buildId;

    case "list":
      return "schematics";

    case "list-presets":
      return command.tag ? `tag:${command.tag}` : command.category ?? "presets";

    case "list-profiles":
      return "profiles";

    case "show-profile":
      return command.profileId;

    case "search-presets":
    case "recommend-preset":
      return command.query;

    case "show-preset":
    case "generate-preset":
      return command.presetId;

    case "open-folder":
      return command.buildId ?? (command.latest ? "latest" : "folder");

    case "status":
    case "help":
    case "milestone-status":
    case "test-plan":
      return "module";

    case "unknown":
      return "unknown";

    default:
      return "unknown";
  }
}

function getActionForParsedCommand(command: MinecraftSchematicParsedCommand): string {
  const milestone6FinalizationInfo = getMilestone6FinalizationInfo(command);
  if (milestone6FinalizationInfo) {
    return milestone6FinalizationInfo.action;
  }

  const milestone6PreviewInfo = getMilestone6PreviewInfo(command);
  if (milestone6PreviewInfo) {
    return "preview";
  }

  const milestone6PackReviewInfo = getMilestone6PackReviewInfo(command);
  if (milestone6PackReviewInfo) {
    return milestone6PackReviewInfo.action;
  }

  const milestone6ScenePackInfo = getMilestone6ScenePackInfo(command);
  if (milestone6ScenePackInfo) {
    return milestone6ScenePackInfo.action === "latest" ? "show" : "generate";
  }

  const milestone6CreatePreset = getMilestone6CreatePreset(command);
  if (milestone6CreatePreset) {
    return "generate";
  }

  switch (command.kind) {
    case "generate-tower":
    case "generate-structure":
    case "generate-preset":
      return "generate";

    case "show-latest":
    case "show-build":
    case "show-preset":
    case "show-profile":
      return "show";

    case "validate-latest":
      return "validate";

    case "review-latest":
    case "review-build":
      return "review";

    case "list":
    case "list-presets":
    case "list-profiles":
      return "list";

    case "search-presets":
      return "search";

    case "recommend-preset":
      return "recommend";

    case "open-folder":
      return "open";

    case "status":
      return "status";

    case "help":
      return "help";

    case "milestone-status":
      return "status";

    case "test-plan":
      return "test";

    case "unknown":
      return "unknown";

    default:
      return "unknown";
  }
}

function getArgsForParsedCommand(command: MinecraftSchematicParsedCommand): string[] {
  const milestone6FinalizationInfo = getMilestone6FinalizationInfo(command);
  if (milestone6FinalizationInfo) {
    return [milestone6FinalizationInfo.action];
  }

  const milestone6BuildDepartmentInfo = getMilestone6BuildDepartmentInfo(command);
  if (milestone6BuildDepartmentInfo) {
    return [milestone6BuildDepartmentInfo.action, milestone6BuildDepartmentInfo.prompt].filter(Boolean);
  }

  const milestone6PreviewInfo = getMilestone6PreviewInfo(command);
  if (milestone6PreviewInfo) {
    return [milestone6PreviewInfo.action, milestone6PreviewInfo.target];
  }

  const milestone6PackReviewInfo = getMilestone6PackReviewInfo(command);
  if (milestone6PackReviewInfo) {
    return [milestone6PackReviewInfo.action, milestone6PackReviewInfo.target];
  }

  const milestone6ScenePackInfo = getMilestone6ScenePackInfo(command);
  if (milestone6ScenePackInfo) {
    return [milestone6ScenePackInfo.action, milestone6ScenePackInfo.prompt].filter(Boolean);
  }

  const milestone6CreatePreset = getMilestone6CreatePreset(command);
  if (milestone6CreatePreset) {
    return [milestone6CreatePreset];
  }

  if (command.kind === "generate-tower") {
    return [command.variant, ...(command.presetId ? [command.presetId] : [])];
  }

  if (command.kind === "generate-structure") {
    return [command.generator, command.variant, ...(command.presetId ? [command.presetId] : [])];
  }

  if (command.kind === "review-build" || command.kind === "show-build") {
    return [command.buildId];
  }

  if (command.kind === "show-preset" || command.kind === "generate-preset") {
    return [command.presetId];
  }

  if (command.kind === "show-profile") {
    return [command.profileId];
  }

  if (command.kind === "list-presets") {
    return command.tag ? ["tag", command.tag] : command.category ? ["category", command.category] : [];
  }

  if (command.kind === "search-presets" || command.kind === "recommend-preset") {
    return [command.query];
  }

  if (command.kind === "open-folder") {
    return [command.buildId ?? (command.latest ? "latest" : "exports")];
  }

  return [];
}

export function parseMinecraftSchematicCommand(input: string): MinecraftSchematicParsedCommand {
  const normalized = normalize(input);

  const libraryCommand = parseSchematicLibraryCommand(input);

  if (libraryCommand.matched) {
    if (libraryCommand.error || !libraryCommand.command) {
      return {
        kind: "schematic-library-error",
        raw: input,
        reason:
          libraryCommand.error ??
          "Schematic library command matched but no command was produced.",
      } as unknown as MinecraftSchematicParsedCommand;
    }

    return {
      ...libraryCommand.command,
      kind: "schematic-library",
      action: libraryCommand.command.kind,
      raw: input,
    } as unknown as MinecraftSchematicParsedCommand;
  }

  const milestone6CompatibilityCommand = parseMilestone6CompatibilityCommand(input);
  if (milestone6CompatibilityCommand) {
    return milestone6CompatibilityCommand as unknown as MinecraftSchematicParsedCommand;
  }

  const createMechanicalGraphCommand = parseCreateMechanicalGraphCommand(input);
  if (createMechanicalGraphCommand) {
    return createMechanicalGraphCommand as unknown as MinecraftSchematicParsedCommand;
  }

  if (normalized === "schematic status") {
    return { kind: "status", raw: input };
  }

  if (normalized === "schematic help") {
    return { kind: "help", raw: input };
  }

  if (
    normalized === "schematic milestone status" ||
    normalized === "schematic milestone 5 status" ||
    normalized === "schematic final status" ||
    normalized === "schematic closeout status"
  ) {
    return { kind: "milestone-status", raw: input };
  }

  if (
    normalized === "schematic test plan" ||
    normalized === "schematic milestone 5 test plan" ||
    normalized === "schematic final test plan" ||
    normalized === "schematic final checklist"
  ) {
    return { kind: "test-plan", raw: input };
  }

  if (normalized === "schematic show latest") {
    return { kind: "show-latest", raw: input };
  }

  const showBuildId = getBuildIdFromShowCommand(input);
  if (showBuildId) {
    return { kind: "show-build", buildId: showBuildId, raw: input };
  }

    if (
    normalized === "schematic validate latest" ||
    normalized === "minecraft schematic validate latest"
  ) {
    return { kind: "validate-latest", raw: input };
  }

  if (normalized === "schematic list") {
    return { kind: "list", raw: input };
  }

  if (normalized === "schematic list profiles" || normalized === "schematic list block profiles" || normalized === "schematic profiles") {
    return { kind: "list-profiles", raw: input };
  }

  const showProfileId = getProfileIdFromShowProfileCommand(input);
  if (showProfileId) {
    return { kind: "show-profile", profileId: showProfileId, raw: input };
  }

  if (normalized === "schematic list presets" || normalized === "schematic list presets siriocraft") {
    return { kind: "list-presets", raw: input };
  }

  const presetFilter = getPresetListFilterFromListCommand(input);
  if (presetFilter) {
    return { kind: "list-presets", ...presetFilter, raw: input };
  }

  const presetSearchQuery = getPresetSearchQuery(input);
  if (presetSearchQuery) {
    return { kind: "search-presets", query: presetSearchQuery, raw: input };
  }

  const presetRecommendQuery = getPresetRecommendQuery(input);
  if (presetRecommendQuery) {
    return { kind: "recommend-preset", query: presetRecommendQuery, raw: input };
  }

  const showPresetId = getPresetIdFromShowPresetCommand(input);
  if (showPresetId) {
    return { kind: "show-preset", presetId: showPresetId, raw: input };
  }

  const generatePresetId = getPresetIdFromGeneratePresetCommand(input);
  if (generatePresetId) {
    return { kind: "generate-preset", presetId: generatePresetId, raw: input };
  }

  const openFolderTarget = getOpenFolderTarget(input);
  if (openFolderTarget) {
    return { kind: "open-folder", ...openFolderTarget, raw: input };
  }

  if (normalized === "schematic review latest") {
    return { kind: "review-latest", raw: input };
  }

  const reviewBuildId = getBuildIdFromReviewCommand(input);
  if (reviewBuildId) {
    return { kind: "review-build", buildId: reviewBuildId, raw: input };
  }

  if (normalized === "schematic generate tower") {
    return {
      kind: "generate-tower",
      variant: "default",
      raw: input,
    };
  }

  if (normalized === "schematic generate tower medieval") {
    return {
      kind: "generate-tower",
      variant: "medieval",
      raw: input,
    };
  }

  const generateMinecraftPrompt = getPromptFromGenerateMinecraftCommand(input);
  if (generateMinecraftPrompt) {
    const route = inferStructureFromPrompt(generateMinecraftPrompt);

    return {
      kind: "generate-structure",
      generator: route.generator,
      variant: route.variant,
      presetId: route.presetId,
      prompt: generateMinecraftPrompt,
      raw: input,
    };
  }

  const schematicPrompt = getPromptFromSchematicGenerateCommand(input);
  if (schematicPrompt) {
    const route = inferStructureFromPrompt(schematicPrompt);

    return {
      kind: "generate-structure",
      generator: route.generator,
      variant: route.variant,
      presetId: route.presetId,
      prompt: schematicPrompt,
      raw: input,
    };
  }

  if (isMinecraftSchematicInput(normalized)) {
    return {
      kind: "unknown",
      raw: input,
      reason:
        "Unknown schematic command. Try: generate create press line, generate create mixer station, generate create water wheel power test, generate minecraft schematic: small house, stone bridge, gatehouse, small Create-style starter factory, industrial storage yard, small workshop, machine house, rail loading factory, pipeworks yard, small train station, faction watchtower, ruined outpost, schematic list, schematic list presets, schematic list presets category <category>, schematic list presets tag <tag>, schematic search presets <query>, schematic recommend preset <query>, schematic show preset <preset-id>, generate minecraft schematic preset <preset-id>, generate minecraft schematic from preset <preset-id>, schematic list profiles, schematic show profile <profile-id>, schematic show <build-id>, schematic review latest, schematic review <build-id>, schematic open folder latest, schematic open folder <build-id>, schematic validate latest, schematic milestone status, or schematic test plan.",
    };
  }

  return {
    kind: "unknown",
    raw: input,
    reason: "Input is not a schematic command.",
  };
}

export function parseMinecraftSchematicUnifiedCommand(input: string): UnifiedParseResult {
  const normalized = normalize(input);

  if (!isMinecraftSchematicInput(normalized)) {
    return null;
  }

  const parsedCommand = parseMinecraftSchematicCommand(input);

  const unifiedCommand = {
    raw: input,
    normalized,
    domain: "schematic",
    action: getActionForParsedCommand(parsedCommand),
    target: getTargetForParsedCommand(parsedCommand),
    args: getArgsForParsedCommand(parsedCommand),
    flags: {},
    confidence: parsedCommand.kind === "unknown" ? 0.25 : 1,
    source: "minecraft-schematic",
    moduleId: "minecraft-schematic",
    moduleCommand: parsedCommand,
    parsedCommand,
  };

  return unifiedCommand as unknown as UnifiedCommandLike;
}
