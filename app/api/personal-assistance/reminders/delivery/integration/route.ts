import { NextResponse } from "next/server";
import { getPersonalAssistanceProfile } from "@chernobog/personal-assistance/profileStore";
import { getPersonalAttentionSnapshot } from "@chernobog/personal-assistance/attentionStore";
import { listPersonalAssistanceMobileDevices } from "@chernobog/personal-assistance/mobile/store";
import { liveReminderStore } from "@chernobog/personal-assistance/reminders/store";
import { liveReminderDeliveryOutbox } from "@chernobog/personal-assistance/reminders/deliveryOutbox";
import { assessReminderIntegrationHealth } from "@chernobog/personal-assistance/reminders/integrationHealth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** OH-6J4 diagnostics only: aggregate counts, no device IDs or reminder titles. */
export async function GET(request: Request) {
  const rawLimit = new URL(request.url).searchParams.get("limit");
  if (rawLimit !== null && (!/^\d{1,3}$/u.test(rawLimit) ||
      Number(rawLimit) < 1 || Number(rawLimit) > 100)) {
    return NextResponse.json({ ok: false, error: "invalid_limit" },
      { status: 400, headers: { "Cache-Control": "no-store" } });
  }
  try {
    const now = new Date();
    const [store, outbox] = await Promise.all([
      liveReminderStore(),
      liveReminderDeliveryOutbox(),
    ]);
    const pairedAndroidDeviceCount = listPersonalAssistanceMobileDevices()
      .filter((device) => device.platform === "android" &&
        device.status === "active" && device.revokedAt === null).length;
    const integration = assessReminderIntegrationHealth(
      store.list(), outbox.list(),
      getPersonalAttentionSnapshot(now), getPersonalAssistanceProfile(),
      now, rawLimit === null ? 25 : Number(rawLimit),
      { pairedAndroidDeviceCount, androidReminderRoutesAvailable: true },
    );
    return NextResponse.json({ ok: true, integration },
      { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ ok: false, error: "reminder_integration_unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
