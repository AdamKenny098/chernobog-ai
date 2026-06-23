import fs from "node:fs/promises";
import path from "node:path";

import {
  getQueueRoot,
  getSavedContentItemsVaultPath,
  getSavedContentQueueSummary,
  getVaultRoot,
  readSavedContentStore,
} from "@/lib/modules/saved-content";

async function pathExists(absolutePath: string) {
  try {
    await fs.access(absolutePath);
    return true;
  } catch {
    return false;
  }
}

function relativeToProject(absolutePath: string) {
  return path.relative(process.cwd(), absolutePath).replace(/\\/g, "/");
}

function boolLabel(value: boolean) {
  return value ? "present" : "missing";
}

async function readJsonIfExists<T>(absolutePath: string): Promise<T | null> {
  try {
    const raw = await fs.readFile(absolutePath, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function getLatestImportStatus(filePath: string, countKey: "videosFound" | "urlsFound") {
  const parsed = await readJsonIfExists<Record<string, unknown>>(filePath);

  return {
    exists: Boolean(parsed),
    latestPath: relativeToProject(filePath),
    importedAt: typeof parsed?.importedAt === "string" ? parsed.importedAt : null,
    count: typeof parsed?.[countKey] === "number" ? parsed[countKey] as number : null,
  };
}

export async function getSavedContentDiagnostics() {
  const queueRoot = getQueueRoot();
  const transcriptRoot = path.join(queueRoot, "transcripts");
  const chunksRoot = path.join(queueRoot, "chunks");
  const analysisRoot = path.join(queueRoot, "analysis");
  const candidatesRoot = path.join(queueRoot, "candidates");

  const store = await readSavedContentStore();
  const summary = await getSavedContentQueueSummary();

  const anySummary = summary as {
    byQueueStatus: Record<string, number>;
    byTranscriptStatus?: Record<string, number>;
    byPlatform?: Record<string, number>;
  };

  const activeCount =
    (anySummary.byQueueStatus.unprocessed ?? 0) +
    (anySummary.byQueueStatus["watch-next"] ?? 0) +
    (anySummary.byQueueStatus["analyze-next"] ?? 0) +
    (anySummary.byQueueStatus.processing ?? 0);

  const closedCount =
    (anySummary.byQueueStatus.watched ?? 0) +
    (anySummary.byQueueStatus.analyzed ?? 0) +
    (anySummary.byQueueStatus.archived ?? 0) +
    (anySummary.byQueueStatus.dismissed ?? 0);

  const oauthTokenPath = path.join(process.cwd(), "data", "secrets", "youtube-oauth.local.json");
  const youtubeSavedLatestPath = path.join(getVaultRoot(), "inbox", "youtube-saved", "_latest-import.json");
  const tiktokLatestPath = path.join(getVaultRoot(), "inbox", "tiktok", "_latest-import.json");

  const latestYouTubeSavedImport = await getLatestImportStatus(youtubeSavedLatestPath, "videosFound");
  const latestTikTokImport = await getLatestImportStatus(tiktokLatestPath, "urlsFound");

  const env = {
    youtubeApiKey: Boolean(process.env.YOUTUBE_API_KEY),
    youtubeOAuthClientId: Boolean(process.env.YOUTUBE_OAUTH_CLIENT_ID),
    youtubeOAuthClientSecret: Boolean(process.env.YOUTUBE_OAUTH_CLIENT_SECRET),
    youtubeOAuthRedirectUri: Boolean(process.env.YOUTUBE_OAUTH_REDIRECT_URI),
    vaultPath: process.env.CHERNOBOG_VAULT_PATH ?? process.env.OBSIDIAN_VAULT_PATH,
  };

  const warnings: string[] = [];

  if (!env.youtubeApiKey) {
    warnings.push("YOUTUBE_API_KEY is missing. Public YouTube playlist ingest may fail.");
  }

  if (!env.youtubeOAuthClientId || !env.youtubeOAuthClientSecret || !env.youtubeOAuthRedirectUri) {
    warnings.push("YouTube OAuth is not fully configured. OAuth connection commands will not complete.");
  }

  if (!(await pathExists(oauthTokenPath))) {
    warnings.push("YouTube OAuth token file is missing. The account is not connected locally.");
  }

  if (!latestYouTubeSavedImport.exists) {
    warnings.push("No YouTube saved/archive import has been recorded yet.");
  }

  if (((anySummary.byTranscriptStatus?.available ?? 0) === 0) && store.items.length > 0) {
    warnings.push("No available transcripts are currently stored. Analysis may fall back to metadata.");
  }

  if ((anySummary.byPlatform?.tiktok ?? 0) === 0) {
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
    oauth: {
      tokenPath: relativeToProject(oauthTokenPath),
      tokenFileExists: await pathExists(oauthTokenPath),
    },
    latestYouTubeSavedImport,
    latestTikTokImport,
    paths: {
      queueFile: getSavedContentItemsVaultPath(),
      queueRoot: relativeToProject(queueRoot),
      transcriptRoot: relativeToProject(transcriptRoot),
      chunksRoot: relativeToProject(chunksRoot),
      analysisRoot: relativeToProject(analysisRoot),
      candidatesRoot: relativeToProject(candidatesRoot),
    },
    pathStatus: {
      queueRootExists: await pathExists(queueRoot),
      transcriptRootExists: await pathExists(transcriptRoot),
      chunksRootExists: await pathExists(chunksRoot),
      analysisRootExists: await pathExists(analysisRoot),
      candidatesRootExists: await pathExists(candidatesRoot),
    },
    warnings,
  };
}

export function formatSavedContentDiagnostics(diagnostics: Awaited<ReturnType<typeof getSavedContentDiagnostics>>) {
  const summary = diagnostics.summary as {
    byQueueStatus: Record<string, number>;
    byTranscriptStatus?: Record<string, number>;
    byPlatform?: Record<string, number>;
  };

  const transcript = summary.byTranscriptStatus ?? {};
  const platform = summary.byPlatform ?? {};

  const warnings =
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
    `- Unprocessed: ${summary.byQueueStatus.unprocessed ?? 0}`,
    `- Watch next: ${summary.byQueueStatus["watch-next"] ?? 0}`,
    `- Analyze next: ${summary.byQueueStatus["analyze-next"] ?? 0}`,
    `- Processing: ${summary.byQueueStatus.processing ?? 0}`,
    `- Watched: ${summary.byQueueStatus.watched ?? 0}`,
    `- Analyzed: ${summary.byQueueStatus.analyzed ?? 0}`,
    `- Archived: ${summary.byQueueStatus.archived ?? 0}`,
    `- Dismissed: ${summary.byQueueStatus.dismissed ?? 0}`,
    "",
    "Transcript status:",
    `- Not started: ${transcript["not-started"] ?? 0}`,
    `- Queued: ${transcript.queued ?? 0}`,
    `- Available: ${transcript.available ?? 0}`,
    `- Unavailable: ${transcript.unavailable ?? 0}`,
    `- Failed: ${transcript.failed ?? 0}`,
    "",
    "Source breakdown:",
    `- YouTube: ${platform.youtube ?? 0}`,
    `- TikTok: ${platform.tiktok ?? 0}`,
    "",
    "Environment:",
    `- YOUTUBE_API_KEY: ${boolLabel(diagnostics.env.youtubeApiKey)}`,
    `- YOUTUBE_OAUTH_CLIENT_ID: ${boolLabel(diagnostics.env.youtubeOAuthClientId)}`,
    `- YOUTUBE_OAUTH_CLIENT_SECRET: ${boolLabel(diagnostics.env.youtubeOAuthClientSecret)}`,
    `- YOUTUBE_OAUTH_REDIRECT_URI: ${boolLabel(diagnostics.env.youtubeOAuthRedirectUri)}`,
    `- Vault path: ${diagnostics.env.vaultPath ?? "default vault/chernobog"}`,
    "",
    "OAuth:",
    `- Token file: ${diagnostics.oauth.tokenFileExists ? "present" : "missing"}`,
    `- Token path: ${diagnostics.oauth.tokenPath}`,
    "",
    "Saved source imports:",
    `- Latest YouTube saved import: ${diagnostics.latestYouTubeSavedImport.exists ? "present" : "missing"}`,
    `- Latest YouTube saved date: ${diagnostics.latestYouTubeSavedImport.importedAt ?? "unknown"}`,
    `- Latest YouTube saved videos found: ${diagnostics.latestYouTubeSavedImport.count ?? "unknown"}`,
    `- Latest TikTok import: ${diagnostics.latestTikTokImport.exists ? "present" : "missing"}`,
    `- Latest TikTok import date: ${diagnostics.latestTikTokImport.importedAt ?? "unknown"}`,
    `- Latest TikTok URLs found: ${diagnostics.latestTikTokImport.count ?? "unknown"}`,
    "",
    "Folders:",
    `- Queue root: ${diagnostics.pathStatus.queueRootExists ? "present" : "missing"} (${diagnostics.paths.queueRoot})`,
    `- Transcripts: ${diagnostics.pathStatus.transcriptRootExists ? "present" : "missing"} (${diagnostics.paths.transcriptRoot})`,
    `- Chunks: ${diagnostics.pathStatus.chunksRootExists ? "present" : "missing"} (${diagnostics.paths.chunksRoot})`,
    `- Analysis: ${diagnostics.pathStatus.analysisRootExists ? "present" : "missing"} (${diagnostics.paths.analysisRoot})`,
    `- Candidates: ${diagnostics.pathStatus.candidatesRootExists ? "present" : "missing"} (${diagnostics.paths.candidatesRoot})`,
    "",
    "Warnings:",
    warnings,
  ].join("\n");
}

export async function getSourceReliabilityReport() {
  const diagnostics = await getSavedContentDiagnostics();
  const summary = diagnostics.summary as {
    byTranscriptStatus?: Record<string, number>;
  };

  const readiness = {
    publicYouTubePlaylists: diagnostics.env.youtubeApiKey,
    youtubeSavedArchive: diagnostics.latestYouTubeSavedImport.exists,
    tiktokArchive: diagnostics.latestTikTokImport.exists,
    transcriptLayer: (summary.byTranscriptStatus?.available ?? 0) > 0,
    oauthConfigured:
      diagnostics.env.youtubeOAuthClientId &&
      diagnostics.env.youtubeOAuthClientSecret &&
      diagnostics.env.youtubeOAuthRedirectUri,
  };

  const score =
    Object.values(readiness).filter(Boolean).length /
    Object.values(readiness).length;

  return {
    generatedAt: new Date().toISOString(),
    readiness,
    score,
    diagnostics,
  };
}

export function formatSourceReliabilityReport(report: Awaited<ReturnType<typeof getSourceReliabilityReport>>) {
  return [
    "Saved Source Reliability Report",
    "",
    `Generated at: ${report.generatedAt}`,
    `Reliability score: ${Math.round(report.score * 100)}%`,
    "",
    "Source readiness:",
    `- Public YouTube playlists: ${report.readiness.publicYouTubePlaylists ? "ready" : "not ready"}`,
    `- YouTube saved/archive import: ${report.readiness.youtubeSavedArchive ? "ready" : "not tested"}`,
    `- TikTok archive import: ${report.readiness.tiktokArchive ? "ready" : "not tested"}`,
    `- Transcript layer: ${report.readiness.transcriptLayer ? "has transcripts" : "metadata fallback only"}`,
    `- YouTube OAuth env: ${report.readiness.oauthConfigured ? "configured" : "not configured"}`,
    "",
    "Recommended next fixes:",
    ...(report.diagnostics.warnings.length
      ? report.diagnostics.warnings.map((warning) => `- ${warning}`)
      : ["- None"]),
  ].join("\n");
}
