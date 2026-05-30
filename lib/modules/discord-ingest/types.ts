export type DiscordIngestStatus = {
    configured: boolean;
    missing: string[];
    apiBaseUrl: string;
    bot?: {
      id: string;
      username: string;
      discriminator?: string;
      globalName?: string | null;
    };
    channel?: {
      id: string;
      name?: string;
      type?: number;
      guildId?: string;
    };
  };
  
  export type DiscordApiUser = {
    id: string;
    username: string;
    discriminator?: string;
    global_name?: string | null;
    bot?: boolean;
  };
  
  export type DiscordApiChannel = {
    id: string;
    type: number;
    name?: string;
    guild_id?: string;
  };
  
  export type DiscordApiErrorPayload = {
    message?: string;
    code?: number;
  };