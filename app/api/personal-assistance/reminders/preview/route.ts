import { NextResponse } from "next/server";
import { getPersonalAssistanceProfile } from "@chernobog/personal-assistance/profileStore";
import { getPersonalAttentionSnapshot } from "@chernobog/personal-assistance/attentionStore";
import { previewReminders } from "@chernobog/personal-assistance/reminders/foundation";
import { liveReminderStore } from "@chernobog/personal-assistance/reminders/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** OH-6G1: read-only preview; never dispatch, reserve, or mark delivered. */
export async function GET(request: Request) {
  const rawLimit = new URL(request.url).searchParams.get("limit");
  if (rawLimit !== null && (!/^\d{1,3}$/u.test(rawLimit) ||
      Number(rawLimit) < 1 || Number(rawLimit) > 100)) {
    return NextResponse.json({ ok: false, error: "invalid_limit" },
      { status: 400, headers: { "Cache-Control": "no-store" } });
  }
  try {
    const now = new Date();
    const store = await liveReminderStore();
    const preview = previewReminders(
      store.list(),
      getPersonalAttentionSnapshot(now),
      getPersonalAssistanceProfile(),
      now,
      rawLimit === null ? 100 : Number(rawLimit),
    );
    return NextResponse.json({ ok: true, preview },
      { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ ok: false, error: "reminder_preview_unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
