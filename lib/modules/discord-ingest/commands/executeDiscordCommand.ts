import type {
    ModuleCommandContext,
    ModuleHandlerResult,
  } from "@/lib/modules/types";
  import { getDiscordIngestConfig, maskDiscordToken } from "../config";
  import {
    DiscordApiError,
    fetchDiscordChannelMessages,
    getDiscordChannel,
    getDiscordIngestStatus,
  } from "../client/discordApi";
  import { normalizeDiscordMessages } from "../ingest/normalizeDiscordMessage";
  import type {
    DiscordIngestStatus,
    DiscordScanModuleCommand,
    NormalizedDiscordMessage,
  } from "../types";
  
  function formatDiscordStatusReply(status: DiscordIngestStatus): string {
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
      "V5.5A status check passed. Message reading is now available through V5.5B preview commands.",
    ].join("\n");
  }
  
  function getScanCommand(context: ModuleCommandContext): DiscordScanModuleCommand | null {
    const command = context.command.moduleCommand as
      | DiscordScanModuleCommand
      | undefined;
  
    if (!command || command.kind !== "discord_scan_messages") {
      return null;
    }
  
    return command;
  }
  
  function formatPreviewContent(content: string): string {
    const cleaned = content.replace(/\s+/g, " ").trim();
  
    if (!cleaned) {
      return "[empty content]";
    }
  
    if (cleaned.length <= 160) {
      return cleaned;
    }
  
    return `${cleaned.slice(0, 157)}...`;
  }
  
  function formatMessageLine(
    message: NormalizedDiscordMessage,
    index: number
  ): string {
    const time = new Date(message.timestamp).toLocaleString();
    const content = formatPreviewContent(message.content);
    const extras: string[] = [];
  
    if (message.attachmentCount > 0) {
      extras.push(`${message.attachmentCount} attachment(s)`);
    }
  
    if (message.embedCount > 0) {
      extras.push(`${message.embedCount} embed(s)`);
    }
  
    const suffix = extras.length > 0 ? ` [${extras.join(", ")}]` : "";
  
    return `${index + 1}. ${message.authorLabel} — ${time}\n   ${content}${suffix}`;
  }
  
  function formatDiscordScanReply(args: {
    channelName: string;
    requestedLimit: number;
    messages: NormalizedDiscordMessage[];
    visibleMessages: NormalizedDiscordMessage[];
  }): string {
    const lines: string[] = [
      `Discord idea channel preview for #${args.channelName}.`,
      "",
      `Fetched ${args.messages.length} message(s). Showing ${args.visibleMessages.length} non-bot message(s).`,
    ];
  
    if (args.messages.length > 0 && args.visibleMessages.length === 0) {
      lines.push(
        "",
        "No readable non-bot messages were found. If the channel has messages, check Message Content Intent and channel permissions."
      );
    }
  
    const emptyContentCount = args.visibleMessages.filter(
      (message) => message.content.length === 0
    ).length;
  
    if (emptyContentCount > 0) {
      lines.push(
        "",
        `${emptyContentCount} visible message(s) had empty content. That usually means Message Content Intent is not enabled or approved.`
      );
    }
  
    if (args.visibleMessages.length > 0) {
      lines.push("");
      lines.push(
        ...args.visibleMessages
          .slice(0, 10)
          .map((message, index) => formatMessageLine(message, index))
      );
    }
  
    lines.push("");
    lines.push(
      "V5.5B preview only. No vault notes were created and no Discord messages were modified."
    );
  
    return lines.join("\n");
  }
  
  async function handleDiscordScanIdeas(
    context: ModuleCommandContext,
    scanCommand: DiscordScanModuleCommand
  ): Promise<ModuleHandlerResult> {
    const config = getDiscordIngestConfig();
  
    if (!config.ideaChannelId) {
      return {
        route: "tools",
        moduleId: "discord-ingest",
        reply:
          "Discord idea channel is not configured. Set DISCORD_IDEA_CHANNEL_ID in `.env.local`, then restart the dev server.",
      };
    }
  
    const channel = await getDiscordChannel(config.ideaChannelId);
    const messages = await fetchDiscordChannelMessages({
      channelId: config.ideaChannelId,
      limit: scanCommand.limit,
    });
  
    const normalizedMessages = normalizeDiscordMessages(messages, channel);
    const visibleMessages = normalizedMessages.filter(
      (message) => !message.isBot && message.type === 0
    );
  
    const channelName = channel.name ?? config.ideaChannelId;
  
    return {
      route: "tools",
      moduleId: "discord-ingest",
      reply: formatDiscordScanReply({
        channelName,
        requestedLimit: scanCommand.limit,
        messages: normalizedMessages,
        visibleMessages,
      }),
      modulePayload: {
        action: "discord_scan_messages",
        channelId: config.ideaChannelId,
        channelName,
        requestedLimit: scanCommand.limit,
        fetchedCount: normalizedMessages.length,
        visibleCount: visibleMessages.length,
        messages: visibleMessages.slice(0, 10),
      },
    };
  }
  
  export async function handleDiscordCommand(
    context: ModuleCommandContext
  ): Promise<ModuleHandlerResult> {
    const config = getDiscordIngestConfig();
  
    try {
      const scanCommand = getScanCommand(context);
  
      if (scanCommand) {
        return await handleDiscordScanIdeas(context, scanCommand);
      }
  
      if (context.command.action !== "status") {
        return {
          route: "chat",
          moduleId: "discord-ingest",
          reply:
            "The Discord module currently supports `discord status` and `discord scan ideas`.",
        };
      }
  
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
            "Discord ingest command failed.",
            "",
            `Reason: ${error.message}`,
            `HTTP status: ${error.status || "not available"}`,
            "",
            "Check the bot token, channel ID, server invite, channel permissions, Read Message History, and Message Content Intent.",
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
        reply: `Discord ingest command failed: ${message}`,
        modulePayload: {
          configured: false,
          apiBaseUrl: config.apiBaseUrl,
          error: message,
          token: maskDiscordToken(config.botToken),
        },
      };
    }
  }