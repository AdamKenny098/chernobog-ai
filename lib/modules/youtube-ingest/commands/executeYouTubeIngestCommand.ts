import { ingestYouTubePlaylist } from "../ingestYouTubePlaylist";
import { parseYouTubeIngestCommand } from "./parseYouTubeIngestCommand";
import { YouTubeIngestCommandResult } from "./types";

export async function executeYouTubeIngestCommand(
  command: string
): Promise<YouTubeIngestCommandResult> {
  const parsed = parseYouTubeIngestCommand(command);

  if (parsed.kind === "unknown") {
    return {
      ok: false,
      title: "YouTube ingest command not recognized",
      message: parsed.reason,
    };
  }

  const result = await ingestYouTubePlaylist({
    playlist: parsed.playlist,
    projectId: parsed.projectId,
    tags: parsed.tags,
  });

  const importStatus = result.skippedDuplicate
    ? "duplicate skipped"
    : "new import created";

  const statusLines = result.skippedDuplicate
    ? [
        "Status: duplicate skipped",
        "Import mode: duplicate skipped",
        result.duplicateReason ??
          "This playlist already exists in the vault inbox.",
      ]
    : ["Status: new import created", "Import mode: new import created"];

  const savedContentLines = result.savedContent
    ? [
        "",
        "Saved content queue:",
        `- Added: ${result.savedContent.added}`,
        `- Updated: ${result.savedContent.updated}`,
        `- Unchanged: ${result.savedContent.unchanged}`,
        `- Total queue items: ${result.savedContent.total}`,
        `- Queue file: ${result.savedContent.queuePath}`,
      ]
    : [];

  return {
    ok: true,
    title: result.skippedDuplicate
      ? "YouTube playlist already ingested"
      : "YouTube playlist ingested",
    message: [
      ...statusLines,
      "",
      `Playlist: ${result.playlist.title}`,
      `Import ID: ${result.importId}`,
      `Import status: ${importStatus}`,
      result.contentHash ? `Content hash: ${result.contentHash}` : "",
      `Videos retrieved: ${result.videoCount}`,
      "",
      "Vault files:",
      `- ${result.vaultPaths.rawJson}`,
      `- ${result.vaultPaths.summaryMarkdown}`,
      `- ${result.vaultPaths.videoIndexMarkdown}`,
      `- ${result.vaultPaths.candidateMemoryJson}`,
      result.vaultPaths.manifest ? `- ${result.vaultPaths.manifest}` : "",
      ...savedContentLines,
    ]
      .filter(Boolean)
      .join("\n"),
    data: result,
  };
}
