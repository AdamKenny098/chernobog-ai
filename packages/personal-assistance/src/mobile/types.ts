export type PersonalAssistanceMobilePlatform =
  | "android";

export type PersonalAssistanceMobileDeviceStatus =
  | "active"
  | "revoked";

export interface PersonalAssistanceMobileEnrollmentChallenge {
  enrollmentId: string;
  pairingCode: string;
  createdAt: string;
  expiresAt: string;
}

export interface PersonalAssistanceMobileDevice {
  deviceId: string;
  installationId: string;
  displayName: string;
  platform: PersonalAssistanceMobilePlatform;
  appVersion: string | null;
  enrolledAt: string;
  lastSeenAt: string | null;
  revokedAt: string | null;
  status: PersonalAssistanceMobileDeviceStatus;
}

export interface PersonalAssistanceMobileEnrollmentInput {
  pairingCode: string;
  installationId: string;
  displayName: string;
  appVersion?: string | null;
}

export interface PersonalAssistanceMobileEnrollmentResult {
  device: PersonalAssistanceMobileDevice;
  token: string;
}

export interface PersonalAssistanceMobileCredential {
  scheme: "Bearer";
  token: string;
}

/** Owner-created single-use recovery code; never persist the raw code. */
export interface PersonalAssistanceMobileRecoveryChallenge {
  deviceId: string;
  expiresAt: string;
  recoveryCode: string;
}

export interface PersonalAssistanceMobileRecoveryInput {
  deviceId: string;
  installationId: string;
  recoveryCode: string;
}
