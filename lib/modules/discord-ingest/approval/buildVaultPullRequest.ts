import fs from "node:fs";
import path from "node:path";

import type {
  RoutedDiscordTriageCandidate,
  StoredDiscordTriagePlan,
  VaultProposedChange,
  VaultProposedChangeAction,
  VaultPullRequest,
} from "../types";

const DEFAULT_VAULT_ROOT = path.join(process.cwd(), "vault", "chernobog");

const TITLE_PREFIX_PATTERNS = [
  /^project\s+idea\s*:\s*/i,
  /^idea\s*:\s*/i,
  /^project\s*:\s*/i,
  /^tool\s*:\s*/i,
  /^app\s*:\s*/i,
  /^feature\s*:\s*/i,
  /^note\s*:\s*/i,
];

const ACRONYM_WORDS = new Set([
  "ai",
  "api",
  "adr",
  "ar",
  "ca",
  "csv",
  "dnd",
  "gdd",
  "gpt",
  "gui",
  "html",
  "http",
  "json",
  "llm",
  "npc",
  "pc",
  "pdf",
  "pr",
  "readme",
  "ttrpg",
  "ui",
  "ux",
  "vr",
  "xml",
]);

const SMALL_TITLE_WORDS = new Set([
  "a",
  "an",
  "and",
  "as",
  "at",
  "but",
  "by",
  "for",
  "from",
  "in",
  "into",
  "nor",
  "of",
  "on",
  "or",
  "per",
  "the",
  "to",
  "via",
  "with",
]);

function getVaultRoot(): string {
  return process.env.CHERNOBOG_VAULT_ROOT ?? DEFAULT_VAULT_ROOT;
}

function normalizeRelativePath(relativePath: string): string {
  return relativePath.replace(/\\/g, "/").replace(/^\/+/, "").trim();
}

function resolveVaultPath(relativePath: string): string {
  const vaultRoot = path.resolve(getVaultRoot());
  const normalizedRelativePath = normalizeRelativePath(relativePath);
  const resolvedPath = path.resolve(vaultRoot, normalizedRelativePath);

  if (
    resolvedPath !== vaultRoot &&
    !resolvedPath.startsWith(`${vaultRoot}${path.sep}`)
  ) {
    throw new Error(
      `Refusing to inspect path outside vault root: ${normalizedRelativePath}`
    );
  }

  return resolvedPath;
}

function safePathExists(relativePath: string): boolean {
  try {
    return fs.existsSync(resolveVaultPath(relativePath));
  } catch {
    return false;
  }
}

function sanitizeMarkdown(value: string): string {
  return value.trim().replace(/\r\n/g, "\n");
}

function normalizeWhitespace(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function stripKnownTitlePrefix(value: string): string {
  let cleaned = normalizeWhitespace(value);

  for (const pattern of TITLE_PREFIX_PATTERNS) {
    cleaned = cleaned.replace(pattern, "");
  }

  return normalizeWhitespace(cleaned);
}

function stripListPrefix(value: string): string {
  return value
    .replace(/^\s*[-*•]\s+/, "")
    .replace(/^\s*\d+[.)]\s+/, "")
    .trim();
}

function hasUnbalancedParentheses(value: string): boolean {
  const open = (value.match(/\(/g) ?? []).length;
  const close = (value.match(/\)/g) ?? []).length;

  return open !== close;
}

function looksTruncated(value: string): boolean {
  const cleaned = value.trim();

  return (
    hasUnbalancedParentheses(cleaned) ||
    /[/|,:;-]\s*$/.test(cleaned) ||
    /\b(and|or|for|with|to|from|of|the|a|an)$/i.test(cleaned)
  );
}

function titleCaseWord(word: string, index: number): string {
  const lower = word.toLowerCase();

  if (ACRONYM_WORDS.has(lower)) {
    return lower === "dnd" ? "DnD" : lower.toUpperCase();
  }

  if (index > 0 && SMALL_TITLE_WORDS.has(lower)) {
    return lower;
  }

  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

function titleCaseSegment(segment: string): string {
  return segment
    .split(/(\s+|-)/)
    .map((part, index) => {
      if (/^\s+$/.test(part) || part === "-") {
        return part;
      }

      return titleCaseWord(part, index);
    })
    .join("");
}

function titleCasePreservingSeparators(value: string): string {
  return value
    .split(/(\s*\/\s*)/)
    .map((part) => {
      if (part.includes("/")) {
        return " / ";
      }

      return titleCaseSegment(part);
    })
    .join("")
    .replace(/\s+\/\s+/g, " / ");
}

function trimTitleLength(value: string, maxLength = 110): string {
  const cleaned = normalizeWhitespace(value);

  if (cleaned.length <= maxLength) {
    return cleaned;
  }

  const truncated = cleaned.slice(0, maxLength).replace(/\s+\S*$/, "").trim();

  if (hasUnbalancedParentheses(truncated)) {
    return truncated.replace(/\s*\([^)]*$/, "").trim();
  }

  return truncated;
}

function getBestTitle(item: RoutedDiscordTriageCandidate): string {
  const sourceTitle = stripKnownTitlePrefix(
    stripListPrefix(item.fragment.content)
  );
  const guessedTitle = item.classification.titleGuess
    ? stripKnownTitlePrefix(stripListPrefix(item.classification.titleGuess))
    : "";

  const normalizedSourceTitle = titleCasePreservingSeparators(sourceTitle);
  const normalizedGuessedTitle = guessedTitle
    ? titleCasePreservingSeparators(guessedTitle)
    : "";

  if (!normalizedGuessedTitle) {
    return trimTitleLength(normalizedSourceTitle);
  }

  if (looksTruncated(normalizedGuessedTitle)) {
    return trimTitleLength(normalizedSourceTitle);
  }

  if (
    normalizedSourceTitle.length > normalizedGuessedTitle.length + 8 &&
    normalizedSourceTitle
      .toLowerCase()
      .startsWith(normalizedGuessedTitle.toLowerCase())
  ) {
    return trimTitleLength(normalizedSourceTitle);
  }

  if (
    normalizedSourceTitle.length > normalizedGuessedTitle.length + 8 &&
    normalizedSourceTitle
      .toLowerCase()
      .includes(normalizedGuessedTitle.toLowerCase())
  ) {
    return trimTitleLength(normalizedSourceTitle);
  }

  return trimTitleLength(normalizedGuessedTitle);
}

function sanitizeFileName(value: string): string {
  return normalizeWhitespace(value)
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, " ")
    .replace(/\s+/g, " ")
    .replace(/[. ]+$/g, "")
    .trim();
}

function getProjectIdeaDestinationPath(title: string): string {
  const fileName = sanitizeFileName(title) || "Untitled Discord Idea";

  return `project-ideas/${fileName}.md`;
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

function formatYamlTags(tags: string[]): string {
  return tags.map((tag) => `  - ${tag}`).join("\n");
}

function getSourceDate(item: RoutedDiscordTriageCandidate): string {
  const timestamp = item.message.timestamp;

  if (!timestamp) {
    return "unknown";
  }

  return new Date(timestamp).toISOString();
}

function formatReasoning(item: RoutedDiscordTriageCandidate): string {
  return [...item.classification.reasoning, ...item.vaultRoute.reasoning]
    .map((reason) => `- ${reason}`)
    .join("\n");
}

function formatNewNoteContent(args: {
  item: RoutedDiscordTriageCandidate;
  title: string;
  destinationPath: string;
}): string {
  const { item, title, destinationPath } = args;
  const tags = buildTags(item);

  return sanitizeMarkdown(`---
type: ${item.classification.kind}
source: discord
status: captured
created: ${new Date().toISOString()}
tags:
${formatYamlTags(tags)}
---

# ${title}

## Summary

${stripKnownTitlePrefix(item.fragment.content)}

## Source

- Source: Discord project ideas
- Author: ${item.message.authorLabel}
- Message ID: ${item.message.id}
- Fragment ID: ${item.fragment.id}
- Captured At: ${getSourceDate(item)}

## Classification

- Kind: ${item.classification.kind}
- Confidence: ${Math.round(item.classification.confidence * 100)}%
- Project Guess: ${item.classification.projectGuess ?? "none"}

## Vault Routing

- Action: ${item.vaultRoute.action}
- Destination: ${destinationPath}
- Route Confidence: ${Math.round(item.vaultRoute.confidence * 100)}%

## Reasoning

${formatReasoning(item)}

## Next Action

Decide whether this should become an active project, be merged into an existing project, or be archived.
`);
}

function formatAppendContent(args: {
  item: RoutedDiscordTriageCandidate;
  title: string;
}): string {
  const { item, title } = args;

  return sanitizeMarkdown(`### ${title}

Source: Discord project ideas  
Author: ${item.message.authorLabel}  
Message ID: ${item.message.id}  
Fragment ID: ${item.fragment.id}  
Captured At: ${getSourceDate(item)}  
Classification: ${item.classification.kind}  
Confidence: ${Math.round(item.classification.confidence * 100)}%  
Route Confidence: ${Math.round(item.vaultRoute.confidence * 100)}%

${stripKnownTitlePrefix(item.fragment.content)}

Reasoning:
${formatReasoning(item)}
`);
}

function formatInboxContent(args: {
  item: RoutedDiscordTriageCandidate;
  title: string;
}): string {
  const { item, title } = args;

  return sanitizeMarkdown(`## ${title}

Status: needs review  
Source: Discord project ideas  
Author: ${item.message.authorLabel}  
Message ID: ${item.message.id}  
Fragment ID: ${item.fragment.id}  
Captured At: ${getSourceDate(item)}  
Classification: ${item.classification.kind}  
Confidence: ${Math.round(item.classification.confidence * 100)}%

${stripKnownTitlePrefix(item.fragment.content)}

Reasoning:
${formatReasoning(item)}
`);
}

function buildProposedContent(args: {
  item: RoutedDiscordTriageCandidate;
  action: VaultProposedChangeAction;
  title: string;
  destinationPath: string;
}): string {
  switch (args.action) {
    case "create_new_note":
      return formatNewNoteContent(args);

    case "append_existing_note":
      return formatAppendContent(args);

    case "append_inbox":
      return formatInboxContent(args);
  }
}

function buildInitialReviewWarnings(args: {
  action: VaultProposedChangeAction;
  destinationExists: boolean;
}): string[] {
  const warnings: string[] = [];

  if (args.action === "create_new_note" && args.destinationExists) {
    warnings.push(
      "Destination note already exists. If applied, this create_new_note change will be skipped to avoid overwriting."
    );
  }

  if (args.action === "append_existing_note" && !args.destinationExists) {
    warnings.push(
      "Target note does not exist. If applied, this append_existing_note change will be skipped."
    );
  }

  return warnings;
}

function getDestinationPath(args: {
  item: RoutedDiscordTriageCandidate;
  action: VaultProposedChangeAction;
  title: string;
}): string {
  if (args.action === "create_new_note") {
    return getProjectIdeaDestinationPath(args.title);
  }

  return args.item.vaultRoute.destination?.relativePath ?? "discord/ideas-inbox.md";
}

function buildChange(
  item: RoutedDiscordTriageCandidate,
  index: number
): VaultProposedChange | null {
  const action = getChangeAction(item);

  if (!action || !item.vaultRoute.destination) {
    return null;
  }

  const title = getBestTitle(item);
  const destinationPath = getDestinationPath({
    item,
    action,
    title,
  });
  const destinationExists = safePathExists(destinationPath);

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
    sourceText: stripKnownTitlePrefix(item.fragment.content),
    classificationKind: item.classification.kind,
    classificationConfidence: item.classification.confidence,
    routeConfidence: item.vaultRoute.confidence,
    proposedContent: buildProposedContent({
      item,
      action,
      title,
      destinationPath,
    }),
    reasoning: [...item.classification.reasoning, ...item.vaultRoute.reasoning],
    destinationExists,
    duplicateDestinationCount: 1,
    duplicateGroupKey: destinationPath.toLowerCase(),
    reviewWarnings: buildInitialReviewWarnings({
      action,
      destinationExists,
    }),
  };
}

function addWarning(change: VaultProposedChange, warning: string): void {
  const existingWarnings = change.reviewWarnings ?? [];

  if (!existingWarnings.includes(warning)) {
    change.reviewWarnings = [...existingWarnings, warning];
  }
}

function annotateDuplicateDestinations(
  changes: VaultProposedChange[]
): VaultProposedChange[] {
  const groups = new Map<string, VaultProposedChange[]>();

  for (const change of changes) {
    const key = change.destinationPath.toLowerCase();
    const existing = groups.get(key) ?? [];
    existing.push(change);
    groups.set(key, existing);
  }

  for (const [destinationPath, group] of groups) {
    if (group.length <= 1) {
      continue;
    }

    for (const change of group) {
      change.duplicateDestinationCount = group.length;
      change.duplicateGroupKey = destinationPath;

      addWarning(
        change,
        `This pull request contains ${group.length} changes targeting the same destination path. Review before applying.`
      );

      if (change.action === "create_new_note") {
        addWarning(
          change,
          "Multiple create_new_note changes share this destination. Only the first successful write can create the file; later ones will be skipped if the file exists."
        );
      }
    }
  }

  return changes;
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
  const changes = annotateDuplicateDestinations(
    plan.candidates
      .map((candidate, index) => buildChange(candidate, index))
      .filter((change): change is VaultProposedChange => Boolean(change))
  );

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