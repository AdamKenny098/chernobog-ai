import type { ItchGamePlatforms, ItchGamePrice } from "../types";

export type EmbeddedListingMetadata = {
  rawTitle: string;
  cleanTitle: string;
  price?: ItchGamePrice;
  platforms: ItchGamePlatforms;
  tags: string[];
  recognizedTokens: string[];
};

const FORMAT_TAGS = new Map<string, string>([
  ["visual novel", "visual-novel"],
  ["visualnovel", "visual-novel"],
  ["vn", "visual-novel"],
  ["role playing", "role-playing"],
  ["role-playing", "role-playing"],
  ["roleplaying", "role-playing"],
  ["rpg", "role-playing"],
  ["simulation", "simulation"],
  ["sim", "simulation"],
  ["adventure", "adventure"],
  ["action", "action"],
  ["strategy", "strategy"],
  ["dating sim", "dating-sim"],
  ["dating simulator", "dating-sim"],
  ["interactive fiction", "interactive-fiction"],
  ["text based", "text-based"],
  ["text-based", "text-based"],
  ["management", "management"],
  ["life sim", "life-sim"],
  ["life simulation", "life-sim"],
  ["sandbox", "sandbox"],
  ["puzzle", "puzzle"],
  ["platformer", "platformer"],
  ["shooter", "shooter"],
  ["card game", "card-game"],
  ["roguelike", "roguelike"],
  ["dungeon crawler", "dungeon-crawler"],
  ["incremental", "incremental"],
  ["idle", "idle"],
  ["clicker", "clicker"],
]);

const TAG_TOKENS = new Map<string, string>([
  ["adult", "adult"],
  ["18+", "adult"],
  ["nsfw", "nsfw"],
  ["erotic", "erotic"],
  ["explicit", "explicit"],
  ["hentai", "hentai"],
  ["demo", "demo"],
  ["prototype", "prototype"],
  ["alpha", "alpha"],
  ["beta", "beta"],
  ["early access", "early-access"],
  ["complete", "complete"],
  ["completed", "complete"],
  ["in development", "in-development"],
]);

export function parseEmbeddedListingMetadata(value: string): EmbeddedListingMetadata {
  const rawTitle = cleanWhitespace(value).slice(0, 500);
  const platforms: ItchGamePlatforms = {
    windows: false,
    linux: false,
    macos: false,
    browser: false,
  };
  const tags = new Set<string>();
  const recognizedTokens: string[] = [];
  let price: ItchGamePrice | undefined;

  const cleanTitle = rawTitle.replace(/\[([^\]]{1,100})\]/g, (full, token: string) => {
    const parts = token
      .split(/[,/|]+/g)
      .map((part) => normalizeToken(part))
      .filter(Boolean);

    let recognized = false;
    for (const part of parts) {
      if (applyToken(part, platforms, tags, (nextPrice) => {
        price = choosePrice(price, nextPrice);
      })) {
        recognized = true;
        recognizedTokens.push(part);
      }
    }

    return recognized ? " " : full;
  });

  return {
    rawTitle,
    cleanTitle: cleanWhitespace(cleanTitle) || rawTitle,
    price,
    platforms,
    tags: [...tags].sort(),
    recognizedTokens: [...new Set(recognizedTokens)],
  };
}

function applyToken(
  token: string,
  platforms: ItchGamePlatforms,
  tags: Set<string>,
  setPrice: (price: ItchGamePrice) => void,
): boolean {
  if (!token) {
    return false;
  }

  if (/^(?:free|freeware|free game)$/.test(token)) {
    tags.add("free");
    setPrice({
      kind: "free",
      isFree: true,
      isOnSale: false,
      displayText: "Free",
    });
    return true;
  }

  if (/^(?:paid|commercial|premium)$/.test(token)) {
    tags.add("paid");
    setPrice({
      kind: "paid",
      isFree: false,
      isOnSale: false,
      displayText: "Paid",
    });
    return true;
  }

  if (/^(?:name your own price|pay what you want|pwyw)$/.test(token)) {
    tags.add("name-your-own-price");
    setPrice({
      kind: "name-your-own-price",
      isFree: true,
      isOnSale: false,
      displayText: "Name your own price",
    });
    return true;
  }

  if (/^(?:windows|win|win32|win64)$/.test(token)) {
    platforms.windows = true;
    tags.add("windows");
    return true;
  }

  if (/^(?:linux|linux64)$/.test(token)) {
    platforms.linux = true;
    tags.add("linux");
    return true;
  }

  if (/^(?:mac|macos|mac os|osx|os x)$/.test(token)) {
    platforms.macos = true;
    tags.add("macos");
    return true;
  }

  if (/^(?:browser|web|webgl|html5|play in browser)$/.test(token)) {
    platforms.browser = true;
    tags.add("browser");
    return true;
  }

  if (/^(?:android|apk)$/.test(token)) {
    tags.add("android");
    return true;
  }

  const formatTag = FORMAT_TAGS.get(token);
  if (formatTag) {
    tags.add(formatTag);
    return true;
  }

  const directTag = TAG_TOKENS.get(token);
  if (directTag) {
    tags.add(directTag);
    return true;
  }

  return false;
}

function choosePrice(
  current: ItchGamePrice | undefined,
  next: ItchGamePrice,
): ItchGamePrice {
  if (!current) {
    return next;
  }

  const priority: Record<ItchGamePrice["kind"], number> = {
    unknown: 0,
    free: 1,
    "name-your-own-price": 2,
    paid: 3,
  };

  return priority[next.kind] > priority[current.kind] ? next : current;
}

function normalizeToken(value: string): string {
  return cleanWhitespace(value)
    .toLowerCase()
    .replace(/[_.]+/g, " ")
    .replace(/\s*-\s*/g, "-")
    .replace(/^\W+|\W+$/g, "")
    .trim();
}

function cleanWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function hasAnyPlatform(platforms: ItchGamePlatforms): boolean {
  return Object.values(platforms).some(Boolean);
}

export function mergePlatforms(
  primary: ItchGamePlatforms,
  fallback: ItchGamePlatforms,
): ItchGamePlatforms {
  return {
    windows: primary.windows || fallback.windows,
    linux: primary.linux || fallback.linux,
    macos: primary.macos || fallback.macos,
    browser: primary.browser || fallback.browser,
  };
}
