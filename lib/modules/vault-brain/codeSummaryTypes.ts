export const CODE_SUMMARY_SUPPORTED_EXTENSIONS = [
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
] as const;

export type CodeSummarySupportedExtension = (typeof CODE_SUMMARY_SUPPORTED_EXTENSIONS)[number];

export const CODE_SUMMARY_DEFAULT_EXCLUDED_DIRS = [
  ".git",
  ".next",
  ".turbo",
  "coverage",
  "dist",
  "build",
  "out",
  "node_modules",
  "vault",
  "imports",
] as const;

export const CODE_SUMMARY_FILE_KINDS = [
  "api-route",
  "app-route",
  "react-component",
  "module",
  "script",
  "config",
  "test",
  "source-file",
] as const;

export type CodeSummaryFileKind = (typeof CODE_SUMMARY_FILE_KINDS)[number];

export type CodeSummaryScanOptions = {
  rootDir?: string;
  includePaths?: string[];
  excludeDirs?: string[];
  maxFiles?: number;
  maxFileSizeBytes?: number;
};

export type CodeSummaryMemoryOptions = CodeSummaryScanOptions & {
  projectId?: string;
  version?: string;
  tags?: string[];
  actor?: string;
};

export type CodeSummaryFileCandidate = {
  absolutePath: string;
  relativePath: string;
  extension: CodeSummarySupportedExtension;
  kind: CodeSummaryFileKind;
  sizeBytes: number;
  modifiedAt: string;
};

export type CodeSummaryAnalysis = {
  file: CodeSummaryFileCandidate;
  id: string;
  title: string;
  body: string;
  imports: string[];
  exports: string[];
  functions: string[];
  components: string[];
  routeMethods: string[];
  tags: string[];
  confidence: number;
};

export type CodeSummaryMemoryWriteResult = {
  scannedFiles: number;
  created: number;
  updated: number;
  skipped: number;
  skippedApproved: number;
  skippedReviewed: number;
  skippedOtherStatuses: number;
  entries: string[];
  warnings: string[];
};

export type CodeSummaryMemoryStatus = {
  supportedExtensions: readonly CodeSummarySupportedExtension[];
  defaultExcludedDirs: readonly string[];
  codeSummaryCounts: Record<string, number>;
  totalCodeSummaryEntries: number;
};
