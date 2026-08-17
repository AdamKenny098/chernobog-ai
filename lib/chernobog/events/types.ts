export const CHERNOBOG_EVENT_SCHEMA_VERSION = 1 as const;

export type ChernobogEventSeverity =
  | "debug"
  | "info"
  | "notice"
  | "warning"
  | "critical";

export interface ChernobogEventSource {
  subsystem: string;
  nodeId?: string;
  instanceId?: string;
}

export interface ChernobogEventMetadata {
  schemaVersion: typeof CHERNOBOG_EVENT_SCHEMA_VERSION;
  confidence?: number;
  tags?: string[];
  expiresAt?: string;
  sensitive?: boolean;
}

export interface ChernobogEvent<TPayload = unknown> {
  id: string;
  type: string;
  occurredAt: string;
  receivedAt: string;
  source: ChernobogEventSource;
  severity: ChernobogEventSeverity;
  subject?: string;
  scope?: string;
  correlationId?: string;
  causationId?: string;
  dedupeKey?: string;
  payload: TPayload;
  metadata: ChernobogEventMetadata;
}

export interface ChernobogEventInput<TPayload = unknown> {
  type: string;
  occurredAt?: string;
  source: ChernobogEventSource;
  severity?: ChernobogEventSeverity;
  subject?: string;
  scope?: string;
  correlationId?: string;
  causationId?: string;
  dedupeKey?: string;
  payload: TPayload;
  metadata?: Omit<ChernobogEventMetadata, "schemaVersion">;
}

export interface ChernobogEventQuery {
  types?: string[];
  typePrefixes?: string[];
  sources?: string[];
  severities?: ChernobogEventSeverity[];
  correlationId?: string;
  after?: string;
  before?: string;
  limit?: number;
  newestFirst?: boolean;
}

export type ChernobogEventSubscriptionFilter = Pick<
  ChernobogEventQuery,
  "types" | "typePrefixes" | "sources" | "severities" | "correlationId"
>;

export type ChernobogEventHandler = (
  event: ChernobogEvent,
) => void | Promise<void>;

export interface ChernobogEventPublishResult {
  event: ChernobogEvent;
  deduplicated: boolean;
  delivered: number;
  handlerErrors: string[];
}
