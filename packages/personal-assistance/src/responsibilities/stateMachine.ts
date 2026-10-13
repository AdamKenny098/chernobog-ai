import type {
  ResponsibilityState,
} from "./types";

const ALLOWED_TRANSITIONS:
  Readonly<Record<
    ResponsibilityState,
    ReadonlySet<ResponsibilityState>
  >> = {
    detected:
      new Set([
        "triaged",
        "waiting-user",
        "waiting-external",
        "scheduled",
        "delegated",
        "resolved",
        "dismissed",
      ]),
    triaged:
      new Set([
        "waiting-user",
        "waiting-external",
        "scheduled",
        "delegated",
        "resolved",
        "dismissed",
      ]),
    "waiting-user":
      new Set([
        "triaged",
        "waiting-external",
        "scheduled",
        "delegated",
        "resolved",
        "dismissed",
      ]),
    "waiting-external":
      new Set([
        "triaged",
        "waiting-user",
        "scheduled",
        "delegated",
        "resolved",
        "dismissed",
      ]),
    scheduled:
      new Set([
        "triaged",
        "waiting-user",
        "waiting-external",
        "delegated",
        "resolved",
        "dismissed",
      ]),
    delegated:
      new Set([
        "triaged",
        "waiting-user",
        "waiting-external",
        "scheduled",
        "resolved",
        "dismissed",
      ]),
    resolved:
      new Set([
        "triaged",
      ]),
    dismissed:
      new Set([
        "triaged",
      ]),
  };

export function canTransitionResponsibility(
  from: ResponsibilityState,
  to: ResponsibilityState,
): boolean {
  if (
    from === to
  ) {
    return true;
  }

  return ALLOWED_TRANSITIONS[
    from
  ].has(to);
}

export function assertResponsibilityTransition(
  from: ResponsibilityState,
  to: ResponsibilityState,
): void {
  if (
    canTransitionResponsibility(
      from,
      to,
    )
  ) {
    return;
  }

  throw new Error(
    `Invalid responsibility transition: ${from} -> ${to}`,
  );
}

export function isClosedResponsibilityState(
  state: ResponsibilityState,
): boolean {
  return (
    state === "resolved" ||
    state === "dismissed"
  );
}
