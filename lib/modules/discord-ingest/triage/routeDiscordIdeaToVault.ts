import fs from "node:fs/promises";
import path from "node:path";

import type {
  ClassifiedDiscordMessage,
  RoutedDiscordTriageCandidate,
  VaultRoutingResult,
} from "../types";

type VaultNoteCandidate = {
  title: string;
  relativePath: string;
  scoreText: string;
};

const DEFAULT_VAULT_ROOT = path.join(process.cwd(), "vault", "chernobog");

const NOTE_SCAN_SKIP_DIRS = new Set([
  ".obsidian",
  ".git",
  "node_modules",
  ".next",
]);

const COMMON_WORDS = new Set([
  "a",
  "an",
  "and",
  "app",
  "for",
  "from",
  "in",
  "into",
  "is",
  "it",
  "of",
  "on",
  "or",
  "the",
  "this",
  "to",
  "tool",
  "tools",
  "with",
]);

function getVaultRoot(): string {
  return process.env.CHERNOBOG_VAULT_ROOT ?? DEFAULT_VAULT_ROOT;
}

function normalizeWhitespace(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function stripExtension(value: string): string {
  return value.replace(/\.md$/i, "");
}

function toTitleCase(value: string): string {
  return normalizeWhitespace(value)
    .split(" ")
    .filter(Boolean)
    .map((word) => {
      if (/^(AI|UI|UX|LLM|NPC|README|TTRPG|DnD)$/i.test(word)) {
        return word.toUpperCase();
      }

      return `${word.charAt(0).toUpperCase()}${word.slice(1)}`;
    })
    .join(" ");
}

function sanitizeFileName(value: string): string {
  return normalizeWhitespace(value)
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
    .replace(/\.$/, "")
    .slice(0, 80)
    .trim();
}

function getTitleForCandidate(item: ClassifiedDiscordMessage): string {
  const title =
    item.classification.titleGuess ??
    item.fragment.content ??
    "Untitled Discord Idea";

  return toTitleCase(sanitizeFileName(title));
}

function createDestination(relativePath: string, section?: string) {
  const title = stripExtension(path.basename(relativePath));

  return {
    noteTitle: title,
    relativePath,
    section,
  };
}

function clampConfidence(value: number): number {
  return Math.max(0.1, Math.min(0.98, Number(value.toFixed(2))));
}

function tokenize(value: string): string[] {
  return normalizeWhitespace(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3 && !COMMON_WORDS.has(token));
}

function scoreNoteCandidate(
  item: ClassifiedDiscordMessage,
  note: VaultNoteCandidate
): number {
  const content = [
    item.fragment.content,
    item.classification.kind,
    item.classification.titleGuess,
    item.classification.projectGuess,
  ]
    .filter(Boolean)
    .join(" ");

  const tokens = new Set(tokenize(content));
  const noteTokens = new Set(tokenize(note.scoreText));

  let score = 0;

  for (const token of tokens) {
    if (noteTokens.has(token)) {
      score += 1;
    }
  }

  const lowerContent = content.toLowerCase();
  const lowerPath = note.relativePath.toLowerCase();

  if (lowerContent.includes("chernobog") && lowerPath.includes("chernobog")) {
    score += 2;
  }

  if (lowerContent.includes("discord") && lowerPath.includes("discord")) {
    score += 3;
  }

  if (
    /\b(module|modules|modular|registry)\b/i.test(lowerContent) &&
    lowerPath.includes("module")
  ) {
    score += 3;
  }

  if (
    /\b(pipeline|orchestration)\b/i.test(lowerContent) &&
    lowerPath.includes("pipeline")
  ) {
    score += 3;
  }

  if (
    /\b(bug|broken|error|failed|issue)\b/i.test(lowerContent) &&
    (lowerPath.includes("known-failures") || lowerPath.includes("failure"))
  ) {
    score += 3;
  }

  if (
    /\b(decision|decided|going forward|from now on)\b/i.test(lowerContent) &&
    lowerPath.includes("decision")
  ) {
    score += 3;
  }

  return score;
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function scanVaultNotesAt(
  vaultRoot: string,
  currentDir: string = vaultRoot
): Promise<VaultNoteCandidate[]> {
  if (!(await pathExists(currentDir))) {
    return [];
  }

  const entries = await fs.readdir(currentDir, { withFileTypes: true });
  const notes: VaultNoteCandidate[] = [];

  for (const entry of entries) {
    if (NOTE_SCAN_SKIP_DIRS.has(entry.name)) {
      continue;
    }

    const absolutePath = path.join(currentDir, entry.name);

    if (entry.isDirectory()) {
      notes.push(...(await scanVaultNotesAt(vaultRoot, absolutePath)));
      continue;
    }

    if (!entry.isFile() || !entry.name.endsWith(".md")) {
      continue;
    }

    const relativePath = path.relative(vaultRoot, absolutePath).replace(/\\/g, "/");
    const title = stripExtension(entry.name);

    notes.push({
      title,
      relativePath,
      scoreText: `${title} ${relativePath}`,
    });
  }

  return notes;
}

async function scanVaultNotes(): Promise<VaultNoteCandidate[]> {
  return scanVaultNotesAt(getVaultRoot());
}

function findExplicitKnownDestination(
  item: ClassifiedDiscordMessage,
  notes: VaultNoteCandidate[]
): VaultRoutingResult | null {
  const content = item.fragment.content.toLowerCase();
  const kind = item.classification.kind;

  function noteExists(relativePath: string): boolean {
    return notes.some(
      (note) => note.relativePath.toLowerCase() === relativePath.toLowerCase()
    );
  }

  function existing(relativePath: string, section: string, reason: string) {
    return {
      action: "append_existing_note" as const,
      confidence: 0.88,
      destination: createDestination(relativePath, section),
      reasoning: [reason],
    };
  }

  if (
    kind === "architecture_note" &&
    /\b(module|modules|modular|registry)\b/i.test(content) &&
    noteExists("module-map.md")
  ) {
    return existing(
      "module-map.md",
      "Discord Triage",
      "architecture/module language matched the module map"
    );
  }

  if (
    kind === "architecture_note" &&
    /\b(pipeline|orchestration|command grammar)\b/i.test(content) &&
    noteExists("pipeline-map.md")
  ) {
    return existing(
      "pipeline-map.md",
      "Discord Triage",
      "pipeline/orchestration language matched the pipeline map"
    );
  }

  if (
    kind === "bug_report" &&
    noteExists("known-failures.md")
  ) {
    return existing(
      "known-failures.md",
      "Discord Triage",
      "bug/failure language matched known failures"
    );
  }

  if (
    /\bdiscord\b/i.test(content) &&
    noteExists("module-map.md")
  ) {
    return existing(
      "module-map.md",
      "Discord Triage",
      "Discord module idea matched the module map"
    );
  }

  if (
    /\bchernobog\b/i.test(content) &&
    noteExists("current-state.md")
  ) {
    return existing(
      "current-state.md",
      "Discord Triage",
      "Chernobog-specific idea matched current project state"
    );
  }

  return null;
}

function findBestExistingNote(
  item: ClassifiedDiscordMessage,
  notes: VaultNoteCandidate[]
): { note: VaultNoteCandidate; score: number } | null {
  let best: { note: VaultNoteCandidate; score: number } | null = null;

  for (const note of notes) {
    const score = scoreNoteCandidate(item, note);

    if (!best || score > best.score) {
      best = { note, score };
    }
  }

  if (!best || best.score < 5) {
    return null;
  }

  return best;
}

function buildNewNoteRoute(item: ClassifiedDiscordMessage): VaultRoutingResult {
  const title = getTitleForCandidate(item);
  const kind = item.classification.kind;

  if (kind === "decision") {
    return {
      action: "create_new_note",
      confidence: clampConfidence(item.classification.confidence),
      destination: createDestination(`decisions/${title}.md`),
      reasoning: ["decision-like fragment should become a reviewable decision note"],
    };
  }

  return {
    action: "create_new_note",
    confidence: clampConfidence(item.classification.confidence),
    destination: createDestination(`project-ideas/${title}.md`),
    reasoning: ["useful idea did not strongly match an existing vault note"],
  };
}

function buildInboxRoute(
  item: ClassifiedDiscordMessage,
  reason: string
): VaultRoutingResult {
  return {
    action: "append_inbox",
    confidence: clampConfidence(item.classification.confidence),
    destination: createDestination("discord/ideas-inbox.md", "Inbox"),
    reasoning: [reason],
  };
}

function routeSingleIdea(
  item: ClassifiedDiscordMessage,
  notes: VaultNoteCandidate[]
): VaultRoutingResult {
  const classification = item.classification;

  if (!classification.shouldKeep || classification.kind === "ignore") {
    return {
      action: "ignore",
      confidence: classification.confidence,
      reasoning: ["classification said this fragment should not be kept"],
    };
  }

  if (classification.kind === "general_chatter") {
    return {
      action: "ignore",
      confidence: classification.confidence,
      reasoning: ["general chatter is not routed to the vault"],
    };
  }

  if (classification.confidence < 0.55) {
    return buildInboxRoute(item, "classification confidence was too low for routing");
  }

  const explicitDestination = findExplicitKnownDestination(item, notes);

  if (explicitDestination) {
    return explicitDestination;
  }

  const bestExistingNote = findBestExistingNote(item, notes);

  if (bestExistingNote) {
    return {
      action: "append_existing_note",
      confidence: clampConfidence(0.64 + bestExistingNote.score * 0.03),
      destination: createDestination(
        bestExistingNote.note.relativePath,
        "Discord Triage"
      ),
      reasoning: [
        `best vault note match was ${bestExistingNote.note.relativePath} with score ${bestExistingNote.score}`,
      ],
    };
  }

  if (
    classification.kind === "project_idea" ||
    classification.kind === "feature_request" ||
    classification.kind === "decision"
  ) {
    return buildNewNoteRoute(item);
  }

  if (
    classification.kind === "architecture_note" ||
    classification.kind === "design_note" ||
    classification.kind === "task" ||
    classification.kind === "question"
  ) {
    return buildInboxRoute(
      item,
      "useful fragment needs review before choosing a permanent note"
    );
  }

  return {
    action: "needs_review",
    confidence: classification.confidence,
    destination: createDestination("discord/ideas-inbox.md", "Needs Review"),
    reasoning: ["fragment was useful but no safe route was found"],
  };
}

export async function routeDiscordIdeasToVault(
  classified: ClassifiedDiscordMessage[]
): Promise<RoutedDiscordTriageCandidate[]> {
  const notes = await scanVaultNotes();

  return classified.map((item) => ({
    ...item,
    vaultRoute: routeSingleIdea(item, notes),
  }));
}