export interface PersonalAssistanceMobileNotificationInput {
  eventId: string;
  appPackage: string;
  appLabel?: string | null;
  notificationKey?: string | null;
  category?: string | null;
  channelId?: string | null;
  postedAt: string;
  sender?: string | null;
  title?: string | null;
  body?: string | null;
  redactedTitle?: string | null;
  redactedBody?: string | null;
}

export type PersonalAssistanceMobileNotificationDisposition =
  | "accepted"
  | "duplicate"
  | "rejected";

export interface PersonalAssistanceMobileNotificationResult {
  eventId: string;
  disposition: PersonalAssistanceMobileNotificationDisposition;
  reason:
    | "accepted"
    | "duplicate"
    | "capture-disabled"
    | "invalid";
  retryable: boolean;
}

export interface PersonalAssistanceMobileNotificationBatchInput {
  batchId: string;
  events: PersonalAssistanceMobileNotificationInput[];
}

export interface PersonalAssistanceMobileNotificationBatchResult {
  batchId: string;
  acceptedCount: number;
  duplicateCount: number;
  rejectedCount: number;
  results: PersonalAssistanceMobileNotificationResult[];
  acknowledgedEventIds: string[];
}

export interface PersonalAssistanceStoredNotification {
  eventId: string;
  deviceId: string;
  captureMode:
    | "metadata-only"
    | "redacted-content"
    | "full-content";
  appPackage: string;
  appLabel: string | null;
  notificationKey: string | null;
  category: string | null;
  channelId: string | null;
  postedAt: string;
  sender: string | null;
  title: string | null;
  body: string | null;
  receivedAt: string;
}
