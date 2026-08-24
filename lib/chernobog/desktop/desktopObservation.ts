export const CHERNOBOG_DESKTOP_PRESENCE_STATES = [
    "present",
    "absent",
    "unknown",
  ] as const;
  
  export type ChernobogDesktopPresenceState =
    (typeof CHERNOBOG_DESKTOP_PRESENCE_STATES)[number];
  
  export const CHERNOBOG_DESKTOP_ACTIVITY_STATES = [
    "active",
    "idle",
    "locked",
    "unknown",
  ] as const;
  
  export type ChernobogDesktopActivityState =
    (typeof CHERNOBOG_DESKTOP_ACTIVITY_STATES)[number];
  
  export const CHERNOBOG_SCREEN_STATES = [
    "available",
    "unavailable",
    "unknown",
  ] as const;
  
  export type ChernobogScreenState =
    (typeof CHERNOBOG_SCREEN_STATES)[number];
  
  export interface ChernobogDesktopApplicationState {
    id?: string;
  
    name?: string;
  }
  
  export interface ChernobogDesktopWorkspaceState {
    id?: string;
  
    projectId?: string;
  
    kind?:
      | "project"
      | "folder"
      | "application"
      | "unknown";
  }
  
  export interface ChernobogDesktopScreenState {
    status: ChernobogScreenState;
  
    monitorCount?: number;
  }
  
  export interface ChernobogDesktopObservation {
    nodeId: string;
  
    observedAt: string;
  
    platform?: string;
  
    presence:
      ChernobogDesktopPresenceState;
  
    activity:
      ChernobogDesktopActivityState;
  
    idleSeconds?: number;
  
    foregroundApplication?:
      ChernobogDesktopApplicationState;
  
    workspace?:
      ChernobogDesktopWorkspaceState;
  
    screen?:
      ChernobogDesktopScreenState;
  
    message?: string;
  
    metadata?: Record<
      string,
      string | number | boolean | null
    >;
  }
  
  export function createDesktopObservation(
    input: Omit<
      ChernobogDesktopObservation,
      "observedAt"
    > & {
      observedAt?: string;
    }
  ): ChernobogDesktopObservation {
    return {
      ...input,
  
      observedAt:
        input.observedAt ??
        new Date().toISOString(),
    };
  }