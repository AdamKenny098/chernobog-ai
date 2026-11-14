import { NextResponse } from "next/server";
import { getPersonalAssistanceProfile } from "@chernobog/personal-assistance/profileStore";
import { getPersonalAttentionSnapshot } from "@chernobog/personal-assistance/attentionStore";
import { liveReminderStore } from "@chernobog/personal-assistance/reminders/store";
import { liveReminderDeliveryOutbox } from "@chernobog/personal-assistance/reminders/deliveryOutbox";
import { assessReminderDeliveryHealth } from "@chernobog/personal-assistance/reminders/deliveryHealth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** OH-6G2: authenticated deployment boundary remains the same as existing PA reads. */
export async function GET(request: Request) {
  const rawLimit = new URL(request.url).searchParams.get("limit");
  if (rawLimit !== null && (!/^\d{1,3}$/u.test(rawLimit) ||
      Number(rawLimit) < 1 || Number(rawLimit) > 100)) {
    return NextResponse.json({ ok: false, error: "invalid_limit" },
      { status: 400, headers: { "Cache-Control": "no-store" } });
  }
  try {
    const now = new Date();
    const reminderStore = await liveReminderStore();
    const outbox = await liveReminderDeliveryOutbox();
    const health = assessReminderDeliveryHealth(
      reminderStore.list(),
      outbox.list(),
      getPersonalAttentionSnapshot(now),
      getPersonalAssistanceProfile(),
      now,
      rawLimit === null ? 25 : Number(rawLimit),
    );
    return NextResponse.json({ ok: true, health },
      { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ ok: false, error: "reminder_delivery_health_unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
