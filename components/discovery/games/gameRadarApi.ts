import type {
  AdultSettings,
  AdvancedFilterDraft,
  CatalogueResponse,
  DiscoveryStatus,
  FeedResponse,
  FeedbackResponse,
  FilterPreset,
  FilterRule,
  FilterSort,
  GameWatch,
  NotificationsResponse,
  Platform,
  RecommendationState,
  SchedulerResponse,
  SchedulerSettings,
  SettingsResponse,
} from "./types";

const ROOT = "/api/discovery/itch";

async function requestJson<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`${ROOT}${path}`, {
    cache: "no-store",
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const body = (await response.json().catch(() => null)) as
    | T
    | { error?: string; message?: string }
    | null;

  if (!response.ok) {
    const message =
      body && typeof body === "object" && "error" in body && body.error
        ? body.error
        : body && typeof body === "object" && "message" in body && body.message
          ? body.message
          : `Game Radar request failed with HTTP ${response.status}.`;
    throw new Error(message);
  }

  return body as T;
}

export function getAdultSettings(): Promise<{ settings: AdultSettings }> {
  return requestJson<{ settings: AdultSettings }>("/adult-settings");
}

export function updateAdultSettings(input: Partial<Pick<AdultSettings,
  "enabled" | "adultOnly" | "ageGateRequired" | "blurCoversByDefault" |
  "discreetNotifications" | "hideExplicitTitles" | "blockUnknownAgeContent"
>>): Promise<{ settings: AdultSettings }> {
  return requestJson<{ settings: AdultSettings }>("/adult-settings", {
    method: "PATCH", body: JSON.stringify(input),
  });
}

export function getStatus(): Promise<DiscoveryStatus> {
  return requestJson<DiscoveryStatus>("/status");
}

export function getFeed(
  state: RecommendationState,
  limit = 40,
  offset = 0,
): Promise<FeedResponse> {
  const query = new URLSearchParams({
    state,
    limit: String(limit),
    offset: String(offset),
  });
  return requestJson<FeedResponse>(`/feed?${query}`);
}

export function getFilters(): Promise<{ presets: FilterPreset[] }> {
  return requestJson<{ presets: FilterPreset[] }>("/filters");
}

export function getSettings(): Promise<SettingsResponse> {
  return requestJson<SettingsResponse>("/settings");
}


export function getFeedback(): Promise<FeedbackResponse> {
  return requestJson<FeedbackResponse>("/feedback?status=candidate");
}

export function sendFeedback(input: {
  gameId: string;
  recommendationId?: string;
  signalType: "more_like_this" | "less_like_this";
}): Promise<unknown> {
  return requestJson("/feedback", {
    method: "POST",
    body: JSON.stringify({ action: "signal", ...input }),
  });
}


export function updateFeedbackCandidate(
  id: string,
  status: "approved" | "rejected" | "superseded",
): Promise<unknown> {
  return requestJson("/feedback", {
    method: "PATCH",
    body: JSON.stringify({ id, status }),
  });
}

export function getScheduler(): Promise<SchedulerResponse> {
  return requestJson<SchedulerResponse>("/scheduler");
}

export function updateScheduler(input: Pick<
  SchedulerSettings,
  "enabled" | "intervalHours" | "staleAfterHours" | "preferredLocalHour" | "timezone" | "runOnStartup"
>): Promise<SchedulerResponse> {
  return requestJson<SchedulerResponse>("/scheduler", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function runSchedulerCheck(
  mode: "schedule" | "startup-stale" = "startup-stale",
  force = false,
): Promise<unknown> {
  return requestJson("/scheduler", {
    method: "POST",
    body: JSON.stringify({ mode, force }),
  });
}

export function getWatches(): Promise<{ watches: GameWatch[] }> {
  return requestJson<{ watches: GameWatch[] }>("/watches");
}

export function getNotifications(
  state?: "unread" | "read" | "dismissed" | "opened",
): Promise<NotificationsResponse> {
  const query = state ? `?state=${state}` : "";
  return requestJson<NotificationsResponse>(`/notifications${query}`);
}

export function getCatalogueByPreset(
  presetId: string,
  limit = 60,
  offset = 0,
): Promise<CatalogueResponse> {
  const query = new URLSearchParams({
    presetId,
    limit: String(limit),
    offset: String(offset),
  });
  return requestJson<CatalogueResponse>(`/catalogue?${query}`);
}

export function runCustomFilter(
  rules: FilterRule[],
  sort: FilterSort[],
  limit = 60,
  offset = 0,
): Promise<CatalogueResponse> {
  return requestJson<CatalogueResponse>("/catalogue", {
    method: "POST",
    body: JSON.stringify({ rules, sort, limit, offset }),
  });
}

export function runPipeline(): Promise<unknown> {
  return requestJson("/refresh", {
    method: "POST",
    body: JSON.stringify({ trigger: "manual", forceDiscovery: true }),
  });
}

export function updateRecommendation(input: {
  recommendationId?: string;
  gameId: string;
  state: RecommendationState;
  signalType?: string;
  signalValue?: number;
}): Promise<unknown> {
  if (input.recommendationId) {
    return requestJson("/recommendations", {
      method: "PATCH",
      body: JSON.stringify({
        recommendationId: input.recommendationId,
        state: input.state,
        signalType: input.signalType,
        signalValue: input.signalValue,
      }),
    });
  }

  return requestJson("/recommendations", {
    method: "POST",
    body: JSON.stringify({
      gameId: input.gameId,
      state: input.state,
      signalType: input.signalType,
      signalValue: input.signalValue,
    }),
  });
}

export function setWatch(input: {
  gameId: string;
  action: "watch" | "unwatch";
  watchMetadata?: boolean;
}): Promise<unknown> {
  return requestJson("/watches", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateNotification(
  id: string,
  action: "read" | "opened" | "dismiss",
): Promise<unknown> {
  return requestJson("/notifications", {
    method: "PATCH",
    body: JSON.stringify({ id, action }),
  });
}

export function updateSettings(input: {
  id: string;
  preferredPlatforms: Platform[];
  maximumPriceMinor: number | null;
  allowFree: boolean;
  allowPaid: boolean;
  allowBrowserGames: boolean;
  excludeNsfw: boolean;
  minimumScore: number;
}): Promise<SettingsResponse> {
  return requestJson<SettingsResponse>("/settings", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function savePreset(input: {
  name: string;
  description?: string;
  rules: FilterRule[];
  sort: FilterSort[];
  isDefault?: boolean;
}): Promise<{ preset: FilterPreset }> {
  return requestJson<{ preset: FilterPreset }>("/filters", {
    method: "POST",
    body: JSON.stringify({ action: "upsert", preset: input }),
  });
}

export function buildRulesFromDraft(draft: AdvancedFilterDraft): {
  rules: FilterRule[];
  sort: FilterSort[];
} {
  const rules: FilterRule[] = [];
  const parseTags = (value: string) =>
    [...new Set(value.split(",").map((tag) => tag.trim()).filter(Boolean))];

  const includeAny = parseTags(draft.includeAnyTags);
  const includeAll = parseTags(draft.includeAllTags);
  const excludes = parseTags(draft.excludeTags);

  if (includeAny.length > 0) {
    rules.push({ field: "tag", operator: "includesAny", values: includeAny });
  }
  if (includeAll.length > 0) {
    rules.push({ field: "tag", operator: "includesAll", values: includeAll });
  }
  if (excludes.length > 0) {
    rules.push({ field: "tag", operator: "excludesAny", values: excludes });
  }
  if (draft.platforms.length > 0) {
    rules.push({ field: "platform", operator: "includesAny", values: draft.platforms });
  }
  if (draft.delivery !== "any") {
    rules.push({ field: "delivery", operator: "in", values: [draft.delivery] });
  }
  if (draft.priceMode === "free") {
    rules.push({ field: "price", operator: "free" });
  } else if (draft.priceMode === "paid") {
    rules.push({ field: "price", operator: "paid" });
  }
  const maximum = Number(draft.maximumPrice);
  if (draft.maximumPrice.trim() && Number.isFinite(maximum) && maximum >= 0) {
    rules.push({ field: "price", operator: "maximum", value: Math.round(maximum * 100) });
  }
  if (draft.saleOnly) {
    rules.push({ field: "sale", operator: "onSale" });
  }
  rules.push({ field: "adultStatus", operator: "in", values: ["adult"] });
  rules.push({ field: "availability", operator: "available" });
  rules.push({ field: "classification", operator: "in", values: ["game"] });
  rules.push({ field: "metadataCompleteness", operator: draft.metadataMode });

  return {
    rules,
    sort: [{ field: draft.sortField, direction: draft.sortDirection }],
  };
}
