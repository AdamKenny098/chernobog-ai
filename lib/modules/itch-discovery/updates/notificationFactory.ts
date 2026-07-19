import type { ItchNotificationPriority } from "../contract";
import type { ItchGame, ItchGameChangeEvent } from "../types";

export function buildItchUpdateNotification(
  game: ItchGame,
  event: ItchGameChangeEvent,
): {
  notificationType: string;
  title: string;
  body: string;
  priority: ItchNotificationPriority;
} {
  const priority: ItchNotificationPriority =
    event.type === "major-update" || event.type === "availability"
      ? "high"
      : event.type === "tags" || event.type === "page"
        ? "low"
        : "normal";

  const labels: Record<string, string> = {
    devlog: "New devlog",
    "major-update": "Major update",
    price: "Price changed",
    sale: "Sale update",
    platform: "Platform update",
    tags: "Tag update",
    page: "Project page changed",
    availability: "Availability update",
  };

  return {
    notificationType: `game-update:${event.type}`,
    title: `${labels[event.type] ?? "Game update"}: ${game.title}`,
    body: event.summary,
    priority,
  };
}
