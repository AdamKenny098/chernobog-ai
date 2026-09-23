import {
  publishChernobogEventSafely,
} from "../../events";
import type {
  PersonalAssistanceMobileDevice,
  PersonalAssistanceMobileEnrollmentChallenge,
} from "./types";

const MOBILE_EVENT_SOURCE = {
  subsystem:
    "personal-assistance.mobile",
} as const;

export async function publishMobileEnrollmentCreated(
  challenge:
    PersonalAssistanceMobileEnrollmentChallenge,
): Promise<void> {
  await publishChernobogEventSafely({
    type:
      "personal-assistance.mobile.enrollment.created",
    occurredAt:
      challenge.createdAt,
    source:
      MOBILE_EVENT_SOURCE,
    severity:
      "info",
    subject:
      challenge.enrollmentId,
    scope:
      "personal-assistance",
    dedupeKey:
      `mobile-enrollment-created:${challenge.enrollmentId}`,
    payload: {
      enrollmentId:
        challenge.enrollmentId,
      expiresAt:
        challenge.expiresAt,
    },
    metadata: {
      sensitive: true,
      confidence: 1,
      tags: [
        "personal-assistance",
        "mobile",
        "enrollment",
      ],
    },
  });
}

export async function publishMobileDeviceEnrolled(
  device:
    PersonalAssistanceMobileDevice,
): Promise<void> {
  await publishChernobogEventSafely({
    type:
      "personal-assistance.mobile.device.enrolled",
    occurredAt:
      device.enrolledAt,
    source:
      MOBILE_EVENT_SOURCE,
    severity:
      "notice",
    subject:
      device.deviceId,
    scope:
      "personal-assistance",
    dedupeKey:
      `mobile-device-enrolled:${device.deviceId}`,
    payload: {
      deviceId:
        device.deviceId,
      displayName:
        device.displayName,
      platform:
        device.platform,
      appVersion:
        device.appVersion,
    },
    metadata: {
      sensitive: true,
      confidence: 1,
      tags: [
        "personal-assistance",
        "mobile",
        "device",
      ],
    },
  });
}

export async function publishMobileDeviceRevoked(
  device:
    PersonalAssistanceMobileDevice,
): Promise<void> {
  await publishChernobogEventSafely({
    type:
      "personal-assistance.mobile.device.revoked",
    occurredAt:
      device.revokedAt ??
      new Date().toISOString(),
    source:
      MOBILE_EVENT_SOURCE,
    severity:
      "notice",
    subject:
      device.deviceId,
    scope:
      "personal-assistance",
    dedupeKey:
      `mobile-device-revoked:${device.deviceId}`,
    payload: {
      deviceId:
        device.deviceId,
      displayName:
        device.displayName,
      platform:
        device.platform,
    },
    metadata: {
      sensitive: true,
      confidence: 1,
      tags: [
        "personal-assistance",
        "mobile",
        "device",
        "revoked",
      ],
    },
  });
}