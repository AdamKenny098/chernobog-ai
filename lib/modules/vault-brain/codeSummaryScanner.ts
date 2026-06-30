import path from "node:path";
import { promises as fs } from "node:fs";
import {
  CODE_SUMMARY_DEFAULT_EXCLUDED_DIRS,
  CODE_SUMMARY_SUPPORTED_EXTENSIONS,
  type CodeSummaryAnalysis,
  type CodeSummaryFileCandidate,
  type CodeSummaryFileKind,
  type CodeSummaryScanOptions,
  type CodeSummarySupportedExtension,
} from "./codeSummaryTypes";

const DEFAULT_MAX_FILES = 250;
const DEFAULT_MAX_FILE_SIZE_BYTES = 256 * 1024;

function toPosixPath(value: string): string {
  return value.split(path.sep).join("/");
}

function unique(values: string[]): string[] {
  return Array.from(
    new Set(
      values
        .map((value) => value.trim())
        .filter(Boolean)
    )
  );
}

function normalizeTag(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function isSupportedExtension(extension: string): extension is CodeSummarySupportedExtension {
  return CODE_SUMMARY_SUPPORTED_EXTENSIONS.includes(extension as CodeSummarySupportedExtension);
}

function stableCodeSummaryId(relativePath: string): string {
  const normalized = toPosixPath(relativePath)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);

  return `code-summary-${normalized}`;
}


function isExcludedRelativePath(relativePath: string, excludedDirs: Set<string>): boolean {
  const normalized = toPosixPath(relativePath).replace(/^\.\//, "");
  const firstSegment = normalized.split("/")[0] ?? "";
  return excludedDirs.has(firstSegment) || excludedDirs.has(normalized);
}

function inferFileKind(relativePath: string, extension: string): CodeSummaryFileKind {
  const normalized = toPosixPath(relativePath).toLowerCase();

  if (/^app\/api\/.*\/route\.(ts|js)$/.test(normalized)) {
    return "api-route";
  }

  if (/^app\/.*\/(page|layout|loading|error|not-found)\.(tsx|jsx|ts|js)$/.test(normalized)) {
    return "app-route";
  }

  if (normalized.includes("/__tests__/") || /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(normalized)) {
    return "test";
  }

  if (normalized.startsWith("scripts/")) {
    return "script";
  }

  if (/^(next|eslint|postcss|tailwind|vitest|jest|tsconfig).*\.(ts|js|mjs|cjs|json)$/.test(normalized)) {
    return "config";
  }

  if (normalized.startsWith("lib/modules/")) {
    return "module";
  }

  if (extension === ".tsx" || extension === ".jsx") {
    return "react-component";
  }

  return "source-file";
}

function inferTags(file: CodeSummaryFileCandidate, imports: string[], exports: string[]): string[] {
  const parts = toPosixPath(file.relativePath).split("/");
  const tags = ["code-summary", file.kind, file.extension.replace(/^\./, "")];

  if (parts[0]) {
    tags.push(parts[0]);
  }

  if (parts[0] === "lib" && parts[1] === "modules" && parts[2]) {
    tags.push("module", parts[2]);
  }

  if (parts[0] === "app" && parts[1] === "api") {
    tags.push("api", "next-route");
  }

  if (imports.some((item) => item.includes("react"))) {
    tags.push("react");
  }

  if (exports.length > 0) {
    tags.push("exports");
  }

  return unique(tags.map(normalizeTag).filter(Boolean));
}

function matchAllUnique(source: string, pattern: RegExp, groupIndex = 1): string[] {
  const values: string[] = [];
  for (const match of source.matchAll(pattern)) {
    const value = match[groupIndex];
    if (value) {
      values.push(value.trim());
    }
  }

  return unique(values).slice(0, 40);
}

function extractImports(source: string): string[] {
  const staticImports = matchAllUnique(source, /import\s+(?:type\s+)?(?:[\s\S]*?\s+from\s+)?["']([^"']+)["']/g);
  const dynamicImports = matchAllUnique(source, /import\(["']([^"']+)["']\)/g);
  const requireImports = matchAllUnique(source, /require\(["']([^"']+)["']\)/g);
  return unique([...staticImports, ...dynamicImports, ...requireImports]).slice(0, 40);
}

function extractExports(source: string): string[] {
  const named = matchAllUnique(
    source,
    /export\s+(?:async\s+)?(?:function|const|class|type|interface|enum)\s+([A-Za-z0-9_]+)/g
  );
  const reexports = matchAllUnique(source, /export\s+\{([^}]+)\}/g)
    .flatMap((group) => group.split(","))
    .map((item) => item.replace(/\sas\s.+$/i, "").trim())
    .filter(Boolean);

  const defaults = /export\s+default\s+/g.test(source) ? ["default"] : [];
  return unique([...named, ...reexports, ...defaults]).slice(0, 40);
}

function extractFunctions(source: string): string[] {
  const declarations = matchAllUnique(source, /(?:async\s+)?function\s+([A-Za-z0-9_]+)/g);
  const arrowFunctions = matchAllUnique(
    source,
    /(?:const|let)\s+([A-Za-z0-9_]+)\s*=\s*(?:async\s+)?\([^)]*\)\s*=>/g
  );

  return unique([...declarations, ...arrowFunctions]).slice(0, 40);
}

function extractComponents(source: string, extension: string): string[] {
  if (extension !== ".tsx" && extension !== ".jsx") {
    return [];
  }

  const candidates = unique([
    ...matchAllUnique(source, /function\s+([A-Z][A-Za-z0-9_]*)/g),
    ...matchAllUnique(source, /const\s+([A-Z][A-Za-z0-9_]*)\s*=/g),
  ]);

  return candidates.slice(0, 30);
}

function extractRouteMethods(source: string): string[] {
  const methods = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"];
  return methods.filter((method) => new RegExp(`export\\s+(?:async\\s+)?function\\s+${method}\\b`).test(source));
}

function inferPurpose(file: CodeSummaryFileCandidate, routeMethods: string[]): string {
  const relativePath = toPosixPath(file.relativePath);

  if (file.kind === "api-route") {
    const methods = routeMethods.length > 0 ? routeMethods.join(", ") : "unlisted HTTP handlers";
    return `Next.js API route for ${relativePath}. Detected methods: ${methods}.`;
  }

  if (file.kind === "app-route") {
    return `Next.js app route file for ${relativePath}.`;
  }

  if (file.kind === "module") {
    return `Module source file under ${relativePath.split("/").slice(0, 3).join("/")}.`;
  }

  if (file.kind === "script") {
    return `Repository script located at ${relativePath}.`;
  }

  if (file.kind === "config") {
    return `Project configuration file located at ${relativePath}.`;
  }

  if (file.kind === "test") {
    return `Test/specification file located at ${relativePath}.`;
  }

  if (file.kind === "react-component") {
    return `React-facing source file located at ${relativePath}.`;
  }

  return `Source file located at ${relativePath}.`;
}

function formatList(label: string, values: readonly string[]): string {
  if (values.length === 0) {
    return `${label}: none detected`;
  }

  return `${label}: ${values.slice(0, 20).join(", ")}`;
}

function buildSummaryBody(args: {
  file: CodeSummaryFileCandidate;
  imports: string[];
  exports: string[];
  functions: string[];
  components: string[];
  routeMethods: string[];
}): string {
  const purpose = inferPurpose(args.file, args.routeMethods);

  return [
    `File: ${toPosixPath(args.file.relativePath)}`,
    `Kind: ${args.file.kind}`,
    `Size: ${args.file.sizeBytes} bytes`,
    `Modified: ${args.file.modifiedAt}`,
    "",
    `Purpose: ${purpose}`,
    "",
    formatList("Imports", args.imports),
    formatList("Exports", args.exports),
    formatList("Functions", args.functions),
    formatList("Components", args.components),
    formatList("Route methods", args.routeMethods),
    "",
    "Summary note: This is a deterministic code-summary memory entry. It records file shape, exported symbols, detected functions, and route/component hints without storing raw source as approved vault truth.",
  ].join("\n");
}

async function isDirectory(filePath: string): Promise<boolean> {
  try {
    const stat = await fs.stat(filePath);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

async function collectFilesFromDir(args: {
  rootDir: string;
  dir: string;
  excludedDirs: Set<string>;
  maxFileSizeBytes: number;
  output: CodeSummaryFileCandidate[];
}): Promise<void> {
  const entries = await fs.readdir(args.dir, { withFileTypes: true });

  for (const entry of entries) {
    const absolutePath = path.join(args.dir, entry.name);
    const relativePath = toPosixPath(path.relative(args.rootDir, absolutePath));

    if (entry.isDirectory()) {
      if (args.excludedDirs.has(entry.name) || args.excludedDirs.has(relativePath)) {
        continue;
      }

      await collectFilesFromDir({ ...args, dir: absolutePath });
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    const extension = path.extname(entry.name).toLowerCase();
    if (!isSupportedExtension(extension)) {
      continue;
    }

    const stat = await fs.stat(absolutePath);
    if (stat.size > args.maxFileSizeBytes) {
      continue;
    }

    args.output.push({
      absolutePath,
      relativePath,
      extension,
      kind: inferFileKind(relativePath, extension),
      sizeBytes: stat.size,
      modifiedAt: stat.mtime.toISOString(),
    });
  }
}

export async function scanCodeSummaryFiles(
  options: CodeSummaryScanOptions = {}
): Promise<CodeSummaryFileCandidate[]> {
  const rootDir = path.resolve(options.rootDir ?? process.cwd());
  const includePaths = options.includePaths && options.includePaths.length > 0
    ? options.includePaths
    : ["lib", "app", "scripts", "next.config.ts", "eslint.config.mjs"];
  const excludedDirs = new Set([...(options.excludeDirs ?? CODE_SUMMARY_DEFAULT_EXCLUDED_DIRS)]);
  const maxFileSizeBytes = options.maxFileSizeBytes ?? DEFAULT_MAX_FILE_SIZE_BYTES;
  const maxFiles = options.maxFiles ?? DEFAULT_MAX_FILES;
  const output: CodeSummaryFileCandidate[] = [];

  for (const includePath of includePaths) {
    const absolutePath = path.resolve(rootDir, includePath);
    const relativeIncludePath = toPosixPath(path.relative(rootDir, absolutePath));

    if (isExcludedRelativePath(relativeIncludePath, excludedDirs)) {
      continue;
    }

    try {
      const stat = await fs.stat(absolutePath);
      if (stat.isDirectory()) {
        await collectFilesFromDir({
          rootDir,
          dir: absolutePath,
          excludedDirs,
          maxFileSizeBytes,
          output,
        });
      } else if (stat.isFile()) {
        const extension = path.extname(absolutePath).toLowerCase();
        if (isSupportedExtension(extension) && stat.size <= maxFileSizeBytes) {
          const relativePath = toPosixPath(path.relative(rootDir, absolutePath));
          output.push({
            absolutePath,
            relativePath,
            extension,
            kind: inferFileKind(relativePath, extension),
            sizeBytes: stat.size,
            modifiedAt: stat.mtime.toISOString(),
          });
        }
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
    }
  }

  return output
    .sort((a, b) => a.relativePath.localeCompare(b.relativePath))
    .slice(0, maxFiles);
}

export async function analyzeCodeSummaryFile(
  file: CodeSummaryFileCandidate
): Promise<CodeSummaryAnalysis> {
  const source = await fs.readFile(file.absolutePath, "utf8");
  const imports = extractImports(source);
  const exports = extractExports(source);
  const functions = extractFunctions(source);
  const components = extractComponents(source, file.extension);
  const routeMethods = extractRouteMethods(source);
  const tags = inferTags(file, imports, exports);
  const confidence = Number(
    Math.min(0.85, 0.5 + exports.length * 0.025 + functions.length * 0.015 + routeMethods.length * 0.05).toFixed(4)
  );

  return {
    file,
    id: stableCodeSummaryId(file.relativePath),
    title: `Code Summary — ${toPosixPath(file.relativePath)}`,
    body: buildSummaryBody({ file, imports, exports, functions, components, routeMethods }),
    imports,
    exports,
    functions,
    components,
    routeMethods,
    tags,
    confidence,
  };
}

export async function analyzeCodeSummaryFiles(
  options: CodeSummaryScanOptions = {}
): Promise<CodeSummaryAnalysis[]> {
  const files = await scanCodeSummaryFiles(options);
  const analyses: CodeSummaryAnalysis[] = [];

  for (const file of files) {
    if (!(await isDirectory(file.absolutePath))) {
      analyses.push(await analyzeCodeSummaryFile(file));
    }
  }

  return analyses;
}
