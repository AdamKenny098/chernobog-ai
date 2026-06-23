export type VaultBrainDocumentType = "markdown" | "text";

export type VaultBrainDocument = {
  id: string;
  relativePath: string;
  title: string;
  type: VaultBrainDocumentType;
  hash: string;
  sizeBytes: number;
  indexedAt: string;
  modifiedAt: string;
  chunkCount: number;
};

export type VaultBrainChunk = {
  id: string;
  documentId: string;
  relativePath: string;
  title: string;
  chunkIndex: number;
  text: string;
  charStart: number;
  charEnd: number;
  keywords: string[];
  indexedAt: string;
};

export type VaultBrainIndex = {
  version: 1;
  indexedAt: string;
  vaultRoot: string;
  documentCount: number;
  chunkCount: number;
  documents: VaultBrainDocument[];
};

export type VaultBrainDiagnostics = {
  version: 1;
  generatedAt: string;
  vaultRoot: string;
  indexedAt: string;
  documentCount: number;
  chunkCount: number;
  skipped: {
    path: string;
    reason: string;
  }[];
};

export type VaultBrainSearchResult = {
  chunk: VaultBrainChunk;
  document?: VaultBrainDocument;
  score: number;
  matchedTerms: string[];
};

export type VaultBrainAnswer = {
  question: string;
  confidence: "none" | "low" | "medium" | "high";
  answer: string;
  sources: VaultBrainSearchResult[];
  unsupported: boolean;
};

export type VaultBrainCommandResult = {
  ok: boolean;
  title: string;
  message: string;
  data?: unknown;
};

export type VaultBrainBuildResult = {
  index: VaultBrainIndex;
  chunks: VaultBrainChunk[];
  diagnostics: VaultBrainDiagnostics;
  paths: {
    indexPath: string;
    documentsPath: string;
    chunksPath: string;
    diagnosticsPath: string;
  };
};

export type VaultBrainStaleFile = {
  relativePath: string;
  reason: "new" | "modified" | "deleted";
  indexedHash?: string;
  currentHash?: string;
};
