import { DEFAULT_RECOMMENDATION_TIMEZONE } from "./recommendationConfig";

export function getRecommendationBatchDate(
  now: string | Date = new Date(),
  timezone = DEFAULT_RECOMMENDATION_TIMEZONE,
): string {
  const date = typeof now === "string" ? new Date(now) : now;
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid recommendation date: ${String(now)}`);
  }

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const values = new Map(parts.map((part) => [part.type, part.value]));
  const year = values.get("year");
  const month = values.get("month");
  const day = values.get("day");
  if (!year || !month || !day) {
    throw new Error(`Could not calculate batch date for timezone ${timezone}`);
  }

  return `${year}-${month}-${day}`;
}
