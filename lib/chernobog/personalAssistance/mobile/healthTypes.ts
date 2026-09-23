export type PersonalAssistanceMobileNetworkType =
  | "wifi"
  | "cellular"
  | "ethernet"
  | "offline"
  | "unknown";

export type PersonalAssistanceMobileAppState =
  | "foreground"
  | "background"
  | "unknown";

export interface PersonalAssistanceMobileHeartbeatInput {
  heartbeatId: string;
  batteryPercent?: number | null;
  charging?: boolean | null;
  lowPowerMode?: boolean | null;
  networkType?: PersonalAssistanceMobileNetworkType;
  appState?: PersonalAssistanceMobileAppState;
  notificationListenerEnabled?: boolean;
  spoolPendingCount?: number;
  clientObservedAt?: string | null;
}

export interface PersonalAssistanceMobileHealthSnapshot {
  deviceId: string;
  heartbeatId: string;
  batteryPercent: number | null;
  charging: boolean | null;
  lowPowerMode: boolean | null;
  networkType: PersonalAssistanceMobileNetworkType;
  appState: PersonalAssistanceMobileAppState;
  notificationListenerEnabled: boolean;
  spoolPendingCount: number;
  clientObservedAt: string | null;
  receivedAt: string;
}

export interface PersonalAssistanceMobileHeartbeatResult {
  accepted: boolean;
  duplicate: boolean;
  historyPersisted: boolean;
  snapshot: PersonalAssistanceMobileHealthSnapshot;
  serverTime: string;
}