import {
  authenticatePersonalAssistanceMobileToken,
} from "./store";
import type {
  PersonalAssistanceMobileDevice,
} from "./types";

export function readPersonalAssistanceMobileBearerToken(
  request: Request,
): string {
  const authorization =
    request.headers.get(
      "authorization",
    );

  if (!authorization) {
    throw new Error(
      "Authorization header is required.",
    );
  }

  const match =
    /^Bearer\s+(.+)$/i.exec(
      authorization.trim(),
    );

  if (!match?.[1]) {
    throw new Error(
      "Authorization header must use the Bearer scheme.",
    );
  }

  return match[1].trim();
}

export function authenticatePersonalAssistanceMobileRequest(
  request: Request,
): PersonalAssistanceMobileDevice {
  return authenticatePersonalAssistanceMobileToken(
    readPersonalAssistanceMobileBearerToken(
      request,
    ),
  );
}