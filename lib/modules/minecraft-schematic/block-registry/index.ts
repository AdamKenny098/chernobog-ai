export {
  MINECRAFT_BLOCK_REGISTRY,
  MINECRAFT_BLOCK_REGISTRY_BY_ID,
  applyBlockRegistryToBuild,
  blockRegistryProfiles,
  formatBlockRegistryProfile,
  getBlockRegistryProfile,
  normalizeBlockRegistryProfileId,
} from "./blockRegistry";

export type {
  ApplyBlockRegistryOptions,
  BlockRegistryProfileLike,
} from "./blockRegistry";

export type {
  BlockResolutionResult,
  BlockVersionIssue,
  BlockVersionLimitReport,
  MinecraftBlockRegistryEntry,
  MinecraftBlockTag,
} from "./blockRegistryTypes";

export {
  canonicalizeMinecraftBlockId,
  getMinecraftBlockRegistryEntry,
  isBlockAllowedInVersion,
  resolveBlockForVersion,
} from "./blockCompatibility";

export {
  createBlockVersionLimitReport,
} from "./blockVersionLimitReport";

export {
  compareMinecraftVersions,
  isMinecraftVersionAtLeast,
  isMinecraftVersionBefore,
  normalizeMinecraftVersion,
  parseMinecraftVersion,
} from "./minecraftVersion";

export {
  applyVersionSafePaletteIntentToBuild,
  createVersionSafePaletteIntentReport,
} from "./applyVersionSafePaletteIntentToBuild";

export type {
  VersionSafePaletteIntentReport,
  VersionSafePaletteReplacementRecord,
  VersionSafePaletteUnresolvedRecord,
} from "./applyVersionSafePaletteIntentToBuild";

export {
  applyBlockVersionValidationToBuild,
  createBlockVersionValidationReport,
  formatBlockVersionValidationReport,
  runBlockVersionValidatorSelfTest,
} from "./blockVersionValidator";

export type {
  BlockVersionValidationCoordinate,
  BlockVersionValidationIssue,
  BlockVersionValidationReport,
  BlockVersionValidationStatus,
} from "./blockVersionValidator";

export * from "./blockVersionFinalizer9F";