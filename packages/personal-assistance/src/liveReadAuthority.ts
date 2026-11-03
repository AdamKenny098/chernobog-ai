import { getPersonalAttentionSnapshot } from "./attentionStore";
import { getPersonalAssistanceProfile } from "./profileStore";
import { getResponsibilityLedger } from "./responsibilities/store";
import { getWorkScheduleStatus } from "./workSchedule/service";
import { createPersonalAssistanceReadAuthority } from "./readAuthority";

/**
 * OH-6B live binding. These methods delegate to PA-1, PA-3 and PA-4.
 * PA-5 remains the sole calendar-sync authority and PA-2 owns mobile ingress.
 * OH-3 remains the durable scheduler; OH-4 routes commands; OH-5 owns memory.
 */
export const personalAssistanceReadAuthority =
  createPersonalAssistanceReadAuthority({
    getAttention: () => getPersonalAttentionSnapshot(),
    getProfile: () => getPersonalAssistanceProfile(),
    listResponsibilities: (filter) =>
      getResponsibilityLedger().list(filter),
    getWorkSchedule: () => getWorkScheduleStatus(),
  });
