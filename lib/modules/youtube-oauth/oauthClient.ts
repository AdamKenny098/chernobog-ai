import { readYouTubeOAuthTokens, writeYouTubeOAuthTokens } from "./store";

const YOUTUBE_OAUTH_SCOPES = [
  "https://www.googleapis.com/auth/youtube.readonly",
];

function getRequiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function createYouTubeOAuthUrl() {
  const clientId = getRequiredEnv("YOUTUBE_OAUTH_CLIENT_ID");
  const redirectUri = getRequiredEnv("YOUTUBE_OAUTH_REDIRECT_URI");

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");

  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("scope", YOUTUBE_OAUTH_SCOPES.join(" "));

  return url.toString();
}

export async function exchangeYouTubeOAuthCode(code: string) {
  const clientId = getRequiredEnv("YOUTUBE_OAUTH_CLIENT_ID");
  const clientSecret = getRequiredEnv("YOUTUBE_OAUTH_CLIENT_SECRET");
  const redirectUri = getRequiredEnv("YOUTUBE_OAUTH_REDIRECT_URI");

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
    cache: "no-store",
  });

  const json = await response.json() as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
    token_type?: string;
    error?: string;
    error_description?: string;
  };

  if (!response.ok || !json.access_token) {
    throw new Error(
      json.error_description ?? json.error ?? "Failed to exchange OAuth code."
    );
  }

  const now = Date.now();

  await writeYouTubeOAuthTokens({
    version: 1,
    connectedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    expiresAt: json.expires_in ? now + json.expires_in * 1000 : undefined,
    scope: json.scope,
    tokenType: json.token_type,
  });
}

export async function getValidYouTubeAccessToken() {
  const tokens = await readYouTubeOAuthTokens();

  if (!tokens) {
    throw new Error("YouTube account is not connected.");
  }

  if (!tokens.expiresAt || tokens.expiresAt > Date.now() + 60_000) {
    return tokens.accessToken;
  }

  if (!tokens.refreshToken) {
    throw new Error("YouTube token expired and no refresh token is available.");
  }

  const clientId = getRequiredEnv("YOUTUBE_OAUTH_CLIENT_ID");
  const clientSecret = getRequiredEnv("YOUTUBE_OAUTH_CLIENT_SECRET");

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: tokens.refreshToken,
      grant_type: "refresh_token",
    }),
    cache: "no-store",
  });

  const json = await response.json() as {
    access_token?: string;
    expires_in?: number;
    scope?: string;
    token_type?: string;
    error?: string;
    error_description?: string;
  };

  if (!response.ok || !json.access_token) {
    throw new Error(
      json.error_description ?? json.error ?? "Failed to refresh YouTube token."
    );
  }

  await writeYouTubeOAuthTokens({
    ...tokens,
    updatedAt: new Date().toISOString(),
    accessToken: json.access_token,
    expiresAt: json.expires_in ? Date.now() + json.expires_in * 1000 : tokens.expiresAt,
    scope: json.scope ?? tokens.scope,
    tokenType: json.token_type ?? tokens.tokenType,
  });

  return json.access_token;
}
