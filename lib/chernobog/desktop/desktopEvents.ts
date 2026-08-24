import { publishChernobogEventSafely } from "../events/publishers";

import type {
  ChernobogDesktopObservation,
} from "./desktopObservation";

export interface PublishDesktopObservationOptions {
  previousObservation?: ChernobogDesktopObservation;
}

function buildDesktopPayload(
  observation: ChernobogDesktopObservation
) {
  return {
    nodeId:
      observation.nodeId,

    platform:
      observation.platform,

    presence:
      observation.presence,

    activity:
      observation.activity,

    idleSeconds:
      observation.idleSeconds,

    foregroundApplication:
      observation.foregroundApplication,

    workspace:
      observation.workspace,

    screen:
      observation.screen,

    observedAt:
      observation.observedAt,
  };
}

function applicationKey(
  observation:
    ChernobogDesktopObservation
): string {
  const application =
    observation.foregroundApplication;

  if (!application) {
    return "none";
  }

  return [
    application.id ?? "",
    application.name ?? "",
  ].join(":");
}

function workspaceKey(
  observation:
    ChernobogDesktopObservation
): string {
  const workspace =
    observation.workspace;

  if (!workspace) {
    return "none";
  }

  return [
    workspace.id ?? "",
    workspace.projectId ?? "",
    workspace.kind ?? "",
  ].join(":");
}

export async function publishDesktopObservation(
  observation:
    ChernobogDesktopObservation,
  options:
    PublishDesktopObservationOptions = {}
): Promise<void> {
  const payload =
    buildDesktopPayload(
      observation
    );

  const previous =
    options.previousObservation;

  /*
   * Every desktop report first becomes
   * one neutral observation.
   */
  await publishChernobogEventSafely({
    type:
      "desktop.observed",

    source: {
      subsystem:
        "desktop-observation",

      nodeId:
        observation.nodeId,
    },

    severity:
      "debug",

    subject:
      observation.nodeId,

    scope:
      `node:${observation.nodeId}`,

    payload,

    dedupeKey: [
      "desktop.observed",
      observation.nodeId,
      observation.presence,
      observation.activity,
      applicationKey(
        observation
      ),
      workspaceKey(
        observation
      ),
      observation.screen?.status ??
        "no-screen-state",
    ].join(":"),

    metadata: {
      tags: [
        "desktop",
        "observation",
      ],
    },
  });

  /*
   * USER PRESENCE
   */
  if (
    observation.presence ===
    "present"
  ) {
    await publishChernobogEventSafely({
      type:
        "desktop.user_present",

      source: {
        subsystem:
          "desktop-observation",

        nodeId:
          observation.nodeId,
      },

      severity:
        "info",

      subject:
        observation.nodeId,

      scope:
        `node:${observation.nodeId}`,

      payload: {
        nodeId:
          observation.nodeId,

        presence:
          observation.presence,

        observedAt:
          observation.observedAt,
      },

      dedupeKey:
        `desktop.user_present:${observation.nodeId}`,

      metadata: {
        tags: [
          "desktop",
          "presence",
          "present",
        ],
      },
    });
  }

  if (
    observation.presence ===
    "absent"
  ) {
    await publishChernobogEventSafely({
      type:
        "desktop.user_absent",

      source: {
        subsystem:
          "desktop-observation",

        nodeId:
          observation.nodeId,
      },

      severity:
        "info",

      subject:
        observation.nodeId,

      scope:
        `node:${observation.nodeId}`,

      payload: {
        nodeId:
          observation.nodeId,

        presence:
          observation.presence,

        observedAt:
          observation.observedAt,
      },

      dedupeKey:
        `desktop.user_absent:${observation.nodeId}`,

      metadata: {
        tags: [
          "desktop",
          "presence",
          "absent",
        ],
      },
    });
  }

  /*
   * USER ACTIVITY
   */
  const activityType =
    observation.activity === "active"
      ? "desktop.user_active"
      : observation.activity === "idle"
        ? "desktop.user_idle"
        : observation.activity === "locked"
          ? "desktop.session_locked"
          : undefined;

  if (activityType) {
    await publishChernobogEventSafely({
      type:
        activityType,

      source: {
        subsystem:
          "desktop-observation",

        nodeId:
          observation.nodeId,
      },

      severity:
        observation.activity ===
        "locked"
          ? "notice"
          : "info",

      subject:
        observation.nodeId,

      scope:
        `node:${observation.nodeId}`,

      payload: {
        nodeId:
          observation.nodeId,

        activity:
          observation.activity,

        idleSeconds:
          observation.idleSeconds,

        observedAt:
          observation.observedAt,
      },

      dedupeKey:
        `${activityType}:${observation.nodeId}`,

      metadata: {
        tags: [
          "desktop",
          "activity",
          observation.activity,
        ],
      },
    });
  }

  /*
   * SCREEN CAPABILITY
   */
  if (
    observation.screen?.status ===
    "available"
  ) {
    await publishChernobogEventSafely({
      type:
        "desktop.screen_available",

      source: {
        subsystem:
          "desktop-observation",

        nodeId:
          observation.nodeId,
      },

      severity:
        "info",

      subject:
        observation.nodeId,

      scope:
        `node:${observation.nodeId}`,

      payload: {
        nodeId:
          observation.nodeId,

        status:
          observation.screen.status,

        monitorCount:
          observation.screen.monitorCount,

        observedAt:
          observation.observedAt,
      },

      dedupeKey:
        `desktop.screen_available:${observation.nodeId}:${observation.screen.monitorCount ?? "unknown"}`,

      metadata: {
        tags: [
          "desktop",
          "screen",
          "available",
        ],
      },
    });
  }

  if (
    observation.screen?.status ===
    "unavailable"
  ) {
    await publishChernobogEventSafely({
      type:
        "desktop.screen_unavailable",

      source: {
        subsystem:
          "desktop-observation",

        nodeId:
          observation.nodeId,
      },

      severity:
        "warning",

      subject:
        observation.nodeId,

      scope:
        `node:${observation.nodeId}`,

      payload: {
        nodeId:
          observation.nodeId,

        status:
          observation.screen.status,

        observedAt:
          observation.observedAt,
      },

      dedupeKey:
        `desktop.screen_unavailable:${observation.nodeId}`,

      metadata: {
        tags: [
          "desktop",
          "screen",
          "unavailable",
        ],
      },
    });
  }

  /*
   * Application/workspace events are
   * transitions rather than generic
   * current-state announcements.
   *
   * The first desktop observation is enough
   * to establish initial state through
   * desktop.observed.
   */
  if (
    previous &&
    applicationKey(previous) !==
      applicationKey(observation)
  ) {
    await publishChernobogEventSafely({
      type:
        "desktop.application_changed",

      source: {
        subsystem:
          "desktop-observation",

        nodeId:
          observation.nodeId,
      },

      severity:
        "info",

      subject:
        observation.nodeId,

      scope:
        `node:${observation.nodeId}`,

      payload: {
        nodeId:
          observation.nodeId,

        previousApplication:
          previous.foregroundApplication,

        currentApplication:
          observation.foregroundApplication,

        observedAt:
          observation.observedAt,
      },

      dedupeKey: [
        "desktop.application_changed",
        observation.nodeId,
        applicationKey(previous),
        applicationKey(observation),
      ].join(":"),

      metadata: {
        tags: [
          "desktop",
          "application",
          "changed",
        ],
      },
    });
  }

  if (
    previous &&
    workspaceKey(previous) !==
      workspaceKey(observation)
  ) {
    await publishChernobogEventSafely({
      type:
        "desktop.workspace_changed",

      source: {
        subsystem:
          "desktop-observation",

        nodeId:
          observation.nodeId,
      },

      severity:
        "info",

      subject:
        observation.nodeId,

      scope:
        `node:${observation.nodeId}`,

      payload: {
        nodeId:
          observation.nodeId,

        previousWorkspace:
          previous.workspace,

        currentWorkspace:
          observation.workspace,

        observedAt:
          observation.observedAt,
      },

      dedupeKey: [
        "desktop.workspace_changed",
        observation.nodeId,
        workspaceKey(previous),
        workspaceKey(observation),
      ].join(":"),

      metadata: {
        tags: [
          "desktop",
          "workspace",
          "changed",
        ],
      },
    });
  }
}