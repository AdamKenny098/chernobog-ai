import type {
    RoutedDiscordTriageCandidate,
    StoredDiscordTriagePlan,
    VaultProposedChange,
    VaultProposedChangeAction,
    VaultPullRequest,
  } from "../types";
  
  function sanitizeMarkdown(value: string): string {
    return value.trim().replace(/\r\n/g, "\n");
  }
  
  function getChangeAction(
    item: RoutedDiscordTriageCandidate
  ): VaultProposedChangeAction | null {
    switch (item.vaultRoute.action) {
      case "create_new_note":
      case "append_existing_note":
      case "append_inbox":
        return item.vaultRoute.action;
  
      default:
        return null;
    }
  }
  
  function buildTags(item: RoutedDiscordTriageCandidate): string[] {
    const tags = ["discord", "triage"];
  
    if (item.classification.kind) {
      tags.push(item.classification.kind.replace(/_/g, "-"));
    }
  
    if (item.classification.projectGuess) {
      tags.push(
        item.classification.projectGuess
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "")
      );
    }
  
    return Array.from(new Set(tags.filter(Boolean)));
  }
  
  function formatNewNoteContent(item: RoutedDiscordTriageCandidate): string {
    const title = item.classification.titleGuess ?? item.fragment.content;
    const tags = buildTags(item);
  
    return sanitizeMarkdown(`---
  type: ${item.classification.kind}
  source: discord
  status: captured
  tags: [${tags.join(", ")}]
  ---
  
  # ${title}
  
  ## Source
  
  Captured from Discord via Chernobog Discord triage.
  
  Source message: ${item.message.id}
  Source fragment: ${item.fragment.id}
  Author: ${item.message.authorLabel}
  
  ## Idea
  
  ${item.fragment.content}
  
  ## Classification
  
  Kind: ${item.classification.kind}
  Confidence: ${Math.round(item.classification.confidence * 100)}%
  
  Project guess: ${item.classification.projectGuess ?? "none"}
  
  ## Routing
  
  Action: ${item.vaultRoute.action}
  Destination: ${item.vaultRoute.destination?.relativePath ?? "none"}
  Route confidence: ${Math.round(item.vaultRoute.confidence * 100)}%
  
  ## Reasoning
  
  ${[...item.classification.reasoning, ...item.vaultRoute.reasoning]
    .map((reason) => `- ${reason}`)
    .join("\n")}
  
  ## Next Action
  
  Review whether this should become an active project, be merged into an existing project, or be discarded.
  `);
  }
  
  function formatAppendContent(item: RoutedDiscordTriageCandidate): string {
    const title = item.classification.titleGuess ?? item.fragment.content;
  
    return sanitizeMarkdown(`
  
  ### ${title}
  
  Source: Discord #project-ideas  
  Source message: ${item.message.id}  
  Source fragment: ${item.fragment.id}  
  Classification: ${item.classification.kind}  
  Confidence: ${Math.round(item.classification.confidence * 100)}%  
  Route confidence: ${Math.round(item.vaultRoute.confidence * 100)}%
  
  ${item.fragment.content}
  
  Reasoning:
  ${[...item.classification.reasoning, ...item.vaultRoute.reasoning]
    .map((reason) => `- ${reason}`)
    .join("\n")}
  `);
  }
  
  function formatInboxContent(item: RoutedDiscordTriageCandidate): string {
    const title = item.classification.titleGuess ?? item.fragment.content;
  
    return sanitizeMarkdown(`
  
  ## ${title}
  
  Status: needs review  
  Source: Discord #project-ideas  
  Source message: ${item.message.id}  
  Source fragment: ${item.fragment.id}  
  Classification: ${item.classification.kind}  
  Confidence: ${Math.round(item.classification.confidence * 100)}%
  
  ${item.fragment.content}
  
  Reasoning:
  ${[...item.classification.reasoning, ...item.vaultRoute.reasoning]
    .map((reason) => `- ${reason}`)
    .join("\n")}
  `);
  }
  
  function buildProposedContent(
    item: RoutedDiscordTriageCandidate,
    action: VaultProposedChangeAction
  ): string {
    switch (action) {
      case "create_new_note":
        return formatNewNoteContent(item);
  
      case "append_existing_note":
        return formatAppendContent(item);
  
      case "append_inbox":
        return formatInboxContent(item);
    }
  }
  
  function buildChange(
    item: RoutedDiscordTriageCandidate,
    index: number
  ): VaultProposedChange | null {
    const action = getChangeAction(item);
  
    if (!action || !item.vaultRoute.destination) {
      return null;
    }
  
    const title = item.classification.titleGuess ?? item.fragment.content;
    const destinationPath = item.vaultRoute.destination.relativePath;
  
    return {
      id: `change-${index + 1}`,
      status: "pending",
      action,
      title,
      destinationPath,
      section: item.vaultRoute.destination.section,
      sourceMessageId: item.message.id,
      sourceFragmentId: item.fragment.id,
      sourceAuthor: item.message.authorLabel,
      sourceText: item.fragment.content,
      classificationKind: item.classification.kind,
      classificationConfidence: item.classification.confidence,
      routeConfidence: item.vaultRoute.confidence,
      proposedContent: buildProposedContent(item, action),
      reasoning: [...item.classification.reasoning, ...item.vaultRoute.reasoning],
    };
  }
  
  function summarizeChanges(changes: VaultProposedChange[]) {
    const createCount = changes.filter(
      (change) => change.action === "create_new_note"
    ).length;
    const appendCount = changes.filter(
      (change) => change.action === "append_existing_note"
    ).length;
    const inboxCount = changes.filter(
      (change) => change.action === "append_inbox"
    ).length;
    const approvedCount = changes.filter(
      (change) => change.status === "approved"
    ).length;
    const rejectedCount = changes.filter(
      (change) => change.status === "rejected"
    ).length;
    const pendingCount = changes.filter(
      (change) => change.status === "pending"
    ).length;
  
    return {
      totalChanges: changes.length,
      createCount,
      appendCount,
      inboxCount,
      approvedCount,
      rejectedCount,
      pendingCount,
    };
  }
  
  export function buildVaultPullRequestFromTriagePlan(
    plan: StoredDiscordTriagePlan
  ): VaultPullRequest {
    const changes = plan.candidates
      .map((candidate, index) => buildChange(candidate, index))
      .filter((change): change is VaultProposedChange => Boolean(change));
  
    return {
      id: `discord-vault-pr-${Date.now()}`,
      source: "discord-triage",
      status: "draft",
      createdAt: new Date().toISOString(),
      triagePlanId: plan.id,
      summary: summarizeChanges(changes),
      changes,
    };
  }