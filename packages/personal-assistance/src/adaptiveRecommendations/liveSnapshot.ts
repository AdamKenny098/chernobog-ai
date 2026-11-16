import { getResponsibilityLedger } from "../responsibilities";
import { getWorkScheduleStatus } from "../workSchedule";
import { getGoogleCalendarStatus } from "../calendar";
import { getPersonalAssistanceProfile } from "../profileStore";
import { getPersonalAttentionSnapshot } from "../attentionStore";
import { buildScheduleCalendarDiagnostics } from "../scheduleCalendarAuthority/diagnostics";
import { buildUnifiedAttentionQueue } from "../unifiedAttentionQueue/readModel";
import { buildAdaptiveRecommendations } from "./readModel";

/** Shared read path for GET recommendations and explicit owner feedback validation. */
export async function readLiveAdaptiveRecommendations(origin: string, now = new Date()) {
  const [responsibilities, schedule, calendar] = await Promise.all([
    getResponsibilityLedger().list({ includeClosed: false }),
    getWorkScheduleStatus(now),
    getGoogleCalendarStatus(origin),
  ]);
  const profile = getPersonalAssistanceProfile();
  const attention = getPersonalAttentionSnapshot(now);
  const diagnostics = buildScheduleCalendarDiagnostics(schedule, calendar, profile.timeZone, now);
  const queue = buildUnifiedAttentionQueue(responsibilities, diagnostics, now, { limit: 100 });
  return buildAdaptiveRecommendations(queue, {
    attentionState: attention.state,
    proactiveAssistanceEnabled: profile.proactiveAssistanceEnabled,
    interruptionPreference: profile.interruptionPreference,
  }, 100);
}
