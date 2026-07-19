import { ItchRssParseError } from "../errors";
import type {
  ParsedItchRssEntry,
  ParsedItchRssFeed,
} from "./types";

const MAX_XML_CHARACTERS = 2_500_000;

export function parseItchRssSource(xml: string): ParsedItchRssFeed {
  const source = xml.replace(/^\uFEFF/, "").trim();

  if (!source) {
    throw new ItchRssParseError("The RSS response was empty.");
  }

  if (source.length > MAX_XML_CHARACTERS) {
    throw new ItchRssParseError(
      `The RSS response exceeded ${MAX_XML_CHARACTERS.toLocaleString()} characters.`,
    );
  }

  const isRss = /<(rss|rdf:RDF)\b/i.test(source);
  const isAtom = /<feed\b/i.test(source);

  if (!isRss && !isAtom) {
    throw new ItchRssParseError("The response did not contain an RSS or Atom feed.");
  }

  const entryBlocks = isAtom
    ? extractBlocks(source, "entry")
    : extractBlocks(source, "item");

  const feedContainer =
    extractFirstBlock(source, isAtom ? "feed" : "channel") ?? source;

  return {
    title: cleanText(extractTagText(feedContainer, ["title"])),
    link: extractFeedLink(feedContainer, isAtom),
    description: cleanDescription(
      extractTagText(feedContainer, ["description", "subtitle"]),
    ),
    entries: entryBlocks.map((block) => parseEntry(block, isAtom)),
  };
}

function parseEntry(block: string, isAtom: boolean): ParsedItchRssEntry {
  const categories = [
    ...extractAllTagText(block, "category"),
    ...extractAtomCategoryTerms(block),
  ]
    .map((value) => cleanText(value))
    .filter((value): value is string => Boolean(value));

  const title = cleanText(extractTagText(block, ["title"])) ?? "Untitled itch.io project";
  const link = extractEntryLink(block, isAtom);
  const guid = cleanText(extractTagText(block, ["guid", "id"]));
  const rawDescription = extractTagText(block, [
    "description",
    "summary",
    "content:encoded",
    "content",
  ]);
  const description = cleanDescription(rawDescription);
  const imageUrl = extractEntryImage(block, rawDescription, link);
  const creatorName = cleanText(
    extractTagText(block, ["dc:creator", "creator", "author", "name"]),
  );

  return {
    title,
    link,
    guid,
    description,
    creatorName,
    imageUrl,
    publishedAt: normalizeDate(
      extractTagText(block, ["pubDate", "published", "dc:date"]),
    ),
    updatedAt: normalizeDate(extractTagText(block, ["updated"])),
    categories: [...new Set(categories)],
  };
}


function extractEntryImage(
  block: string,
  rawDescription: string | undefined,
  entryLink: string | undefined,
): string | undefined {
  const candidates: string[] = [];
  const tagPatterns = [
    /<media:content\b([^>]*)\/?\s*>/gi,
    /<media:thumbnail\b([^>]*)\/?\s*>/gi,
    /<enclosure\b([^>]*)\/?\s*>/gi,
    /<itunes:image\b([^>]*)\/?\s*>/gi,
  ];

  for (const pattern of tagPatterns) {
    for (const match of block.matchAll(pattern)) {
      const attributes = match[1] ?? "";
      const type = extractAttribute(attributes, "type")?.toLowerCase();
      const medium = extractAttribute(attributes, "medium")?.toLowerCase();
      if (type && !type.startsWith("image/") && medium !== "image") {
        continue;
      }
      const value =
        extractAttribute(attributes, "url") ??
        extractAttribute(attributes, "href") ??
        extractAttribute(attributes, "src");
      if (value) {
        candidates.push(decodeXmlText(value));
      }
    }
  }

  if (rawDescription) {
    const imageMatch = rawDescription.match(/<img\b[^>]*\bsrc\s*=\s*(["'])(.*?)\1/i);
    if (imageMatch?.[2]) {
      candidates.push(decodeXmlText(imageMatch[2]));
    }
  }

  for (const candidate of candidates) {
    try {
      const url = new URL(candidate, entryLink);
      if (url.protocol !== "https:" && url.protocol !== "http:") {
        continue;
      }
      const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
      if (
        hostname !== "itch.io" &&
        !hostname.endsWith(".itch.io") &&
        hostname !== "itch.zone" &&
        !hostname.endsWith(".itch.zone")
      ) {
        continue;
      }
      if (url.protocol === "http:") {
        url.protocol = "https:";
      }
      url.hash = "";
      return url.toString();
    } catch {
      // Ignore malformed optional image URLs.
    }
  }

  return undefined;
}

function extractFeedLink(container: string, isAtom: boolean): string | undefined {
  if (isAtom) {
    return extractAtomLink(container);
  }

  return cleanText(extractTagText(container, ["link"]));
}

function extractEntryLink(block: string, isAtom: boolean): string | undefined {
  if (isAtom) {
    return extractAtomLink(block);
  }

  return cleanText(extractTagText(block, ["link"]));
}

function extractAtomLink(block: string): string | undefined {
  const matches = [...block.matchAll(/<link\b([^>]*)\/?\s*>/gi)];

  for (const match of matches) {
    const attributes = match[1] ?? "";
    const relation = extractAttribute(attributes, "rel")?.toLowerCase();
    const href = extractAttribute(attributes, "href");

    if (href && (!relation || relation === "alternate")) {
      return decodeXmlText(href);
    }
  }

  return undefined;
}

function extractAtomCategoryTerms(block: string): string[] {
  const values: string[] = [];

  for (const match of block.matchAll(/<category\b([^>]*)\/?\s*>/gi)) {
    const term = extractAttribute(match[1] ?? "", "term");
    if (term) {
      values.push(decodeXmlText(term));
    }
  }

  return values;
}

function extractAttribute(attributes: string, name: string): string | undefined {
  const expression = new RegExp(
    `(?:^|\\s)${escapeRegExp(name)}\\s*=\\s*(["'])(.*?)\\1`,
    "i",
  );
  return expression.exec(attributes)?.[2];
}

function extractBlocks(xml: string, tagName: string): string[] {
  const expression = new RegExp(
    `<${escapeRegExp(tagName)}\\b[^>]*>([\\s\\S]*?)<\\/${escapeRegExp(tagName)}>`,
    "gi",
  );

  return [...xml.matchAll(expression)].map((match) => match[1] ?? "");
}

function extractFirstBlock(xml: string, tagName: string): string | undefined {
  return extractBlocks(xml, tagName)[0];
}

function extractTagText(block: string, tagNames: string[]): string | undefined {
  for (const tagName of tagNames) {
    const value = extractAllTagText(block, tagName)[0];
    if (value !== undefined) {
      return value;
    }
  }

  return undefined;
}

function extractAllTagText(block: string, tagName: string): string[] {
  const expression = new RegExp(
    `<${escapeRegExp(tagName)}\\b[^>]*>([\\s\\S]*?)<\\/${escapeRegExp(tagName)}>`,
    "gi",
  );

  return [...block.matchAll(expression)].map((match) => unwrapCdata(match[1] ?? ""));
}

function cleanText(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const cleaned = decodeXmlText(stripHtml(unwrapCdata(value)))
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/[\u202A-\u202E\u2066-\u2069]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned || undefined;
}

function cleanDescription(value: string | undefined): string | undefined {
  const cleaned = cleanText(value);
  if (!cleaned) {
    return undefined;
  }

  return cleaned.length > 600 ? `${cleaned.slice(0, 597).trimEnd()}...` : cleaned;
}

function stripHtml(value: string): string {
  return value
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ");
}

function unwrapCdata(value: string): string {
  return value.replace(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/i, "$1");
}

function decodeXmlText(value: string): string {
  const named: Record<string, string> = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    nbsp: " ",
    quot: '"',
  };

  return value.replace(
    /&(#x?[0-9a-f]+|[a-z]+);/gi,
    (match, entity: string) => {
      if (entity.startsWith("#x") || entity.startsWith("#X")) {
        const codePoint = Number.parseInt(entity.slice(2), 16);
        return Number.isFinite(codePoint) ? safeCodePoint(codePoint, match) : match;
      }

      if (entity.startsWith("#")) {
        const codePoint = Number.parseInt(entity.slice(1), 10);
        return Number.isFinite(codePoint) ? safeCodePoint(codePoint, match) : match;
      }

      return named[entity.toLowerCase()] ?? match;
    },
  );
}

function safeCodePoint(codePoint: number, fallback: string): string {
  try {
    return String.fromCodePoint(codePoint);
  } catch {
    return fallback;
  }
}

function normalizeDate(value: string | undefined): string | undefined {
  const cleaned = cleanText(value);
  if (!cleaned) {
    return undefined;
  }

  const timestamp = Date.parse(cleaned);
  return Number.isNaN(timestamp) ? undefined : new Date(timestamp).toISOString();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
