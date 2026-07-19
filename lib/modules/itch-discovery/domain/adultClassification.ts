import type { ItchAdultStatus } from "../contract";
import type { ItchAdultSettings, ItchGame } from "../types";

const ADULT_TERMS = [
  "adult", "nsfw", "18+", "erotic", "sexual content", "adult visual novel",
  "adult dating sim", "mature romance", "hentai",
];
const ADULT_TAGS = new Set([
  "adult", "nsfw", "erotic", "adult-visual-novel", "adult-dating-sim",
  "mature-romance", "hentai",
]);

function normalizedText(value: string): string {
  return value.toLowerCase().replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
}

function containsTerm(text: string, term: string): boolean {
  const normalized = normalizedText(term);
  if (!normalized) return false;
  const escaped = normalized.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?:^|[^a-z0-9])${escaped}(?:$|[^a-z0-9])`, "i").test(text);
}

export type AdultClassification = {
  status: ItchAdultStatus;
  confidence: number;
  reasons: string[];
  contentTags: string[];
};

export function classifyItchAdultGame(game: ItchGame, settings: ItchAdultSettings): AdultClassification {
  const tags = game.tags.map(normalizedText);
  const text = normalizedText([game.title, game.shortDescription ?? "", tags.join(" ")].join(" "));
  const blocked = settings.hardExcludedTerms.filter((term) => containsTerm(text, term));
  if (blocked.length > 0) {
    return { status: "blocked", confidence: 1, reasons: blocked.map((term) => `blocked-term:${term}`), contentTags: [] };
  }

  const matchedTags = tags.filter((tag) => ADULT_TAGS.has(tag));
  const matchedTerms = ADULT_TERMS.filter((term) => containsTerm(text, term));
  const reasons: string[] = [];
  if (game.isNsfw) reasons.push("itch-nsfw-flag");
  reasons.push(...matchedTags.map((tag) => `adult-tag:${tag}`));
  reasons.push(...matchedTerms.map((term) => `adult-term:${term}`));

  if (game.isNsfw || matchedTags.length > 0 || matchedTerms.length > 0) {
    const confidence = game.isNsfw ? 1 : Math.min(0.95, 0.65 + 0.1 * (matchedTags.length + matchedTerms.length));
    return { status: "adult", confidence, reasons: [...new Set(reasons)], contentTags: [...new Set(matchedTags)] };
  }

  if (game.metadataStatus === "enriched" && game.shortDescription && game.tags.length > 0) {
    return { status: "non-adult", confidence: 0.75, reasons: ["no-adult-signal-in-enriched-metadata"], contentTags: [] };
  }
  return { status: "unknown", confidence: 0.25, reasons: ["insufficient-adult-metadata"], contentTags: [] };
}
