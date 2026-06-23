import fs from "node:fs/promises";
import path from "node:path";

import { YouTubeOAuthTokenStore } from "./types";

function getSecretRoot() {
  return path.join(process.cwd(), "data", "secrets");
}

export function getYouTubeOAuthTokenPath() {
  return path.join(getSecretRoot(), "youtube-oauth.local.json");
}

export async function readYouTubeOAuthTokens() {
  try {
    const raw = await fs.readFile(getYouTubeOAuthTokenPath(), "utf8");
    return JSON.parse(raw) as YouTubeOAuthTokenStore;
  } catch {
    return null;
  }
}

export async function writeYouTubeOAuthTokens(tokens: YouTubeOAuthTokenStore) {
  const tokenPath = getYouTubeOAuthTokenPath();

  await fs.mkdir(path.dirname(tokenPath), { recursive: true });
  await fs.writeFile(tokenPath, JSON.stringify(tokens, null, 2), "utf8");
}

export async function clearYouTubeOAuthTokens() {
  try {
    await fs.unlink(getYouTubeOAuthTokenPath());
  } catch {
    // Already disconnected.
  }
}
