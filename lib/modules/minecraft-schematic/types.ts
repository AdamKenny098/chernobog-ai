export type MinecraftBlockName = `${string}:${string}`;

export type SchematicSize = {
  x: number;
  y: number;
  z: number;
};

export type SchematicBlock = {
  x: number;
  y: number;
  z: number;
  block: MinecraftBlockName;
};

export type TowerVariant =
  | "default"
  | "medieval"
  | "ruined"
  | "snow"
  | "dark_fantasy"
  | "create_industrial"
  | "deepslate"
  | "wooden";

export type SchematicGeneratorName =
  | "tower"
  | "house"
  | "bridge"
  | "gatehouse"
  | "factory"
  | "train_station"
  | "outpost";

export type SchematicVariant = TowerVariant | string;

export type BlockRegistryProfileId = "vanilla" | "siriocraft-create";

export type BlockRegistryProfile = {
  id: BlockRegistryProfileId;
  displayName: string;
  description: string;
  allowedNamespaces: string[];
  supportedModdedBlocks: MinecraftBlockName[];
  allowModdedBlocksDefault: boolean;
  fallbackToVanillaDefault: boolean;
  fallbackBlocks: Partial<Record<MinecraftBlockName, MinecraftBlockName>>;
};

export type BlockRegistryReplacementRecord = {
  original: MinecraftBlockName;
  replacement: MinecraftBlockName;
  reason: string;
  context: string;
};

export type BlockRegistryUnsupportedRecord = {
  block: MinecraftBlockName;
  reason: string;
};

export type BlockRegistryReport = {
  profileId: BlockRegistryProfileId;
  profileDisplayName: string;
  allowModdedBlocks: boolean;
  fallbackToVanilla: boolean;
  allowedNamespaces: string[];
  supportedModdedBlocks: MinecraftBlockName[];
  totalBlocksChecked: number;
  totalPaletteEntriesChecked: number;
  changedBlocks: number;
  fallbackBlocks: number;
  unsupportedBlocks: BlockRegistryUnsupportedRecord[];
  replacements: BlockRegistryReplacementRecord[];
  warnings: string[];
};

export type SchematicBlockEntityKind = "sign" | "chest" | "barrel" | "placeholder";

export type SchematicBlockEntityNbtStatus = "written" | "metadata_only";

export type SchematicBlockEntity = {
  id: MinecraftBlockName;
  kind: SchematicBlockEntityKind;
  x: number;
  y: number;
  z: number;
  text?: string[];
  label?: string;
  metadata?: Record<string, unknown>;
  nbtId?: MinecraftBlockName;
  nbtStatus?: SchematicBlockEntityNbtStatus;
  nbtWarnings?: string[];
};

export type SchematicBlockEntityExportSummary = {
  total: number;
  signs: number;
  chests: number;
  barrels: number;
  placeholders: number;
  nbtWritten: number;
  metadataOnly: number;
  warnings: string[];
};

export type ShapeValidationIssueRecord = {
  severity: "error" | "warning";
  category: string;
  message: string;
  x?: number;
  y?: number;
  z?: number;
  blockState?: string;
};

export type ShapeValidationReportRecord = {
  valid: boolean;
  blockCount: number;
  nonAirBlockCount: number;
  invalidBlocks: number;
  invalidStates: number;
  unsupportedComplexBlocks: number;
  missingSupport: number;
  malformedMultiBlocks: number;
  warnings: number;
  issues: ShapeValidationIssueRecord[];
};

export type ShapeResolverReportRecord = {
  passName: string;
  changed: number;
  warnings: string[];
};

export type SchematicBuildReportFileSummary = {
  kind: "schem" | "metadata" | "debug" | "vault-note";
  path: string;
  label: string;
};

export type SchematicBuildReport = {
  title: string;
  status: "passed" | "warning" | "failed";
  sirioCraftUseCase: string;
  suggestedPlacement: string;
  recommendedNextAction: string;
  qualityNotes: string[];
  knownLimitations: string[];
  warningSummary: string[];
  paletteSummary: Array<{
    block: MinecraftBlockName;
    role: string;
  }>;
  blockEntitySummary: {
    total: number;
    nbtWritten: number;
    metadataOnly: number;
    labels: string[];
  };
  blockRegistrySummary?: {
    profileId: BlockRegistryProfileId;
    allowModdedBlocks: boolean;
    fallbackToVanilla: boolean;
    changedBlocks: number;
    fallbackBlocks: number;
    unsupportedBlocks: number;
  };
  outputSummary: SchematicBuildReportFileSummary[];
  reviewRoute: string;
  tags: string[];
};

export type GeneratedSchematicBuild = {
  buildId: string;
  displayName?: string;
  generatorName: SchematicGeneratorName | string;
  variant: SchematicVariant;
  presetId?: string;
  profile?: BlockRegistryProfileId | string;
  allowModdedBlocks?: boolean;
  fallbackToVanilla?: boolean;
  prompt: string;
  command: string;
  minecraftVersion: string;
  generatedAt: string;
  size: SchematicSize;
  palette: MinecraftBlockName[];
  blocks: SchematicBlock[];
  blockEntities?: SchematicBlockEntity[];
  blockEntityExport?: SchematicBlockEntityExportSummary;
  features?: string[];
  blockCount: number;
  shapeValidation?: ShapeValidationReportRecord;
  shapeResolverReports?: ShapeResolverReportRecord[];
  placementWarnings?: string[];
  unsupportedBlockWarnings?: string[];
  blockRegistryReport?: BlockRegistryReport;
};

export type SchematicValidationResult = {
  ok: boolean;
  warnings: string[];
  errors: string[];
};

export type SchematicOutputPaths = {
  debugJsonPath: string;
  metadataJsonPath: string;
  schemPath: string;
  vaultNotePath: string;
};

export type SchematicMetadata = {
  buildId: string;
  displayName?: string;
  generatedAt: string;
  generatorName: SchematicGeneratorName | string;
  variant: SchematicVariant;
  presetId?: string;
  profile?: BlockRegistryProfileId | string;
  allowModdedBlocks?: boolean;
  fallbackToVanilla?: boolean;
  prompt: string;
  command: string;
  minecraftVersion: string;
  size: SchematicSize;
  palette: MinecraftBlockName[];
  blockCount: number;
  blockEntities?: SchematicBlockEntity[];
  blockEntityExport?: SchematicBlockEntityExportSummary;
  features?: string[];
  outputPaths: SchematicOutputPaths;
  validation: SchematicValidationResult;
  shapeValidation?: ShapeValidationReportRecord;
  shapeResolverReports?: ShapeResolverReportRecord[];
  placementWarnings?: string[];
  unsupportedBlockWarnings?: string[];
  blockRegistryReport?: BlockRegistryReport;
  buildReport?: SchematicBuildReport;
};

export type LatestSchematicRecord = {
  buildId: string;
  generatedAt: string;
  metadataJsonPath: string;
  debugJsonPath: string;
  schemPath: string;
  vaultNotePath: string;
};

export type MinecraftSchematicParsedCommand =
  | {
      kind: "status";
      raw: string;
    }
  | {
      kind: "help";
      raw: string;
    }
  | {
      kind: "milestone-status";
      raw: string;
    }
  | {
      kind: "test-plan";
      raw: string;
    }
  | {
      kind: "generate-tower";
      variant: TowerVariant;
      presetId?: string;
      raw: string;
    }
  | {
      kind: "generate-structure";
      generator: SchematicGeneratorName;
      variant: SchematicVariant;
      presetId?: string;
      prompt: string;
      raw: string;
    }
  | {
      kind: "show-latest";
      raw: string;
    }
  | {
      kind: "show-build";
      buildId: string;
      raw: string;
    }
  | {
      kind: "validate-latest";
      raw: string;
    }
  | {
      kind: "list";
      raw: string;
    }
  | {
      kind: "list-presets";
      category?: string;
      tag?: string;
      raw: string;
    }
  | {
      kind: "list-profiles";
      raw: string;
    }
  | {
      kind: "show-profile";
      profileId: BlockRegistryProfileId;
      raw: string;
    }
  | {
      kind: "search-presets";
      query: string;
      raw: string;
    }
  | {
      kind: "recommend-preset";
      query: string;
      raw: string;
    }
  | {
      kind: "show-preset";
      presetId: string;
      raw: string;
    }
  | {
      kind: "generate-preset";
      presetId: string;
      raw: string;
    }
  | {
      kind: "open-folder";
      buildId?: string;
      latest?: boolean;
      raw: string;
    }
  | {
      kind: "review-latest";
      raw: string;
    }
  | {
      kind: "review-build";
      buildId: string;
      raw: string;
    }
  | {
      kind: "unknown";
      raw: string;
      reason: string;
    };

export type MinecraftSchematicCommandResult = {
  ok: boolean;
  title: string;
  message: string;
  data?: unknown;
};
