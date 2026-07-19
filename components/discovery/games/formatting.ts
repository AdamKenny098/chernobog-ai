import type { Game, GamePrice, Platform, ScoreBreakdown } from "./types";

const PLATFORM_LABELS: Record<Platform, string> = {
  windows: "WIN",
  linux: "LINUX",
  macos: "MAC",
  browser: "WEB",
};

export function formatPrice(price: GamePrice): string {
  if (price.displayText?.trim()) return price.displayText.trim();
  if (price.kind === "free") return "FREE";
  if (price.kind === "name-your-own-price") return "NAME YOUR PRICE";
  if (typeof price.amountMinor === "number") {
    const currency = price.currency ?? "EUR";
    try {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency,
        maximumFractionDigits: 2,
      }).format(price.amountMinor / 100);
    } catch {
      return `${currency} ${(price.amountMinor / 100).toFixed(2)}`;
    }
  }
  return "PRICE UNKNOWN";
}

export function platformLabels(game: Game): string[] {
  const labels = (Object.entries(game.platforms) as Array<[Platform, boolean]>)
    .filter(([, enabled]) => enabled)
    .map(([platform]) => PLATFORM_LABELS[platform]);

  if (game.tags.includes("android") && !labels.includes("ANDROID")) {
    labels.push("ANDROID");
  }

  return labels;
}

export function formatDate(value?: string): string {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return new Intl.DateTimeFormat(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function formatRelativeTime(value?: string): string {
  if (!value) return "Never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  const difference = Date.now() - date.getTime();
  const hours = Math.floor(difference / 3_600_000);
  if (hours < 1) return "Less than an hour ago";
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  return formatDate(value);
}

export function scoreRows(breakdown: ScoreBreakdown): Array<[string, number]> {
  return [
    ["Tag affinity", breakdown.tagMatch],
    ["Text affinity", breakdown.textMatch],
    ["Platform", breakdown.platformMatch],
    ["Price", breakdown.priceMatch],
    ["Source quality", breakdown.sourceQuality],
    ["Recency", breakdown.recency],
    ["Novelty", breakdown.novelty],
    ["Feedback", breakdown.feedbackAdjustment],
    ["Penalties", breakdown.penalties],
  ];
}

export function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}
