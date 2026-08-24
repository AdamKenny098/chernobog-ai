import type {
    ChernobogDesktopActivityState,
    ChernobogDesktopApplicationState,
    ChernobogDesktopObservation,
    ChernobogDesktopPresenceState,
    ChernobogDesktopScreenState,
    ChernobogDesktopWorkspaceState,
  } from "./desktopObservation";
  
  import {
    createDesktopObservation,
  } from "./desktopObservation";
  
  import {
    publishDesktopObservation,
  } from "./desktopEvents";
  
  export interface DesktopStateReport {
    nodeId: string;
  
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
  
    observedAt?: string;
  }
  
  export interface ReportDesktopStateOptions {
    previousObservation?:
      ChernobogDesktopObservation;
  
    rememberObservation?: boolean;
  }
  
  const lastObservationByNode =
    new Map<
      string,
      ChernobogDesktopObservation
    >();
  
  function cloneObservation(
    observation:
      ChernobogDesktopObservation
  ): ChernobogDesktopObservation {
    return {
      ...observation,
  
      foregroundApplication:
        observation
          .foregroundApplication
          ? {
              ...observation
                .foregroundApplication,
            }
          : undefined,
  
      workspace:
        observation.workspace
          ? {
              ...observation.workspace,
            }
          : undefined,
  
      screen:
        observation.screen
          ? {
              ...observation.screen,
            }
          : undefined,
  
      metadata:
        observation.metadata
          ? {
              ...observation.metadata,
            }
          : undefined,
    };
  }
  
  export function getLastDesktopObservation(
    nodeId: string
  ):
    | ChernobogDesktopObservation
    | undefined {
    const observation =
      lastObservationByNode.get(
        nodeId
      );
  
    return observation
      ? cloneObservation(
          observation
        )
      : undefined;
  }
  
  export function clearDesktopObservationState(
    nodeId?: string
  ): void {
    if (nodeId) {
      lastObservationByNode.delete(
        nodeId
      );
  
      return;
    }
  
    lastObservationByNode.clear();
  }
  
  export async function reportDesktopState(
    report: DesktopStateReport,
    options:
      ReportDesktopStateOptions = {}
  ): Promise<ChernobogDesktopObservation> {
    const observation =
      createDesktopObservation({
        nodeId:
          report.nodeId,
  
        platform:
          report.platform,
  
        presence:
          report.presence,
  
        activity:
          report.activity,
  
        idleSeconds:
          report.idleSeconds,
  
        foregroundApplication:
          report.foregroundApplication,
  
        workspace:
          report.workspace,
  
        screen:
          report.screen,
  
        message:
          report.message,
  
        metadata:
          report.metadata,
  
        observedAt:
          report.observedAt,
      });
  
    const previousObservation =
      options.previousObservation ??
      getLastDesktopObservation(
        report.nodeId
      );
  
    await publishDesktopObservation(
      observation,
      {
        previousObservation,
      }
    );
  
    if (
      options.rememberObservation !==
      false
    ) {
      lastObservationByNode.set(
        report.nodeId,
        cloneObservation(
          observation
        )
      );
    }
  
    return observation;
  }