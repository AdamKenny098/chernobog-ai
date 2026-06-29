import type { VaultNoteType, VaultParsedCommand } from "../types";
import { parseVaultMemoryBridge } from "./parseVaultMemoryBridge";

const VALID_NOTE_TYPES = new Set<VaultNoteType>([
  "note",
  "project",
  "feature",
  "decision",
  "dev_log",
  "bug",
  "task",
  "concept",
  "research",
]);

function normalize(message: string): string {
  return message.trim().replace(/\s+/g, " ");
}

function base(message: string): Omit<VaultParsedCommand, "action"> {
  return {
    raw: message,
    normalized: normalize(message),
    domain: "vault",
    confidence: 0.75,
    reasons: [],
  };
}

function detectType(value: string | undefined): VaultNoteType | undefined {
  if (!value) return undefined;
  const normalized = value.trim().toLowerCase().replace(/\s+/g, "_") as VaultNoteType;
  return VALID_NOTE_TYPES.has(normalized) ? normalized : undefined;
}

function cleanNoteTitle(value: string): string {
  return value
    .trim()
    .replace(/^['"]|['"]$/g, "")
    .replace(/\.$/, "")
    .trim();
}

export function parseVaultCommand(message: string): VaultParsedCommand | null {
  const normalized = normalize(message);
  const lower = normalized.toLowerCase();

  const bridgeCommand = parseVaultMemoryBridge(message);
  if (bridgeCommand) return bridgeCommand;

  const mentionsVault = /\b(vault|obsidian)\b/.test(lower);
  const startsWithVault = /^vault\b/.test(lower);

  if (!mentionsVault && !startsWithVault) return null;

  const withoutPrefix = normalized.replace(/^vault\s+/i, "");

  if (/^(status|state|context|review state)$/i.test(withoutPrefix)) {
    return {
      ...base(message),
      action: "status",
      confidence: 0.9,
      reasons: ["vault status command detected"],
    };
  }

  const reviewMatch = withoutPrefix.match(/^(review|inspect|what do you remember about)\s+(.+)$/i);
  if (reviewMatch) {
    return {
      ...base(message),
      action: "search",
      query: reviewMatch[2].trim(),
      confidence: 0.86,
      reasons: ["vault review command normalized to search"],
    };
  }

  let match = withoutPrefix.match(/^(search|find|look for)\s+(?:the\s+)?(?:vault\s+)?(?:for\s+)?(.+)$/i);
  if (match) {
    return {
      ...base(message),
      action: "search",
      query: match[2].trim(),
      confidence: 0.92,
      reasons: ["vault search command detected"],
    };
  }

  match = withoutPrefix.match(/^(read|show|open)\s+(?:vault\s+note\s+|note\s+)?(.+)$/i);
  if (match) {
    return {
      ...base(message),
      action: "read",
      note: cleanNoteTitle(match[2]),
      confidence: 0.9,
      reasons: ["vault read command detected"],
    };
  }

  match = withoutPrefix.match(
    /^(create|make|add)\s+(?:(project|feature|decision|dev log|bug|task|concept|research|note)\s+)?(?:vault\s+)?(?:note\s+)?(?:for\s+)?(.+)$/i
  );
  if (match) {
    const type = detectType(match[2]);
    return {
      ...base(message),
      action: "create",
      type: type ?? "note",
      note: cleanNoteTitle(match[3]),
      confidence: 0.9,
      reasons: ["vault create command detected"],
    };
  }

  match = withoutPrefix.match(/^append\s+(?:to\s+)?(.+?)\s+[:\-]\s+(.+)$/i);
  if (match) {
    return {
      ...base(message),
      action: "append",
      note: cleanNoteTitle(match[1]),
      content: match[2].trim(),
      confidence: 0.88,
      reasons: ["vault append command detected"],
    };
  }

  match = withoutPrefix.match(/^append\s+(.+?)\s+to\s+(?:vault\s+note\s+|note\s+)?(.+)$/i);
  if (match) {
    return {
      ...base(message),
      action: "append",
      note: cleanNoteTitle(match[2]),
      content: match[1].trim(),
      confidence: 0.84,
      reasons: ["natural vault append command detected"],
    };
  }

  match = withoutPrefix.match(/^link\s+(.+?)\s+(?:to|with)\s+(.+)$/i);
  if (match) {
    return {
      ...base(message),
      action: "link",
      note: cleanNoteTitle(match[1]),
      targetNote: cleanNoteTitle(match[2]),
      confidence: 0.92,
      reasons: ["vault link command detected"],
    };
  }

  match = withoutPrefix.match(/^backlinks?\s+(?:for\s+)?(.+)$/i);
  if (match) {
    return {
      ...base(message),
      action: "backlinks",
      note: cleanNoteTitle(match[1]),
      confidence: 0.9,
      reasons: ["vault backlink command detected"],
    };
  }

  if (/^(find\s+)?orphans?$|^find orphan notes$|^orphan notes$/i.test(withoutPrefix)) {
    return {
      ...base(message),
      action: "orphans",
      confidence: 0.9,
      reasons: ["vault orphan scan command detected"],
    };
  }

  match = withoutPrefix.match(/^index\s+(?:project\s+)?(.+)$/i);
  if (match) {
    return {
      ...base(message),
      action: "index",
      project: cleanNoteTitle(match[1]),
      confidence: 0.86,
      reasons: ["vault project index command detected"],
    };
  }

  match = withoutPrefix.match(/^(daily log|log today|dev log)\s*(?:for\s+(.+?))?\s*[:\-]\s*(.+)$/i);
  if (match) {
    return {
      ...base(message),
      action: "daily_log",
      project: match[2]?.trim(),
      content: match[3].trim(),
      confidence: 0.9,
      reasons: ["vault daily log command detected"],
    };
  }

  return null;
}
