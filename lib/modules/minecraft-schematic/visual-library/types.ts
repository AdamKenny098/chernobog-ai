export type VisualSchematicStatus =
  | "ok"
  | "missing-data"
  | "corrupt-metadata"
  | "missing-library";

export type VisualSchematicSize = {
  x: number;
  y: number;
  z: number;
};

export type VisualBlockMaterialKind =
  | "solid"
  | "transparent"
  | "foliage"
  | "liquid"
  | "emissive"
  | "missing";

export type VisualBlockMaterialInfo = {
  key: string;
  displayName: string;
  color: string;
  secondaryColor: string;
  texturePath: string;
  transparent: boolean;
  opacity: number;
  roughness: number;
  metalness: number;
  kind: VisualBlockMaterialKind;
  emissive?: string;
  emissiveIntensity?: number;
};

export type VisualBlockSummary = {
  blockId: string;
  count: number;
  color: string;
  material: VisualBlockMaterialInfo;
};

export type VisualVoxelBlock = {
  x: number;
  y: number;
  z: number;
  blockId: string;
  color: string;
  material: VisualBlockMaterialInfo;
};


export type VisualViewerReliabilityLevel = "ok" | "warning" | "blocked";

export type VisualViewerReliabilityReport = {
  level: VisualViewerReliabilityLevel;
  blocked: boolean;
  messages: string[];
  warnings: string[];
  errors: string[];
  renderedVoxelLimit: number;
  rawVoxelParseLimit: number;
  coordinateLimit: number;
};

export type VisualVoxelPayload = {
  size: VisualSchematicSize;
  voxels: VisualVoxelBlock[];
  capped: boolean;
  totalAvailableVoxels: number;
  source: "raw-block-data" | "metadata-scaffold";
  reliability: VisualViewerReliabilityReport;
};

export type VisualSchematicViewer =
  | {
      kind: "placeholder";
      message: string;
      supportsVoxelPayload: false;
    }
  | {
      kind: "voxel";
      message: string;
      supportsVoxelPayload: true;
      payload: VisualVoxelPayload;
    };

export type VisualSchematicThumbnail =
  | {
      kind: "image";
      src: string;
      alt: string;
    }
  | {
      kind: "generated-placeholder";
      src: null;
      alt: string;
    };

export type VisualValidationLevel = "unknown" | "passed" | "warning" | "failed";

export type VisualValidationSummary = {
  level: VisualValidationLevel;
  messageCount: number;
  warningCount: number;
  errorCount: number;
};

export type VisualViewerViewMode = "perspective" | "top-down" | "layer";

export type VisualLayerBlockSummary = {
  blockId: string;
  count: number;
  color: string;
  displayName: string;
};

export type VisualLayerSummary = {
  y: number;
  blockCount: number;
  uniqueBlockCount: number;
  topBlocks: VisualLayerBlockSummary[];
};

export type VisualMaterialCostItem = {
  blockId: string;
  displayName: string;
  count: number;
  stackCount: number;
  shulkerBoxCount: number;
  color: string;
  materialKind: VisualBlockMaterialKind;
  texturePath: string;
};

export type VisualMaterialCostSummary = {
  totalBlocks: number;
  uniqueBlocks: number;
  estimatedStacks: number;
  estimatedShulkerBoxes: number;
  items: VisualMaterialCostItem[];
};

export type VisualVersionCompatibilityLevel =
  | "unknown"
  | "compatible"
  | "warning"
  | "incompatible";

export type VisualVersionCompatibilitySummary = {
  level: VisualVersionCompatibilityLevel;
  targetVersion: string;
  message: string;
  warnings: string[];
  requiredMods: string[];
};

export type VisualHighlightCandidate = {
  blockId: string;
  count: number;
  color: string;
  displayName: string;
};

export type VisualSchematicSummary = {
  id: string;
  name: string;
  category: string;
  theme: string;
  targetMinecraftVersion: string;
  size: VisualSchematicSize;
  blockCount: number;
  tags: string[];
  requiredMods: string[];
  createdAt: string | null;
  status: VisualSchematicStatus;
  statusMessage: string;
  thumbnail: VisualSchematicThumbnail;
  validationSummary: VisualValidationSummary;
};

export type VisualSchematicDetail = VisualSchematicSummary & {
  palette: VisualBlockSummary[];
  validationMessages: string[];
  viewer: VisualSchematicViewer;
  layerSummary: VisualLayerSummary[];
  materialCostSummary: VisualMaterialCostSummary;
  versionCompatibility: VisualVersionCompatibilitySummary;
  highlightCandidates: VisualHighlightCandidate[];
};

export type VisualSchematicLibrarySort =
  | "created-desc"
  | "created-asc"
  | "name-asc"
  | "name-desc"
  | "blocks-desc"
  | "blocks-asc"
  | "size-desc"
  | "size-asc";

export type VisualSchematicLibraryFilters = {
  q: string;
  status: string;
  category: string;
  theme: string;
  version: string;
  tag: string;
  sort: VisualSchematicLibrarySort;
};

export type VisualSchematicFacetOption = {
  value: string;
  label: string;
  count: number;
};

export type VisualSchematicLibraryFacets = {
  statuses: VisualSchematicFacetOption[];
  categories: VisualSchematicFacetOption[];
  themes: VisualSchematicFacetOption[];
  versions: VisualSchematicFacetOption[];
  tags: VisualSchematicFacetOption[];
};

export type VisualSchematicLibraryStats = {
  totalSchematics: number;
  filteredSchematics: number;
  totalBlocks: number;
  filteredBlocks: number;
  okCount: number;
  issueCount: number;
  averageBlockCount: number;
  largestSchematic: VisualSchematicSummary | null;
};
