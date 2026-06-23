import { clearYouTubeOAuthTokens, readYouTubeOAuthTokens } from "./store";
import { createYouTubeOAuthUrl } from "./oauthClient";
import { importYouTubeWatchLater } from "./watchLater";
import { YouTubeOAuthCommandResult } from "./types";

export function isYouTubeOAuthCommand(command: string) {
  const normalized = command.trim().replace(/\s+/g, " ");

  return (
    /^connect youtube account$/i.test(normalized) ||
    /^show youtube account status$/i.test(normalized) ||
    /^import youtube watch later$/i.test(normalized) ||
    /^refresh youtube watch later$/i.test(normalized) ||
    /^disconnect youtube account$/i.test(normalized)
  );
}

export async function executeYouTubeOAuthCommand(
  command: string
): Promise<YouTubeOAuthCommandResult> {
  const normalized = command.trim().replace(/\s+/g, " ");

  if (/^connect youtube account$/i.test(normalized)) {
    const url = createYouTubeOAuthUrl();

    return {
      ok: true,
      title: "Connect YouTube Account",
      message: [
        "Open this URL in your browser to connect YouTube:",
        "",
        url,
        "",
        "After Google redirects back to Chernobog, run:",
        "show youtube account status",
      ].join("\n"),
      data: { url },
    };
  }

  if (/^show youtube account status$/i.test(normalized)) {
    const tokens = await readYouTubeOAuthTokens();

    return {
      ok: true,
      title: "YouTube Account Status",
      message: tokens
        ? [
            "Status: connected",
            `Connected at: ${tokens.connectedAt}`,
            `Updated at: ${tokens.updatedAt}`,
            `Scope: ${tokens.scope ?? "unknown"}`,
            `Expires at: ${
              tokens.expiresAt ? new Date(tokens.expiresAt).toISOString() : "unknown"
            }`,
          ].join("\n")
        : "Status: not connected",
      data: tokens
        ? {
            connected: true,
            connectedAt: tokens.connectedAt,
            updatedAt: tokens.updatedAt,
            scope: tokens.scope,
            expiresAt: tokens.expiresAt,
          }
        : { connected: false },
    };
  }

  if (
    /^import youtube watch later$/i.test(normalized) ||
    /^refresh youtube watch later$/i.test(normalized)
  ) {
    const result = await importYouTubeWatchLater();

    return {
      ok: true,
      title: "YouTube Watch Later Imported",
      message: [
        `Imported at: ${result.importedAt}`,
        `Videos retrieved: ${result.videoCount}`,
        "",
        "Saved content queue:",
        `- Added: ${result.savedContent.added}`,
        `- Updated: ${result.savedContent.updated}`,
        `- Unchanged: ${result.savedContent.unchanged}`,
        `- Total queue items: ${result.savedContent.total}`,
        `- Queue file: ${result.savedContent.queuePath}`,
      ].join("\n"),
      data: result,
    };
  }

  if (/^disconnect youtube account$/i.test(normalized)) {
    await clearYouTubeOAuthTokens();

    return {
      ok: true,
      title: "YouTube Account Disconnected",
      message: "Local YouTube OAuth tokens were removed.",
    };
  }

  return {
    ok: false,
    title: "YouTube OAuth command not recognized",
    message: "Try: connect youtube account",
  };
}
