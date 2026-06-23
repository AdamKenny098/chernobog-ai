import fs from "node:fs/promises";
import path from "node:path";

import {
  VaultBrainChunk,
  VaultBrainDiagnostics,
  VaultBrainDocument,
  VaultBrainIndex,
} from "./types";

export function getVaultRoot() {
  const configuredPath =
    process.env.CHERNOBOG_VAULT_PATH ?? process.env.OBSIDIAN_VAULT_PATH;

  if (configuredPath) {
    return path.isAbsolute(configuredPath)
      ? configuredPath
      : path.join(process.cwd(), configuredPath);
  }

  return path.join(process.cwd(), "vault", "chernobog");
}

export function getVaultBrainRoot() {
  return path.join(getVaultRoot(), "system", "vault-brain");
}

export function getVaultBrainIndexPath() {
  return path.join(getVaultBrainRoot(), "index.json");
}

export function getVaultBrainDocumentsPath() {
  return path.join(getVaultBrainRoot(), "documents.json");
}

export function getVaultBrainChunksPath() {
  return path.join(getVaultBrainRoot(), "chunks.json");
}

export function getVaultBrainDiagnosticsPath() {
  return path.join(getVaultBrainRoot(), "diagnostics.json");
}

export function relativeToVault(absolutePath: string) {
  return path.relative(getVaultRoot(), absolutePath).replace(/\\/g, "/");
}

export function absoluteFromVault(relativePath: string) {
  return path.join(getVaultRoot(), relativePath);
}

async function pathExists(absolutePath: string) {
  try {
    await fs.access(absolutePath);
    return true;
  } catch {
    return false;
  }
}

async function readJsonIfExists<T>(absolutePath: string, fallback: T): Promise<T> {
  if (!(await pathExists(absolutePath))) {
    return fallback;
  }

  try {
    const raw = await fs.readFile(absolutePath, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function writeVaultBrainStore(params: {
  index: VaultBrainIndex;
  documents: VaultBrainDocument[];
  chunks: VaultBrainChunk[];
  diagnostics: VaultBrainDiagnostics;
}) {
  const root = getVaultBrainRoot();

  await fs.mkdir(root, { recursive: true });

  await fs.writeFile(
    getVaultBrainIndexPath(),
    JSON.stringify(params.index, null, 2),
    "utf8"
  );

  await fs.writeFile(
    getVaultBrainDocumentsPath(),
    JSON.stringify(params.documents, null, 2),
    "utf8"
  );

  await fs.writeFile(
    getVaultBrainChunksPath(),
    JSON.stringify(params.chunks, null, 2),
    "utf8"
  );

  await fs.writeFile(
    getVaultBrainDiagnosticsPath(),
    JSON.stringify(params.diagnostics, null, 2),
    "utf8"
  );

  return {
    indexPath: relativeToVault(getVaultBrainIndexPath()),
    documentsPath: relativeToVault(getVaultBrainDocumentsPath()),
    chunksPath: relativeToVault(getVaultBrainChunksPath()),
    diagnosticsPath: relativeToVault(getVaultBrainDiagnosticsPath()),
  };
}

export async function readVaultBrainIndex() {
  return readJsonIfExists<VaultBrainIndex | null>(getVaultBrainIndexPath(), null);
}

export async function readVaultBrainDocuments() {
  return readJsonIfExists<VaultBrainDocument[]>(getVaultBrainDocumentsPath(), []);
}

export async function readVaultBrainChunks() {
  return readJsonIfExists<VaultBrainChunk[]>(getVaultBrainChunksPath(), []);
}

export async function readVaultBrainDiagnostics() {
  return readJsonIfExists<VaultBrainDiagnostics | null>(
    getVaultBrainDiagnosticsPath(),
    null
  );
}

export async function getVaultBrainStatus() {
  const index = await readVaultBrainIndex();
  const documents = await readVaultBrainDocuments();
  const chunks = await readVaultBrainChunks();
  const diagnostics = await readVaultBrainDiagnostics();

  return {
    exists: Boolean(index),
    index,
    diagnostics,
    documentCount: documents.length,
    chunkCount: chunks.length,
    paths: {
      root: relativeToVault(getVaultBrainRoot()),
      indexPath: relativeToVault(getVaultBrainIndexPath()),
      documentsPath: relativeToVault(getVaultBrainDocumentsPath()),
      chunksPath: relativeToVault(getVaultBrainChunksPath()),
      diagnosticsPath: relativeToVault(getVaultBrainDiagnosticsPath()),
    },
  };
}
