import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import {
  getVaultRoot,
  relativeToVault,
  writeVaultBrainStore,
} from "./store";
import {
  VaultBrainBuildResult,
  VaultBrainChunk,
  VaultBrainDiagnostics,
  VaultBrainDocument,
  VaultBrainDocumentType,
  VaultBrainIndex,
} from "./types";
import {
  extractKeywords,
  normalizeText,
} from "./text";

const MAX_FILE_BYTES = 1_000_000;
const TARGET_CHUNK_CHARS = 1400;
const CHUNK_OVERLAP_CHARS = 180;

const EXCLUDED_DIRS = new Set([
  ".git",
  ".obsidian",
  ".trash",
  "node_modules",
  ".next",
  "system/vault-brain",
]);

function hash(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function documentId(relativePath: string) {
  return `doc:${hash(relativePath).slice(0, 16)}`;
}

function chunkId(docId: string, index: number) {
  return `${docId}:chunk:${index}`;
}

export function detectVaultBrainDocumentType(filePath: string): VaultBrainDocumentType | null {
  const lower = filePath.toLowerCase();

  if (lower.endsWith(".md")) {
    return "markdown";
  }

  if (lower.endsWith(".txt")) {
    return "text";
  }

  return null;
}

export function shouldExcludeVaultBrainPath(relativePath: string) {
  const normalized = relativePath.replace(/\\/g, "/");

  for (const excluded of EXCLUDED_DIRS) {
    if (normalized === excluded || normalized.startsWith(`${excluded}/`)) {
      return true;
    }
  }

  return false;
}

export function hashVaultBrainContent(value: string) {
  return hash(value);
}

async function walkFiles(root: string, current = root): Promise<string[]> {
  const entries = await fs.readdir(current, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const absolutePath = path.join(current, entry.name);
    const relativePath = path.relative(root, absolutePath).replace(/\\/g, "/");

    if (shouldExcludeVaultBrainPath(relativePath)) {
      continue;
    }

    if (entry.isDirectory()) {
      files.push(...(await walkFiles(root, absolutePath)));
      continue;
    }

    if (entry.isFile() && detectVaultBrainDocumentType(absolutePath)) {
      files.push(absolutePath);
    }
  }

  return files;
}

function extractTitle(relativePath: string, content: string) {
  const heading = content.match(/^#\s+(.+)$/m);

  if (heading?.[1]) {
    return heading[1].trim().slice(0, 160);
  }

  return path.basename(relativePath, path.extname(relativePath));
}

function splitIntoChunks(text: string) {
  const chunks: Array<{ text: string; start: number; end: number }> = [];
  let cursor = 0;

  while (cursor < text.length) {
    let end = Math.min(text.length, cursor + TARGET_CHUNK_CHARS);

    if (end < text.length) {
      const paragraphBreak = text.lastIndexOf("\n\n", end);
      const sentenceBreak = text.lastIndexOf(". ", end);

      if (paragraphBreak > cursor + 400) {
        end = paragraphBreak;
      } else if (sentenceBreak > cursor + 400) {
        end = sentenceBreak + 1;
      }
    }

    const chunkText = text.slice(cursor, end).trim();

    if (chunkText.length > 0) {
      chunks.push({
        text: chunkText,
        start: cursor,
        end,
      });
    }

    if (end >= text.length) {
      break;
    }

    cursor = Math.max(0, end - CHUNK_OVERLAP_CHARS);
  }

  return chunks;
}

export async function getIndexableVaultFiles() {
  return walkFiles(getVaultRoot());
}

export async function buildVaultBrainIndex(): Promise<VaultBrainBuildResult> {
  const vaultRoot = getVaultRoot();
  const indexedAt = new Date().toISOString();

  const files = await walkFiles(vaultRoot);
  const documents: VaultBrainDocument[] = [];
  const chunks: VaultBrainChunk[] = [];
  const skipped: VaultBrainDiagnostics["skipped"] = [];

  for (const absolutePath of files) {
    const relativePath = relativeToVault(absolutePath);
    const type = detectVaultBrainDocumentType(absolutePath);

    if (!type) {
      continue;
    }

    const stat = await fs.stat(absolutePath);

    if (stat.size > MAX_FILE_BYTES) {
      skipped.push({
        path: relativePath,
        reason: `file larger than ${MAX_FILE_BYTES} bytes`,
      });
      continue;
    }

    let raw = "";

    try {
      raw = await fs.readFile(absolutePath, "utf8");
    } catch {
      skipped.push({
        path: relativePath,
        reason: "file could not be read as UTF-8",
      });
      continue;
    }

    const content = normalizeText(raw);

    if (content.length < 20) {
      skipped.push({
        path: relativePath,
        reason: "file too small to index",
      });
      continue;
    }

    const docId = documentId(relativePath);
    const title = extractTitle(relativePath, content);
    const fileChunks = splitIntoChunks(content);

    const document: VaultBrainDocument = {
      id: docId,
      relativePath,
      title,
      type,
      hash: hash(content),
      sizeBytes: stat.size,
      indexedAt,
      modifiedAt: stat.mtime.toISOString(),
      chunkCount: fileChunks.length,
    };

    documents.push(document);

    fileChunks.forEach((chunk, index) => {
      chunks.push({
        id: chunkId(docId, index),
        documentId: docId,
        relativePath,
        title,
        chunkIndex: index,
        text: chunk.text,
        charStart: chunk.start,
        charEnd: chunk.end,
        keywords: extractKeywords(chunk.text),
        indexedAt,
      });
    });
  }

  const index: VaultBrainIndex = {
    version: 1,
    indexedAt,
    vaultRoot,
    documentCount: documents.length,
    chunkCount: chunks.length,
    documents,
  };

  const diagnostics: VaultBrainDiagnostics = {
    version: 1,
    generatedAt: new Date().toISOString(),
    vaultRoot,
    indexedAt,
    documentCount: documents.length,
    chunkCount: chunks.length,
    skipped,
  };

  const paths = await writeVaultBrainStore({
    index,
    documents,
    chunks,
    diagnostics,
  });

  return {
    index,
    chunks,
    diagnostics,
    paths,
  };
}
