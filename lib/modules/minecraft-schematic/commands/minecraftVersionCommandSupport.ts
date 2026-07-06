import type {
  BlockRegistryProfileId,
  GeneratedSchematicBuild,
  MinecraftSchematicParsedCommand,
  SchematicGeneratorName,
  SchematicVariant,
  TowerVariant,
} from "../types";
import { normalizeMinecraftVersion } from "../block-registry";

export type MinecraftSchematicBaseParser = (input: string) => MinecraftSchematicParsedCommand;

export type MinecraftVersionClauseParseResult = {
  targetMinecraftVersion?: string;
  strippedInput: string;
  matchedClause?: string;
};

type VersionedCommandOptions = {
  targetMinecraftVersion?: string;
  profile?: BlockRegistryProfileId | string;
  allowModdedBlocks?: boolean;
  fallbackToVanilla?: boolean;
};

const VERSION_PATTERN = String.raw`(\d+\.\d+(?:\.\d+)?)`;

function safeNormalizeMinecraftVersion(version: string | undefined): string | undefined {
  if (!version) {
    return undefined;
  }

  try {
    return normalizeMinecraftVersion(version).replace(/\.0$/, "");
  } catch {
    return undefined;
  }
}

function normalizeWhitespace(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function isVersionOnlyText(value: unknown): boolean {
  return typeof value === "string" && /^\d+\.\d+(?:\.\d+)?$/.test(value.trim());
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseMinecraftVersionTargetFromText(raw: string): string | undefined {
  const normalized = normalizeWhitespace(raw);

  const patterns = [
    new RegExp(String.raw`\b(?:target\s+)?minecraft\s+version\s+${VERSION_PATTERN}\b`, "i"),
    new RegExp(String.raw`\b(?:mc\s+version|version)\s+${VERSION_PATTERN}\b`, "i"),
    new RegExp(String.raw`\bcompatible\s+with\s+${VERSION_PATTERN}\b`, "i"),
    new RegExp(String.raw`\busing\s+only\s+${VERSION_PATTERN}\s+blocks?\b`, "i"),
    new RegExp(String.raw`\bvanilla\s+${VERSION_PATTERN}\b`, "i"),
    new RegExp(String.raw`\bto\s+version\s+${VERSION_PATTERN}\b`, "i"),
    new RegExp(String.raw`\b${VERSION_PATTERN}\s+blocks?\b`, "i"),
    new RegExp(String.raw`\b${VERSION_PATTERN}$`, "i"),
  ];

  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    const version = safeNormalizeMinecraftVersion(match?.[1]);

    if (version) {
      return version;
    }
  }

  return undefined;
}

export function stripMinecraftVersionClauses(raw: string): MinecraftVersionClauseParseResult {
  let strippedInput = normalizeWhitespace(raw);
  let targetMinecraftVersion: string | undefined;
  let matchedClause: string | undefined;

  const patterns = [
    new RegExp(String.raw`\b(?:target\s+)?minecraft\s+version\s+${VERSION_PATTERN}\b`, "i"),
    new RegExp(String.raw`\b(?:mc\s+version|version)\s+${VERSION_PATTERN}\b`, "i"),
    new RegExp(String.raw`\bcompatible\s+with\s+${VERSION_PATTERN}\b`, "i"),
    new RegExp(String.raw`\busing\s+only\s+${VERSION_PATTERN}\s+blocks?\b`, "i"),
    new RegExp(String.raw`\bvanilla\s+${VERSION_PATTERN}\b`, "i"),
    new RegExp(String.raw`\bto\s+version\s+${VERSION_PATTERN}\b`, "i"),
    new RegExp(String.raw`\b${VERSION_PATTERN}\s+blocks?\b`, "i"),
    new RegExp(String.raw`\b${VERSION_PATTERN}$`, "i"),
  ];

  for (const pattern of patterns) {
    const match = strippedInput.match(pattern);

    if (!match) {
      continue;
    }

    const version = safeNormalizeMinecraftVersion(match[1]);

    if (!version) {
      continue;
    }

    targetMinecraftVersion = targetMinecraftVersion ?? version;
    matchedClause = matchedClause ?? match[0];
    strippedInput = normalizeWhitespace(strippedInput.replace(match[0], ""));
  }

  return {
    targetMinecraftVersion,
    strippedInput,
    matchedClause,
  };
}

function parseProfileOptions(raw: string): VersionedCommandOptions {
  const normalized = normalizeWhitespace(raw).toLowerCase();

  if (/\b(?:siriocraft-create|siriocraft create|create)\b/.test(normalized)) {
    return {
      profile: "siriocraft-create",
      allowModdedBlocks: true,
      fallbackToVanilla: true,
    };
  }

  if (/\bvanilla\b/.test(normalized)) {
    return {
      profile: "vanilla",
      allowModdedBlocks: false,
      fallbackToVanilla: true,
    };
  }

  return {};
}

function removeGenerateNoise(rawSubject: string): string {
  return normalizeWhitespace(
    rawSubject
      .replace(/^minecraft\s+schematic\s*:?[\s]*/i, "")
      .replace(/^schematic\s*:?[\s]*/i, "")
      .replace(/\b(?:using\s+only|compatible\s+with|version|minecraft\s+version|mc\s+version|target\s+minecraft\s+version)\b.*$/i, "")
      .replace(/\bvanilla\s+\d+\.\d+(?:\.\d+)?\b/i, "vanilla")
      .replace(/\b\d+\.\d+(?:\.\d+)?\b/g, " ")
      .replace(/\b(?:please|make|build|create|a|an|the)\b/gi, " "),
  );
}

function inferTowerVariant(subject: string): TowerVariant {
  const normalized = subject.toLowerCase();

  if (/\bdark\s+fantasy\b/.test(normalized)) return "dark_fantasy";
  if (/\bcreate\b|\bindustrial\b|\bfactory\b/.test(normalized)) return "create_industrial";
  if (/\bdeepslate\b/.test(normalized)) return "deepslate";
  if (/\bwooden\b|\bwood\b/.test(normalized)) return "wooden";
  if (/\bmedieval\b/.test(normalized)) return "medieval";
  if (/\bruined\b|\bruin\b/.test(normalized)) return "ruined";
  if (/\bsnow\b|\bsnowy\b|\bfrozen\b/.test(normalized)) return "snow";

  return "default";
}

function inferStructure(subject: string): {
  generator: SchematicGeneratorName;
  variant: SchematicVariant;
  useTowerCommand: boolean;
} | null {
  const normalized = subject.toLowerCase();

  if (/\btower\b|\bwatchtower\b/.test(normalized)) {
    return {
      generator: "tower",
      variant: inferTowerVariant(subject),
      useTowerCommand: true,
    };
  }

  if (/\btrain\s+station\b|\bstation\b|\brail\b|\brailway\b/.test(normalized)) {
    return {
      generator: "train_station",
      variant: /\bfactory\b|\bloading\b|\bindustrial\b/.test(normalized) ? "industrial" : "default",
      useTowerCommand: false,
    };
  }

  if (/\bfactory\b|\bworkshop\b|\bwarehouse\b|\bpipeworks\b|\bmachine\s+house\b/.test(normalized)) {
    return {
      generator: "factory",
      variant: /\bmedieval\b/.test(normalized) ? "medieval" : "default",
      useTowerCommand: false,
    };
  }

  if (/\bmedieval\s+house\b|\bhouse\b|\bhome\b|\bcottage\b|\bhut\b/.test(normalized)) {
    return {
      generator: "house",
      variant: /\bmedieval\b/.test(normalized) ? "medieval" : "default",
      useTowerCommand: false,
    };
  }

  if (/\bgatehouse\b|\bgate\s+house\b|\bgate\b/.test(normalized)) {
    return {
      generator: "gatehouse",
      variant: /\bmedieval\b/.test(normalized) ? "medieval" : "default",
      useTowerCommand: false,
    };
  }

  if (/\bbridge\b/.test(normalized)) {
    return {
      generator: "bridge",
      variant: /\bstone\b/.test(normalized) ? "stone" : "default",
      useTowerCommand: false,
    };
  }

  if (/\bspawn\b|\boutpost\b|\bcheckpoint\b|\bcamp\b/.test(normalized)) {
    return {
      generator: "outpost",
      variant: /\bspawn\b/.test(normalized) ? "spawn" : "default",
      useTowerCommand: false,
    };
  }

  return null;
}

function withVersionOptions<TCommand extends MinecraftSchematicParsedCommand>(
  command: TCommand,
  options: VersionedCommandOptions,
): TCommand {
  if (!options.targetMinecraftVersion && !options.profile && options.allowModdedBlocks === undefined && options.fallbackToVanilla === undefined) {
    return command;
  }

  if (
    command.kind !== "generate-tower" &&
    command.kind !== "generate-structure" &&
    command.kind !== "generate-preset" &&
    command.kind !== "validate-latest" &&
    command.kind !== "show-build" &&
    command.kind !== "show-latest"
  ) {
    return command;
  }

  return {
    ...command,
    ...options,
  } as TCommand;
}

function readTargetVersionFromUnknown(input: unknown): string | undefined {
  if (!isRecord(input)) {
    return typeof input === "string" ? parseMinecraftVersionTargetFromText(input) : undefined;
  }

  const direct =
    readString(input.targetMinecraftVersion) ??
    readString(input.minecraftVersionTarget) ??
    readString(input.version) ??
    readString(input.minecraftVersion) ??
    readString(input.variant) ??
    readString(input.target);

  const normalizedDirect = safeNormalizeMinecraftVersion(direct);
  if (normalizedDirect) {
    return normalizedDirect;
  }

  return parseMinecraftVersionTargetFromText(readString(input.raw) ?? readString(input.prompt) ?? "");
}

function readProfileOptionsFromUnknown(input: unknown): VersionedCommandOptions {
  if (typeof input === "string") {
    return parseProfileOptions(input);
  }

  if (!isRecord(input)) {
    return {};
  }

  const fromRaw = parseProfileOptions(readString(input.raw) ?? readString(input.prompt) ?? "");
  const profile = readString(input.profile) ?? readString(input.profileId) ?? fromRaw.profile;
  const allowModdedBlocks = typeof input.allowModdedBlocks === "boolean" ? input.allowModdedBlocks : fromRaw.allowModdedBlocks;
  const fallbackToVanilla = typeof input.fallbackToVanilla === "boolean" ? input.fallbackToVanilla : fromRaw.fallbackToVanilla;

  return {
    profile,
    allowModdedBlocks,
    fallbackToVanilla,
  };
}

export function enrichMinecraftSchematicParsedCommandWithVersion(
  command: MinecraftSchematicParsedCommand,
  originalInput?: unknown,
): MinecraftSchematicParsedCommand {
  const targetMinecraftVersion =
    readTargetVersionFromUnknown(originalInput) ??
    parseMinecraftVersionTargetFromText("raw" in command ? command.raw : "");
  const profileOptions = readProfileOptionsFromUnknown(originalInput ?? ("raw" in command ? command.raw : ""));

  return withVersionOptions(command, {
    ...profileOptions,
    targetMinecraftVersion,
  });
}

function parseVersionedValidateOrConvert(raw: string): MinecraftSchematicParsedCommand | null {
  const normalized = normalizeWhitespace(raw);

  const validateMatch = normalized.match(
    new RegExp(String.raw`^(?:schematic\s+)?validate\s+(?:schematic\s+)?([a-zA-Z0-9_.-]+)\s+(?:target\s+)?(?:minecraft\s+)?version\s+${VERSION_PATTERN}$`, "i"),
  );

  if (validateMatch) {
    const targetMinecraftVersion = safeNormalizeMinecraftVersion(validateMatch[2]);

    if (targetMinecraftVersion) {
      return {
        kind: "validate-build-version",
        buildId: validateMatch[1],
        targetMinecraftVersion,
        raw,
      };
    }
  }

  const convertMatch = normalized.match(
    new RegExp(String.raw`^(?:schematic\s+)?convert\s+(?:schematic\s+)?([a-zA-Z0-9_.-]+)\s+to\s+(?:target\s+)?(?:minecraft\s+)?version\s+${VERSION_PATTERN}$`, "i"),
  );

  if (convertMatch) {
    const targetMinecraftVersion = safeNormalizeMinecraftVersion(convertMatch[2]);

    if (targetMinecraftVersion) {
      return {
        kind: "convert-build-version",
        buildId: convertMatch[1],
        targetMinecraftVersion,
        raw,
      };
    }
  }

  return null;
}

function parseVersionedSelfTestCommand(raw: string): MinecraftSchematicParsedCommand | null {
  const normalized = normalizeWhitespace(raw).toLowerCase();

  if (
    normalized === "schematic version parser self test" ||
    normalized === "schematic version parser test" ||
    normalized === "test schematic version parser" ||
    normalized === "test version parser"
  ) {
    return {
      kind: "version-parser-self-test",
      raw,
    };
  }

  return null;
}

function parseVersionedGenerateShorthand(raw: string): MinecraftSchematicParsedCommand | null {
  const stripped = stripMinecraftVersionClauses(raw);
  const profileOptions = parseProfileOptions(raw);
  const normalized = normalizeWhitespace(stripped.strippedInput);

  const generateMatch = normalized.match(/^generate\s+(.+)$/i);
  if (!generateMatch) {
    return null;
  }

  if (!stripped.targetMinecraftVersion && /^generate\s+minecraft\s+schematic/i.test(normalized)) {
    return null;
  }

  const subject = removeGenerateNoise(generateMatch[1]);
  const inferred = inferStructure(subject);

  if (!inferred) {
    return null;
  }

  const targetMinecraftVersion = stripped.targetMinecraftVersion;

  if (inferred.useTowerCommand) {
    return {
      kind: "generate-tower",
      variant: inferred.variant as TowerVariant,
      targetMinecraftVersion,
      ...profileOptions,
      raw,
    };
  }

  return {
    kind: "generate-structure",
    generator: inferred.generator,
    variant: inferred.variant,
    prompt: raw,
    targetMinecraftVersion,
    ...profileOptions,
    raw,
  };
}

export function parseMinecraftSchematicCommandWithVersionSupport(
  raw: string,
  baseParser: MinecraftSchematicBaseParser,
): MinecraftSchematicParsedCommand {
  const selfTest = parseVersionedSelfTestCommand(raw);
  if (selfTest) {
    return selfTest;
  }

  const validateOrConvert = parseVersionedValidateOrConvert(raw);
  if (validateOrConvert) {
    return validateOrConvert;
  }

  const shorthand = parseVersionedGenerateShorthand(raw);
  if (shorthand) {
    return shorthand;
  }

  const stripped = stripMinecraftVersionClauses(raw);
  const baseRaw = stripped.targetMinecraftVersion ? stripped.strippedInput : raw;
  const baseCommand = baseParser(baseRaw);

  return enrichMinecraftSchematicParsedCommandWithVersion(baseCommand, raw);
}

export function applyVersionOptionsToGeneratedBuild(
  build: GeneratedSchematicBuild,
  command: MinecraftSchematicParsedCommand,
): GeneratedSchematicBuild {
  if (!isRecord(command)) {
    return build;
  }

  const targetMinecraftVersion = readTargetVersionFromUnknown(command);
  const profileOptions = readProfileOptionsFromUnknown(command);

  const generatedVariant = readString((build as { variant?: unknown }).variant);
  const shouldRepairVersionVariant =
    isVersionOnlyText(generatedVariant) &&
    safeNormalizeMinecraftVersion(generatedVariant) === targetMinecraftVersion;

  if (!targetMinecraftVersion && !profileOptions.profile && profileOptions.allowModdedBlocks === undefined && profileOptions.fallbackToVanilla === undefined && !shouldRepairVersionVariant) {
    return build;
  }

  return {
    ...build,
    ...(shouldRepairVersionVariant ? { variant: "default" } : {}),
    ...(targetMinecraftVersion ? { targetMinecraftVersion } : {}),
    ...(profileOptions.profile ? { profile: profileOptions.profile } : {}),
    ...(profileOptions.allowModdedBlocks !== undefined ? { allowModdedBlocks: profileOptions.allowModdedBlocks } : {}),
    ...(profileOptions.fallbackToVanilla !== undefined ? { fallbackToVanilla: profileOptions.fallbackToVanilla } : {}),
  };
}

export function formatMinecraftVersionParserSelfTest(): string {
  const examples = [
    "generate tower version 1.8.8",
    "generate tower 1.8.8",
    "generate medieval house using only 1.12.2 blocks",
    "generate factory vanilla 1.20.1",
    "generate spawn compatible with 1.8.8",
    "validate schematic demo-build version 1.8.8",
    "convert schematic demo-build to version 1.8.8",
  ];

  const lines = [
    "Minecraft version parser self-test",
    "==================================",
  ];

  for (const example of examples) {
    const stripped = stripMinecraftVersionClauses(example);
    lines.push(`- ${example}`);
    lines.push(`  targetMinecraftVersion: ${stripped.targetMinecraftVersion ?? "none"}`);
    lines.push(`  strippedInput: ${stripped.strippedInput}`);
  }

  return lines.join("\n");
}
