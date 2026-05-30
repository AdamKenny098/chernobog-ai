import {
    getDiscordIngestConfig,
    getMissingDiscordConfig,
  } from "../config";
  import type {
    DiscordApiChannel,
    DiscordApiErrorPayload,
    DiscordApiMessage,
    DiscordApiUser,
    DiscordIngestStatus,
  } from "../types";
  
  export class DiscordApiError extends Error {
    readonly status: number;
    readonly body: string;
  
    constructor(message: string, status: number, body: string) {
      super(message);
      this.name = "DiscordApiError";
      this.status = status;
      this.body = body;
    }
  }
  
  async function readResponseBody(response: Response): Promise<string> {
    try {
      return await response.text();
    } catch {
      return "";
    }
  }
  
  function parseDiscordError(body: string): string {
    if (!body) {
      return "Discord API request failed.";
    }
  
    try {
      const payload = JSON.parse(body) as DiscordApiErrorPayload;
  
      if (payload.message) {
        return payload.code
          ? `${payload.message} [code ${payload.code}]`
          : payload.message;
      }
    } catch {
      // Fall through to raw body.
    }
  
    return body;
  }
  
  async function discordFetch<T>(
    endpointPath: string,
    init?: RequestInit
  ): Promise<T> {
    const config = getDiscordIngestConfig();
    const missing = getMissingDiscordConfig(config);
  
    if (missing.includes("DISCORD_BOT_TOKEN")) {
      throw new DiscordApiError(
        "DISCORD_BOT_TOKEN is not configured.",
        0,
        "Missing Discord bot token."
      );
    }
  
    const response = await fetch(`${config.apiBaseUrl}${endpointPath}`, {
      ...init,
      headers: {
        Authorization: `Bot ${config.botToken}`,
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    });
  
    if (!response.ok) {
      const body = await readResponseBody(response);
      const detail = parseDiscordError(body);
  
      throw new DiscordApiError(detail, response.status, body);
    }
  
    return (await response.json()) as T;
  }
  
  function clampMessageLimit(limit: number): number {
    if (!Number.isFinite(limit)) {
      return 25;
    }
  
    return Math.max(1, Math.min(100, Math.floor(limit)));
  }
  
  export async function getDiscordBotUser(): Promise<DiscordApiUser> {
    return discordFetch<DiscordApiUser>("/users/@me");
  }
  
  export async function getDiscordChannel(
    channelId: string
  ): Promise<DiscordApiChannel> {
    return discordFetch<DiscordApiChannel>(`/channels/${channelId}`);
  }
  
  export async function fetchDiscordChannelMessages(args: {
    channelId: string;
    limit?: number;
  }): Promise<DiscordApiMessage[]> {
    const limit = clampMessageLimit(args.limit ?? 25);
    const params = new URLSearchParams({
      limit: String(limit),
    });
  
    return discordFetch<DiscordApiMessage[]>(
      `/channels/${args.channelId}/messages?${params.toString()}`
    );
  }
  
  export async function getDiscordIngestStatus(): Promise<DiscordIngestStatus> {
    const config = getDiscordIngestConfig();
    const missing = getMissingDiscordConfig(config);
  
    if (missing.length > 0) {
      return {
        configured: false,
        missing,
        apiBaseUrl: config.apiBaseUrl,
      };
    }
  
    const bot = await getDiscordBotUser();
    const channel = await getDiscordChannel(config.ideaChannelId!);
  
    return {
      configured: true,
      missing: [],
      apiBaseUrl: config.apiBaseUrl,
      bot: {
        id: bot.id,
        username: bot.username,
        discriminator: bot.discriminator,
        globalName: bot.global_name,
      },
      channel: {
        id: channel.id,
        name: channel.name,
        type: channel.type,
        guildId: channel.guild_id,
      },
    };
  }