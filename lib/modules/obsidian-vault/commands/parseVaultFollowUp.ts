import type { VaultParsedCommand } from "../types";
import {
  resolveActiveVaultNote,
  resolveVaultOrdinalReference,
} from "../session/vaultSession";

function normalize(message: string): string {
  return message.trim().replace(/\s+/g, " ");
}

function cleanNoteTitle(value: string): string {
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
    confidence: 0.78,
    reasons: ["vault follow-up resolved from active vault session state"],
  };
}

function containsVaultishPronoun(value: string): boolean {
  return /\b(it|that|this|the note|current note|active note)\b/i.test(value);
}

function parseOrdinalRead(message: string): string | null {
  const match = normalize(message).match(
    /^(?:read|show|open)\s+(?:the\s+)?(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|\d+(?:st|nd|rd|th)?)\s+(?:one|result|note)?$/i
  );

  return match?.[1] ?? null;
}

export function parseVaultFollowUp(
  sessionId: string,
  message: string
): VaultParsedCommand | null {
  const normalized = normalize(message);
  const lower = normalized.toLowerCase();

  const ordinal = parseOrdinalRead(message);
  if (ordinal) {
    const note = resolveVaultOrdinalReference(sessionId, ordinal);

    if (!note) {
      return null;
    }

    return {
      ...base(message),
      action: "read",
      note: note.title,
      confidence: 0.9,
      reasons: [
        `vault follow-up resolved ordinal "${ordinal}" to [[${note.title}]]`,
      ],
    };
  }

  if (/^(?:read|show|open)\s+(?:it|that|this|the note|current note|active note)$/i.test(lower)) {
    const active = resolveActiveVaultNote(sessionId);

    if (!active) {
      return null;
    }

    return {
      ...base(message),
      action: "read",
      note: active.title,
      confidence: 0.86,
      reasons: [`vault follow-up resolved active note [[${active.title}]]`],
    };
  }

  let match = normalized.match(
    /^show\s+backlinks(?:\s+for)?\s+(it|that|this|the note|current note|active note)$/i
  );
  if (match) {
    const active = resolveActiveVaultNote(sessionId);

    if (!active) {
      return null;
    }

    return {
      ...base(message),
      action: "backlinks",
      note: active.title,
      confidence: 0.86,
      reasons: [`vault follow-up resolved backlinks for [[${active.title}]]`],
    };
  }

  match = normalized.match(/^backlinks(?:\s+for)?\s+(it|that|this|the note|current note|active note)$/i);
  if (match) {
    const active = resolveActiveVaultNote(sessionId);

    if (!active) {
      return null;
    }

    return {
      ...base(message),
      action: "backlinks",
      note: active.title,
      confidence: 0.86,
      reasons: [`vault follow-up resolved backlinks for [[${active.title}]]`],
    };
  }

  match = normalized.match(/^link\s+(it|that|this|the note|current note|active note)\s+(?:to|with)\s+(.+)$/i);
  if (match) {
    const active = resolveActiveVaultNote(sessionId);

    if (!active) {
      return null;
    }

    return {
      ...base(message),
      action: "link",
      note: active.title,
      targetNote: cleanNoteTitle(match[2]),
      confidence: 0.88,
      reasons: [`vault follow-up resolved link from [[${active.title}]]`],
    };
  }

  match = normalized.match(/^link\s+(.+?)\s+(?:to|with)\s+(it|that|this|the note|current note|active note)$/i);
  if (match) {
    const active = resolveActiveVaultNote(sessionId);

    if (!active) {
      return null;
    }

    return {
      ...base(message),
      action: "link",
      note: cleanNoteTitle(match[1]),
      targetNote: active.title,
      confidence: 0.84,
      reasons: [`vault follow-up resolved target as active note [[${active.title}]]`],
    };
  }

  match = normalized.match(/^append\s+(.+?)\s+to\s+(it|that|this|the note|current note|active note)$/i);
  if (match && containsVaultishPronoun(match[2])) {
    const active = resolveActiveVaultNote(sessionId);

    if (!active) {
      return null;
    }

    return {
      ...base(message),
      action: "append",
      note: active.title,
      content: match[1].trim(),
      confidence: 0.82,
      reasons: [`vault follow-up resolved append target [[${active.title}]]`],
    };
  }

  match = normalized.match(/^append\s+to\s+(it|that|this|the note|current note|active note)\s*[:\-]\s*(.+)$/i);
  if (match) {
    const active = resolveActiveVaultNote(sessionId);

    if (!active) {
      return null;
    }

    return {
      ...base(message),
      action: "append",
      note: active.title,
      content: match[2].trim(),
      confidence: 0.84,
      reasons: [`vault follow-up resolved append target [[${active.title}]]`],
    };
  }

  return null;
}
