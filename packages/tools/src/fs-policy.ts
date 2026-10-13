import os from "node:os";
import path from "node:path";

export const READABLE_TEXT_EXTENSIONS = new Set([
  ".txt",
  ".md",
  ".json",
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".cs",
  ".py",
  ".html",
  ".css",
  ".xml",
  ".yml",
  ".yaml",
  ".csv",
  ".log",
]);

export const EXCLUDED_DIRECTORY_NAMES = new Set([
  "node_modules",
  ".git",
  ".next",
  "dist",
  "build",
  "bin",
  "obj",
  "coverage",
  ".turbo",
  ".cache",
  ".idea",
  ".vs",
  "vendor",
  "packages",
  "library",
  "temp",
  "packagecache",
]);

export function getAllowedRoots(): string[] {
  const home = os.homedir();

  return [
    path.join(home, "Desktop"),
    path.join(home, "Documents"),
    path.join(home, "Downloads"),
    process.cwd(),
  ].map((root) => path.resolve(root));
}

export function getDefaultSearchRoot(): string {
  return path.resolve(path.join(os.homedir(), "Documents"));
}

export function isPathWithin(parent: string, child: string): boolean {
  const relative = path.relative(parent, child);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

export function ensureAllowedPath(targetPath: string): string {
  const resolved = path.resolve(targetPath);
  const allowedRoots = getAllowedRoots();

  const allowed = allowedRoots.some((root) => isPathWithin(root, resolved));
  if (!allowed) {
    throw new Error("Path is outside allowed roots");
  }

  return resolved;
}

export function resolveSearchRoot(rawRoot?: string): string {
  if (!rawRoot || !rawRoot.trim()) {
    return getDefaultSearchRoot();
  }

  return ensureAllowedPath(rawRoot);
}

export function getNormalizedExtension(fileName: string): string {
  const lowerName = fileName.toLowerCase();

  if (lowerName.startsWith(".") && !lowerName.slice(1).includes(".")) {
    return "";
  }

  return path.extname(lowerName);
}

export function isReadableTextFileName(fileName: string): boolean {
  const ext = getNormalizedExtension(fileName);
  return READABLE_TEXT_EXTENSIONS.has(ext);
}

export function isReadableTextPath(filePath: string): boolean {
  const ext = getNormalizedExtension(filePath);
  return READABLE_TEXT_EXTENSIONS.has(ext);
}

export function shouldSkipDirectory(dirName: string): boolean {
  if (!dirName) return false;
  if (dirName.startsWith(".")) return true;
  return EXCLUDED_DIRECTORY_NAMES.has(dirName.toLowerCase());
}