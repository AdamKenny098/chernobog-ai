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
  
  export type DiscordApiAttachment = {
    id: string;
    filename: string;
    size?: number;
    url?: string;
    content_type?: string;
  };
  
  export type DiscordApiEmbed = {
    title?: string;
    description?: string;
    url?: string;
    type?: string;
  };
  
  export type DiscordApiMessage = {
    id: string;
    channel_id: string;
    guild_id?: string;
    author: DiscordApiUser;
    content: string;
    timestamp: string;
    edited_timestamp?: string | null;
    type: number;
    pinned: boolean;
    webhook_id?: string;
    attachments?: DiscordApiAttachment[];
    embeds?: DiscordApiEmbed[];
  };
  
  export type NormalizedDiscordMessage = {
    id: string;
    channelId: string;
    guildId?: string;
    authorId: string;
    authorLabel: string;
    isBot: boolean;
    content: string;
    timestamp: string;
    editedTimestamp?: string | null;
    type: number;
    pinned: boolean;
    attachmentCount: number;
    embedCount: number;
    jumpUrl?: string;
  };
  
  export type DiscordScanModuleCommand = {
    kind: "discord_scan_messages";
    limit: number;
  };
  
  export type DiscordApiErrorPayload = {
    message?: string;
    code?: number;
  };