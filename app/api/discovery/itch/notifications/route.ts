import { NextResponse } from "next/server";

import { guardItchMutationRequest } from "@/lib/modules/itch-discovery/api/security";

import {
  ITCH_NOTIFICATION_STATES,
  type ItchNotificationState,
} from "@/lib/modules/itch-discovery/contract";
import {
  apiFailureResponseInit,
  optionalInteger,
  optionalString,
  readJsonObject,
  requiredString,
  toItchApiFailure,
} from "@/lib/modules/itch-discovery/api/http";
import { getItchDiscoveryDatabase } from "@/lib/modules/itch-discovery/database/client";
import {
  ItchAdultSettingsRepository,
  ItchNotificationDigestRepository,
  ItchNotificationRepository,
} from "@/lib/modules/itch-discovery/repositories";
import { bootstrapItchDiscovery } from "@/lib/modules/itch-discovery/services/bootstrapItchDiscovery";
import { buildItchNotificationDigest } from "@/lib/modules/itch-discovery/services/buildItchNotificationDigest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const rawState = url.searchParams.get("state");
    if (rawState && !ITCH_NOTIFICATION_STATES.includes(rawState as ItchNotificationState)) {
      throw new TypeError(`Unsupported notification state: ${rawState}`);
    }
    const limitValue = url.searchParams.get("limit");
    const limit = limitValue ? Number(limitValue) : 100;
    if (!Number.isInteger(limit) || limit < 1 || limit > 500) {
      throw new TypeError("limit must be an integer from 1 to 500.");
    }
    const database = getItchDiscoveryDatabase();
    bootstrapItchDiscovery(database);
    const notifications = new ItchNotificationRepository(database);
    const adult = new ItchAdultSettingsRepository(database).ensureDefault();
    const listed = notifications.list(rawState as ItchNotificationState | undefined, limit);
    const safeNotifications = adult.discreetNotifications
      ? listed.map((item) => ({ ...item, title: "Game update available", body: "A watched adult game has new activity." }))
      : listed;
    return NextResponse.json({
      notifications: safeNotifications,
      unreadCount: notifications.countUnread(),
      digests: new ItchNotificationDigestRepository(database).list(30),
    });
  } catch (error) {
    const failure = toItchApiFailure(error);
    return NextResponse.json(failure.body, apiFailureResponseInit(failure));
  }
}

export async function PATCH(request: Request) {
  try {
    guardItchMutationRequest(request, "notifications:patch", { limit: 90, windowMs: 60000 });
    const body = await readJsonObject(request);
    const id = requiredString(body.id, "id");
    const action = requiredString(body.action, "action");
    const database = getItchDiscoveryDatabase();
    bootstrapItchDiscovery(database);
    const notifications = new ItchNotificationRepository(database);
    const notification = action === "read"
      ? notifications.markRead(id)
      : action === "opened"
        ? notifications.markOpened(id)
        : action === "dismiss"
          ? notifications.dismiss(id)
          : (() => { throw new TypeError(`Unsupported notification action: ${action}`); })();
    if (!notification) {
      return NextResponse.json({ error: "Notification not found.", code: "GAME_RADAR_NOT_FOUND" }, { status: 404 });
    }
    return NextResponse.json({ notification });
  } catch (error) {
    const failure = toItchApiFailure(error);
    return NextResponse.json(failure.body, apiFailureResponseInit(failure));
  }
}

export async function POST(request: Request) {
  try {
    guardItchMutationRequest(request, "notifications:post", { limit: 90, windowMs: 60000 });
    const body = await readJsonObject(request);
    const result = buildItchNotificationDigest({
      digestDate: optionalString(body.digestDate, "digestDate", { maximumLength: 10 }),
      timezone: optionalString(body.timezone, "timezone", { maximumLength: 100 }),
    });
    return NextResponse.json(result);
  } catch (error) {
    const failure = toItchApiFailure(error);
    return NextResponse.json(failure.body, apiFailureResponseInit(failure));
  }
}
