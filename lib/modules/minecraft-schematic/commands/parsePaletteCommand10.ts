import type {
  MinecraftSchematicParsedCommand,
  SchematicGeneratorName,
  SchematicVariant,
} from "../types";

export type PaletteCommand10 =
  | {
      kind: "palette-list";
      raw: string;
    }
  | {
      kind: "palette-show";
      paletteId: string;
      raw: string;
    }
  | {
      kind: "palette-validate";
      paletteId: string;
      targetMinecraftVersion?: string;
      profile?: string;
      raw: string;
    }
  | {
      kind: "palette-generate";
      prompt: string;
      targetMinecraftVersion?: string;
      profile?: string;
      raw: string;
    }
  | {
      kind: "palette-apply";
      paletteId: string;
      buildId: string;
      targetMinecraftVersion?: string;
      profile?: string;
      raw: string;
    };

export type PaletteParsedCommand10 = PaletteCommand10 | MinecraftSchematicParsedCommand;

function parseVersionOrProfile(value?: string): {
  targetMinecraftVersion?: string;
  profile?: string;
} {
  if (!value) {
    return {};
  }

  const normalized = value.trim().toLowerCase();

  if (/^\d+\.\d+(\.\d+)?$/.test(normalized)) {
    return { targetMinecraftVersion: normalized, profile: "vanilla" };
  }

  if (normalized === "vanilla") {
    return { profile: "vanilla" };
  }

  if (normalized === "create" || normalized === "modded" || normalized === "create-industrial") {
    return { profile: "siriocraft-create" };
  }

  return { profile: normalized };
}

function normalizeStructureGenerator(value: string): SchematicGeneratorName | undefined {
  const normalized = value.trim().toLowerCase().replace(/[-\s]+/g, "_");

  if (
    normalized === "tower" ||
    normalized === "factory" ||
    normalized === "gatehouse" ||
    normalized === "house" ||
    normalized === "bridge" ||
    normalized === "train_station" ||
    normalized === "outpost"
  ) {
    return normalized;
  }

  return undefined;
}

export function isPaletteManagementCommand10(
  command: unknown,
): command is PaletteCommand10 {
  return (
    !!command &&
    typeof command === "object" &&
    "kind" in command &&
    typeof (command as { kind?: unknown }).kind === "string" &&
    (command as { kind: string }).kind.startsWith("palette-")
  );
}

export function parsePaletteCommand10(input: string): PaletteParsedCommand10 | null {
  const raw = input.trim();
  const normalized = raw.toLowerCase().replace(/\s+/g, " ");

  if (normalized === "list palettes" || normalized === "schematic list palettes") {
    return { kind: "palette-list", raw };
  }

  const showMatch = normalized.match(/^(?:schematic )?show palette ([a-z0-9_.:-]+)$/i);
  if (showMatch) {
    return { kind: "palette-show", paletteId: showMatch[1], raw };
  }

  const validateMatch = normalized.match(
    /^(?:schematic )?validate palette ([a-z0-9_.:-]+)(?: ([a-z0-9_.:-]+))?$/i,
  );
  if (validateMatch) {
    return {
      kind: "palette-validate",
      paletteId: validateMatch[1],
      ...parseVersionOrProfile(validateMatch[2]),
      raw,
    };
  }

  const generateMatch = normalized.match(/^generate palette (.+?)(?: ([0-9]+\.[0-9]+(?:\.[0-9]+)?|vanilla|create|modded|siriocraft-create))?$/i);
  if (generateMatch) {
    return {
      kind: "palette-generate",
      prompt: generateMatch[1].trim(),
      ...parseVersionOrProfile(generateMatch[2]),
      raw,
    };
  }

  const generateStructureWithPaletteMatch = normalized.match(
    /^generate ([a-z_ -]+) using palette ([a-z0-9_.:-]+)(?: ([0-9]+\.[0-9]+(?:\.[0-9]+)?|vanilla|create|modded|siriocraft-create))?$/i,
  );
  if (generateStructureWithPaletteMatch) {
    const generator = normalizeStructureGenerator(generateStructureWithPaletteMatch[1]);

    if (!generator) {
      return null;
    }

    const parsedVersion = parseVersionOrProfile(generateStructureWithPaletteMatch[3]);

    return {
      kind: "generate-structure",
      generator,
      variant: generator as SchematicVariant,
      prompt: raw,
      paletteId: generateStructureWithPaletteMatch[2],
      ...parsedVersion,
      raw,
    } as MinecraftSchematicParsedCommand & { paletteId: string };
  }

  const applyMatch = normalized.match(
    /^apply palette ([a-z0-9_.:-]+) to schematic ([a-z0-9_.:-]+|latest)(?: ([0-9]+\.[0-9]+(?:\.[0-9]+)?|vanilla|create|modded|siriocraft-create))?$/i,
  );
  if (applyMatch) {
    return {
      kind: "palette-apply",
      paletteId: applyMatch[1],
      buildId: applyMatch[2],
      ...parseVersionOrProfile(applyMatch[3]),
      raw,
    };
  }

  return null;
}
