import {
  ALLOWED_FEATURES,
  ALLOWED_GENERATORS,
  ALLOWED_PALETTES,
  ALLOWED_ROOF_TYPES,
  ALLOWED_THEMES,
  DEFAULT_TOWER_BLUEPRINT,
  type BlueprintValidationResult,
  type BuildScale,
  type MinecraftBlueprint,
  type MinecraftSchematicFeature,
  type MinecraftSchematicGenerator,
  type MinecraftSchematicPalette,
  type MinecraftSchematicRoofType,
  type MinecraftSchematicTheme,
  type TowerDimensions,
} from "../types/blueprint";

const MIN_RADIUS = 3;
const MAX_RADIUS = 12;
const MIN_HEIGHT = 10;
const MAX_HEIGHT = 48;
const MIN_FLOORS = 1;
const MAX_FLOORS = 8;

const FORBIDDEN_BLOCK_FIELD_NAMES = new Set([
  "blocks",
  "block",
  "blockId",
  "blockIds",
  "blockPalette",
  "paletteBlocks",
  "rawBlocks",
  "coordinates",
  "coords",
  "positions",
  "voxels",
]);

const FEATURE_ALIASES: Record<string, MinecraftSchematicFeature> = {
  windows: "arched_windows",
  window: "arched_windows",
  arched_window: "arched_windows",
  archedWindows: "arched_windows",
  pillars: "corner_pillars",
  pillar: "corner_pillars",
  cornerPillars: "corner_pillars",
  lights: "lanterns",
  light: "lanterns",
  torches: "lanterns",
  torch: "lanterns",
  interior_ladder: "ladder",
  broken: "cracked_blocks",
  damaged: "cracked_blocks",
  cracks: "cracked_blocks",
  moss: "mossy_weathering",
  mossy: "mossy_weathering",
  snow: "snow_layers",
  snowy: "snow_layers",
};

const THEME_ALIASES: Record<string, MinecraftSchematicTheme> = {
  castle: "medieval",
  stone: "medieval",
  fantasy: "dark_fantasy",
  gothic: "dark_fantasy",
  wizard: "dark_fantasy",
  necromancer: "dark_fantasy",
  ice: "snow",
  snowy: "snow",
  frozen: "snow",
  abandoned: "ruined",
  broken: "ruined",
  collapsed: "ruined",
  create: "create_industrial",
  industrial: "create_industrial",
  factory: "create_industrial",
  blackstone: "deepslate",
  timber: "wooden",
  wood: "wooden",
};

const ROOF_ALIASES: Record<string, MinecraftSchematicRoofType> = {
  battlement: "flat_battlement",
  battlements: "flat_battlement",
  flat: "flat_battlement",
  crenellated: "flat_battlement",
  pointed: "peaked",
  peak: "peaked",
  sloped: "peaked",
  collapsed: "ruined",
  broken: "ruined",
  damaged: "ruined",
  platform: "watch_platform",
  lookout: "watch_platform",
  watch: "watch_platform",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeToken(value: unknown): string {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_");
}

function cloneDefault(): MinecraftBlueprint {
  return {
    ...DEFAULT_TOWER_BLUEPRINT,
    features: [...DEFAULT_TOWER_BLUEPRINT.features],
    dimensions: { ...DEFAULT_TOWER_BLUEPRINT.dimensions },
  };
}

function repairEnum<T extends string>(
  fieldName: string,
  value: unknown,
  allowed: readonly T[],
  aliases: Record<string, T>,
  fallback: T,
  result: BlueprintValidationResult,
): T {
  const token = normalizeToken(value);

  if ((allowed as readonly string[]).includes(token)) {
    return token as T;
  }

  if (aliases[token]) {
    result.repairedFields[fieldName] = {
      from: value,
      to: aliases[token],
      reason: "Mapped alias to allowed vocabulary.",
    };
    result.warnings.push(`${fieldName} "${String(value)}" was repaired to "${aliases[token]}".`);
    return aliases[token];
  }

  result.repairedFields[fieldName] = {
    from: value,
    to: fallback,
    reason: "Unknown value replaced with safe default.",
  };
  result.warnings.push(`${fieldName} "${String(value)}" is unsupported. Falling back to "${fallback}".`);

  return fallback;
}

function repairScale(value: unknown, result: BlueprintValidationResult): BuildScale {
  const token = normalizeToken(value);

  if (token === "small" || token === "medium" || token === "large") {
    return token;
  }

  if (["tiny", "mini", "compact", "short"].includes(token)) {
    result.repairedFields.scale = {
      from: value,
      to: "small",
      reason: "Mapped scale alias to supported scale.",
    };
    return "small";
  }

  if (["huge", "massive", "giant", "tall", "grand"].includes(token)) {
    result.repairedFields.scale = {
      from: value,
      to: "large",
      reason: "Mapped scale alias to supported scale.",
    };
    return "large";
  }

  result.repairedFields.scale = {
    from: value,
    to: "medium",
    reason: "Invalid scale replaced with safe default.",
  };
  result.warnings.push(`scale "${String(value)}" is unsupported. Falling back to "medium".`);

  return "medium";
}

function clampNumber(
  fieldName: string,
  value: unknown,
  min: number,
  max: number,
  fallback: number,
  result: BlueprintValidationResult,
): number {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    result.repairedFields[fieldName] = {
      from: value,
      to: fallback,
      reason: "Non-numeric dimension replaced with safe default.",
    };
    result.warnings.push(`${fieldName} was not numeric. Falling back to ${fallback}.`);
    return fallback;
  }

  const integer = Math.round(numeric);
  const clamped = Math.min(max, Math.max(min, integer));

  if (clamped !== numeric) {
    result.repairedFields[fieldName] = {
      from: value,
      to: clamped,
      reason: `Dimension clamped to supported range ${min}-${max}.`,
    };
    result.warnings.push(`${fieldName} ${String(value)} was clamped to ${clamped}.`);
  }

  return clamped;
}

function repairDimensions(input: unknown, fallback: TowerDimensions, result: BlueprintValidationResult): TowerDimensions {
  if (!isRecord(input)) {
    result.repairedFields.dimensions = {
      from: input,
      to: fallback,
      reason: "Missing or invalid dimensions replaced with safe default.",
    };
    result.warnings.push("dimensions were missing or invalid. Using scale defaults.");

    return { ...fallback };
  }

  return {
    radius: clampNumber("dimensions.radius", input.radius, MIN_RADIUS, MAX_RADIUS, fallback.radius, result),
    height: clampNumber("dimensions.height", input.height, MIN_HEIGHT, MAX_HEIGHT, fallback.height, result),
    floors: clampNumber("dimensions.floors", input.floors, MIN_FLOORS, MAX_FLOORS, fallback.floors, result),
  };
}

function repairFeatures(value: unknown, result: BlueprintValidationResult): MinecraftSchematicFeature[] {
  if (!Array.isArray(value)) {
    result.repairedFields.features = {
      from: value,
      to: DEFAULT_TOWER_BLUEPRINT.features,
      reason: "Features were not an array.",
    };
    result.warnings.push("features were missing or invalid. Using safe defaults.");
    return [...DEFAULT_TOWER_BLUEPRINT.features];
  }

  const repaired: MinecraftSchematicFeature[] = [];

  for (const feature of value) {
    const token = normalizeToken(feature);

    if ((ALLOWED_FEATURES as readonly string[]).includes(token)) {
      repaired.push(token as MinecraftSchematicFeature);
      continue;
    }

    if (FEATURE_ALIASES[token]) {
      const mapped = FEATURE_ALIASES[token];
      repaired.push(mapped);

      result.repairedFields[`features.${token}`] = {
        from: feature,
        to: mapped,
        reason: "Mapped feature alias to allowed vocabulary.",
      };
      result.warnings.push(`feature "${String(feature)}" was repaired to "${mapped}".`);
      continue;
    }

    result.rejectedFields[`features.${token}`] = feature;
    result.warnings.push(`feature "${String(feature)}" is unsupported and was removed.`);
  }

  const unique = [...new Set(repaired)];

  if (unique.length === 0) {
    result.repairedFields.features = {
      from: value,
      to: DEFAULT_TOWER_BLUEPRINT.features,
      reason: "All requested features were unsupported.",
    };
    result.warnings.push("all requested features were unsupported. Using safe defaults.");
    return [...DEFAULT_TOWER_BLUEPRINT.features];
  }

  return unique;
}

function removeUnsafeFields(input: Record<string, unknown>, result: BlueprintValidationResult): void {
  for (const key of Object.keys(input)) {
    if (FORBIDDEN_BLOCK_FIELD_NAMES.has(key)) {
      result.rejectedFields[key] = input[key];
      result.warnings.push(`unsafe field "${key}" was rejected. AI cannot control raw blocks or coordinates.`);
    }
  }
}

function dimensionsForScale(scale: BuildScale): TowerDimensions {
  switch (scale) {
    case "small":
      return { radius: 4, height: 16, floors: 3 };
    case "large":
      return { radius: 7, height: 34, floors: 6 };
    case "medium":
    default:
      return { radius: 5, height: 22, floors: 4 };
  }
}

export function validateBlueprint(input: unknown): BlueprintValidationResult {
  const result: BlueprintValidationResult = {
    valid: true,
    blueprint: cloneDefault(),
    repairedFields: {},
    warnings: [],
    rejectedFields: {},
  };

  if (!isRecord(input)) {
    result.valid = false;
    result.repairedFields.root = {
      from: input,
      to: DEFAULT_TOWER_BLUEPRINT,
      reason: "Blueprint was not an object.",
    };
    result.warnings.push("blueprint was not an object. Falling back to deterministic defaults.");
    return result;
  }

  removeUnsafeFields(input, result);

  const generator = repairEnum<MinecraftSchematicGenerator>(
    "generator",
    input.generator,
    ALLOWED_GENERATORS,
    {},
    "tower",
    result,
  );

  const theme = repairEnum<MinecraftSchematicTheme>(
    "theme",
    input.theme,
    ALLOWED_THEMES,
    THEME_ALIASES,
    "medieval",
    result,
  );

  const scale = repairScale(input.scale, result);

  const roofType = repairEnum<MinecraftSchematicRoofType>(
    "roofType",
    input.roofType,
    ALLOWED_ROOF_TYPES,
    ROOF_ALIASES,
    "flat_battlement",
    result,
  );

  const palette = repairEnum<MinecraftSchematicPalette>(
    "palette",
    input.palette ?? theme,
    ALLOWED_PALETTES,
    THEME_ALIASES,
    theme,
    result,
  );

  const fallbackDimensions = dimensionsForScale(scale);
  const dimensions = repairDimensions(input.dimensions, fallbackDimensions, result);
  const features = repairFeatures(input.features, result);

  const seedNumber = Number(input.seed);
  const seed = Number.isFinite(seedNumber) ? Math.abs(Math.round(seedNumber)) : DEFAULT_TOWER_BLUEPRINT.seed;

  if (!Number.isFinite(seedNumber)) {
    result.repairedFields.seed = {
      from: input.seed,
      to: seed,
      reason: "Invalid seed replaced with deterministic default.",
    };
  }

  result.blueprint = {
    generator,
    theme,
    scale,
    roofType,
    features,
    palette,
    dimensions,
    seed,
  };

  result.valid = Object.keys(result.rejectedFields).length === 0;

  return result;
}
