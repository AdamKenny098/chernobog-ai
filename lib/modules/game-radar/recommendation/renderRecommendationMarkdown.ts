import { GameRadarRecommendationItem, GameRadarRecommendationSnapshot } from "./types";

function renderTagList(values: string[]): string {
  if (values.length === 0) {
    return "none";
  }

  return values.join(", ");
}

function renderReasons(item: GameRadarRecommendationItem): string {
  if (item.reasons.length === 0) {
    return "No specific reasons recorded.";
  }

  return item.reasons
    .map((reason) => `- ${reason.label}${reason.weight > 0 ? ` (+${reason.weight})` : ""}`)
    .join("\n");
}

function renderGame(item: GameRadarRecommendationItem): string {
  const lines: string[] = [];

  lines.push(`## ${item.rank}. ${item.title}`);
  lines.push("");
  lines.push(`Score: ${item.score}`);

  if (item.creator) {
    lines.push(`Creator: ${item.creator}`);
  }

  if (item.price) {
    lines.push(`Price: ${item.price}`);
  }

  if (item.url) {
    lines.push(`URL: ${item.url}`);
  }

  lines.push(`Tags: ${renderTagList(item.tags)}`);
  lines.push(`Platforms: ${renderTagList(item.platforms)}`);

  if (item.description) {
    lines.push("");
    lines.push(item.description);
  }

  lines.push("");
  lines.push("Reasons:");
  lines.push(renderReasons(item));

  return lines.join("\n");
}

export function renderGameRadarRecommendationMarkdown(
  snapshot: GameRadarRecommendationSnapshot,
): string {
  const lines: string[] = [];

  lines.push(`# Game Radar Recommendations — ${snapshot.snapshotId}`);
  lines.push("");
  lines.push(`Generated: ${snapshot.generatedAt}`);
  lines.push(`Profile: ${snapshot.profile.label}`);
  lines.push(`Source entries: ${snapshot.sourceCount}`);
  lines.push(`Recommended entries: ${snapshot.recommendedCount}`);
  lines.push(`Filtered out: ${snapshot.filteredOutCount}`);
  lines.push("");
  lines.push("## Filter Profile");
  lines.push("");
  lines.push(`Include tags: ${snapshot.profile.includeTags || "none"}`);
  lines.push(`Exclude tags: ${snapshot.profile.excludeTags || "none"}`);
  lines.push(`Preferred platforms: ${snapshot.profile.preferredPlatforms || "none"}`);
  lines.push(`Limit: ${snapshot.profile.limit}`);
  lines.push(`Minimum score: ${snapshot.profile.minScore}`);
  lines.push("");

  if (snapshot.items.length === 0) {
    lines.push("No recommendations were produced from the current catalogue and filter profile.");
    lines.push("");
    return lines.join("\n");
  }

  lines.push("---");
  lines.push("");

  for (const item of snapshot.items) {
    lines.push(renderGame(item));
    lines.push("");
    lines.push("---");
    lines.push("");
  }

  return lines.join("\n");
}
