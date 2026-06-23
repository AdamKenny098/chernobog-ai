export type YouTubeOAuthTokenStore = {
  version: 1;
  connectedAt: string;
  updatedAt: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  scope?: string;
  tokenType?: string;
};

export type YouTubeOAuthCommandResult = {
  ok: boolean;
  title: string;
  message: string;
  data?: unknown;
};
