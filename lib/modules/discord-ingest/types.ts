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
  
  export type DiscordTriageModuleCommand = {
    kind: "discord_triage_messages";
    limit: number;
  };
  
  export type DiscordMessageKind =
    | "project_idea"
    | "feature_request"
    | "bug_report"
    | "design_note"
    | "architecture_note"
    | "task"
    | "decision"
    | "question"
    | "general_chatter"
    | "ignore";
  
  export type DiscordMessageClassification = {
    kind: DiscordMessageKind;
    confidence: number;
    shouldKeep: boolean;
    titleGuess?: string;
    projectGuess?: string;
    reasoning: string[];
  };
  
  export type DiscordIdeaFragment = {
    id: string;
    sourceMessageId: string;
    fragmentIndex: number;
    content: string;
    sourceContent: string;
    wasSplitFromMultiIdeaMessage: boolean;
  };
  
  export type ClassifiedDiscordMessage = {
    message: NormalizedDiscordMessage;
    fragment: DiscordIdeaFragment;
    classification: DiscordMessageClassification;
  };
  
  export type VaultRoutingAction =
    | "append_existing_note"
    | "create_new_note"
    | "append_inbox"
    | "needs_review"
    | "ignore";
  
  export type VaultRoutingDestination = {
    noteTitle: string;
    relativePath: string;
    section?: string;
  };
  
  export type VaultRoutingResult = {
    action: VaultRoutingAction;
    confidence: number;
    destination?: VaultRoutingDestination;
    reasoning: string[];
  };
  
  export type RoutedDiscordTriageCandidate = ClassifiedDiscordMessage & {
    vaultRoute: VaultRoutingResult;
  };
  
  export type DiscordTriagePlan = {
    source: {
      channelId: string;
      channelName?: string;
      scannedMessageCount: number;
      visibleMessageCount: number;
    };
    candidates: RoutedDiscordTriageCandidate[];
    ignoredCount: number;
  };

  export type DiscordTriagePlanCommandKind =
  | "discord_show_triage_plan"
  | "discord_summarize_triage_plan"
  | "discord_discard_triage_plan";

export type DiscordTriagePlanModuleCommand = {
  kind: DiscordTriagePlanCommandKind;
};

export type StoredDiscordTriagePlan = {
  id: string;
  createdAt: string;
  source: {
    channelId: string;
    channelName?: string;
    scannedMessageCount: number;
    visibleMessageCount: number;
  };
  requestedLimit: number;
  classifiedFragmentCount: number;
  candidateCount: number;
  ignoredCount: number;
  actionCounts: Record<string, number>;
  candidates: RoutedDiscordTriageCandidate[];
};
  
  export type DiscordApiErrorPayload = {
    message?: string;
    code?: number;
  };