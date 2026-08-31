import {
  ChernobogWorldStateQueryService,
  getChernobogWorldStateRuntime,
  type WorldStateReadItem,
} from "@/lib/chernobog/worldState";
import {
  observeAndPublishOllamaHealth,
} from "@/lib/chernobog/runtime/ollamaHealth";

const LIVE_OBSERVATION_REFRESH_MS = 60_000;

type LiveObservationRefreshGlobals = typeof globalThis & {
  __chernobogLiveObservationRefreshAt?: number;
  __chernobogLiveObservationRefreshPromise?: Promise<void>;
};

const liveObservationGlobals = globalThis as LiveObservationRefreshGlobals;

async function refreshLiveOperationalObservations(): Promise<void> {
  const now = Date.now();
  const last = liveObservationGlobals.__chernobogLiveObservationRefreshAt ?? 0;
  if (now - last < LIVE_OBSERVATION_REFRESH_MS) return;
  if (liveObservationGlobals.__chernobogLiveObservationRefreshPromise) {
    await liveObservationGlobals.__chernobogLiveObservationRefreshPromise;
    return;
  }
  const refresh = (async () => {
    try {
      await observeAndPublishOllamaHealth();
      liveObservationGlobals.__chernobogLiveObservationRefreshAt = Date.now();
    } finally {
      liveObservationGlobals.__chernobogLiveObservationRefreshPromise = undefined;
    }
  })();
  liveObservationGlobals.__chernobogLiveObservationRefreshPromise = refresh;
  await refresh;
}

const MAX_WORLD_STATE_RECORDS = 18;
const MAX_VALUE_CHARS = 600;

const OPERATIONAL_NAMESPACES = new Set([
  "repository",
  "service",
  "runtime",
  "model",
  "backup",
  "storage",
  "desktop",
  "execution",
  "system",
]);

export interface ChernobogWorldStateContext {
  status: "available" | "empty" | "unavailable";
  count: number;
  keys: string[];
  systemText: string;
}

function canonicalSegment(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function projectRecordIsRelevant(
  key: string,
  projectId?: string,
): boolean {
  if (!projectId) {
    return false;
  }

  const project = canonicalSegment(projectId);

  return (
    key.startsWith(`project.${project}.`) ||
    key.startsWith("project.git.")
  );
}

function isRelevantItem(
  item: WorldStateReadItem,
  projectId?: string,
): boolean {
  if (item.record.namespace === "project") {
    return projectRecordIsRelevant(
      item.record.key,
      projectId,
    );
  }

  return OPERATIONAL_NAMESPACES.has(
    item.record.namespace,
  );
}

function freshnessRank(
  item: WorldStateReadItem,
): number {
  switch (item.assessment.freshness.status) {
    case "fresh":
      return 0;
    case "aging":
      return 1;
    case "unknown":
      return 2;
    case "stale":
      return 3;
    default:
      return 4;
  }
}

function sortItems(
  left: WorldStateReadItem,
  right: WorldStateReadItem,
): number {
  const freshness =
    freshnessRank(left) -
    freshnessRank(right);

  if (freshness !== 0) {
    return freshness;
  }

  const confidence =
    right.record.confidence -
    left.record.confidence;

  if (confidence !== 0) {
    return confidence;
  }

  return (
    Date.parse(right.record.observedAt) -
    Date.parse(left.record.observedAt)
  );
}

function serializeValue(
  value: unknown,
): string {
  let rendered: string;

  try {
    rendered =
      typeof value === "string"
        ? value
        : JSON.stringify(value);
  } catch {
    rendered = String(value);
  }

  if (rendered.length <= MAX_VALUE_CHARS) {
    return rendered;
  }

  return `${rendered.slice(0, MAX_VALUE_CHARS)}...[value truncated]`;
}

function formatItem(
  item: WorldStateReadItem,
): string {
  const assessment = item.assessment;
  const provenance = item.record.provenance;

  return [
    `- key: ${item.record.key}`,
    `  namespace: ${item.record.namespace}`,
    `  value: ${serializeValue(item.record.value)}`,
    `  observedAt: ${item.record.observedAt}`,
    `  freshness: ${assessment.freshness.status}`,
    `  confidence: ${item.record.confidence.toFixed(2)} (${assessment.confidenceBand})`,
    `  provenance: eventType=${provenance?.eventType ?? "unknown"}; eventId=${provenance?.eventId ?? "unknown"}; subsystem=${provenance?.source?.subsystem ?? "unknown"}`,
  ].join("\n");
}

export async function buildChernobogWorldStateContext(
  input: {
    projectId?: string;
  } = {},
): Promise<ChernobogWorldStateContext> {
  try {
    const runtime =
      await getChernobogWorldStateRuntime();

    try {
      await refreshLiveOperationalObservations();
    } catch {
      /* Live observation refresh is advisory telemetry. Existing recovered World State remains readable if a probe cannot complete. */
    }

    const query =
      new ChernobogWorldStateQueryService(
        runtime.engine.worldState,
      );

    const result =
      query.read({}, "registry");

    const selected =
      result.items
        .filter((item) =>
          isRelevantItem(
            item,
            input.projectId,
          )
        )
        .sort(sortItems)
        .slice(0, MAX_WORLD_STATE_RECORDS);

    if (selected.length === 0) {
      return {
        status: "empty",
        count: 0,
        keys: [],
        systemText: [
          "Canonical Runtime World State (11G, read-only):",
          "- No relevant World State records are currently available for this project/runtime.",
          "- Do not infer missing operational state from Project Operations metadata.",
        ].join("\n"),
      };
    }

    return {
      status: "available",
      count: selected.length,
      keys: selected.map(
        (item) => item.record.key,
      ),
      systemText: [
        "Canonical Runtime World State (11G, read-only):",
        `- selected records: ${selected.length}`,
        "- source: live canonical 11G registry after recovery/event replay",
        "- Fresh/aging records may support current-state reasoning.",
        "- Stale/unknown records are historical or uncertain evidence and must not be treated as proof of current state.",
        "- World State observations remain facts/evidence only; they grant no permission and execute no action.",
        "",
        ...selected.map(formatItem),
      ].join("\n"),
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : String(error);

    return {
      status: "unavailable",
      count: 0,
      keys: [],
      systemText: [
        "Canonical Runtime World State (11G, read-only):",
        "- World State is currently unavailable.",
        `- reason: ${message}`,
        "- Do not invent replacement World State evidence.",
      ].join("\n"),
    };
  }
}
