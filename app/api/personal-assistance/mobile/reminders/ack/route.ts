import { NextResponse } from "next/server";
import { authenticatePersonalAssistanceMobileRequest } from "@chernobog/personal-assistance";
import { liveAndroidReminderDeliveryService } from "@chernobog/personal-assistance/reminders/androidDelivery";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const HEADERS = { "Cache-Control": "no-store" };

export async function POST(request: Request) {
  let authenticated = false;
  try {
    const device = authenticatePersonalAssistanceMobileRequest(request);
    authenticated = true;
    const input = await request.json() as Record<string, unknown>;
    const service = await liveAndroidReminderDeliveryService();
    const result = service.acknowledge(
      device.deviceId,
      typeof input?.reminderId === "string" ? input.reminderId : "",
      typeof input?.reservationId === "string" ? input.reservationId : "",
      typeof input?.receipt === "string" ? input.receipt : "",
    );
    return NextResponse.json({ ok: true, result }, { headers: HEADERS });
  } catch (error) {
    // Do not expose token values, SQL details, reminder titles, or device identifiers.
    return NextResponse.json(
      { ok: false, error: authenticated ? "reminder_ack_rejected" : "mobile_unauthorized" },
      { status: authenticated ? 400 : 401, headers: HEADERS },
    );
  }
}
