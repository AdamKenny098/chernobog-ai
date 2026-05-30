import type {
    ModuleCommandContext,
    ModuleHandlerResult,
  } from "@/lib/modules/types";
  import { getDiscordIngestConfig, maskDiscordToken } from "../config";
  import {
    DiscordApiError,
    getDiscordIngestStatus,
  } from "../client/discordApi";
  
  function formatDiscordStatusReply(status: Awaited<ReturnType<typeof getDiscordIngestStatus>>): string {
    if (!status.configured) {
      return [
        "Discord ingest is not configured yet.",
        "",
        "Missing:",
        ...status.missing.map((key) => `- ${key}`),
        "",
        "Add the missing values to `.env.local`, then restart the dev server.",
      ].join("\n");
    }
  
    const channelName = status.channel?.name
      ? `#${status.channel.name}`
      : status.channel?.id ?? "unknown channel";
  
    const botName = status.bot?.globalName ?? status.bot?.username ?? "unknown bot";
  
    return [
      "Discord ingest is configured.",
      "",
      `Bot: ${botName} (${status.bot?.id})`,
      `Idea channel: ${channelName} (${status.channel?.id})`,
      `API base: ${status.apiBaseUrl}`,
      "",
      "V5.5A status check passed. Message reading is intentionally reserved for V5.5B.",
    ].join("\n");
  }
  
  export async function handleDiscordCommand(
    context: ModuleCommandContext
  ): Promise<ModuleHandlerResult> {
    if (context.command.action !== "status") {
      return {
        route: "chat",
        moduleId: "discord-ingest",
        reply: "The Discord module currently supports `discord status` only.",
      };
    }
  
    const config = getDiscordIngestConfig();
  
    try {
      const status = await getDiscordIngestStatus();
  
      return {
        route: "tools",
        moduleId: "discord-ingest",
        reply: formatDiscordStatusReply(status),
        modulePayload: {
          configured: status.configured,
          missing: status.missing,
          botId: status.bot?.id,
          channelId: status.channel?.id,
          apiBaseUrl: status.apiBaseUrl,
          token: maskDiscordToken(config.botToken),
        },
      };
    } catch (error) {
      if (error instanceof DiscordApiError) {
        return {
          route: "tools",
          moduleId: "discord-ingest",
          reply: [
            "Discord ingest status check failed.",
            "",
            `Reason: ${error.message}`,
            `HTTP status: ${error.status || "not available"}`,
            "",
            "Check the bot token, channel ID, server invite, and channel permissions.",
          ].join("\n"),
          modulePayload: {
            configured: false,
            apiBaseUrl: config.apiBaseUrl,
            status: error.status,
            error: error.message,
            token: maskDiscordToken(config.botToken),
          },
        };
      }
  
      const message =
        error instanceof Error ? error.message : "Unknown Discord ingest error.";
  
      return {
        route: "tools",
        moduleId: "discord-ingest",
        reply: `Discord ingest status check failed: ${message}`,
        modulePayload: {
          configured: false,
          apiBaseUrl: config.apiBaseUrl,
          error: message,
          token: maskDiscordToken(config.botToken),
        },
      };
    }
  }