import type {
  PersonalAttentionSnapshot,
} from "./types";
import type {
  PersonalAssistanceProfile,
} from "./profileTypes";
import type {
  Responsibility,
  ResponsibilityListFilter,
} from "./responsibilities/types";
import type {
  WorkScheduleStatus,
} from "./workSchedule/types";

/**
 * OH-6B — read-only port for existing Personal Assistance authorities.
 *
 * The port has no persistence, caches, jobs, notification policy, or execution
 * authority of its own. Callers obtain current state from the existing owners.
 * This is not an atomic snapshot across the independently-owned stores.
 */
export interface PersonalAssistanceReadAuthority {
  getAttention(): PersonalAttentionSnapshot;
  getProfile(): PersonalAssistanceProfile;
  listResponsibilities(
    filter?: ResponsibilityListFilter,
  ): Promise<Responsibility[]>;
  getWorkSchedule(): Promise<WorkScheduleStatus>;
}

/** Injectable only so OH-6B can verify delegation without live user data. */
export function createPersonalAssistanceReadAuthority(
  owners: PersonalAssistanceReadAuthority,
): Readonly<PersonalAssistanceReadAuthority> {
  return Object.freeze({
    getAttention: () => owners.getAttention(),
    getProfile: () => owners.getProfile(),
    listResponsibilities: (filter?: ResponsibilityListFilter) =>
      owners.listResponsibilities(filter),
    getWorkSchedule: () => owners.getWorkSchedule(),
  });
}
