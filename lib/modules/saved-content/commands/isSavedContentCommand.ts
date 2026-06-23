export function isSavedContentCommand(command: string) {
  const normalized = command.trim().replace(/\s+/g, " ");

  return (
    /^show saved content diagnostics$/i.test(normalized) ||
    /^saved content diagnostics$/i.test(normalized) ||
    /^content diagnostics$/i.test(normalized) ||
    /^show saved content queue$/i.test(normalized) ||
    /^saved content queue$/i.test(normalized) ||
    /^show content queue$/i.test(normalized) ||
    /^content queue$/i.test(normalized) ||
    /^show saved content items(?:\s+\d+)?$/i.test(normalized) ||
    /^show active saved content(?:\s+\d+)?$/i.test(normalized) ||
    /^watch next saved content\s+\d+$/i.test(normalized) ||
    /^analyze next saved content\s+\d+$/i.test(normalized) ||
    /^archive saved content\s+\d+$/i.test(normalized) ||
    /^dismiss saved content\s+\d+$/i.test(normalized) ||
    /^mark saved content\s+\d+\s+(watched|analyzed|archived|dismissed)$/i.test(normalized) ||
    /^fetch transcript for saved content\s+\d+$/i.test(normalized) ||
    /^fetch transcripts for analyze-next$/i.test(normalized) ||
    /^normalize transcript for saved content\s+\d+$/i.test(normalized) ||
    /^chunk transcript for saved content\s+\d+$/i.test(normalized) ||
    /^prepare transcripts for analyze-next$/i.test(normalized) ||
    /^summarize saved content\s+\d+$/i.test(normalized) ||
    /^show summary for saved content\s+\d+$/i.test(normalized) ||
    /^why did i save content\s+\d+$/i.test(normalized) ||
    /^set reason for saved content\s+\d+\s+as\s+.+$/i.test(normalized) ||
    /^confirm reason for saved content\s+\d+$/i.test(normalized) ||
    /^clear reason for saved content\s+\d+$/i.test(normalized) ||
    /^extract tasks from saved content\s+\d+$/i.test(normalized) ||
    /^extract ideas from saved content\s+\d+$/i.test(normalized) ||
    /^extract candidates from saved content\s+\d+$/i.test(normalized) ||
    /^show candidates for saved content\s+\d+$/i.test(normalized) ||
    /^show saved content (youtube|tiktok|unprocessed|watch next|analyze next|watched|analyzed|archived|dismissed|playlists|watch later|favorites|collections|needing transcripts|ready to analyze|failed analysis)(?:\s+\d+)?$/i.test(normalized) ||
    /^show saved content for project\s+.+$/i.test(normalized) ||
    /^show saved content by topic\s+.+$/i.test(normalized) ||
    /^import tiktok archive\s+.+$/i.test(normalized) ||
    /^show latest tiktok import$/i.test(normalized) ||
    /^show tiktok saved content$/i.test(normalized)
  );
}
