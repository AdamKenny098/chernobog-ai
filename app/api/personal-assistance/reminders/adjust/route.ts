import { NextResponse } from "next/server";
import {
  ReminderAdjustmentError,
  liveReminderAdjustmentService,
} from "@chernobog/personal-assistance/reminders/adjustments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const HEADERS = { "Cache-Control": "no-store" };

function failure(error: unknown) {
  if (error instanceof ReminderAdjustmentError) {
    const status = error.code === "not_found" ? 404 :
      ["idempotency_conflict", "stale_due_at", "already_delivered",
        "cancelled", "active_lease", "unchanged"].includes(error.code) ? 409 :
        error.code === "invalid_input" || error.code === "invalid_due_at" ? 400 : 503;
    return NextResponse.json({ ok: false, error: error.code }, { status, headers: HEADERS });
  }
  return NextResponse.json({ ok: false, error: "reminder_adjustment_unavailable" },
    { status: 503, headers: HEADERS });
}

/** This is an explicit owner action in the existing protected PA deployment.
 * It never executes recommendations, sends messages or overrides DND. */
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin !== null && origin !== new URL(request.url).origin) {
    return NextResponse.json({ ok: false, error: "cross_origin_rejected" },
      { status: 403, headers: HEADERS });
  }
  if (!/^application\/json(?:\s*;|$)/iu.test(request.headers.get("content-type") ?? "")) {
    return NextResponse.json({ ok: false, error: "json_required" },
      { status: 415, headers: HEADERS });
  }
  try {
    const input: unknown = await request.json();
    const service = await liveReminderAdjustmentService();
    const result = service.adjust(input);
    return NextResponse.json({ ok: true, ...result, boundaries: {
      explicitOwnerActionOnly: true, sendsMessages: false,
      overridesDoNotDisturb: false, changesUserPreferences: false,
      createsReminders: false,
    } }, { headers: HEADERS });
  } catch (error) {
    return failure(error);
  }
}

/** Read-only audit: no titles, notification evidence, tokens or transport receipts. */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const reminderId = url.searchParams.get("reminderId") ?? "";
    const limitText = url.searchParams.get("limit") ?? "50";
    if (!/^\d{1,3}$/u.test(limitText)) {
      return NextResponse.json({ ok: false, error: "invalid_limit" },
        { status: 400, headers: HEADERS });
    }
    const service = await liveReminderAdjustmentService();
    const history = service.history(reminderId, Number(limitText));
    return NextResponse.json({ ok: true, history }, { headers: HEADERS });
  } catch (error) {
    return failure(error);
  }
}
