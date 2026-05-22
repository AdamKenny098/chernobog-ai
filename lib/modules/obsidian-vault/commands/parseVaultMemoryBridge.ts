import type { VaultParsedCommand } from "../types";

function normalize(message: string): string {
  return message.trim().replace(/\s+/g, " ");
}

function cleanTitle(value: string): string {
  return value
    .trim()
    .replace(/^\[\[|\]\]$/g, "")
    .replace(/^['"]|['"]$/g, "")
    .replace(/\.$/, "")
    .trim();
}

function base(message: string): Omit<VaultParsedCommand, "action"> {
  return {
    raw: message,
    normalized: normalize(message),
    domain: "vault",
    confidence: 0.82,
    reasons: ["vault memory bridge command detected"],
  };
}

function buildInboxTitle(prefix: string): string {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  return `${prefix} - ${stamp}`;
}

export function parseVaultMemoryBridge(
  message: string
): VaultParsedCommand | null {
  const normalized = normalize(message);
  const lower = normalized.toLowerCase();

  let match = normalized.match(
    /^(?:remember|save|store)\s+this\s+(?:in|to)\s+(?:the\s+)?(?:obsidian\s+)?vault\s*(?:as\s+(.+?))?\s*[:\-]\s*(.+)$/i
  );
  if (match) {
    const title = match[1]?.trim()
      ? cleanTitle(match[1])
      : buildInboxTitle("Captured Memory");

    return {
      ...base(message),
      action: "create",
      type: "note",
      note: title,
      folder: "01_Inbox",
      content: match[2].trim(),
      confidence: 0.9,
      reasons: ["vault capture memory command detected"],
    };
  }

  match = normalized.match(
    /^(?:save|record|capture)\s+this\s+(?:as\s+(?:a\s+)?(?:vault|obsidian)\s+decision|as\s+(?:a\s+)?decision\s+(?:in|to)\s+(?:the\s+)?(?:obsidian\s+)?vault)\s*(?::|-)\s*(.+)$/i
  );
  if (match) {
    const content = match[1].trim();
    const title = content.length > 80 ? `${content.slice(0, 77)}...` : content;

    return {
      ...base(message),
      action: "create",
      type: "decision",
      note: cleanTitle(title),
      folder: "06_Decisions",
      content,
      confidence: 0.88,
      reasons: ["vault decision capture command detected"],
    };
  }

  match = normalized.match(
    /^(?:append|add)\s+this\s+to\s+(?:today'?s\s+)?(?:(?:vault|obsidian)\s+)?(?:dev\s+)?log\s*(?::|-)\s*(.+)$/i
  );
  if (match && /\b(vault|obsidian)\b/i.test(normalized)) {
    return {
      ...base(message),
      action: "daily_log",
      content: match[1].trim(),
      confidence: 0.9,
      reasons: ["vault daily log bridge command detected"],
    };
  }

  match = normalized.match(
    /^(?:what\s+does\s+(?:the\s+)?(?:obsidian\s+)?vault\s+know|review\s+vault\s+memory|review\s+obsidian\s+memory)\s+(?:about\s+)?(.+)$/i
  );
  if (match) {
    return {
      ...base(message),
      action: "search",
      query: cleanTitle(match[1]),
      confidence: 0.86,
      reasons: ["vault memory review search command detected"],
    };
  }

  if (/^(?:vault\s+)?(?:memory\s+)?status$/.test(lower) || /^show\s+vault\s+state$/.test(lower)) {
    return {
      ...base(message),
      action: "status",
      confidence: 0.88,
      reasons: ["vault status command detected"],
    };
  }

  return null;
}
