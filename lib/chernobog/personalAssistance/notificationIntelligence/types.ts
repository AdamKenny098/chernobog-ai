import type {
  ResponsibilityPriority,
  ResponsibilityState,
} from "../responsibilities";

export type NotificationClass =
  | "communication"
  | "email"
  | "calendar"
  | "work"
  | "finance"
  | "delivery"
  | "security"
  | "reminder"
  | "system"
  | "other";

export type NotificationContentAvailability =
  | "metadata-only"
  | "redacted-content"
  | "full-content";

export type NotificationImportance =
  | "low"
  | "normal"
  | "important"
  | "critical";

export type NotificationActionKind =
  | "reply"
  | "confirm"
  | "send"
  | "call"
  | "pay"
  | "attend"
  | "complete"
  | "review"
  | "schedule"
  | "generic-action"
  | "none";

export type NotificationIntelligenceObservation = {
  eventId: string;
  appPackage?: string;
  appLabel?: string;
  notificationKey?: string;
  category?: string;
  channelId?: string;
  postedAt?: string;
  sender?: string;
  title?: string;
  body?: string;
  redactedTitle?: string;
  redactedBody?: string;
};

export type NotificationClassification = {
  kind: NotificationClass;
  confidence: number;
  reasons: string[];
};

export type NotificationCorrespondenceAssessment = {
  likelyCorrespondence: boolean;
  confidence: number;
  reasons: string[];
};

export type NotificationActionAssessment = {
  actionRequired: boolean;
  kind: NotificationActionKind;
  confidence: number;
  suggestedAction?: string;
  reasons: string[];
};

export type NotificationImportanceAssessment = {
  level: NotificationImportance;
  confidence: number;
  reasons: string[];
};

export type NotificationResponsibilityRecommendation = {
  shouldCreate: boolean;
  state: ResponsibilityState;
  priority: ResponsibilityPriority;
  requiresHuman: boolean;
  title?: string;
  summary?: string;
  suggestedAction?: string;
  mergeKey?: string;
  confidence: number;
  reasons: string[];
};

export type NotificationIntelligenceResult = {
  eventId: string;
  analyzedAt: string;
  contentAvailability: NotificationContentAvailability;
  classification: NotificationClassification;
  correspondence: NotificationCorrespondenceAssessment;
  action: NotificationActionAssessment;
  importance: NotificationImportanceAssessment;
  responsibility: NotificationResponsibilityRecommendation;
};

export type NotificationProjectionResult = {
  intelligence: NotificationIntelligenceResult;
  outcome:
    | "analysis-only"
    | "insufficient-evidence"
    | "created"
    | "source-replayed"
    | "merged";
  responsibilityId?: string;
};
