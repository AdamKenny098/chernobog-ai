import { createHash } from "node:crypto";

import type {
  ItchClassification,
  ItchMetadataStatus,
} from "../contract";
import {
  hasAnyPlatform,
  mergePlatforms,
  parseEmbeddedListingMetadata,
} from "../domain/embeddedListingMetadata";
import { ItchProjectPageParseError } from "../errors";
import type {
  ItchEnrichmentField,
  ItchGameEnrichmentData,
  ItchGamePlatforms,
  ItchGamePrice,
} from "../types";
import { canonicalizeItchProjectUrl } from "./canonicalizeItchUrl";

export type ExtractItchProjectMetadataInput = {
  sourceUrl: string;
  finalUrl: string;
  fetchedAt: string;
  html: string;
  fallbackTitle?: string;
};

type HtmlAttributes = Record<string, string>;
type JsonRecord = Record<string, unknown>;

export function extractItchProjectMetadata(
  input: ExtractItchProjectMetadataInput,
): ItchGameEnrichmentData {
  if (!input.html.trim()) {
    throw new ItchProjectPageParseError(
      "The itch.io project page was empty.",
    );
  }

  const canonicalUrl = canonicalizeItchProjectUrl(input.finalUrl);
  if (!canonicalUrl) {
    throw new ItchProjectPageParseError(
      `The fetched page is not a valid itch.io project URL: ${input.finalUrl}`,
    );
  }

  const meta = extractMetaValues(input.html);
  const jsonLdNodes = extractJsonLdNodes(input.html);
  const titleTag = extractTitleTag(input.html);
  const detectedFields = new Set<ItchEnrichmentField>();
  const warnings: string[] = [];

  const pageRawTitle = firstNonEmpty(
    getMeta(meta, "og:title", "twitter:title", "title"),
    findJsonString(jsonLdNodes, ["name", "headline"]),
    extractElementTextByClasses(input.html, ["game_title", "project_title"]),
    titleTag,
  );
  const pageEmbedded = parseEmbeddedListingMetadata(pageRawTitle ?? "");
  const fallbackEmbedded = parseEmbeddedListingMetadata(input.fallbackTitle ?? "");
  const rawTitle = firstNonEmpty(input.fallbackTitle, pageRawTitle);
  const title = cleanProjectTitle(
    firstNonEmpty(pageEmbedded.cleanTitle, fallbackEmbedded.cleanTitle, pageRawTitle),
  );

  if (!title) {
    throw new ItchProjectPageParseError(
      "Could not extract a project title from the itch.io page.",
    );
  }
  detectedFields.add("title");

  const creatorName = cleanCreatorName(
    firstNonEmpty(
      findJsonPartyName(jsonLdNodes, ["author", "creator", "publisher"]),
      getMeta(meta, "author", "article:author", "itch:author"),
      extractElementTextByClasses(input.html, [
        "user_link",
        "game_author",
        "project_author",
        "byline",
      ]),
      extractCreatorFromTitleTag(titleTag),
    ),
  );
  if (creatorName) {
    detectedFields.add("creatorName");
  }

  const shortDescription = truncateText(
    firstNonEmpty(
      getMeta(
        meta,
        "og:description",
        "twitter:description",
        "description",
      ),
      findJsonString(jsonLdNodes, ["description"]),
      extractElementTextByClasses(input.html, [
        "formatted_description",
        "game_description",
        "project_description",
      ]),
    ),
    1_200,
  );
  if (shortDescription) {
    detectedFields.add("shortDescription");
  }

  const coverImageUrl = normalizePublicUrl(
    firstNonEmpty(
      getMeta(meta, "og:image", "twitter:image", "twitter:image:src"),
      findJsonImage(jsonLdNodes),
      extractImageUrlByClasses(input.html, [
        "cover_image",
        "game_header",
        "header",
        "screenshot",
        "screenshot_image",
      ]),
      extractLinkedImage(input.html),
      extractBackgroundImageByClasses(input.html, [
        "cover_image",
        "game_header",
        "header",
        "screenshot",
      ]),
      extractBestItchHostedImage(input.html),
    ),
    input.finalUrl,
  );
  if (coverImageUrl) {
    detectedFields.add("coverImageUrl");
  }

  const classificationResult = extractClassification(
    input.html,
    meta,
    jsonLdNodes,
  );
  if (classificationResult.detected) {
    detectedFields.add("classification");
  }

  const extractedPrice = extractPrice(input.html, meta, jsonLdNodes);
  const embeddedPrice = fallbackEmbedded.price ?? pageEmbedded.price;
  const priceResult =
    embeddedPrice && (!extractedPrice.detected || extractedPrice.price.kind === "unknown")
      ? { price: embeddedPrice, detected: true }
      : extractedPrice;
  if (priceResult.detected) {
    detectedFields.add("price");
  }

  const extractedPlatforms = extractPlatforms(input.html, meta, jsonLdNodes);
  const embeddedPlatforms = mergePlatforms(
    fallbackEmbedded.platforms,
    pageEmbedded.platforms,
  );
  const platformResult = {
    platforms: mergePlatforms(extractedPlatforms.platforms, embeddedPlatforms),
    detected:
      extractedPlatforms.detected || hasAnyPlatform(embeddedPlatforms),
  };
  if (platformResult.detected) {
    detectedFields.add("platforms");
  }

  const tags = [
    ...new Set([
      ...extractTags(input.html, jsonLdNodes),
      ...pageEmbedded.tags,
      ...fallbackEmbedded.tags,
    ]),
  ].sort();
  if (tags.length > 0) {
    detectedFields.add("tags");
  }

  const isNsfw = extractNsfw(input.html, meta, tags);
  if (isNsfw) {
    detectedFields.add("isNsfw");
  }

  const publishedAt = normalizeDate(
    firstNonEmpty(
      findJsonString(jsonLdNodes, ["datePublished"]),
      getMeta(meta, "article:published_time", "datepublished"),
    ),
  );
  if (publishedAt) {
    detectedFields.add("publishedAt");
  }

  const sourceUpdatedAt = normalizeDate(
    firstNonEmpty(
      findJsonString(jsonLdNodes, ["dateModified"]),
      getMeta(
        meta,
        "article:modified_time",
        "datemodified",
        "last-modified",
      ),
    ),
  );
  if (sourceUpdatedAt) {
    detectedFields.add("sourceUpdatedAt");
  }

  const completenessScore = calculateCompletenessScore(detectedFields);
  const metadataStatus: Extract<
    ItchMetadataStatus,
    "partial" | "enriched"
  > = shortDescription && coverImageUrl && tags.length > 0
    ? "enriched"
    : "partial";

  appendMissingWarnings(warnings, detectedFields);

  const metadataHash = hashMetadata({
    canonicalUrl,
    title,
    rawTitle,
    creatorName,
    shortDescription,
    coverImageUrl,
    classification: classificationResult.classification,
    price: priceResult.price,
    platforms: platformResult.platforms,
    tags,
    isNsfw,
    publishedAt,
    sourceUpdatedAt,
    detectedFields: [...detectedFields].sort(),
  });

  return {
    canonicalUrl,
    title,
    rawTitle,
    creatorName,
    shortDescription,
    coverImageUrl,
    classification: classificationResult.classification,
    price: priceResult.price,
    platforms: platformResult.platforms,
    tags,
    isNsfw,
    publishedAt,
    sourceUpdatedAt,
    fetchedAt: input.fetchedAt,
    metadataHash,
    completenessScore,
    metadataStatus,
    detectedFields: [...detectedFields],
    warnings,
  };
}

function extractMetaValues(html: string): Map<string, string> {
  const values = new Map<string, string>();
  const pattern = /<meta\b([^>]*)>/gi;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(html))) {
    const attributes = parseAttributes(match[1] ?? "");
    const key = firstNonEmpty(
      attributes.property,
      attributes.name,
      attributes.itemprop,
    )?.toLowerCase();
    const content = cleanText(attributes.content);

    if (key && content && !values.has(key)) {
      values.set(key, content);
    }
  }

  return values;
}

function getMeta(meta: Map<string, string>, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = meta.get(key.toLowerCase());
    if (value) {
      return value;
    }
  }

  return undefined;
}

function extractJsonLdNodes(html: string): JsonRecord[] {
  const nodes: JsonRecord[] = [];
  const pattern =
    /<script\b([^>]*)type\s*=\s*(?:"application\/ld\+json"|'application\/ld\+json'|application\/ld\+json)([^>]*)>([\s\S]*?)<\/script\s*>/gi;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(html))) {
    const raw = decodeHtmlEntities((match[3] ?? "").trim())
      .replace(/^\s*<!--/, "")
      .replace(/-->\s*$/, "")
      .trim();

    if (!raw) {
      continue;
    }

    try {
      flattenJsonLd(JSON.parse(raw), nodes);
    } catch {
      // A malformed optional JSON-LD block should not invalidate the page.
    }
  }

  return nodes;
}

function flattenJsonLd(value: unknown, output: JsonRecord[]): void {
  if (Array.isArray(value)) {
    for (const item of value) {
      flattenJsonLd(item, output);
    }
    return;
  }

  if (!isJsonRecord(value)) {
    return;
  }

  output.push(value);
  if (Array.isArray(value["@graph"])) {
    flattenJsonLd(value["@graph"], output);
  }
}

function findJsonString(
  nodes: JsonRecord[],
  keys: string[],
): string | undefined {
  for (const node of nodes) {
    for (const key of keys) {
      const value = node[key];
      if (typeof value === "string" && cleanText(value)) {
        return cleanText(value);
      }
    }
  }

  return undefined;
}

function findJsonPartyName(
  nodes: JsonRecord[],
  keys: string[],
): string | undefined {
  for (const node of nodes) {
    for (const key of keys) {
      const value = node[key];
      const name = extractPartyName(value);
      if (name) {
        return name;
      }
    }
  }

  return undefined;
}

function extractPartyName(value: unknown): string | undefined {
  if (typeof value === "string") {
    return cleanText(value);
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const name = extractPartyName(item);
      if (name) {
        return name;
      }
    }
    return undefined;
  }

  if (isJsonRecord(value) && typeof value.name === "string") {
    return cleanText(value.name);
  }

  return undefined;
}

function findJsonImage(nodes: JsonRecord[]): string | undefined {
  for (const node of nodes) {
    const value = node.image;
    if (typeof value === "string") {
      return value;
    }

    if (Array.isArray(value)) {
      const first = value.find((item) => typeof item === "string");
      if (typeof first === "string") {
        return first;
      }
    }

    if (isJsonRecord(value) && typeof value.url === "string") {
      return value.url;
    }
  }

  return undefined;
}

function extractClassification(
  html: string,
  meta: Map<string, string>,
  jsonLdNodes: JsonRecord[],
): { classification: ItchClassification; detected: boolean } {
  const candidates: string[] = [];

  const explicitMeta = getMeta(
    meta,
    "itch:classification",
    "classification",
    "application-category",
  );
  if (explicitMeta) {
    candidates.push(explicitMeta);
  }

  for (const node of jsonLdNodes) {
    const type = node["@type"];
    if (typeof type === "string") {
      candidates.push(type);
    } else if (Array.isArray(type)) {
      candidates.push(...type.filter((item): item is string => typeof item === "string"));
    }

    if (typeof node.applicationCategory === "string") {
      candidates.push(node.applicationCategory);
    }
  }

  const infoText = firstNonEmpty(
    extractElementTextByClasses(html, ["game_info_panel_widget"]),
    extractElementTextByClasses(html, ["game_info_panel"]),
  );
  if (infoText) {
    candidates.push(infoText.slice(0, 1_500));
  }

  for (const candidate of candidates) {
    const normalized = candidate.toLowerCase();
    if (/(asset|asset pack|game assets|sprites|textures)/.test(normalized)) {
      return { classification: "asset", detected: true };
    }
    if (/(comic|graphic novel|zine)/.test(normalized)) {
      return { classification: "comic", detected: true };
    }
    if (/(soundtrack|music album|audio album)/.test(normalized)) {
      return { classification: "soundtrack", detected: true };
    }
    if (
      /(video\s*game|videogame|downloadable game|html5 game|browser game|game mod)/.test(
        normalized,
      )
    ) {
      return { classification: "game", detected: true };
    }
  }

  return { classification: "game", detected: false };
}

function extractPrice(
  html: string,
  meta: Map<string, string>,
  jsonLdNodes: JsonRecord[],
): { price: ItchGamePrice; detected: boolean } {
  const offer = findJsonOffer(jsonLdNodes);
  const metaAmount = firstNonEmpty(
    getMeta(meta, "product:price:amount", "price", "offers:price"),
    extractItemPropValue(inputHtmlForPrice(html), "price"),
    offer?.amount,
  );
  const metaCurrency = firstNonEmpty(
    getMeta(
      meta,
      "product:price:currency",
      "pricecurrency",
      "offers:pricecurrency",
    ),
    extractItemPropValue(inputHtmlForPrice(html), "priceCurrency"),
    offer?.currency,
  );
  const accessibleForFree = findJsonBoolean(jsonLdNodes, [
    "isAccessibleForFree",
  ]);

  const priceTextCandidates = extractElementTextsByClasses(html, [
    "sale_price",
    "price_value",
    "buy_message",
    "button_message",
    "buy_btn",
    "buy_row",
    "purchase_banner",
    "purchase_row",
    "dollars",
  ]);
  const saleText = firstNonEmpty(
    ...extractElementTextsByClasses(html, [
      "sale_rate",
      "sale_message",
      "sale_text",
      "discount",
    ]),
  );
  const priceText = firstNonEmpty(
    priceTextCandidates.find((value) => looksLikePriceText(value)),
    metaAmount ? formatAmountText(metaAmount, metaCurrency) : undefined,
  );
  const combinedText = [priceText, saleText, ...priceTextCandidates]
    .filter(Boolean)
    .join(" ");
  const isOnSale = Boolean(
    saleText || /(?:\bon sale\b|\bdiscount\b|\d+\s*%\s*off)/i.test(combinedText),
  );
  const parsedAmount = parseAmountMinor(
    metaAmount ?? priceText,
    isOnSale && !metaAmount,
  );
  const currency = normalizeCurrency(
    metaCurrency ?? inferCurrency(priceText ?? combinedText),
  );
  const normalizedText = combinedText.toLowerCase();
  const isNameYourOwnPrice =
    /name your own price|pay what you want|donation optional/.test(
      normalizedText,
    );
  const isFree =
    isNameYourOwnPrice ||
    accessibleForFree === true ||
    parsedAmount === 0 ||
    (parsedAmount === undefined &&
      /\bfree\b|no payments|download now/.test(normalizedText));
  const kind: ItchGamePrice["kind"] = isNameYourOwnPrice
    ? "name-your-own-price"
    : isFree
      ? "free"
      : parsedAmount !== undefined || offer || /\bbuy now\b/.test(normalizedText)
        ? "paid"
        : "unknown";
  const detected = Boolean(
    offer ||
      metaAmount ||
      metaCurrency ||
      accessibleForFree !== undefined ||
      priceText ||
      saleText,
  );

  return {
    detected,
    price: {
      kind,
      amountMinor: parsedAmount,
      currency,
      displayText: cleanText(priceText),
      isFree,
      isOnSale,
      saleText: cleanText(saleText),
    },
  };
}

function findJsonOffer(
  nodes: JsonRecord[],
): { amount?: string; currency?: string } | undefined {
  for (const node of nodes) {
    const offers = Array.isArray(node.offers) ? node.offers : [node.offers];
    for (const offer of offers) {
      if (!isJsonRecord(offer)) {
        continue;
      }

      const amount = valueToString(offer.price ?? offer.lowPrice);
      const currency = valueToString(offer.priceCurrency);
      if (amount || currency) {
        return { amount, currency };
      }
    }
  }

  return undefined;
}

function findJsonBoolean(
  nodes: JsonRecord[],
  keys: string[],
): boolean | undefined {
  for (const node of nodes) {
    for (const key of keys) {
      const value = node[key];
      if (typeof value === "boolean") {
        return value;
      }
      if (typeof value === "string") {
        if (value.toLowerCase() === "true") {
          return true;
        }
        if (value.toLowerCase() === "false") {
          return false;
        }
      }
    }
  }

  return undefined;
}

function extractPlatforms(
  html: string,
  meta: Map<string, string>,
  jsonLdNodes: JsonRecord[],
): { platforms: ItchGamePlatforms; detected: boolean } {
  const platforms: ItchGamePlatforms = {
    windows: false,
    linux: false,
    macos: false,
    browser: false,
  };
  const signals: string[] = [];

  for (const node of jsonLdNodes) {
    const value = node.operatingSystem;
    if (typeof value === "string") {
      signals.push(value);
    } else if (Array.isArray(value)) {
      signals.push(...value.filter((item): item is string => typeof item === "string"));
    }
  }

  const platformMeta = getMeta(
    meta,
    "operating-system",
    "operatingsystem",
    "itch:platforms",
  );
  if (platformMeta) {
    signals.push(platformMeta);
  }

  const normalizedHtml = html.toLowerCase();
  if (
    /icon-windows(?:8)?|platform-windows|title\s*=\s*["'][^"']*windows/i.test(
      html,
    )
  ) {
    platforms.windows = true;
  }
  if (/icon-linux|icon-tux|platform-linux|title\s*=\s*["'][^"']*linux/i.test(html)) {
    platforms.linux = true;
  }
  if (
    /icon-apple|icon-macos|platform-osx|platform-mac|title\s*=\s*["'][^"']*(?:mac|os x)/i.test(
      html,
    )
  ) {
    platforms.macos = true;
  }
  if (
    /class\s*=\s*["'][^"']*(?:html_embed|launch_btn|play_btn)[^"']*["']/.test(
      normalizedHtml,
    ) ||
    />\s*(?:run game|play in browser|play game)\s*</i.test(html)
  ) {
    platforms.browser = true;
  }

  for (const signal of signals) {
    const normalized = signal.toLowerCase();
    platforms.windows ||= /windows|win32|win64/.test(normalized);
    platforms.linux ||= /linux/.test(normalized);
    platforms.macos ||= /macos|mac os|os x|macintosh/.test(normalized);
    platforms.browser ||= /browser|html5|web/.test(normalized);
  }

  return {
    platforms,
    detected: Object.values(platforms).some(Boolean),
  };
}

function extractTags(html: string, jsonLdNodes: JsonRecord[]): string[] {
  const tags = new Set<string>();
  const anchorPattern = /<a\b([^>]*)>([\s\S]*?)<\/a\s*>/gi;
  let match: RegExpExecArray | null;

  while ((match = anchorPattern.exec(html))) {
    const attributes = parseAttributes(match[1] ?? "");
    const href = decodeHtmlEntities(attributes.href ?? "");
    const classNames = (attributes.class ?? "").toLowerCase().split(/\s+/g);
    const tagPathMatch = href.match(/\/games\/tag-([^/?#]+)/i);

    if (tagPathMatch?.[1]) {
      addNormalizedTag(tags, decodeURIComponentSafe(tagPathMatch[1]));
      continue;
    }

    if (classNames.includes("tag")) {
      addNormalizedTag(tags, stripTags(match[2] ?? ""));
    }
  }

  for (const node of jsonLdNodes) {
    const keywords = node.keywords;
    if (typeof keywords === "string") {
      for (const value of keywords.split(/[,;|]/g)) {
        addNormalizedTag(tags, value);
      }
    } else if (Array.isArray(keywords)) {
      for (const value of keywords) {
        if (typeof value === "string") {
          addNormalizedTag(tags, value);
        }
      }
    }

    if (typeof node.genre === "string") {
      addNormalizedTag(tags, node.genre);
    } else if (Array.isArray(node.genre)) {
      for (const value of node.genre) {
        if (typeof value === "string") {
          addNormalizedTag(tags, value);
        }
      }
    }
  }

  return [...tags].sort();
}

function extractNsfw(
  html: string,
  meta: Map<string, string>,
  tags: string[],
): boolean {
  const rating = (
    firstNonEmpty(getMeta(meta, "rating", "content-rating", "itch:mature")) ?? ""
  ).toLowerCase();
  const normalized = html.slice(0, 80_000).toLowerCase();
  const matureTags = new Set([
    "adult",
    "erotic",
    "nsfw",
    "mature",
    "sexual-content",
  ]);

  return (
    tags.some((tag) => matureTags.has(tag)) ||
    /adult|mature|nsfw/.test(rating) ||
    normalized.includes("mature_content") ||
    normalized.includes("content intended for adults") ||
    normalized.includes("this page contains content intended for adults")
  );
}

function calculateCompletenessScore(
  fields: Set<ItchEnrichmentField>,
): number {
  const weights: Partial<Record<ItchEnrichmentField, number>> = {
    title: 0.2,
    creatorName: 0.1,
    shortDescription: 0.15,
    coverImageUrl: 0.15,
    classification: 0.05,
    price: 0.1,
    platforms: 0.1,
    tags: 0.15,
  };

  let total = 0;
  for (const [field, weight] of Object.entries(weights) as Array<
    [ItchEnrichmentField, number]
  >) {
    if (fields.has(field)) {
      total += weight;
    }
  }

  return Math.round(total * 100) / 100;
}

function appendMissingWarnings(
  warnings: string[],
  fields: Set<ItchEnrichmentField>,
): void {
  const expected: Array<[ItchEnrichmentField, string]> = [
    ["creatorName", "creator-not-found"],
    ["shortDescription", "description-not-found"],
    ["coverImageUrl", "cover-not-found"],
    ["tags", "tags-not-found"],
    ["platforms", "platforms-not-found"],
    ["price", "price-not-found"],
  ];

  for (const [field, warning] of expected) {
    if (!fields.has(field)) {
      warnings.push(warning);
    }
  }
}

function hashMetadata(value: Record<string, unknown>): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export function hashItchText(value: string | undefined): string | undefined {
  const cleaned = cleanText(value);
  return cleaned
    ? createHash("sha256").update(cleaned).digest("hex")
    : undefined;
}

function extractTitleTag(html: string): string | undefined {
  const match = html.match(/<title\b[^>]*>([\s\S]*?)<\/title\s*>/i);
  return match?.[1] ? stripTags(match[1]) : undefined;
}

function extractCreatorFromTitleTag(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const match = value.match(/\s+by\s+(.+?)\s*(?:-|\|)\s*itch\.io\s*$/i);
  return match?.[1] ? cleanText(match[1]) : undefined;
}

function cleanProjectTitle(value: string | undefined): string | undefined {
  const cleaned = cleanText(value);
  if (!cleaned) {
    return undefined;
  }

  return cleanText(
    cleaned
      .replace(/\s+by\s+.+?\s*(?:-|\|)\s*itch\.io\s*$/i, "")
      .replace(/\s*(?:-|\|)\s*itch\.io\s*$/i, ""),
  );
}

function cleanCreatorName(value: string | undefined): string | undefined {
  const cleaned = cleanText(value);
  if (!cleaned) {
    return undefined;
  }

  return cleanText(cleaned.replace(/^by\s+/i, ""));
}

function extractElementTextByClasses(
  html: string,
  classes: string[],
): string | undefined {
  return extractElementTextsByClasses(html, classes)[0];
}

function extractElementTextsByClasses(
  html: string,
  classes: string[],
): string[] {
  const expected = new Set(classes.map((value) => value.toLowerCase()));
  const values: string[] = [];
  const startPattern = /<([a-z][\w:-]*)\b([^>]*)>/gi;
  let match: RegExpExecArray | null;

  while ((match = startPattern.exec(html))) {
    const tagName = (match[1] ?? "").toLowerCase();
    if (isVoidElement(tagName)) {
      continue;
    }

    const attributes = parseAttributes(match[2] ?? "");
    const classNames = (attributes.class ?? "")
      .toLowerCase()
      .split(/\s+/g)
      .filter(Boolean);
    if (!classNames.some((className) => expected.has(className))) {
      continue;
    }

    const closingPattern = new RegExp(`<\\/${escapeRegExp(tagName)}\\s*>`, "i");
    const remaining = html.slice(startPattern.lastIndex);
    const closingMatch = closingPattern.exec(remaining);
    if (!closingMatch) {
      continue;
    }

    const innerHtml = remaining.slice(0, closingMatch.index);
    const text = truncateText(stripTags(innerHtml), 2_000);
    if (text && !values.includes(text)) {
      values.push(text);
    }
  }

  return values;
}

function extractImageUrlByClasses(
  html: string,
  classes: string[],
): string | undefined {
  const expected = new Set(classes.map((value) => value.toLowerCase()));
  const imagePattern = /<img\b([^>]*)>/gi;
  let match: RegExpExecArray | null;

  while ((match = imagePattern.exec(html))) {
    const attributes = parseAttributes(match[1] ?? "");
    const classNames = (attributes.class ?? "")
      .toLowerCase()
      .split(/\s+/g)
      .filter(Boolean);
    if (classNames.some((className) => expected.has(className))) {
      return firstNonEmpty(
        attributes.src,
        attributes["data-src"],
        attributes["data-lazy-src"],
      );
    }
  }

  const containerStartPattern = /<([a-z][\w:-]*)\b([^>]*)>/gi;
  while ((match = containerStartPattern.exec(html))) {
    const tagName = (match[1] ?? "").toLowerCase();
    const attributes = parseAttributes(match[2] ?? "");
    const classNames = (attributes.class ?? "")
      .toLowerCase()
      .split(/\s+/g)
      .filter(Boolean);
    if (!classNames.some((className) => expected.has(className))) {
      continue;
    }

    const nearby = html.slice(containerStartPattern.lastIndex, containerStartPattern.lastIndex + 6_000);
    const imageMatch = nearby.match(/<img\b([^>]*)>/i);
    if (imageMatch?.[1]) {
      const imageAttributes = parseAttributes(imageMatch[1]);
      return firstNonEmpty(
        imageAttributes.src,
        imageAttributes["data-src"],
        imageAttributes["data-lazy-src"],
      );
    }
  }

  return undefined;
}


function extractLinkedImage(html: string): string | undefined {
  for (const match of html.matchAll(/<link\b([^>]*)>/gi)) {
    const attributes = parseAttributes(match[1] ?? "");
    const rel = (attributes.rel ?? "").toLowerCase();
    const as = (attributes.as ?? "").toLowerCase();
    if (
      rel.split(/\s+/g).includes("image_src") ||
      (rel.split(/\s+/g).includes("preload") && as === "image")
    ) {
      const href = firstNonEmpty(attributes.href, attributes.imagesrcset);
      if (href) {
        return href.split(/\s*,\s*/g)[0]?.split(/\s+/g)[0];
      }
    }
  }

  return undefined;
}

function extractBackgroundImageByClasses(
  html: string,
  classes: string[],
): string | undefined {
  const expected = new Set(classes.map((value) => value.toLowerCase()));
  for (const match of html.matchAll(/<([a-z][\w:-]*)\b([^>]*)>/gi)) {
    const attributes = parseAttributes(match[2] ?? "");
    const classNames = (attributes.class ?? "")
      .toLowerCase()
      .split(/\s+/g)
      .filter(Boolean);
    if (!classNames.some((className) => expected.has(className))) {
      continue;
    }

    const direct = firstNonEmpty(
      attributes["data-background"],
      attributes["data-bg"],
      attributes["data-image"],
      attributes["data-src"],
    );
    if (direct) {
      return direct;
    }

    const style = attributes.style ?? "";
    const backgroundMatch = style.match(
      /background(?:-image)?\s*:\s*(?:[^;]*?)url\(\s*(["']?)(.*?)\1\s*\)/i,
    );
    if (backgroundMatch?.[2]) {
      return decodeHtmlEntities(backgroundMatch[2]);
    }
  }

  return undefined;
}

function extractBestItchHostedImage(html: string): string | undefined {
  let best: { value: string; score: number } | undefined;

  for (const match of html.matchAll(/<img\b([^>]*)>/gi)) {
    const attributes = parseAttributes(match[1] ?? "");
    const value = firstNonEmpty(
      attributes.src,
      attributes["data-src"],
      attributes["data-lazy-src"],
      attributes["data-original"],
    );
    if (!value || !/(?:itch\.zone|itch\.io)/i.test(value)) {
      continue;
    }

    const classText = `${attributes.class ?? ""} ${attributes.id ?? ""}`.toLowerCase();
    const altText = (attributes.alt ?? "").toLowerCase();
    const width = Number.parseInt(attributes.width ?? "0", 10) || 0;
    const height = Number.parseInt(attributes.height ?? "0", 10) || 0;
    let score = 0;

    if (/cover|header|screenshot|game_image|game-image/.test(classText)) score += 80;
    if (/cover|screenshot|game/.test(altText)) score += 20;
    if (/\/aW1hZ2Uv|img\.itch\.zone/i.test(value)) score += 30;
    if (width >= 300 || height >= 200) score += 20;
    if (width >= 600 || height >= 400) score += 10;
    if (/avatar|icon|logo|user_image|profile/.test(classText)) score -= 100;
    if (/avatar|icon|logo/.test(altText)) score -= 60;
    if (/favicon|badge|sprite/.test(value)) score -= 100;

    if (score > (best?.score ?? 0)) {
      best = { value, score };
    }
  }

  return best?.value;
}

function parseAttributes(value: string): HtmlAttributes {
  const attributes: HtmlAttributes = {};
  const pattern =
    /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(value))) {
    const name = (match[1] ?? "").toLowerCase();
    if (!name) {
      continue;
    }

    attributes[name] = decodeHtmlEntities(
      match[2] ?? match[3] ?? match[4] ?? "",
    );
  }

  return attributes;
}

function stripTags(value: string): string {
  return cleanText(
    decodeHtmlEntities(
      value
        .replace(/<script\b[\s\S]*?<\/script\s*>/gi, " ")
        .replace(/<style\b[\s\S]*?<\/style\s*>/gi, " ")
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/p\s*>/gi, "\n")
        .replace(/<[^>]+>/g, " "),
    ),
  ) ?? "";
}

function decodeHtmlEntities(value: string): string {
  const named: Record<string, string> = {
    amp: "&",
    apos: "'",
    gt: ">",
    hellip: "…",
    laquo: "«",
    ldquo: "“",
    lsquo: "‘",
    lt: "<",
    nbsp: " ",
    quot: '"',
    raquo: "»",
    rdquo: "”",
    rsquo: "’",
  };

  return value.replace(
    /&(?:#(\d+)|#x([0-9a-f]+)|([a-z]+));/gi,
    (entity, decimal: string, hexadecimal: string, name: string) => {
      if (decimal) {
        return safeCodePoint(Number.parseInt(decimal, 10), entity);
      }
      if (hexadecimal) {
        return safeCodePoint(Number.parseInt(hexadecimal, 16), entity);
      }
      return named[name.toLowerCase()] ?? entity;
    },
  );
}

function safeCodePoint(value: number, fallback: string): string {
  if (!Number.isFinite(value) || value < 0 || value > 0x10ffff) {
    return fallback;
  }

  try {
    return String.fromCodePoint(value);
  } catch {
    return fallback;
  }
}

function normalizePublicUrl(
  value: string | undefined,
  baseUrl: string,
): string | undefined {
  if (!value) {
    return undefined;
  }

  try {
    const url = new URL(decodeHtmlEntities(value), baseUrl);
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return undefined;
    }
    if (url.username || url.password) {
      return undefined;
    }
    if (!isAllowedItchAssetHost(url.hostname)) {
      return undefined;
    }
    if (url.protocol === "http:") {
      url.protocol = "https:";
    }
    url.hash = "";
    return url.toString();
  } catch {
    return undefined;
  }
}

function extractItemPropValue(html: string, itemProp: string): string | undefined {
  const startPattern = /<([a-z][\w:-]*)\b([^>]*)>/gi;
  let match: RegExpExecArray | null;

  while ((match = startPattern.exec(html))) {
    const attributes = parseAttributes(match[2] ?? "");
    if ((attributes.itemprop ?? "").toLowerCase() !== itemProp.toLowerCase()) {
      continue;
    }

    const directValue = firstNonEmpty(
      attributes.content,
      attributes.value,
      attributes["data-price"],
    );
    if (directValue) {
      return directValue;
    }

    const tagName = (match[1] ?? "").toLowerCase();
    if (isVoidElement(tagName)) {
      continue;
    }

    const remaining = html.slice(startPattern.lastIndex);
    const closing = new RegExp(`<\\/${escapeRegExp(tagName)}\\s*>`, "i").exec(remaining);
    if (closing) {
      const text = stripTags(remaining.slice(0, closing.index));
      if (text) {
        return text;
      }
    }
  }

  return undefined;
}

function inputHtmlForPrice(html: string): string {
  return html.slice(0, 250_000);
}

function isAllowedItchAssetHost(hostname: string): boolean {
  const normalized = hostname.trim().toLowerCase().replace(/\.$/, "");
  return (
    normalized === "itch.io" ||
    normalized.endsWith(".itch.io") ||
    normalized === "itch.zone" ||
    normalized.endsWith(".itch.zone")
  );
}

function normalizeDate(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? undefined : new Date(timestamp).toISOString();
}

function normalizeCurrency(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const normalized = value.trim().toUpperCase();
  const symbolMap: Record<string, string> = {
    "$": "USD",
    "€": "EUR",
    "£": "GBP",
    "¥": "JPY",
  };
  return symbolMap[normalized] ?? (/^[A-Z]{3}$/.test(normalized) ? normalized : undefined);
}

function inferCurrency(value: string): string | undefined {
  const code = value.match(/\b(USD|EUR|GBP|CAD|AUD|JPY)\b/i)?.[1];
  if (code) {
    return code.toUpperCase();
  }

  if (value.includes("€")) {
    return "EUR";
  }
  if (value.includes("£")) {
    return "GBP";
  }
  if (value.includes("¥")) {
    return "JPY";
  }
  if (value.includes("$")) {
    return "USD";
  }

  return undefined;
}

function parseAmountMinor(
  value: string | undefined,
  preferLast = false,
): number | undefined {
  if (!value) {
    return undefined;
  }

  const matches = [...value.matchAll(/(?:\d{1,3}(?:[.,]\d{3})+|\d+)(?:[.,]\d{1,2})?/g)];
  if (matches.length === 0) {
    return undefined;
  }

  const raw = (preferLast ? matches.at(-1) : matches[0])?.[0];
  if (!raw) {
    return undefined;
  }

  const normalized = normalizeDecimalNumber(raw);
  const amount = Number.parseFloat(normalized);
  return Number.isFinite(amount) && amount >= 0
    ? Math.round(amount * 100)
    : undefined;
}

function normalizeDecimalNumber(value: string): string {
  const lastComma = value.lastIndexOf(",");
  const lastPeriod = value.lastIndexOf(".");
  const decimalIndex = Math.max(lastComma, lastPeriod);

  if (decimalIndex === -1) {
    return value.replace(/[^\d]/g, "");
  }

  const fractionLength = value.length - decimalIndex - 1;
  if (fractionLength > 2) {
    return value.replace(/[^\d]/g, "");
  }

  const whole = value.slice(0, decimalIndex).replace(/[^\d]/g, "");
  const fraction = value.slice(decimalIndex + 1).replace(/[^\d]/g, "");
  return `${whole || "0"}.${fraction}`;
}

function formatAmountText(
  amount: string,
  currency: string | undefined,
): string {
  return cleanText(`${currency ?? ""} ${amount}`) ?? amount;
}

function looksLikePriceText(value: string): boolean {
  return /(?:[$€£¥]\s*\d|\d\s*(?:USD|EUR|GBP|CAD|AUD|JPY)\b|\bfree\b|name your own price|buy now|download now)/i.test(
    value,
  );
}

function addNormalizedTag(tags: Set<string>, value: string): void {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

  if (normalized && normalized.length <= 80) {
    tags.add(normalized);
  }
}

function cleanText(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const cleaned = decodeHtmlEntities(value)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/[\u202A-\u202E\u2066-\u2069]/g, "")
    .replace(/[ \t\f\v]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return cleaned || undefined;
}

function truncateText(
  value: string | undefined,
  maxLength: number,
): string | undefined {
  const cleaned = cleanText(value);
  if (!cleaned || cleaned.length <= maxLength) {
    return cleaned;
  }

  return `${cleaned.slice(0, maxLength - 1).trimEnd()}…`;
}

function firstNonEmpty(...values: Array<string | undefined>): string | undefined {
  for (const value of values) {
    const cleaned = cleanText(value);
    if (cleaned) {
      return cleaned;
    }
  }

  return undefined;
}

function valueToString(value: unknown): string | undefined {
  if (typeof value === "string") {
    return cleanText(value);
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return undefined;
}

function decodeURIComponentSafe(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function isJsonRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isVoidElement(tagName: string): boolean {
  return new Set([
    "area",
    "base",
    "br",
    "col",
    "embed",
    "hr",
    "img",
    "input",
    "link",
    "meta",
    "param",
    "source",
    "track",
    "wbr",
  ]).has(tagName);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
