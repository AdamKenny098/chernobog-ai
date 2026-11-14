import { NextResponse } from "next/server";
import { getPersonalAssistanceProfile } from "@chernobog/personal-assistance/profileStore";
import { getPersonalAttentionSnapshot } from "@chernobog/personal-assistance/attentionStore";
import { liveReminderStore } from "@chernobog/personal-assistance/reminders/store";
import { liveReminderDeliveryOutbox } from "@chernobog/personal-assistance/reminders/deliveryOutbox";
import { assessReminderIntegrationHealth } from "@chernobog/personal-assistance/reminders/integrationHealth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** OH-6G3A diagnostics only; never sends or reserves a reminder. */
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
    const integration = assessReminderIntegrationHealth(
      store.list(), outbox.list(),
      getPersonalAttentionSnapshot(now), getPersonalAssistanceProfile(),
      now, rawLimit === null ? 25 : Number(rawLimit),
    );
    return NextResponse.json({ ok: true, integration },
      { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ ok: false, error: "reminder_integration_unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
