import type Database from "better-sqlite3";

import type { ItchFilterRule } from "../contract";
import { getItchDiscoveryDatabase } from "../database/client";
import { executeItchFilter } from "../services/executeItchFilter";
import { getItchDiscoveryStatus } from "../services/getItchDiscoveryStatus";
import { getItchRecommendationFeed } from "../services/getItchRecommendationFeed";
import { recordItchGameAction } from "../services/recordItchGameAction";
import { recordItchPreferenceSignal } from "../services/recordItchPreferenceSignal";
import { runItchDiscoveryPipeline } from "../services/runItchDiscoveryPipeline";
import { unwatchItchGame, watchItchGame } from "../services/watchItchGame";
import {
  ItchGameRepository,
  ItchNotificationRepository,
  ItchRecommendationRepository,
} from "../repositories";
import type {
  ItchDiscoveryCommand,
  ItchDiscoveryCommandResult,
  ItchGame,
} from "../types";
import { bootstrapItchDiscovery } from "../services/bootstrapItchDiscovery";

export async function executeItchDiscoveryCommand(
  command: ItchDiscoveryCommand,
  database: Database.Database = getItchDiscoveryDatabase(),
): Promise<ItchDiscoveryCommandResult> {
  bootstrapItchDiscovery(database);

  if (command.type === "open-radar") {
    return {
      handled: true,
      ok: true,
      message: "Opening Game Radar.",
      navigationPath: "/discover/games",
    };
  }

  if (command.type === "status") {
    const status = getItchDiscoveryStatus(database);
    return {
      handled: true,
      ok: status.catalogueGames > 0,
      message: `Game Radar has ${status.catalogueGames} catalogue games, ${status.unseenRecommendations} unseen recommendations, ${status.watchedGames} watches and ${status.unreadNotifications} unread updates.${status.stale ? ` ${status.staleReason ?? "The catalogue is stale."}` : ""}`,
      navigationPath: "/discover/games",
      data: { status },
    };
  }

  if (command.type === "refresh") {
    const pipeline = await runItchDiscoveryPipeline(
      { trigger: "manual", forceDiscovery: command.force },
      { database },
    );
    return {
      handled: true,
      ok: pipeline.run.status !== "failed",
      message: `Game Radar refresh finished with ${pipeline.run.status} status.${pipeline.run.usedCachedCatalogue ? " Cached catalogue data was used." : ""}`,
      navigationPath: "/discover/games",
      data: { pipeline },
    };
  }

  if (command.type === "show-feed") {
    const feed = getItchRecommendationFeed(
      { state: command.state, limit: 10 },
      database,
    );
    return {
      handled: true,
      ok: true,
      message: summarizeGames(
        `${feed.total} ${command.state} Game Radar item${feed.total === 1 ? "" : "s"}`,
        feed.items.map((item) => item.game),
      ),
      navigationPath: `/discover/games?view=${command.state}`,
      data: { feed },
    };
  }

  if (command.type === "show-updates") {
    const notifications = new ItchNotificationRepository(database).listUnread(10);
    return {
      handled: true,
      ok: true,
      message: notifications.length === 0
        ? "Game Radar has no unread game updates."
        : `${notifications.length} unread game update${notifications.length === 1 ? "" : "s"}: ${notifications.map((item) => item.title).join("; ")}`,
      navigationPath: "/discover/games?panel=updates",
      data: { notifications },
    };
  }

  if (command.type === "show-filter") {
    const rules: ItchFilterRule[] = command.query === "free-horror"
      ? [
          { field: "tag", operator: "includesAny", values: ["horror"] },
          { field: "price", operator: "free" },
          { field: "classification", operator: "in", values: ["game"] },
          { field: "availability", operator: "available" },
          { field: "nsfw", operator: "exclude" },
          { field: "metadataCompleteness", operator: "permissive" },
        ]
      : command.query === "recently-updated"
        ? [
            { field: "updateAgeDays", operator: "lte", value: 30 },
            { field: "classification", operator: "in", values: ["game"] },
            { field: "availability", operator: "available" },
            { field: "metadataCompleteness", operator: "permissive" },
          ]
        : command.query === "on-sale"
          ? [
              { field: "sale", operator: "onSale" },
              { field: "classification", operator: "in", values: ["game"] },
              { field: "availability", operator: "available" },
              { field: "metadataCompleteness", operator: "permissive" },
            ]
          : [
              { field: "price", operator: "maximum", value: command.maximumPriceMinor ?? 0 },
              { field: "classification", operator: "in", values: ["game"] },
              { field: "availability", operator: "available" },
              { field: "metadataCompleteness", operator: "permissive" },
            ];
    const result = executeItchFilter(database, {
      rules,
      sort: command.query === "recently-updated"
        ? [{ field: "sourceUpdatedAt", direction: "desc" }]
        : [{ field: "score", direction: "desc" }],
      limit: 10,
    });
    return {
      handled: true,
      ok: true,
      message: summarizeGames(
        `${result.totalMatched} catalogue match${result.totalMatched === 1 ? "" : "es"}`,
        result.items.map((item) => item.game),
      ),
      navigationPath: "/discover/games?view=catalogue",
      data: { result },
    };
  }

  const resolved = resolveGameByTitle(database, command.title);
  if ("error" in resolved) {
    return { handled: true, ok: false, message: resolved.error };
  }
  const game = resolved.game;

  if (command.type === "game-action") {
    const action = recordItchGameAction(
      { gameId: game.id, state: command.action },
      database,
    );
    return {
      handled: true,
      ok: true,
      message: command.action === "saved"
        ? `${game.title} was saved and is now watched for updates.`
        : command.action === "played"
          ? `${game.title} was marked as played.`
          : `${game.title} was hidden from future recommendations.`,
      data: { action },
    };
  }

  if (command.type === "watch") {
    const result = command.enabled
      ? watchItchGame({ gameId: game.id, watchMetadata: true }, database)
      : unwatchItchGame({ gameId: game.id }, database);
    return {
      handled: true,
      ok: true,
      message: `${game.title} update watch ${command.enabled ? "enabled" : "disabled"}.`,
      data: { result },
    };
  }

  if (command.type === "feedback") {
    const feedback = recordItchPreferenceSignal(
      { gameId: game.id, signalType: command.signalType },
      database,
    );
    return {
      handled: true,
      ok: true,
      message: command.signalType === "more_like_this"
        ? `Game Radar will favor games resembling ${game.title}.`
        : `Game Radar will reduce games resembling ${game.title}.`,
      data: { feedback },
    };
  }

  const profile = database
    .prepare("SELECT id FROM itch_preference_profile WHERE profile_name = 'Default'")
    .get() as { id: string } | undefined;
  const recommendation = profile
    ? new ItchRecommendationRepository(database).findByGameAndProfile(
        game.id,
        profile.id,
      )
    : null;
  return {
    handled: true,
    ok: Boolean(recommendation),
    message: recommendation
      ? `${game.title}: ${recommendation.reason} Current score: ${recommendation.score.toFixed(1)}.`
      : `${game.title} does not currently have a stored recommendation explanation.`,
    data: recommendation ? { recommendation, game } : { game },
  };
}

function resolveGameByTitle(
  database: Database.Database,
  title: string,
): { game: ItchGame } | { error: string } {
  const query = title.trim().toLowerCase();
  const games = new ItchGameRepository(database).listAll();
  const exact = games.filter((game) => game.title.toLowerCase() === query);
  if (exact.length === 1) return { game: exact[0] };
  const partial = games.filter((game) => game.title.toLowerCase().includes(query));
  if (partial.length === 1) return { game: partial[0] };
  if (partial.length > 1) {
    return {
      error: `Multiple games matched “${title}”: ${partial.slice(0, 5).map((game) => game.title).join(", ")}. Use a more specific title.`,
    };
  }
  return { error: `No Game Radar title matched “${title}”.` };
}

function summarizeGames(prefix: string, games: ItchGame[]): string {
  if (games.length === 0) return `${prefix}. No matching titles are currently stored.`;
  return `${prefix}. Top results: ${games.slice(0, 5).map((game) => game.title).join(", ")}.`;
}
