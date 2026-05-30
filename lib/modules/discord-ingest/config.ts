export type DiscordIngestConfig = {
    botToken?: string;
    ideaChannelId?: string;
    apiBaseUrl: string;
  };
  
  export function getDiscordIngestConfig(): DiscordIngestConfig {
    return {
      botToken: process.env.DISCORD_BOT_TOKEN,
      ideaChannelId: process.env.DISCORD_IDEA_CHANNEL_ID,
      apiBaseUrl: process.env.DISCORD_API_BASE_URL ?? "https://discord.com/api",
    };
  }
  
  export function getMissingDiscordConfig(config: DiscordIngestConfig): string[] {
    const missing: string[] = [];
  
    if (!config.botToken) {
      missing.push("DISCORD_BOT_TOKEN");
    }
  
    if (!config.ideaChannelId) {
      missing.push("DISCORD_IDEA_CHANNEL_ID");
    }
  
    return missing;
  }
  
  export function maskDiscordToken(token?: string): string {
    if (!token) {
      return "missing";
    }
  
    if (token.length <= 10) {
      return "configured";
    }
  
    return `${token.slice(0, 4)}...${token.slice(-4)}`;
  }