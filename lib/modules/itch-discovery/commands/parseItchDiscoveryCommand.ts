import type { ItchDiscoveryCommand } from "../types";

export function parseItchDiscoveryCommand(
  input: string,
): ItchDiscoveryCommand | null {
  const message = input.trim().replace(/\s+/g, " ");
  const lower = message.toLowerCase();
  if (!message) return null;

  if (/^(open|show|launch) (the )?(game radar|itch radar)$/.test(lower)) {
    return { type: "open-radar" };
  }
  if (/^(game radar|itch radar) status$/.test(lower) || lower === "show game radar status") {
    return { type: "status" };
  }
  if (/^(refresh|update|run) (the )?(game radar|itch radar)( now)?$/.test(lower)) {
    return { type: "refresh", force: lower.includes(" now") };
  }
  if (/^show (my )?game updates$/.test(lower) || lower === "show itch updates") {
    return { type: "show-updates" };
  }
  if (/^show (my )?saved games$/.test(lower)) {
    return { type: "show-feed", state: "saved" };
  }
  if (/^show (my )?played games$/.test(lower)) {
    return { type: "show-feed", state: "played" };
  }
  if (/^show (new |unseen )?(game )?recommendations$/.test(lower)) {
    return { type: "show-feed", state: "unseen" };
  }
  if (/^show (free )?horror games$/.test(lower) || lower === "show free horror") {
    return { type: "show-filter", query: "free-horror" };
  }
  if (/^show (games )?(on sale|sales)$/.test(lower)) {
    return { type: "show-filter", query: "on-sale" };
  }
  if (/^show (recently )?updated games$/.test(lower)) {
    return { type: "show-filter", query: "recently-updated" };
  }

  const priceMatch = lower.match(
    /^show games (?:under|below|cheaper than)\s*(?:€|eur|\$|usd|£|gbp)?\s*(\d+(?:\.\d{1,2})?)$/,
  );
  if (priceMatch) {
    return {
      type: "show-filter",
      query: "under-price",
      maximumPriceMinor: Math.round(Number(priceMatch[1]) * 100),
    };
  }

  const actionPatterns: Array<{
    regex: RegExp;
    action: "saved" | "hidden" | "played";
  }> = [
    { regex: /^(?:save|bookmark) (?:the game )?(.+)$/i, action: "saved" },
    { regex: /^(?:hide|exclude) (?:the game )?(.+)$/i, action: "hidden" },
    { regex: /^(?:mark|set) (?:the game )?(.+?) as played$/i, action: "played" },
    { regex: /^mark played (?:the game )?(.+)$/i, action: "played" },
  ];
  for (const pattern of actionPatterns) {
    const match = message.match(pattern.regex);
    if (match?.[1]) {
      return { type: "game-action", action: pattern.action, title: stripQuotes(match[1]) };
    }
  }

  const watchMatch = message.match(/^(watch|follow) (?:the game )?(.+?)(?: for updates)?$/i);
  if (watchMatch?.[2]) {
    return { type: "watch", enabled: true, title: stripQuotes(watchMatch[2]) };
  }
  const unwatchMatch = message.match(/^(?:unwatch|stop watching|unfollow) (?:the game )?(.+)$/i);
  if (unwatchMatch?.[1]) {
    return { type: "watch", enabled: false, title: stripQuotes(unwatchMatch[1]) };
  }

  const moreLike = message.match(/^more like (?:the game )?(.+)$/i);
  if (moreLike?.[1]) {
    return { type: "feedback", signalType: "more_like_this", title: stripQuotes(moreLike[1]) };
  }
  const lessLike = message.match(/^less like (?:the game )?(.+)$/i);
  if (lessLike?.[1]) {
    return { type: "feedback", signalType: "less_like_this", title: stripQuotes(lessLike[1]) };
  }

  const explain = message.match(/^(?:why was|why is) (?:the game )?(.+?) recommended\??$/i);
  if (explain?.[1]) {
    return { type: "explain", title: stripQuotes(explain[1]) };
  }

  return null;
}

function stripQuotes(value: string): string {
  return value.trim().replace(/^["']|["']$/g, "");
}
