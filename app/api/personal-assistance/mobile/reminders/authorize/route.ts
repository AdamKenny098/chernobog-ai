import { NextResponse } from "next/server";
import { authenticatePersonalAssistanceMobileRequest } from "@chernobog/personal-assistance";
import { liveAndroidReminderDeliveryService } from "@chernobog/personal-assistance/reminders/androidDelivery";
import { getPersonalAttentionSnapshot, getPersonalAssistanceProfile } from "@chernobog/personal-assistance";
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
    const authorized = service.authorize(
      device.deviceId,
      typeof input?.reminderId === "string" ? input.reminderId : "",
      typeof input?.reservationId === "string" ? input.reservationId : "",
      getPersonalAttentionSnapshot(), getPersonalAssistanceProfile(),
    );
    return NextResponse.json({ ok: true, authorized }, { headers: HEADERS });
  } catch (error) {
    // Do not expose token values, SQL details, reminder titles, or device identifiers.
    return NextResponse.json(
      { ok: false, error: authenticated ? "reminder_authorize_rejected" : "mobile_unauthorized" },
      { status: authenticated ? 400 : 401, headers: HEADERS },
    );
  }
}
