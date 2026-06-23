export function isYouTubeIngestCommand(command: string) {
    const normalized = command.trim().replace(/\s+/g, " ");
  
    return (
      /^ingest youtube playlist\s+.+$/i.test(normalized) ||
      /^youtube ingest playlist\s+.+$/i.test(normalized) ||
      /^youtube ingest\s+.+$/i.test(normalized) ||
      /^yt ingest\s+.+$/i.test(normalized)
    );
  }