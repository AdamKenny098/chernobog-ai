import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import {
  createSavedContentItemFromTikTokUrl,
  getVaultRoot,
  relativeToVault,
  upsertSavedContentItems,
} from "@/lib/modules/saved-content";

import { TikTokArchiveImportResult, TikTokImportSummary } from "./types";

const TIKTOK_URL_REGEX =
  /https?:\/\/(?:www\.)?(?:tiktok\.com|vm\.tiktok\.com|vt\.tiktok\.com)\/[^\s"'<>\\]+/gi;

function slugTimestamp() {
  return new Date()
    .toISOString()
    .replace(/[:.]/g, "-")
    .replace("T", "_")
    .replace("Z", "");
}

function hashPath(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex").slice(0, 10);
}

function getTikTokInboxRoot() {
  return path.join(getVaultRoot(), "inbox", "tiktok");
}

function getLatestSummaryPath() {
  return path.join(getTikTokInboxRoot(), "_latest-import.json");
}

async function listFilesRecursive(inputPath: string): Promise<string[]> {
  const stat = await fs.stat(inputPath);

  if (stat.isFile()) {
    return [inputPath];
  }

  const entries = await fs.readdir(inputPath, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const childPath = path.join(inputPath, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await listFilesRecursive(childPath)));
    } else if (entry.isFile()) {
      files.push(childPath);
    }
  }

  return files;
}

function extractUrlsFromText(text: string) {
  const matches = text.match(TIKTOK_URL_REGEX) ?? [];

  return matches.map((url) => url.replace(/[),.;\]]+$/g, ""));
}

function unique(values: string[]) {
  return Array.from(new Set(values));
}

export async function importTikTokArchive(
  archivePath: string
): Promise<TikTokArchiveImportResult> {
  const absolutePath = path.isAbsolute(archivePath)
    ? archivePath
    : path.join(process.cwd(), archivePath);

  const importedAt = new Date().toISOString();
  const importId = `${slugTimestamp()}_${hashPath(absolutePath)}`;
  const importFolder = path.join(getTikTokInboxRoot(), importId);

  await fs.mkdir(importFolder, { recursive: true });

  const files = await listFilesRecursive(absolutePath);
  const textParts: string[] = [];

  for (const file of files) {
    const lower = file.toLowerCase();

    if (
      lower.endsWith(".json") ||
      lower.endsWith(".txt") ||
      lower.endsWith(".csv") ||
      lower.endsWith(".html")
    ) {
      try {
        textParts.push(await fs.readFile(file, "utf8"));
      } catch {
        // Ignore unreadable files.
      }
    }
  }

  const urls = unique(extractUrlsFromText(textParts.join("\n")));

  const items = urls.map((url) =>
    createSavedContentItemFromTikTokUrl({
      url,
      title: "Saved TikTok",
      sourceType: "favorites",
      importedAt,
    })
  );

  const savedContent = await upsertSavedContentItems(items);

  const parsedJsonPath = path.join(importFolder, "parsed-saved-content.json");
  const summaryPath = path.join(importFolder, "summary.candidate.md");

  const parsedPayload = {
    version: 1,
    importedAt,
    archivePath: absolutePath,
    urls,
    items,
  };

  await fs.writeFile(parsedJsonPath, JSON.stringify(parsedPayload, null, 2), "utf8");

  const summaryMarkdown = [
    "---",
    "source: tiktok",
    "memory_status: candidate",
    "memory_type: media-reference",
    `imported_at: ${importedAt}`,
    `urls_found: ${urls.length}`,
    "---",
    "",
    `# TikTok Archive Import — ${importId}`,
    "",
    `Archive path: ${absolutePath}`,
    `URLs found: ${urls.length}`,
    "",
    "## URLs",
    "",
    urls.length ? urls.map((url) => `- ${url}`).join("\n") : "_No TikTok URLs found._",
    "",
  ].join("\n");

  await fs.writeFile(summaryPath, summaryMarkdown, "utf8");

  const latestSummary: TikTokImportSummary = {
    importId,
    importedAt,
    archivePath: absolutePath,
    urlsFound: urls.length,
    summaryPath: relativeToVault(summaryPath),
    parsedJsonPath: relativeToVault(parsedJsonPath),
  };

  await fs.writeFile(
    getLatestSummaryPath(),
    JSON.stringify(latestSummary, null, 2),
    "utf8"
  );

  return {
    ok: true,
    importId,
    importedAt,
    archivePath: absolutePath,
    urlsFound: urls.length,
    summaryPath: relativeToVault(summaryPath),
    parsedJsonPath: relativeToVault(parsedJsonPath),
    savedContent,
  };
}

export async function getLatestTikTokImportSummary() {
  try {
    const raw = await fs.readFile(getLatestSummaryPath(), "utf8");
    return JSON.parse(raw) as TikTokImportSummary;
  } catch {
    return null;
  }
}
