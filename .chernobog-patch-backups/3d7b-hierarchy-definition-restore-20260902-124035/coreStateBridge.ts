"use client";

export type ChernobogCoreState =
  | "idle"
  | "listening"
  | "thinking"
  | "routing"
  | "speaking"
  | "waiting"
  | "success"
  | "failure";

export const CHERNOBOG_CORE_STATE_EVENT = "chernobog:core-state";
export const CHERNOBOG_CORE_STATE_STORAGE_KEY = "chernobog.core-state.v1";

const VALID_STATES: readonly ChernobogCoreState[] = [
  "idle",
  "listening",
  "thinking",
  "routing",
  "speaking",
  "waiting",
  "success",
  "failure",
];

function isCoreState(value: unknown): value is ChernobogCoreState {
  return (
    typeof value === "string" &&
    VALID_STATES.includes(value as ChernobogCoreState)
  );
}

type StoredCoreState = {
  state: ChernobogCoreState;
  changedAt: number;
};

export function readChernobogCoreState(): ChernobogCoreState {
  if (typeof window === "undefined") {
    return "idle";
  }

  try {
    const raw = window.localStorage.getItem(
      CHERNOBOG_CORE_STATE_STORAGE_KEY,
    );

    if (!raw) {
      return "idle";
    }

    const parsed = JSON.parse(raw) as Partial<StoredCoreState>;

    return isCoreState(parsed.state) ? parsed.state : "idle";
  } catch {
    return "idle";
  }
}

export function publishChernobogCoreState(
  state: ChernobogCoreState,
): void {
  if (typeof window === "undefined") {
    return;
  }

  const payload: StoredCoreState = {
    state,
    changedAt: Date.now(),
  };

  try {
    window.localStorage.setItem(
      CHERNOBOG_CORE_STATE_STORAGE_KEY,
      JSON.stringify(payload),
    );
  } catch {
    // The CustomEvent path still keeps same-document consumers live.
  }

  window.dispatchEvent(
    new CustomEvent<{ state: ChernobogCoreState }>(
      CHERNOBOG_CORE_STATE_EVENT,
      {
        detail: { state },
      },
    ),
  );
}

export function subscribeChernobogCoreState(
  listener: (state: ChernobogCoreState) => void,
): () => void {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  function handleCustomEvent(event: Event) {
    const customEvent = event as CustomEvent<{ state?: unknown }>;

    if (isCoreState(customEvent.detail?.state)) {
      listener(customEvent.detail.state);
    }
  }

  function handleStorage(event: StorageEvent) {
    if (
      event.key !== CHERNOBOG_CORE_STATE_STORAGE_KEY ||
      !event.newValue
    ) {
      return;
    }

    try {
      const parsed = JSON.parse(event.newValue) as Partial<StoredCoreState>;

      if (isCoreState(parsed.state)) {
        listener(parsed.state);
      }
    } catch {
      // Ignore malformed external storage writes.
    }
  }

  window.addEventListener(
    CHERNOBOG_CORE_STATE_EVENT,
    handleCustomEvent,
  );
  window.addEventListener("storage", handleStorage);

  return () => {
    window.removeEventListener(
      CHERNOBOG_CORE_STATE_EVENT,
      handleCustomEvent,
    );
    window.removeEventListener("storage", handleStorage);
  };
}
