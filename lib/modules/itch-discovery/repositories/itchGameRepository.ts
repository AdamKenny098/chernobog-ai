import type Database from "better-sqlite3";

import type { ItchAdultStatus, ItchClassification, ItchMetadataStatus } from "../contract";
import { parseEmbeddedListingMetadata } from "../domain/embeddedListingMetadata";
import { determineItchMetadataStatus } from "../domain/metadataQuality";
import { ItchTagNormalizer } from "../domain/tagNormalization";
import type {
  ItchGame,
  ItchGameEnrichmentData,
  ItchGamePlatforms,
  ItchGamePrice,
  UpsertItchGameInput,
} from "../types";
import {
  createItchId,
  fromSqliteBoolean,
  nowIso,
  parseJson,
  stringifyJson,
  toSqliteBoolean,
} from "../database/helpers";
import { ItchCanonicalTagRepository } from "./itchCanonicalTagRepository";
import { ItchRawTagRepository } from "./itchRawTagRepository";
import { ItchTagAliasRepository } from "./itchTagAliasRepository";

export type DiscoveredItchGameInput = {
  canonicalUrl: string;
  title: string;
  rawTitle?: string;
  creatorName?: string;
  shortDescription?: string;
  coverImageUrl?: string;
  price?: ItchGamePrice;
  platforms?: ItchGamePlatforms;
  tags?: string[];
  publishedAt?: string;
  sourceUpdatedAt?: string;
  discoveredAt?: string;
};

export type DiscoveredItchGameUpsertResult = {
  game: ItchGame;
  created: boolean;
  changed: boolean;
};

export type ItchGameTagInput = {
  tag: string;
  source?: string;
  confidence?: number;
};

type ItchGameRow = {
  id: string;
  canonical_url: string;
  title: string;
  raw_title: string | null;
  creator_name: string | null;
  short_description: string | null;
  cover_image_url: string | null;
  classification: ItchClassification;
  price_text: string | null;
  minimum_price_minor: number | null;
  currency: string | null;
  price_kind: ItchGame["price"]["kind"];
  is_free: number;
  is_on_sale: number;
  sale_text: string | null;
  supports_windows: number;
  supports_linux: number;
  supports_macos: number;
  supports_browser: number;
  is_nsfw: number;
  adult_status: ItchAdultStatus;
  adult_confidence: number;
  adult_reasons_json: string;
  adult_content_tags_json: string;
  published_at: string | null;
  updated_at_source: string | null;
  first_discovered_at: string;
  last_discovered_at: string;
  last_enriched_at: string | null;
  metadata_status: ItchMetadataStatus;
  metadata_hash: string | null;
  is_available: number;
  created_at: string;
  updated_at: string;
};

export class ItchGameRepository {
  private readonly aliases: ItchTagAliasRepository;
  private readonly canonicalTags: ItchCanonicalTagRepository;
  private readonly rawTags: ItchRawTagRepository;
  private readonly tagNormalizer: ItchTagNormalizer;

  constructor(private readonly db: Database.Database) {
    this.aliases = new ItchTagAliasRepository(db);
    this.canonicalTags = new ItchCanonicalTagRepository(db);
    this.rawTags = new ItchRawTagRepository(db);
    this.tagNormalizer = new ItchTagNormalizer(this.aliases);
  }

  upsert(input: UpsertItchGameInput): ItchGame {
    const timestamp = nowIso();
    const firstDiscoveredAt = input.firstDiscoveredAt ?? timestamp;
    const lastDiscoveredAt = input.lastDiscoveredAt ?? timestamp;
    const id = input.id ?? createItchId("itch_game");

    this.db
      .prepare(
        `INSERT INTO itch_games (
          id,
          canonical_url,
          title,
          raw_title,
          creator_name,
          short_description,
          cover_image_url,
          classification,
          price_text,
          minimum_price_minor,
          currency,
          price_kind,
          is_free,
          is_on_sale,
          sale_text,
          supports_windows,
          supports_linux,
          supports_macos,
          supports_browser,
          is_nsfw,
          published_at,
          updated_at_source,
          first_discovered_at,
          last_discovered_at,
          last_enriched_at,
          metadata_status,
          metadata_hash,
          is_available,
          created_at,
          updated_at
        ) VALUES (
          @id,
          @canonicalUrl,
          @title,
          @rawTitle,
          @creatorName,
          @shortDescription,
          @coverImageUrl,
          @classification,
          @priceText,
          @minimumPriceMinor,
          @currency,
          @priceKind,
          @isFree,
          @isOnSale,
          @saleText,
          @supportsWindows,
          @supportsLinux,
          @supportsMacos,
          @supportsBrowser,
          @isNsfw,
          @publishedAt,
          @sourceUpdatedAt,
          @firstDiscoveredAt,
          @lastDiscoveredAt,
          @lastEnrichedAt,
          @metadataStatus,
          @metadataHash,
          @isAvailable,
          @createdAt,
          @updatedAt
        )
        ON CONFLICT(canonical_url) DO UPDATE SET
          title = excluded.title,
          raw_title = COALESCE(excluded.raw_title, itch_games.raw_title),
          creator_name = excluded.creator_name,
          short_description = excluded.short_description,
          cover_image_url = excluded.cover_image_url,
          classification = excluded.classification,
          price_text = excluded.price_text,
          minimum_price_minor = excluded.minimum_price_minor,
          currency = excluded.currency,
          price_kind = excluded.price_kind,
          is_free = excluded.is_free,
          is_on_sale = excluded.is_on_sale,
          sale_text = excluded.sale_text,
          supports_windows = excluded.supports_windows,
          supports_linux = excluded.supports_linux,
          supports_macos = excluded.supports_macos,
          supports_browser = excluded.supports_browser,
          is_nsfw = excluded.is_nsfw,
          published_at = excluded.published_at,
          updated_at_source = excluded.updated_at_source,
          last_discovered_at = excluded.last_discovered_at,
          last_enriched_at = excluded.last_enriched_at,
          metadata_status = excluded.metadata_status,
          metadata_hash = excluded.metadata_hash,
          is_available = excluded.is_available,
          updated_at = excluded.updated_at`,
      )
      .run({
        id,
        canonicalUrl: input.canonicalUrl,
        title: input.title,
        rawTitle: input.rawTitle ?? input.title,
        creatorName: input.creatorName ?? null,
        shortDescription: input.shortDescription ?? null,
        coverImageUrl: input.coverImageUrl ?? null,
        classification: input.classification,
        priceText: input.price.displayText ?? null,
        minimumPriceMinor: input.price.amountMinor ?? null,
        currency: input.price.currency ?? null,
        priceKind: input.price.kind,
        isFree: toSqliteBoolean(input.price.isFree),
        isOnSale: toSqliteBoolean(input.price.isOnSale),
        saleText: input.price.saleText ?? null,
        supportsWindows: toSqliteBoolean(input.platforms.windows),
        supportsLinux: toSqliteBoolean(input.platforms.linux),
        supportsMacos: toSqliteBoolean(input.platforms.macos),
        supportsBrowser: toSqliteBoolean(input.platforms.browser),
        isNsfw: toSqliteBoolean(input.isNsfw),
        publishedAt: input.publishedAt ?? null,
        sourceUpdatedAt: input.sourceUpdatedAt ?? null,
        firstDiscoveredAt,
        lastDiscoveredAt,
        lastEnrichedAt: input.lastEnrichedAt ?? null,
        metadataStatus: input.metadataStatus,
        metadataHash: input.metadataHash ?? null,
        isAvailable: toSqliteBoolean(input.isAvailable),
        createdAt: timestamp,
        updatedAt: timestamp,
      });

    const game = this.findByCanonicalUrl(input.canonicalUrl);
    if (!game) {
      throw new Error(`Failed to read game after upsert: ${input.canonicalUrl}`);
    }

    if (input.tags) {
      this.replaceTags(
        game.id,
        input.tags.map((tag) => ({ tag, source: "input", confidence: 1 })),
      );
    }

    return this.findById(game.id) ?? game;
  }

  upsertDiscovered(
    input: DiscoveredItchGameInput,
  ): DiscoveredItchGameUpsertResult {
    const existing = this.findByCanonicalUrl(input.canonicalUrl);
    const timestamp = nowIso();
    const discoveredAt = input.discoveredAt ?? timestamp;
    const id = existing?.id ?? createItchId("itch_game");

    this.db
      .prepare(
        `INSERT INTO itch_games (
          id, canonical_url, title, raw_title, creator_name, short_description,
          cover_image_url, classification, price_text, price_kind, is_free,
          is_on_sale, supports_windows, supports_linux, supports_macos,
          supports_browser, is_nsfw, published_at, updated_at_source,
          first_discovered_at, last_discovered_at, metadata_status,
          is_available, created_at, updated_at
        ) VALUES (
          @id, @canonicalUrl, @title, @rawTitle, @creatorName, @shortDescription,
          @coverImageUrl, 'game', @priceText, @priceKind, @isFree, 0,
          @supportsWindows, @supportsLinux, @supportsMacos, @supportsBrowser, 0,
          @publishedAt, @sourceUpdatedAt, @discoveredAt, @discoveredAt,
          'discovered', 1, @timestamp, @timestamp
        )
        ON CONFLICT(canonical_url) DO UPDATE SET
          title = CASE
            WHEN itch_games.metadata_status IN ('discovered', 'partial')
            THEN excluded.title
            ELSE itch_games.title
          END,
          raw_title = COALESCE(excluded.raw_title, itch_games.raw_title),
          creator_name = COALESCE(itch_games.creator_name, excluded.creator_name),
          short_description = COALESCE(
            itch_games.short_description,
            excluded.short_description
          ),
          cover_image_url = COALESCE(itch_games.cover_image_url, excluded.cover_image_url),
          price_text = CASE
            WHEN itch_games.price_kind = 'unknown' THEN excluded.price_text
            ELSE itch_games.price_text
          END,
          price_kind = CASE
            WHEN itch_games.price_kind = 'unknown' THEN excluded.price_kind
            ELSE itch_games.price_kind
          END,
          is_free = CASE
            WHEN itch_games.price_kind = 'unknown' THEN excluded.is_free
            ELSE itch_games.is_free
          END,
          supports_windows = MAX(itch_games.supports_windows, excluded.supports_windows),
          supports_linux = MAX(itch_games.supports_linux, excluded.supports_linux),
          supports_macos = MAX(itch_games.supports_macos, excluded.supports_macos),
          supports_browser = MAX(itch_games.supports_browser, excluded.supports_browser),
          published_at = COALESCE(itch_games.published_at, excluded.published_at),
          updated_at_source = COALESCE(
            excluded.updated_at_source,
            itch_games.updated_at_source
          ),
          last_discovered_at = excluded.last_discovered_at,
          is_available = 1,
          updated_at = excluded.updated_at`,
      )
      .run({
        id,
        canonicalUrl: input.canonicalUrl,
        title: input.title,
        rawTitle: input.rawTitle ?? input.title,
        creatorName: input.creatorName ?? null,
        shortDescription: input.shortDescription ?? null,
        coverImageUrl: input.coverImageUrl ?? null,
        priceText: input.price?.displayText ?? null,
        priceKind: input.price?.kind ?? "unknown",
        isFree: toSqliteBoolean(input.price?.isFree ?? false),
        supportsWindows: toSqliteBoolean(input.platforms?.windows ?? false),
        supportsLinux: toSqliteBoolean(input.platforms?.linux ?? false),
        supportsMacos: toSqliteBoolean(input.platforms?.macos ?? false),
        supportsBrowser: toSqliteBoolean(input.platforms?.browser ?? false),
        publishedAt: input.publishedAt ?? null,
        sourceUpdatedAt: input.sourceUpdatedAt ?? null,
        discoveredAt,
        timestamp,
      });

    const game = this.findByCanonicalUrl(input.canonicalUrl);
    if (!game) {
      throw new Error(`Failed to read discovered game: ${input.canonicalUrl}`);
    }

    if (input.tags?.length) {
      this.mergeTags(
        game.id,
        input.tags.map((tag) => ({
          tag,
          source: "rss-source",
          confidence: 0.6,
        })),
      );
    }

    const hydratedGame = this.findById(game.id) ?? game;
    return {
      game: hydratedGame,
      created: existing === null,
      changed:
        existing === null ||
        existing.title !== hydratedGame.title ||
        existing.creatorName !== hydratedGame.creatorName ||
        existing.shortDescription !== hydratedGame.shortDescription ||
        existing.sourceUpdatedAt !== hydratedGame.sourceUpdatedAt ||
        existing.tags.join("|") !== hydratedGame.tags.join("|"),
    };
  }

  mergeTags(gameId: string, tags: ItchGameTagInput[]): void {
    const merge = this.db.transaction(() => {
      this.writeNormalizedTags(gameId, tags, "merge");
    });

    merge();
  }

  replaceTags(gameId: string, tags: ItchGameTagInput[]): void {
    const replace = this.db.transaction(() => {
      this.writeNormalizedTags(gameId, tags, "replace");
    });

    replace();
  }

  findById(id: string): ItchGame | null {
    const row = this.db
      .prepare("SELECT * FROM itch_games WHERE id = ?")
      .get(id) as ItchGameRow | undefined;

    return row ? this.mapRow(row) : null;
  }

  findByCanonicalUrl(canonicalUrl: string): ItchGame | null {
    const row = this.db
      .prepare("SELECT * FROM itch_games WHERE canonical_url = ?")
      .get(canonicalUrl) as ItchGameRow | undefined;

    return row ? this.mapRow(row) : null;
  }

  listRecent(limit = 50): ItchGame[] {
    const rows = this.db
      .prepare(
        `SELECT * FROM itch_games
         ORDER BY last_discovered_at DESC
         LIMIT ?`,
      )
      .all(limit) as ItchGameRow[];

    return rows.map((row) => this.mapRow(row));
  }

  listAll(): ItchGame[] {
    const rows = this.db
      .prepare(
        `SELECT * FROM itch_games
         ORDER BY last_discovered_at DESC, title ASC, id ASC`,
      )
      .all() as ItchGameRow[];

    return rows.map((row) => this.mapRow(row));
  }

  listEnrichmentCandidates(options: {
    limit?: number;
    staleBefore?: string;
    includeFailed?: boolean;
  } = {}): ItchGame[] {
    const limit = Math.min(500, Math.max(1, Math.floor(options.limit ?? 40)));
    const staleBefore =
      options.staleBefore ?? new Date(Date.now() - 7 * 24 * 60 * 60 * 1_000).toISOString();
    const includeFailed = options.includeFailed ? 1 : 0;

    const rows = this.db
      .prepare(
        `SELECT * FROM itch_games
         WHERE is_available = 1
           AND (
             metadata_status = 'discovered'
             OR (
               metadata_status IN ('partial', 'stale')
               AND updated_at <= ?
             )
             OR (
               metadata_status = 'enriched'
               AND (last_enriched_at IS NULL OR last_enriched_at <= ?)
             )
             OR (
               ? = 1
               AND metadata_status = 'failed'
               AND updated_at <= ?
             )
           )
         ORDER BY
           CASE metadata_status
             WHEN 'discovered' THEN 0
             WHEN 'partial' THEN 1
             WHEN 'stale' THEN 2
             WHEN 'failed' THEN 3
             ELSE 4
           END ASC,
           COALESCE(last_enriched_at, first_discovered_at) ASC,
           first_discovered_at ASC
         LIMIT ?`,
      )
      .all(staleBefore, staleBefore, includeFailed, staleBefore, limit) as ItchGameRow[];

    return rows.map((row) => this.mapRow(row));
  }

  applyEnrichment(
    gameId: string,
    input: ItchGameEnrichmentData,
  ): { game: ItchGame; changed: boolean } {
    const existing = this.findById(gameId);
    if (!existing) {
      throw new Error(`Cannot enrich missing game: ${gameId}`);
    }

    const fields = new Set(input.detectedFields);
    const update = this.db.transaction(() => {
      this.db
        .prepare(
          `UPDATE itch_games SET
            title = @title,
            raw_title = COALESCE(@rawTitle, raw_title),
            creator_name = CASE WHEN @hasCreatorName = 1 THEN @creatorName ELSE creator_name END,
            short_description = CASE WHEN @hasShortDescription = 1 THEN @shortDescription ELSE short_description END,
            cover_image_url = CASE WHEN @hasCoverImageUrl = 1 THEN @coverImageUrl ELSE cover_image_url END,
            classification = CASE WHEN @hasClassification = 1 THEN @classification ELSE classification END,
            price_text = CASE WHEN @hasPrice = 1 THEN @priceText ELSE price_text END,
            minimum_price_minor = CASE WHEN @hasPrice = 1 THEN @minimumPriceMinor ELSE minimum_price_minor END,
            currency = CASE WHEN @hasPrice = 1 THEN @currency ELSE currency END,
            price_kind = CASE WHEN @hasPrice = 1 THEN @priceKind ELSE price_kind END,
            is_free = CASE WHEN @hasPrice = 1 THEN @isFree ELSE is_free END,
            is_on_sale = CASE WHEN @hasPrice = 1 THEN @isOnSale ELSE is_on_sale END,
            sale_text = CASE WHEN @hasPrice = 1 THEN @saleText ELSE sale_text END,
            supports_windows = CASE WHEN @hasPlatforms = 1 THEN @supportsWindows ELSE supports_windows END,
            supports_linux = CASE WHEN @hasPlatforms = 1 THEN @supportsLinux ELSE supports_linux END,
            supports_macos = CASE WHEN @hasPlatforms = 1 THEN @supportsMacos ELSE supports_macos END,
            supports_browser = CASE WHEN @hasPlatforms = 1 THEN @supportsBrowser ELSE supports_browser END,
            is_nsfw = CASE WHEN @hasIsNsfw = 1 THEN @isNsfw ELSE is_nsfw END,
            published_at = CASE WHEN @hasPublishedAt = 1 THEN @publishedAt ELSE published_at END,
            updated_at_source = CASE WHEN @hasSourceUpdatedAt = 1 THEN @sourceUpdatedAt ELSE updated_at_source END,
            last_enriched_at = @fetchedAt,
            metadata_status = @metadataStatus,
            metadata_hash = @metadataHash,
            is_available = 1,
            updated_at = @fetchedAt
           WHERE id = @gameId`,
        )
        .run({
          gameId,
          title: input.title,
          rawTitle: input.rawTitle ?? null,
          hasCreatorName: fields.has("creatorName") ? 1 : 0,
          creatorName: input.creatorName ?? null,
          hasShortDescription: fields.has("shortDescription") ? 1 : 0,
          shortDescription: input.shortDescription ?? null,
          hasCoverImageUrl: fields.has("coverImageUrl") ? 1 : 0,
          coverImageUrl: input.coverImageUrl ?? null,
          hasClassification: fields.has("classification") ? 1 : 0,
          classification: input.classification,
          hasPrice: fields.has("price") ? 1 : 0,
          priceText: input.price.displayText ?? null,
          minimumPriceMinor: input.price.amountMinor ?? null,
          currency: input.price.currency ?? null,
          priceKind: input.price.kind,
          isFree: toSqliteBoolean(input.price.isFree),
          isOnSale: toSqliteBoolean(input.price.isOnSale),
          saleText: input.price.saleText ?? null,
          hasPlatforms: fields.has("platforms") ? 1 : 0,
          supportsWindows: toSqliteBoolean(input.platforms.windows),
          supportsLinux: toSqliteBoolean(input.platforms.linux),
          supportsMacos: toSqliteBoolean(input.platforms.macos),
          supportsBrowser: toSqliteBoolean(input.platforms.browser),
          hasIsNsfw: fields.has("isNsfw") ? 1 : 0,
          isNsfw: toSqliteBoolean(input.isNsfw),
          hasPublishedAt: fields.has("publishedAt") ? 1 : 0,
          publishedAt: input.publishedAt ?? null,
          hasSourceUpdatedAt: fields.has("sourceUpdatedAt") ? 1 : 0,
          sourceUpdatedAt: input.sourceUpdatedAt ?? null,
          fetchedAt: input.fetchedAt,
          metadataStatus: input.metadataStatus,
          metadataHash: input.metadataHash,
        });

      if (fields.has("tags")) {
        this.writeNormalizedTags(
          gameId,
          input.tags.map((tag) => ({
            tag,
            source: "project-page",
            confidence: 1,
          })),
          "replace",
        );
      }
    });

    update();

    let game = this.findById(gameId);
    if (!game) {
      throw new Error(`Failed to read enriched game: ${gameId}`);
    }

    const resolvedStatus = determineItchMetadataStatus(game);
    if (resolvedStatus !== game.metadataStatus) {
      this.db
        .prepare(
          `UPDATE itch_games
           SET metadata_status = ?, updated_at = ?
           WHERE id = ?`,
        )
        .run(resolvedStatus, input.fetchedAt, gameId);
      game = this.findById(gameId);
      if (!game) {
        throw new Error(`Failed to read reconciled game: ${gameId}`);
      }
    }

    return {
      game,
      changed:
        existing.metadataHash !== game.metadataHash ||
        existing.isAvailable !== game.isAvailable ||
        existing.metadataStatus !== game.metadataStatus,
    };
  }


  repairEmbeddedMetadata(gameId: string): {
    game: ItchGame;
    changed: boolean;
    markedForEnrichment: boolean;
    recognizedTokens: string[];
  } {
    const existing = this.findById(gameId);
    if (!existing) {
      throw new Error(`Cannot repair missing game: ${gameId}`);
    }

    const embedded = parseEmbeddedListingMetadata(
      existing.rawTitle ?? existing.title,
    );
    const nextTitle = embedded.cleanTitle || existing.title;
    const useEmbeddedPrice =
      existing.price.kind === "unknown" && Boolean(embedded.price);
    const nextPrice = useEmbeddedPrice ? embedded.price! : existing.price;
    const nextPlatforms: ItchGamePlatforms = {
      windows: existing.platforms.windows || embedded.platforms.windows,
      linux: existing.platforms.linux || embedded.platforms.linux,
      macos: existing.platforms.macos || embedded.platforms.macos,
      browser: existing.platforms.browser || embedded.platforms.browser,
    };
    const markedForEnrichment =
      !existing.coverImageUrl &&
      (existing.metadataStatus !== "discovered" || Boolean(existing.lastEnrichedAt));

    const changed =
      nextTitle !== existing.title ||
      useEmbeddedPrice ||
      Object.entries(nextPlatforms).some(
        ([platform, enabled]) =>
          enabled !== existing.platforms[platform as keyof ItchGamePlatforms],
      ) ||
      embedded.tags.some((tag) => !existing.tags.includes(tag)) ||
      (existing.rawTitle ?? "") !== embedded.rawTitle ||
      markedForEnrichment;

    if (!changed) {
      return {
        game: existing,
        changed: false,
        markedForEnrichment: false,
        recognizedTokens: embedded.recognizedTokens,
      };
    }

    const timestamp = nowIso();
    const update = this.db.transaction(() => {
      this.db.prepare(
        `UPDATE itch_games SET
          title = ?,
          raw_title = COALESCE(raw_title, ?),
          price_text = ?,
          minimum_price_minor = ?,
          currency = ?,
          price_kind = ?,
          is_free = ?,
          supports_windows = ?,
          supports_linux = ?,
          supports_macos = ?,
          supports_browser = ?,
          metadata_status = CASE
            WHEN cover_image_url IS NULL OR trim(cover_image_url) = ''
            THEN 'discovered'
            ELSE metadata_status
          END,
          last_enriched_at = CASE
            WHEN cover_image_url IS NULL OR trim(cover_image_url) = ''
            THEN NULL
            ELSE last_enriched_at
          END,
          metadata_hash = CASE
            WHEN cover_image_url IS NULL OR trim(cover_image_url) = ''
            THEN NULL
            ELSE metadata_hash
          END,
          updated_at = ?
         WHERE id = ?`,
      ).run(
        nextTitle,
        embedded.rawTitle,
        nextPrice.displayText ?? null,
        nextPrice.amountMinor ?? null,
        nextPrice.currency ?? null,
        nextPrice.kind,
        toSqliteBoolean(nextPrice.isFree),
        toSqliteBoolean(nextPlatforms.windows),
        toSqliteBoolean(nextPlatforms.linux),
        toSqliteBoolean(nextPlatforms.macos),
        toSqliteBoolean(nextPlatforms.browser),
        timestamp,
        gameId,
      );

      this.writeNormalizedTags(
        gameId,
        embedded.tags.map((tag) => ({
          tag,
          source: "embedded-title",
          confidence: 0.9,
        })),
        "merge",
      );
    });

    update();
    const game = this.findById(gameId);
    if (!game) {
      throw new Error(`Failed to read repaired game: ${gameId}`);
    }

    return {
      game,
      changed: true,
      markedForEnrichment,
      recognizedTokens: embedded.recognizedTokens,
    };
  }

  markEnrichmentFailure(gameId: string, checkedAt = nowIso()): ItchGame | null {
    this.db
      .prepare(
        `UPDATE itch_games SET
          metadata_status = CASE
            WHEN metadata_status IN ('enriched', 'stale') THEN 'stale'
            ELSE 'failed'
          END,
          updated_at = ?
         WHERE id = ?`,
      )
      .run(checkedAt, gameId);

    return this.findById(gameId);
  }

  markUnavailable(gameId: string, checkedAt = nowIso()): ItchGame | null {
    this.db
      .prepare(
        `UPDATE itch_games SET
          is_available = 0,
          metadata_status = 'stale',
          last_enriched_at = ?,
          updated_at = ?
         WHERE id = ?`,
      )
      .run(checkedAt, checkedAt, gameId);

    return this.findById(gameId);
  }

  updateAdultClassification(input: {
    gameId: string;
    status: ItchAdultStatus;
    confidence: number;
    reasons: string[];
    contentTags: string[];
    isNsfw?: boolean;
  }): ItchGame | null {
    const timestamp = nowIso();
    this.db.prepare(
      `UPDATE itch_games SET
        adult_status = ?,
        adult_confidence = ?,
        adult_reasons_json = ?,
        adult_content_tags_json = ?,
        is_nsfw = CASE WHEN ? IS NULL THEN is_nsfw ELSE ? END,
        updated_at = ?
       WHERE id = ?`,
    ).run(
      input.status,
      Math.min(1, Math.max(0, input.confidence)),
      stringifyJson([...new Set(input.reasons)]),
      stringifyJson([...new Set(input.contentTags)]),
      input.isNsfw === undefined ? null : toSqliteBoolean(input.isNsfw),
      input.isNsfw === undefined ? null : toSqliteBoolean(input.isNsfw),
      timestamp,
      input.gameId,
    );
    return this.findById(input.gameId);
  }

  count(): number {
    const row = this.db
      .prepare("SELECT COUNT(*) AS count FROM itch_games")
      .get() as { count: number };

    return row.count;
  }

  private writeNormalizedTags(
    gameId: string,
    tags: ItchGameTagInput[],
    mode: "merge" | "replace",
  ): void {
    const normalizedByCanonical = new Map<string, ItchGameTagInput>();

    for (const input of tags) {
      const rawTag = input.tag.trim();
      if (!rawTag) {
        continue;
      }

      const result = this.tagNormalizer.normalize(rawTag);
      const source = input.source ?? "unknown";
      const confidence = Math.min(1, Math.max(0, input.confidence ?? 1));

      if (result.canonicalTag) {
        this.canonicalTags.ensureDiscovered(result.canonicalTag);
      }

      this.rawTags.observe({
        gameId,
        rawTag,
        normalizedKey: result.normalizedKey || undefined,
        canonicalTag: result.canonicalTag,
        source,
        confidence,
        resolution: result.resolution,
      });

      if (!result.canonicalTag) {
        continue;
      }

      const existing = normalizedByCanonical.get(result.canonicalTag);
      if (!existing || confidence > (existing.confidence ?? 1)) {
        normalizedByCanonical.set(result.canonicalTag, {
          tag: result.canonicalTag,
          source,
          confidence,
        });
      }
    }

    if (mode === "replace") {
      this.db.prepare("DELETE FROM itch_game_tags WHERE game_id = ?").run(gameId);
    }

    const insert = this.db.prepare(
      `INSERT INTO itch_game_tags (game_id, tag, source, confidence)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(game_id, tag) DO UPDATE SET
         confidence = MAX(itch_game_tags.confidence, excluded.confidence),
         source = CASE
           WHEN excluded.confidence > itch_game_tags.confidence
           THEN excluded.source
           ELSE itch_game_tags.source
         END`,
    );

    for (const [canonicalTag, input] of normalizedByCanonical) {
      insert.run(
        gameId,
        canonicalTag,
        input.source ?? "unknown",
        input.confidence ?? 1,
      );
    }
  }

  private getTags(gameId: string): string[] {
    const rows = this.db
      .prepare(
        `SELECT tag FROM itch_game_tags
         WHERE game_id = ?
         ORDER BY tag ASC`,
      )
      .all(gameId) as Array<{ tag: string }>;

    return rows.map((row) => row.tag);
  }

  private mapRow(row: ItchGameRow): ItchGame {
    return {
      id: row.id,
      canonicalUrl: row.canonical_url,
      title: row.title,
      rawTitle: row.raw_title ?? undefined,
      creatorName: row.creator_name ?? undefined,
      shortDescription: row.short_description ?? undefined,
      coverImageUrl: row.cover_image_url ?? undefined,
      tags: this.getTags(row.id),
      classification: row.classification,
      price: {
        kind: row.price_kind,
        amountMinor: row.minimum_price_minor ?? undefined,
        currency: row.currency ?? undefined,
        displayText: row.price_text ?? undefined,
        isFree: fromSqliteBoolean(row.is_free),
        isOnSale: fromSqliteBoolean(row.is_on_sale),
        saleText: row.sale_text ?? undefined,
      },
      platforms: {
        windows: fromSqliteBoolean(row.supports_windows),
        linux: fromSqliteBoolean(row.supports_linux),
        macos: fromSqliteBoolean(row.supports_macos),
        browser: fromSqliteBoolean(row.supports_browser),
      },
      isNsfw: fromSqliteBoolean(row.is_nsfw),
      adultStatus: row.adult_status,
      adultConfidence: row.adult_confidence,
      adultReasons: parseJson<string[]>(row.adult_reasons_json, []),
      adultContentTags: parseJson<string[]>(row.adult_content_tags_json, []),
      publishedAt: row.published_at ?? undefined,
      sourceUpdatedAt: row.updated_at_source ?? undefined,
      firstDiscoveredAt: row.first_discovered_at,
      lastDiscoveredAt: row.last_discovered_at,
      lastEnrichedAt: row.last_enriched_at ?? undefined,
      metadataStatus: row.metadata_status,
      metadataHash: row.metadata_hash ?? undefined,
      isAvailable: fromSqliteBoolean(row.is_available),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
