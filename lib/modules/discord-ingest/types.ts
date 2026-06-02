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

export type VaultPullRequestStatus =
  | "draft"
  | "approved"
  | "partially_approved"
  | "rejected"
  | "applied"
  | "discarded";

export type VaultProposedChangeStatus = "pending" | "approved" | "rejected";

export type VaultProposedChangeAction =
  | "create_new_note"
  | "append_existing_note"
  | "append_inbox";

  export type VaultProposedChange = {
    id: string;
    status: VaultProposedChangeStatus;
    action: VaultProposedChangeAction;
    title: string;
    destinationPath: string;
    section?: string;
    sourceMessageId: string;
    sourceFragmentId: string;
    sourceAuthor: string;
    sourceText: string;
    classificationKind: DiscordMessageKind;
    classificationConfidence: number;
    routeConfidence: number;
    proposedContent: string;
    reasoning: string[];
    destinationExists?: boolean;
    duplicateDestinationCount?: number;
    duplicateGroupKey?: string;
    reviewWarnings?: string[];
  };

export type VaultPullRequest = {
  id: string;
  source: "discord-triage";
  status: VaultPullRequestStatus;
  createdAt: string;
  triagePlanId: string;
  summary: {
    totalChanges: number;
    createCount: number;
    appendCount: number;
    inboxCount: number;
    approvedCount: number;
    rejectedCount: number;
    pendingCount: number;
  };
  changes: VaultProposedChange[];
  lastApplyReport?: VaultPullRequestApplyReport;
};

export type DiscordVaultPullRequestCommandKind =
  | "discord_create_vault_pr"
  | "discord_show_vault_pr"
  | "discord_discard_vault_pr";

export type DiscordVaultPullRequestModuleCommand = {
  kind: DiscordVaultPullRequestCommandKind;
};

export type VaultApplyChangeStatus = "applied" | "skipped" | "failed";

export type VaultApplyChangeResult = {
  changeId: string;
  title: string;
  action: VaultProposedChangeAction;
  destinationPath: string;
  status: VaultApplyChangeStatus;
  reason: string;
};

export type VaultPullRequestApplyReport = {
  pullRequestId: string;
  appliedAt: string;
  approvedChangeCount: number;
  appliedCount: number;
  skippedCount: number;
  failedCount: number;
  results: VaultApplyChangeResult[];
};
  
  export type DiscordApiErrorPayload = {
    message?: string;
    code?: number;
  };