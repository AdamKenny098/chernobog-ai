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
  import { classifyDiscordMessages } from "../triage/classifyDiscordMessage";
  import { routeDiscordIdeasToVault } from "../triage/routeDiscordIdeaToVault";
  import {
    clearLatestDiscordTriagePlan,
    getLatestDiscordTriagePlan,
    setLatestDiscordTriagePlan,
  } from "../session/triagePlanStore";
  import type {
    DiscordIngestStatus,
    DiscordScanModuleCommand,
    DiscordTriageModuleCommand,
    DiscordTriagePlanModuleCommand,
    NormalizedDiscordMessage,
    RoutedDiscordTriageCandidate,
    StoredDiscordTriagePlan,
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
      "Discord scan, triage, and routing preview commands are available. Vault writes are still disabled.",
    ].join("\n");
  }
  
  function getScanCommand(
    context: ModuleCommandContext
  ): DiscordScanModuleCommand | null {
    const command = context.command.moduleCommand as
      | DiscordScanModuleCommand
      | undefined;
  
    if (!command || command.kind !== "discord_scan_messages") {
      return null;
    }
  
    return command;
  }
  
  function getTriageCommand(
    context: ModuleCommandContext
  ): DiscordTriageModuleCommand | null {
    const command = context.command.moduleCommand as
      | DiscordTriageModuleCommand
      | undefined;
  
    if (!command || command.kind !== "discord_triage_messages") {
      return null;
    }
  
    return command;
  }
  
  function getTriagePlanCommand(
    context: ModuleCommandContext
  ): DiscordTriagePlanModuleCommand | null {
    const command = context.command.moduleCommand as
      | DiscordTriagePlanModuleCommand
      | undefined;
  
    if (!command) {
      return null;
    }
  
    if (
      command.kind !== "discord_show_triage_plan" &&
      command.kind !== "discord_summarize_triage_plan" &&
      command.kind !== "discord_discard_triage_plan"
    ) {
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
      "Preview only. No vault notes were created and no Discord messages were modified."
    );
  
    return lines.join("\n");
  }
  
  function formatRoutedCandidateLine(
    item: RoutedDiscordTriageCandidate,
    index: number
  ): string {
    const { message, fragment, classification, vaultRoute } = item;
    const confidence = Math.round(classification.confidence * 100);
    const routeConfidence = Math.round(vaultRoute.confidence * 100);
    const content = formatPreviewContent(fragment.content);
    const project = classification.projectGuess
      ? `Project guess: ${classification.projectGuess}`
      : "Project guess: none yet";
    const fragmentLabel = fragment.wasSplitFromMultiIdeaMessage
      ? `Fragment ${fragment.fragmentIndex} from message ${fragment.sourceMessageId}`
      : `Message ${fragment.sourceMessageId}`;
    const destination = vaultRoute.destination
      ? `${vaultRoute.destination.relativePath}${
          vaultRoute.destination.section ? ` → ${vaultRoute.destination.section}` : ""
        }`
      : "none";
  
    return [
      `${index + 1}. ${classification.kind} — ${confidence}%`,
      `   Title guess: ${classification.titleGuess ?? "none"}`,
      `   ${project}`,
      `   Source: ${message.authorLabel}`,
      `   Fragment: ${fragmentLabel}`,
      `   Message: ${content}`,
      `   Vault action: ${vaultRoute.action} — ${routeConfidence}%`,
      `   Destination: ${destination}`,
      `   Reason: ${[
        ...classification.reasoning,
        ...vaultRoute.reasoning,
      ].join("; ")}`,
    ].join("\n");
  }
  
  function formatDiscordTriageReply(args: {
    channelName: string;
    requestedLimit: number;
    scannedCount: number;
    visibleCount: number;
    routed: RoutedDiscordTriageCandidate[];
  }): string {
    const kept = args.routed.filter(
      (item) =>
        item.classification.shouldKeep && item.vaultRoute.action !== "ignore"
    );
    const ignoredCount = args.routed.length - kept.length;
  
    const actionCounts = getActionCounts(kept);
  
    const lines: string[] = [
      `Discord idea triage and vault routing preview for #${args.channelName}.`,
      "",
      `Scanned ${args.scannedCount} message(s).`,
      `Reviewed ${args.visibleCount} non-bot user message(s).`,
      `Classified ${args.routed.length} extracted fragment(s).`,
      `Routed candidate fragments: ${kept.length}.`,
      `Ignored fragments: ${ignoredCount}.`,
    ];
  
    if (kept.length > 0) {
      lines.push("");
      lines.push("Routing summary:");
  
      for (const [action, count] of Object.entries(actionCounts)) {
        lines.push(`- ${action}: ${count}`);
      }
    }
  
    if (kept.length === 0) {
      lines.push("");
      lines.push("No useful project signals were found in this batch.");
    } else {
      lines.push("");
      lines.push(
        ...kept
          .slice(0, 12)
          .map((item, index) => formatRoutedCandidateLine(item, index))
      );
    }
  
    lines.push("");
    lines.push("V5.5C routing preview only. No vault files were changed.");
  
    return lines.join("\n");
  }
  
  function getActionCounts(
    candidates: RoutedDiscordTriageCandidate[]
  ): Record<string, number> {
    return candidates.reduce<Record<string, number>>((counts, item) => {
      counts[item.vaultRoute.action] = (counts[item.vaultRoute.action] ?? 0) + 1;
      return counts;
    }, {});
  }
  
  function createStoredTriagePlan(args: {
    channelId: string;
    channelName: string;
    requestedLimit: number;
    scannedCount: number;
    visibleCount: number;
    routed: RoutedDiscordTriageCandidate[];
  }): StoredDiscordTriagePlan {
    const candidates = args.routed.filter(
      (item) =>
        item.classification.shouldKeep && item.vaultRoute.action !== "ignore"
    );
  
    return {
      id: `discord-triage-${Date.now()}`,
      createdAt: new Date().toISOString(),
      source: {
        channelId: args.channelId,
        channelName: args.channelName,
        scannedMessageCount: args.scannedCount,
        visibleMessageCount: args.visibleCount,
      },
      requestedLimit: args.requestedLimit,
      classifiedFragmentCount: args.routed.length,
      candidateCount: candidates.length,
      ignoredCount: args.routed.length - candidates.length,
      actionCounts: getActionCounts(candidates),
      candidates,
    };
  }
  
  function formatStoredTriagePlan(plan: StoredDiscordTriagePlan): string {
    const lines: string[] = [
      `Latest Discord triage plan: ${plan.id}`,
      "",
      `Created: ${new Date(plan.createdAt).toLocaleString()}`,
      `Channel: #${plan.source.channelName ?? plan.source.channelId}`,
      `Scanned messages: ${plan.source.scannedMessageCount}`,
      `Visible messages: ${plan.source.visibleMessageCount}`,
      `Classified fragments: ${plan.classifiedFragmentCount}`,
      `Candidate fragments: ${plan.candidateCount}`,
      `Ignored fragments: ${plan.ignoredCount}`,
      "",
      "Routing summary:",
    ];
  
    if (Object.keys(plan.actionCounts).length === 0) {
      lines.push("- none");
    } else {
      for (const [action, count] of Object.entries(plan.actionCounts)) {
        lines.push(`- ${action}: ${count}`);
      }
    }
  
    if (plan.candidates.length > 0) {
      lines.push("");
      lines.push("Top candidates:");
  
      lines.push(
        ...plan.candidates.slice(0, 12).map((item, index) => {
          const destination = item.vaultRoute.destination
            ? item.vaultRoute.destination.relativePath
            : "none";
  
          return `${index + 1}. ${
            item.classification.titleGuess ?? item.fragment.content
          } → ${item.vaultRoute.action} → ${destination}`;
        })
      );
    }
  
    lines.push("");
    lines.push(
      "No vault files have been changed. V5.5D will add approved plan application."
    );
  
    return lines.join("\n");
  }
  
  function formatStoredTriagePlanSummary(plan: StoredDiscordTriagePlan): string {
    const lines: string[] = [
      `Triage plan summary for #${plan.source.channelName ?? plan.source.channelId}:`,
      "",
      `${plan.candidateCount} candidate fragment(s) from ${plan.source.visibleMessageCount} visible message(s).`,
      `${plan.ignoredCount} fragment(s) ignored.`,
      "",
      "Action counts:",
    ];
  
    if (Object.keys(plan.actionCounts).length === 0) {
      lines.push("- none");
    } else {
      for (const [action, count] of Object.entries(plan.actionCounts)) {
        lines.push(`- ${action}: ${count}`);
      }
    }
  
    const createNew = plan.candidates.filter(
      (item) => item.vaultRoute.action === "create_new_note"
    );
    const appendExisting = plan.candidates.filter(
      (item) => item.vaultRoute.action === "append_existing_note"
    );
    const inbox = plan.candidates.filter(
      (item) => item.vaultRoute.action === "append_inbox"
    );
  
    if (createNew.length > 0) {
      lines.push("");
      lines.push("New note proposals:");
      lines.push(
        ...createNew.slice(0, 8).map((item) => {
          return `- ${item.classification.titleGuess ?? item.fragment.content}`;
        })
      );
    }
  
    if (appendExisting.length > 0) {
      lines.push("");
      lines.push("Existing note append proposals:");
      lines.push(
        ...appendExisting.slice(0, 8).map((item) => {
          return `- ${
            item.classification.titleGuess ?? item.fragment.content
          } → ${item.vaultRoute.destination?.relativePath ?? "unknown"}`;
        })
      );
    }
  
    if (inbox.length > 0) {
      lines.push("");
      lines.push("Inbox / review items:");
      lines.push(
        ...inbox.slice(0, 8).map((item) => {
          return `- ${item.classification.titleGuess ?? item.fragment.content}`;
        })
      );
    }
  
    lines.push("");
    lines.push("No vault files have been changed.");
  
    return lines.join("\n");
  }
  
  async function fetchIdeaChannelPreview(args: {
    limit: number;
  }): Promise<{
    channelName: string;
    channelId: string;
    messages: NormalizedDiscordMessage[];
    visibleMessages: NormalizedDiscordMessage[];
  }> {
    const config = getDiscordIngestConfig();
  
    if (!config.ideaChannelId) {
      throw new Error(
        "Discord idea channel is not configured. Set DISCORD_IDEA_CHANNEL_ID in `.env.local`, then restart the dev server."
      );
    }
  
    const channel = await getDiscordChannel(config.ideaChannelId);
    const messages = await fetchDiscordChannelMessages({
      channelId: config.ideaChannelId,
      limit: args.limit,
    });
  
    const normalizedMessages = normalizeDiscordMessages(messages, channel);
    const visibleMessages = normalizedMessages.filter(
      (message) => !message.isBot && message.type === 0
    );
  
    return {
      channelName: channel.name ?? config.ideaChannelId,
      channelId: config.ideaChannelId,
      messages: normalizedMessages,
      visibleMessages,
    };
  }
  
  async function handleDiscordScanIdeas(
    scanCommand: DiscordScanModuleCommand
  ): Promise<ModuleHandlerResult> {
    const preview = await fetchIdeaChannelPreview({
      limit: scanCommand.limit,
    });
  
    return {
      route: "tools",
      moduleId: "discord-ingest",
      reply: formatDiscordScanReply({
        channelName: preview.channelName,
        requestedLimit: scanCommand.limit,
        messages: preview.messages,
        visibleMessages: preview.visibleMessages,
      }),
      modulePayload: {
        action: "discord_scan_messages",
        channelId: preview.channelId,
        channelName: preview.channelName,
        requestedLimit: scanCommand.limit,
        fetchedCount: preview.messages.length,
        visibleCount: preview.visibleMessages.length,
        messages: preview.visibleMessages.slice(0, 10),
      },
    };
  }
  
  async function handleDiscordTriageIdeas(
    context: ModuleCommandContext,
    triageCommand: DiscordTriageModuleCommand
  ): Promise<ModuleHandlerResult> {
    const preview = await fetchIdeaChannelPreview({
      limit: triageCommand.limit,
    });
  
    const classified = classifyDiscordMessages(preview.visibleMessages);
    const routed = await routeDiscordIdeasToVault(classified);
    const candidates = routed.filter(
      (item) =>
        item.classification.shouldKeep && item.vaultRoute.action !== "ignore"
    );
  
    const storedPlan = createStoredTriagePlan({
      channelId: preview.channelId,
      channelName: preview.channelName,
      requestedLimit: triageCommand.limit,
      scannedCount: preview.messages.length,
      visibleCount: preview.visibleMessages.length,
      routed,
    });
  
    setLatestDiscordTriagePlan(context.sessionId, storedPlan);
  
    return {
      route: "tools",
      moduleId: "discord-ingest",
      reply: formatDiscordTriageReply({
        channelName: preview.channelName,
        requestedLimit: triageCommand.limit,
        scannedCount: preview.messages.length,
        visibleCount: preview.visibleMessages.length,
        routed,
      }),
      modulePayload: {
        action: "discord_triage_messages",
        channelId: preview.channelId,
        channelName: preview.channelName,
        requestedLimit: triageCommand.limit,
        scannedCount: preview.messages.length,
        visibleCount: preview.visibleMessages.length,
        classifiedFragmentCount: routed.length,
        candidateCount: candidates.length,
        ignoredCount: routed.length - candidates.length,
        planId: storedPlan.id,
        candidates: candidates.slice(0, 12),
      },
    };
  }
  
  async function handleDiscordTriagePlanCommand(
    context: ModuleCommandContext,
    planCommand: DiscordTriagePlanModuleCommand
  ): Promise<ModuleHandlerResult> {
    if (planCommand.kind === "discord_discard_triage_plan") {
      const cleared = clearLatestDiscordTriagePlan(context.sessionId);
  
      return {
        route: "tools",
        moduleId: "discord-ingest",
        reply: cleared
          ? "Discarded the latest Discord triage plan for this session."
          : "There was no Discord triage plan to discard for this session.",
        modulePayload: {
          action: planCommand.kind,
          cleared,
        },
      };
    }
  
    const plan = getLatestDiscordTriagePlan(context.sessionId);
  
    if (!plan) {
      return {
        route: "tools",
        moduleId: "discord-ingest",
        reply:
          "There is no Discord triage plan in this session yet. Run `discord triage ideas` first.",
        modulePayload: {
          action: planCommand.kind,
          hasPlan: false,
        },
      };
    }
  
    return {
      route: "tools",
      moduleId: "discord-ingest",
      reply:
        planCommand.kind === "discord_summarize_triage_plan"
          ? formatStoredTriagePlanSummary(plan)
          : formatStoredTriagePlan(plan),
      modulePayload: {
        action: planCommand.kind,
        hasPlan: true,
        plan,
      },
    };
  }
  
  export async function handleDiscordCommand(
    context: ModuleCommandContext
  ): Promise<ModuleHandlerResult> {
    const config = getDiscordIngestConfig();
  
    try {
      const triagePlanCommand = getTriagePlanCommand(context);
  
      if (triagePlanCommand) {
        return await handleDiscordTriagePlanCommand(context, triagePlanCommand);
      }
  
      const triageCommand = getTriageCommand(context);
  
      if (triageCommand) {
        return await handleDiscordTriageIdeas(context, triageCommand);
      }
  
      const scanCommand = getScanCommand(context);
  
      if (scanCommand) {
        return await handleDiscordScanIdeas(scanCommand);
      }
  
      if (context.command.action !== "status") {
        return {
          route: "chat",
          moduleId: "discord-ingest",
          reply:
            "The Discord module currently supports `discord status`, `discord scan ideas`, `discord triage ideas`, and triage plan review commands.",
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