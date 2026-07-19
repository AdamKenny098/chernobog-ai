import type Database from "better-sqlite3";
import { getItchDiscoveryDatabase } from "../database/client";
import { ItchGameRepository, ItchNotificationDigestRepository, ItchNotificationRepository } from "../repositories";
import type { BuildItchNotificationDigestInput, BuildItchNotificationDigestResult } from "../types";
import { bootstrapItchDiscovery } from "./bootstrapItchDiscovery";

export function buildItchNotificationDigest(
  input: BuildItchNotificationDigestInput = {},
  database: Database.Database = getItchDiscoveryDatabase(),
): BuildItchNotificationDigestResult {
  bootstrapItchDiscovery(database);
  const timezone = input.timezone ?? "Europe/Dublin";
  const now = input.now ? new Date(input.now) : new Date();
  const digestDate = input.digestDate ?? formatDate(now, timezone);
  const notifications = new ItchNotificationRepository(database);
  const digests = new ItchNotificationDigestRepository(database);
  const games = new ItchGameRepository(database);
  const selected = notifications.list(undefined, 500).filter(
    (notification) => notification.state !== "dismissed" && formatDate(new Date(notification.createdAt), timezone) === digestDate,
  );
  const ids = selected.map((item) => item.id).sort();
  const existing = digests.findByDate(digestDate);
  const alreadyBuilt = Boolean(existing && [...existing.notificationIds].sort().join("|") === ids.join("|"));
  const lines = selected.map((item) => {
    const game = games.findById(item.gameId);
    return `- ${game?.title ?? "Unknown game"}: ${item.body}`;
  });
  const title = selected.length
    ? `Game Radar update digest — ${selected.length} notification${selected.length === 1 ? "" : "s"}`
    : "Game Radar update digest — no updates";
  const body = selected.length ? lines.join("\n") : "No watched game updates were detected for this date.";
  const { digest } = digests.upsert({ digestDate, timezone, title, body, itemCount: selected.length, notificationIds: ids });
  return { digest, alreadyBuilt, notifications: selected };
}

function formatDate(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}
