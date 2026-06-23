import fs from "node:fs/promises";
import path from "node:path";

import {
  absoluteFromVault,
  getVaultBrainStatus,
  getVaultRoot,
  readVaultBrainDocuments,
  relativeToVault,
} from "./store";
import {
  detectVaultBrainDocumentType,
  getIndexableVaultFiles,
  hashVaultBrainContent,
  shouldExcludeVaultBrainPath,
} from "./indexer";
import {
  normalizeText,
  trimSnippet,
} from "./text";
import {
  VaultBrainStaleFile,
} from "./types";

async function readFileHash(absolutePath: string) {
  try {
    const raw = await fs.readFile(absolutePath, "utf8");
    return hashVaultBrainContent(normalizeText(raw));
  } catch {
    return null;
  }
}

export async function findStaleVaultBrainFiles(): Promise<VaultBrainStaleFile[]> {
  const documents = await readVaultBrainDocuments();
  const indexedByPath = new Map(documents.map((document) => [document.relativePath, document]));

  const files = await getIndexableVaultFiles();
  const currentRelativePaths = new Set(files.map((file) => relativeToVault(file)));
  const stale: VaultBrainStaleFile[] = [];

  for (const absolutePath of files) {
    const relativePath = relativeToVault(absolutePath);
    const indexed = indexedByPath.get(relativePath);

    if (!indexed) {
      stale.push({
        relativePath,
        reason: "new",
      });
      continue;
    }

    const currentHash = await readFileHash(absolutePath);

    if (currentHash && currentHash !== indexed.hash) {
      stale.push({
        relativePath,
        reason: "modified",
        indexedHash: indexed.hash,
        currentHash,
      });
    }
  }

  for (const indexed of documents) {
    if (!currentRelativePaths.has(indexed.relativePath)) {
      stale.push({
        relativePath: indexed.relativePath,
        reason: "deleted",
        indexedHash: indexed.hash,
      });
    }
  }

  return stale;
}

export async function formatVaultBrainDiagnostics() {
  const status = await getVaultBrainStatus();
  const stale = await findStaleVaultBrainFiles();

  return [
    "Vault Brain Diagnostics",
    "",
    `Index exists: ${status.exists ? "yes" : "no"}`,
    `Documents: ${status.documentCount}`,
    `Chunks: ${status.chunkCount}`,
    status.index ? `Indexed at: ${status.index.indexedAt}` : "Indexed at: never",
    "",
    "Paths:",
    `- Root: ${status.paths.root}`,
    `- Index: ${status.paths.indexPath}`,
    `- Documents: ${status.paths.documentsPath}`,
    `- Chunks: ${status.paths.chunksPath}`,
    `- Diagnostics: ${status.paths.diagnosticsPath}`,
    "",
    "Stale files:",
    stale.length
      ? stale.slice(0, 25).map((item) => `- ${item.relativePath}: ${item.reason}`).join("\n")
      : "- None",
    "",
    status.diagnostics?.skipped.length
      ? [
          "Skipped files:",
          ...status.diagnostics.skipped.slice(0, 25).map((item) => `- ${item.path}: ${item.reason}`),
        ].join("\n")
      : "Skipped files:\n- None",
  ].join("\n");
}

export async function inspectVaultSource(relativePath: string) {
  const cleaned = relativePath.trim().replace(/^["']|["']$/g, "");
  const safe = cleaned.replace(/\\/g, "/");

  if (safe.includes("..")) {
    return null;
  }

  if (shouldExcludeVaultBrainPath(safe)) {
    return null;
  }

  const absolutePath = absoluteFromVault(safe);
  const type = detectVaultBrainDocumentType(absolutePath);

  if (!type) {
    return null;
  }

  try {
    const raw = await fs.readFile(absolutePath, "utf8");
    const stat = await fs.stat(absolutePath);

    return {
      relativePath: safe,
      sizeBytes: stat.size,
      modifiedAt: stat.mtime.toISOString(),
      snippet: trimSnippet(raw, 1600),
    };
  } catch {
    return null;
  }
}

export async function formatStaleVaultBrainFiles() {
  const stale = await findStaleVaultBrainFiles();

  if (stale.length === 0) {
    return [
      "Stale Vault Brain Files",
      "",
      "No stale files found.",
      "",
      "The vault brain index appears current.",
    ].join("\n");
  }

  return [
    "Stale Vault Brain Files",
    "",
    `Count: ${stale.length}`,
    "",
    ...stale.slice(0, 50).map((item) => `- ${item.relativePath}: ${item.reason}`),
    "",
    "Run:",
    "refresh vault brain",
  ].join("\n");
}
