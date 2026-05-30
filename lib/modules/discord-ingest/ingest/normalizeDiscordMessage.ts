import type {
    DiscordApiChannel,
    DiscordApiMessage,
    NormalizedDiscordMessage,
  } from "../types";
  
  function getAuthorLabel(message: DiscordApiMessage): string {
    const globalName = message.author.global_name;
    const username = message.author.username;
  
    if (globalName && globalName.trim().length > 0) {
      return globalName;
    }
  
    return username;
  }
  
  function buildJumpUrl(
    message: DiscordApiMessage,
    channel?: DiscordApiChannel
  ): string | undefined {
    const guildId = message.guild_id ?? channel?.guild_id;
  
    if (!guildId) {
      return undefined;
    }
  
    return `https://discord.com/channels/${guildId}/${message.channel_id}/${message.id}`;
  }
  
  export function normalizeDiscordMessage(
    message: DiscordApiMessage,
    channel?: DiscordApiChannel
  ): NormalizedDiscordMessage {
    return {
      id: message.id,
      channelId: message.channel_id,
      guildId: message.guild_id ?? channel?.guild_id,
      authorId: message.author.id,
      authorLabel: getAuthorLabel(message),
      isBot: Boolean(message.author.bot),
      content: message.content.trim(),
      timestamp: message.timestamp,
      editedTimestamp: message.edited_timestamp,
      type: message.type,
      pinned: message.pinned,
      attachmentCount: message.attachments?.length ?? 0,
      embedCount: message.embeds?.length ?? 0,
      jumpUrl: buildJumpUrl(message, channel),
    };
  }
  
  export function normalizeDiscordMessages(
    messages: DiscordApiMessage[],
    channel?: DiscordApiChannel
  ): NormalizedDiscordMessage[] {
    return messages.map((message) => normalizeDiscordMessage(message, channel));
  }