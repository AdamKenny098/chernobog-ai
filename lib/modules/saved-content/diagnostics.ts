import fs from "node:fs/promises";
import path from "node:path";

import {
  getQueueRoot,
  getSavedContentItemsVaultPath,
  getSavedContentQueueSummary,
  readSavedContentStore,
} from "./store";

async function pathExists(absolutePath: string) {
  try {
    await fs.access(absolutePath);
    return true;
  } catch {
    return false;
  }
}

function boolLabel(value: boolean) {
  return value ? "present" : "missing";
}

function getRelativeProjectPath(absolutePath: string) {
  return path.relative(process.cwd(), absolutePath).replace(/\\/g, "/");
}

async function getYouTubeOAuthTokenStatus() {
  const tokenPath = path.join(
    process.cwd(),
    "data",
    "secrets",
    "youtube-oauth.local.json"
  );

  return {
    tokenPath: getRelativeProjectPath(tokenPath),
    tokenFileExists: await pathExists(tokenPath),
  };
}

async function getLatestTikTokImportStatus() {
  const latestPath = path.join(
    process.cwd(),
    "vault",
    "chernobog",
    "inbox",
    "tiktok",
    "_latest-import.json"
  );

  const configuredVaultPath =
    process.env.CHERNOBOG_VAULT_PATH ?? process.env.OBSIDIAN_VAULT_PATH;

  const resolvedLatestPath = configuredVaultPath
    ? path.join(
        path.isAbsolute(configuredVaultPath)
          ? configuredVaultPath
          : path.join(process.cwd(), configuredVaultPath),
        "inbox",
        "tiktok",
        "_latest-import.json"
      )
    : latestPath;

  if (!(await pathExists(resolvedLatestPath))) {
    return {
      exists: false,
      latestPath: getRelativeProjectPath(resolvedLatestPath),
      importedAt: null as string | null,
      urlsFound: null as number | null,
    };
  }

  try {
    const raw = await fs.readFile(resolvedLatestPath, "utf8");
    const parsed = JSON.parse(raw) as {
      importedAt?: string;
      urlsFound?: number;
    };

    return {
      exists: true,
      latestPath: getRelativeProjectPath(resolvedLatestPath),
      importedAt: parsed.importedAt ?? null,
      urlsFound:
        typeof parsed.urlsFound === "number" ? parsed.urlsFound : null,
    };
  } catch {
    return {
      exists: true,
      latestPath: getRelativeProjectPath(resolvedLatestPath),
      importedAt: null,
      urlsFound: null,
    };
  }
}

export async function getSavedContentDiagnostics() {
  const queueRoot = getQueueRoot();
  const transcriptRoot = path.join(queueRoot, "transcripts");
  const chunksRoot = path.join(queueRoot, "chunks");
  const analysisRoot = path.join(queueRoot, "analysis");
  const candidatesRoot = path.join(queueRoot, "candidates");

  const store = await readSavedContentStore();
  const summary = await getSavedContentQueueSummary();
  const oauth = await getYouTubeOAuthTokenStatus();
  const latestTikTokImport = await getLatestTikTokImportStatus();

  const activeCount =
    summary.byQueueStatus.unprocessed +
    summary.byQueueStatus["watch-next"] +
    summary.byQueueStatus["analyze-next"] +
    summary.byQueueStatus.processing;

  const closedCount =
    summary.byQueueStatus.watched +
    summary.byQueueStatus.analyzed +
    summary.byQueueStatus.archived +
    summary.byQueueStatus.dismissed;

  const env = {
    youtubeApiKey: Boolean(process.env.YOUTUBE_API_KEY),
    youtubeOAuthClientId: Boolean(process.env.YOUTUBE_OAUTH_CLIENT_ID),
    youtubeOAuthClientSecret: Boolean(process.env.YOUTUBE_OAUTH_CLIENT_SECRET),
    youtubeOAuthRedirectUri: Boolean(process.env.YOUTUBE_OAUTH_REDIRECT_URI),
    vaultPath: process.env.CHERNOBOG_VAULT_PATH ?? process.env.OBSIDIAN_VAULT_PATH,
  };

  const paths = {
    queueFile: getSavedContentItemsVaultPath(),
    queueRoot: getRelativeProjectPath(queueRoot),
    transcriptRoot: getRelativeProjectPath(transcriptRoot),
    chunksRoot: getRelativeProjectPath(chunksRoot),
    analysisRoot: getRelativeProjectPath(analysisRoot),
    candidatesRoot: getRelativeProjectPath(candidatesRoot),
  };

  const pathStatus = {
    queueRootExists: await pathExists(queueRoot),
    transcriptRootExists: await pathExists(transcriptRoot),
    chunksRootExists: await pathExists(chunksRoot),
    analysisRootExists: await pathExists(analysisRoot),
    candidatesRootExists: await pathExists(candidatesRoot),
  };

  const warnings: string[] = [];

  if (!env.youtubeApiKey) {
    warnings.push("YOUTUBE_API_KEY is missing. Public YouTube playlist ingest may fail.");
  }

  if (
    !env.youtubeOAuthClientId ||
    !env.youtubeOAuthClientSecret ||
    !env.youtubeOAuthRedirectUri
  ) {
    warnings.push(
      "YouTube OAuth is not fully configured. Watch Later import will not work yet."
    );
  }

  if (!oauth.tokenFileExists) {
    warnings.push("YouTube OAuth token file is missing. The account is not connected yet.");
  }

  if (summary.byTranscriptStatus.available === 0 && summary.total > 0) {
    warnings.push(
      "No available transcripts are currently stored. Analysis may fall back to metadata."
    );
  }

  if (summary.byPlatform.tiktok === 0) {
    warnings.push("No TikTok saved content items are currently in the queue.");
  }

  return {
    ok: true,
    generatedAt: new Date().toISOString(),
    totalItems: store.items.length,
    activeCount,
    closedCount,
    summary,
    env,
    oauth,
    latestTikTokImport,
    paths,
    pathStatus,
    warnings,
  };
}

export function formatSavedContentDiagnostics(
  diagnostics: Awaited<ReturnType<typeof getSavedContentDiagnostics>>
) {
  const warningLines =
    diagnostics.warnings.length > 0
      ? diagnostics.warnings.map((warning) => `- ${warning}`).join("\n")
      : "- None";

  return [
    "Saved Content Diagnostics",
    "",
    `Generated at: ${diagnostics.generatedAt}`,
    "",
    "Queue:",
    `- Queue file: ${diagnostics.paths.queueFile}`,
    `- Total items: ${diagnostics.totalItems}`,
    `- Active items: ${diagnostics.activeCount}`,
    `- Closed items: ${diagnostics.closedCount}`,
    "",
    "Queue status:",
    `- Unprocessed: ${diagnostics.summary.byQueueStatus.unprocessed}`,
    `- Watch next: ${diagnostics.summary.byQueueStatus["watch-next"]}`,
    `- Analyze next: ${diagnostics.summary.byQueueStatus["analyze-next"]}`,
    `- Processing: ${diagnostics.summary.byQueueStatus.processing}`,
    `- Watched: ${diagnostics.summary.byQueueStatus.watched}`,
    `- Analyzed: ${diagnostics.summary.byQueueStatus.analyzed}`,
    `- Archived: ${diagnostics.summary.byQueueStatus.archived}`,
    `- Dismissed: ${diagnostics.summary.byQueueStatus.dismissed}`,
    "",
    "Transcript status:",
    `- Not started: ${diagnostics.summary.byTranscriptStatus["not-started"]}`,
    `- Queued: ${diagnostics.summary.byTranscriptStatus.queued}`,
    `- Available: ${diagnostics.summary.byTranscriptStatus.available}`,
    `- Unavailable: ${diagnostics.summary.byTranscriptStatus.unavailable}`,
    `- Failed: ${diagnostics.summary.byTranscriptStatus.failed}`,
    "",
    "Source breakdown:",
    `- YouTube: ${diagnostics.summary.byPlatform.youtube}`,
    `- TikTok: ${diagnostics.summary.byPlatform.tiktok}`,
    "",
    "Environment:",
    `- YOUTUBE_API_KEY: ${boolLabel(diagnostics.env.youtubeApiKey)}`,
    `- YOUTUBE_OAUTH_CLIENT_ID: ${boolLabel(
      diagnostics.env.youtubeOAuthClientId
    )}`,
    `- YOUTUBE_OAUTH_CLIENT_SECRET: ${boolLabel(
      diagnostics.env.youtubeOAuthClientSecret
    )}`,
    `- YOUTUBE_OAUTH_REDIRECT_URI: ${boolLabel(
      diagnostics.env.youtubeOAuthRedirectUri
    )}`,
    `- Vault path: ${diagnostics.env.vaultPath ?? "default vault/chernobog"}`,
    "",
    "OAuth:",
    `- Token file: ${diagnostics.oauth.tokenFileExists ? "present" : "missing"}`,
    `- Token path: ${diagnostics.oauth.tokenPath}`,
    "",
    "TikTok:",
    `- Latest import: ${diagnostics.latestTikTokImport.exists ? "present" : "missing"}`,
    `- Latest import path: ${diagnostics.latestTikTokImport.latestPath}`,
    `- Latest import date: ${diagnostics.latestTikTokImport.importedAt ?? "unknown"}`,
    `- Latest import URLs found: ${
      diagnostics.latestTikTokImport.urlsFound ?? "unknown"
    }`,
    "",
    "Folders:",
    `- Queue root: ${diagnostics.pathStatus.queueRootExists ? "present" : "missing"} (${diagnostics.paths.queueRoot})`,
    `- Transcripts: ${diagnostics.pathStatus.transcriptRootExists ? "present" : "missing"} (${diagnostics.paths.transcriptRoot})`,
    `- Chunks: ${diagnostics.pathStatus.chunksRootExists ? "present" : "missing"} (${diagnostics.paths.chunksRoot})`,
    `- Analysis: ${diagnostics.pathStatus.analysisRootExists ? "present" : "missing"} (${diagnostics.paths.analysisRoot})`,
    `- Candidates: ${diagnostics.pathStatus.candidatesRootExists ? "present" : "missing"} (${diagnostics.paths.candidatesRoot})`,
    "",
    "Warnings:",
    warningLines,
  ].join("\n");
}