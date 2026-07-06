export interface SchematicSize {
    width: number;
    height: number;
    length: number;
  }
  
  export type SchematicAssetKind = "json" | "schem" | "none";
  
  export interface SchematicMetadata {
    id: string;
    name: string;
    category: string;
    theme: string;
    targetMinecraftVersion: string;
    requiredMods: string[];
    size: SchematicSize;
    blockCount: number;
    tags: string[];
    generatorSource: string;
    createdAt: string;
    updatedAt: string;
    parentId?: string;
    revision?: number;
    notes?: string;
  }
  
  export interface SchematicLibraryEntry {
    id: string;
    directoryPath: string;
    metadataPath: string;
    assetPath?: string;
    assetKind: SchematicAssetKind;
    metadata: SchematicMetadata;
  }
  
  export interface SchematicLibraryWarning {
    id: string;
    path: string;
    reason: string;
  }
  
  export interface SchematicLibraryListResult {
    entries: SchematicLibraryEntry[];
    warnings: SchematicLibraryWarning[];
  }
  
  export interface SchematicLibrarySearchOptions {
    query?: string;
    category?: string;
    theme?: string;
    targetMinecraftVersion?: string;
    tags?: string[];
    limit?: number;
  }
  
  export interface CreateSchematicAssetInput {
    metadata: SchematicMetadata;
    schematicJson?: unknown;
    schemBytes?: Uint8Array;
    overwrite?: boolean;
  }
  
  export interface DuplicateSchematicAssetInput {
    sourceId: string;
    newId?: string;
    name?: string;
    tags?: string[];
    notes?: string;
  }
  
  export type SchematicLibraryErrorCode =
    | "INVALID_ID"
    | "NOT_FOUND"
    | "DUPLICATE_ID"
    | "MISSING_METADATA"
    | "CORRUPTED_METADATA"
    | "INVALID_METADATA"
    | "WRITE_FAILED"
    | "READ_FAILED";
  
  export class SchematicLibraryError extends Error {
    code: SchematicLibraryErrorCode;
  
    constructor(code: SchematicLibraryErrorCode, message: string) {
      super(message);
      this.name = "SchematicLibraryError";
      this.code = code;
    }
  }