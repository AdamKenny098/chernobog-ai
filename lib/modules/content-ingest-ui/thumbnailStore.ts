import fs from "node:fs/promises";
import path from "node:path";

import {
  SavedContentThumbnailRecord,
  SavedContentThumbnailStore,
} from "./types";

function getVaultRoot() {
  const configuredPath =
    process.env.CHERNOBOG_VAULT_PATH ?? process.env.OBSIDIAN_VAULT_PATH;

  if (configuredPath) {
    return path.isAbsolute(configuredPath)
      ? configuredPath
      : path.join(process.cwd(), configuredPath);
  }

  return path.join(process.cwd(), "vault", "chernobog");
}

export function getThumbnailStorePath() {
  return path.join(
    getVaultRoot(),
    "content-ingest",
    "thumbnails",
    "thumbnails.json"
  );
}

async function readJsonIfExists<T>(absolutePath: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(absolutePath, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function readThumbnailStore(): Promise<SavedContentThumbnailStore> {
  return readJsonIfExists<SavedContentThumbnailStore>(getThumbnailStorePath(), {
    version: 1,
    updatedAt: new Date().toISOString(),
    thumbnails: {},
  });
}

export async function writeThumbnailStore(store: SavedContentThumbnailStore) {
  const storePath = getThumbnailStorePath();

  await fs.mkdir(path.dirname(storePath), {
    recursive: true,
  });

  await fs.writeFile(
    storePath,
    JSON.stringify(
      {
        version: 1,
        updatedAt: new Date().toISOString(),
        thumbnails: store.thumbnails,
      },
      null,
      2
    ),
    "utf8"
  );
}

export async function upsertThumbnailRecords(records: SavedContentThumbnailRecord[]) {
  const store = await readThumbnailStore();

  for (const record of records) {
    store.thumbnails[record.itemId] = record;
  }

  await writeThumbnailStore(store);

  return {
    updated: records.length,
    total: Object.keys(store.thumbnails).length,
  };
}
