import { YouTubeIngestCommand } from "./types";

function normalizeCommand(command: string) {
  return command.trim().replace(/\s+/g, " ");
}

function stripWrappingQuotes(value: string) {
  return value.trim().replace(/^["']|["']$/g, "");
}

export function parseYouTubeIngestCommand(
  command: string
): YouTubeIngestCommand {
  const normalized = normalizeCommand(command);

  const patterns = [
    /^ingest youtube playlist\s+(.+)$/i,
    /^youtube ingest playlist\s+(.+)$/i,
    /^youtube ingest\s+(.+)$/i,
    /^yt ingest\s+(.+)$/i,
  ];

  for (const pattern of patterns) {
    const match = normalized.match(pattern);

    if (match?.[1]) {
      return {
        kind: "youtube-playlist-ingest",
        playlist: stripWrappingQuotes(match[1]),
        projectId: "chernobog",
        tags: ["youtube-ingest", "command-ingest"],
      };
    }
  }

  return {
    kind: "unknown",
    reason:
      "Command was not recognized as a YouTube playlist ingest command.",
  };
}