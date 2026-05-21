import fs from "node:fs";
import path from "node:path";
import { getVaultRoot } from "./config";

export function assertVaultExists(root = getVaultRoot()): void {
  if (!fs.existsSync(root)) {
    throw new Error(`Configured Obsidian vault root does not exist: ${root}`);
  }

  const stat = fs.statSync(root);

  if (!stat.isDirectory()) {
    throw new Error(`Configured Obsidian vault root is not a directory: ${root}`);
  }
}

export function assertInsideVault(targetPath: string, root = getVaultRoot()): void {
  const resolvedRoot = path.resolve(root);
  const resolvedTarget = path.resolve(targetPath);
  const relative = path.relative(resolvedRoot, resolvedTarget);

  const outside =
    relative === "" ? false : relative.startsWith("..") || path.isAbsolute(relative);

  if (outside) {
    throw new Error(`Vault access blocked. Path is outside vault root: ${targetPath}`);
  }
}

export function assertMarkdownPath(targetPath: string): void {
  if (path.extname(targetPath).toLowerCase() !== ".md") {
    throw new Error(`Vault note must be a markdown file: ${targetPath}`);
  }
}

export function assertVaultMarkdownPath(targetPath: string): void {
  assertVaultExists();
  assertInsideVault(targetPath);
  assertMarkdownPath(targetPath);
}
