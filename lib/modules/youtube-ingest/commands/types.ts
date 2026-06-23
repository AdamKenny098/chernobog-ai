export type YouTubeIngestCommand =
  | {
      kind: "youtube-playlist-ingest";
      playlist: string;
      projectId?: string;
      tags: string[];
    }
  | {
      kind: "unknown";
      reason: string;
    };

export type YouTubeIngestCommandResult = {
  ok: boolean;
  title: string;
  message: string;
  data?: unknown;
};