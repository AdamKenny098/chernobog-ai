export type ResponsibilityState =
  | "detected"
  | "triaged"
  | "waiting-user"
  | "waiting-external"
  | "scheduled"
  | "delegated"
  | "resolved"
  | "dismissed";

export type ResponsibilityPriority =
  | "low"
  | "normal"
  | "important"
  | "critical";

export type ResponsibilitySourceType =
  | "notification"
  | "calendar"
  | "email"
  | "message"
  | "work-schedule"
  | "manual"
  | "system";

export type ResponsibilitySource = {
  type: ResponsibilitySourceType;
  sourceId?: string;
  application?: string;
};

export type ResponsibilityEvidence = {
  id: string;
  source: ResponsibilitySource;
  observedAt: string;
};

export type ResponsibilityAuditEvent =
  | "created"
  | "source-replayed"
  | "evidence-merged"
  | "updated"
  | "state-changed"
  | "reopened";

export type ResponsibilityAuditEntry = {
  id: string;
  responsibilityId: string;
  event: ResponsibilityAuditEvent;
  actor: string;
  reason: string;
  timestamp: string;
  fromState?: ResponsibilityState;
  toState?: ResponsibilityState;
  details?: Record<string, unknown>;
};

export type Responsibility = {
  id: string;
  title: string;
  summary: string;
  source: ResponsibilitySource;
  state: ResponsibilityState;
  priority: ResponsibilityPriority;
  requiresHuman: boolean;
  suggestedAction?: string;
  createdAt: string;
  updatedAt: string;
  dueAt?: string;
  confidence: number;
  relatedResponsibilityIds: string[];
  evidence: ResponsibilityEvidence[];
  mergeKey?: string;
  revision: number;
};

export type CreateResponsibilityInput = {
  title: string;
  summary: string;
  source: ResponsibilitySource;
  state?: ResponsibilityState;
  priority?: ResponsibilityPriority;
  requiresHuman?: boolean;
  suggestedAction?: string;
  dueAt?: string;
  confidence?: number;
  relatedResponsibilityIds?: string[];
  mergeKey?: string;
  actor?: string;
  reason?: string;
};

export type UpdateResponsibilityInput = {
  title?: string;
  summary?: string;
  priority?: ResponsibilityPriority;
  requiresHuman?: boolean;
  suggestedAction?: string | null;
  dueAt?: string | null;
  confidence?: number;
  relatedResponsibilityIds?: string[];
  actor?: string;
  reason?: string;
};

export type TransitionResponsibilityInput = {
  state: ResponsibilityState;
  actor?: string;
  reason: string;
};

export type ResponsibilityListFilter = {
  states?: ResponsibilityState[];
  priorities?: ResponsibilityPriority[];
  requiresHuman?: boolean;
  sourceType?: ResponsibilitySourceType;
  includeClosed?: boolean;
};

export type ResponsibilityCreateResult = {
  responsibility: Responsibility;
  disposition:
    | "created"
    | "source-replayed"
    | "merged";
};
