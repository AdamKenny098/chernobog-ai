"use client";

import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";

type AttentionState = "available" | "busy" | "away" | "do-not-disturb";
type Duration = "until-off" | "15" | "60" | "custom";

type AttentionSnapshot = {
  state: AttentionState;
  source: "system-default" | "explicit-user";
  explicit: boolean;
  setAt: string | null;
  expiresAt: string | null;
  reason: string | null;
  revision: number;
};

type ProfileSnapshot = {
  proactiveAssistanceEnabled: boolean;
  interruptionPreference: string;
};

type AttentionResponse = {
  ok?: boolean;
  attention?: AttentionSnapshot;
  message?: string;
  error?: string;
};

type ProfileResponse = {
  ok?: boolean;
  profile?: ProfileSnapshot;
  message?: string;
  error?: string;
};

const ATTENTION_API = "/api/personal-assistance/attention";
const PROFILE_API = "/api/personal-assistance/profile";

const STATE_LABELS: Record<AttentionState, string> = {
  available: "Available",
  busy: "Busy",
  away: "Away",
  "do-not-disturb": "Do Not Disturb",
};

const STATES: AttentionState[] = [
  "available", "busy", "away", "do-not-disturb",
];

function isAttentionState(value: unknown): value is AttentionState {
  return typeof value === "string" && STATES.includes(value as AttentionState);
}

function safeError(value: unknown): string {
  return value instanceof Error ? value.message : "Unexpected attention control error.";
}

function expiryText(expiresAt: string | null): string {
  if (!expiresAt) return "Until you turn it off";
  const date = new Date(expiresAt);
  if (Number.isNaN(date.getTime())) return "Expiry unavailable";
  return `Until ${date.toLocaleString(undefined, {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  })}`;
}

export function AttentionControlSurface() {
  const [attention, setAttention] = useState<AttentionSnapshot | null>(null);
  const [profile, setProfile] = useState<ProfileSnapshot | null>(null);
  const [duration, setDuration] = useState<Duration>("until-off");
  const [customMinutes, setCustomMinutes] = useState("120");
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const requestCounter = useRef(0);
  const mutationInProgress = useRef(false);

  const refresh = useCallback(async (): Promise<AttentionSnapshot> => {
    const seq = ++requestCounter.current;
    const [attentionResponse, profileResponse] = await Promise.all([
      fetch(ATTENTION_API, { cache: "no-store", credentials: "same-origin" }),
      fetch(PROFILE_API, { cache: "no-store", credentials: "same-origin" }),
    ]);

    const a = await attentionResponse.json() as AttentionResponse;
    const p = await profileResponse.json() as ProfileResponse;
    if (!attentionResponse.ok || !a.ok || !a.attention || !isAttentionState(a.attention.state)) {
      throw new Error(a.message ?? a.error ?? "Could not verify attention state.");
    }
    if (!profileResponse.ok || !p.ok || !p.profile ||
        typeof p.profile.proactiveAssistanceEnabled !== "boolean") {
      throw new Error(p.message ?? p.error ?? "Could not verify proactive assistance setting.");
    }

    if (seq === requestCounter.current) {
      setAttention(a.attention);
      setProfile(p.profile);
      setVerified(true);
      setError(null);
      setLoading(false);
    }
    return a.attention;
  }, []);

  useEffect(() => {
    let active = true;
    const check = async () => {
      if (mutationInProgress.current) return;
      try {
        await refresh();
      } catch (failure) {
        if (active) {
          setVerified(false);
          setError(safeError(failure));
          setLoading(false);
        }
      }
    };
    const onFocus = () => { void check(); };
    const onVisibility = () => {
      if (document.visibilityState === "visible") void check();
    };
    void check();
    const poll = window.setInterval(() => {
      if (document.visibilityState === "visible") void check();
    }, 15_000);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      active = false;
      requestCounter.current += 1;
      window.clearInterval(poll);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [refresh]);

  function durationMinutes(): number | undefined {
    if (duration === "until-off") return undefined;
    if (duration === "15" || duration === "60") return Number(duration);
    const minutes = Number(customMinutes);
    if (!Number.isInteger(minutes) || minutes < 5 || minutes > 1440) {
      throw new Error("Custom duration must be a whole number from 5 to 1440 minutes.");
    }
    return minutes;
  }

  async function applyState(nextState: AttentionState) {
    if (mutationInProgress.current || !verified || !attention || !profile) return;
    let minutes: number | undefined;
    try {
      if (nextState !== "available") minutes = durationMinutes();
    } catch (failure) {
      setError(safeError(failure));
      return;
    }

    mutationInProgress.current = true;
    requestCounter.current += 1; // Invalidate an older polling response.
    setPending(true);
    setVerified(false);
    setError(null);
    setNotice(null);
    try {
      const reset = nextState === "available";
      const response = await fetch(ATTENTION_API, {
        method: reset ? "DELETE" : "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reset
          ? { reason: "Owner cleared attention override from OH-6H control surface." }
          : {
              state: nextState,
              ...(minutes === undefined ? {} : { durationMinutes: minutes }),
              reason: "Explicit OH-6H attention control selection.",
            }),
      });
      const body = await response.json() as AttentionResponse;
      if (!response.ok || !body.ok || !body.attention) {
        throw new Error(body.message ?? body.error ?? "Attention change was rejected.");
      }

      const authoritative = await refresh();
      if (authoritative.state !== nextState) {
        throw new Error("Attention change did not match the authoritative server state.");
      }
      setNotice(`${STATE_LABELS[nextState]} confirmed by Chernobog.`);
    } catch (failure) {
      setVerified(false);
      setError(`${safeError(failure)} Refresh before making another change.`);
    } finally {
      mutationInProgress.current = false;
      setPending(false);
    }
  }

  const isDnd = attention?.state === "do-not-disturb";
  const disabled = loading || pending || !verified || !attention || !profile;
  const tone = !verified
    ? "text-[#d1a77b]"
    : isDnd
      ? "text-[#ffb4ab]"
      : attention?.state === "available"
        ? "text-[#a6e6bf]"
        : "text-[#ffd09a]";

  return (
    <section aria-label="Personal attention controls" className="relative z-50 border-b border-[#7b431c]/50 bg-[#090603]/95 px-5 py-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-[175px] flex-1">
          <div className="text-[9px] font-semibold uppercase tracking-[0.25em] text-[#ba7e45]">
            Personal Attention <span className="text-[#6f5135]">/ OH-6H</span>
          </div>
          <div role="status" aria-live="polite" className={`mt-1 text-[12px] font-semibold ${tone}`}>
            {loading ? "Loading attention state..." : verified && attention
              ? STATE_LABELS[attention.state]
              : "State not verified"}
            {verified && attention?.explicit && attention.expiresAt
              ? <span className="ml-2 text-[10px] font-normal text-[#b68a60]">{expiryText(attention.expiresAt)}</span>
              : null}
          </div>
        </div>
        <label className="flex items-center gap-2 text-[10px] text-[#c39a74]">
          <span>DND duration</span>
          <select aria-label="DND and attention mode duration" value={duration} disabled={pending}
            onChange={(event: ChangeEvent<HTMLSelectElement>) => setDuration(event.target.value as Duration)}
            className="max-w-[150px] border border-[#85502b]/70 bg-[#100a05] px-2 py-1.5 text-[#f6cea1] focus-visible:outline focus-visible:outline-1 focus-visible:outline-[#ff9d2e]">
            <option value="until-off">Until I turn it off</option>
            <option value="15">15 minutes</option>
            <option value="60">1 hour</option>
            <option value="custom">Custom</option>
          </select>
        </label>
        {duration === "custom" ? (
          <label className="flex items-center gap-2 text-[10px] text-[#c39a74]">
            <span>Minutes</span>
            <input aria-label="Custom attention duration in minutes" type="number" min={5} max={1440}
              value={customMinutes} disabled={pending} onChange={(event: ChangeEvent<HTMLInputElement>) => setCustomMinutes(event.target.value)}
              className="w-[75px] border border-[#85502b]/70 bg-[#100a05] px-2 py-1.5 text-[#f6cea1]" />
          </label>
        ) : null}
        <button type="button" disabled={disabled} onClick={() => void applyState(isDnd ? "available" : "do-not-disturb")}
          className={`min-w-[130px] border px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.1em] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ffb478] disabled:cursor-not-allowed disabled:opacity-40 ${isDnd
            ? "border-[#e8b39d]/65 bg-[#381711] text-[#ffccc3] hover:bg-[#512017]"
            : "border-[#d27636]/75 bg-[#38200f] text-[#ffd4a2] hover:bg-[#513016]"}`}>
          {pending ? "Applying..." : isDnd ? "Disable DND" : "Enable DND"}
        </button>
        <button type="button" aria-expanded={expanded} aria-controls="oh6h-attention-details"
          onClick={() => setExpanded((previous) => !previous)}
          className="border border-[#795032]/60 bg-black/30 px-3 py-2 text-[10px] uppercase tracking-[0.1em] text-[#cda072] hover:text-[#ffdaad] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ff9d2e]">
          {expanded ? "Close controls" : "More controls"}
        </button>
        <button type="button" disabled={pending} onClick={() => {
          setNotice(null);
          void refresh().catch((failure: unknown) => {
            setVerified(false);
            setError(safeError(failure));
          });
        }} className="text-[10px] text-[#ac8158] underline-offset-2 hover:underline disabled:opacity-40">
          Refresh
        </button>
      </div>

      {error ? <p role="alert" className="mt-2 border border-red-800/55 bg-red-950/35 px-3 py-2 text-[11px] text-[#ffbeb1]">{error}</p> : null}
      {notice ? <p role="status" className="mt-2 text-[10px] text-[#a6e6bf]">{notice}</p> : null}

      {expanded ? (
        <div id="oh6h-attention-details" className="mt-3 grid gap-4 border-t border-[#704220]/60 pt-3 lg:grid-cols-[minmax(0,1fr)_minmax(230px,360px)]">
          <div>
            <h2 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#dca267]">Attention state</h2>
            <p className="mt-1 text-[11px] leading-5 text-[#ac8867]">
              Choose how Chernobog treats interruptions. A selected duration applies to Busy, Away, or DND. Available clears your explicit override.
            </p>
            <div role="group" aria-label="Select attention state" className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {STATES.map((state) => (
                <button key={state} type="button" disabled={disabled || attention?.state === state}
                  aria-pressed={verified && attention?.state === state}
                  onClick={() => void applyState(state)}
                  className={`border px-2 py-3 text-[11px] font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ff9d2e] disabled:cursor-not-allowed disabled:opacity-55 ${attention?.state === state && verified
                    ? "border-[#d78a43] bg-[#34200f] text-[#ffdaad]"
                    : "border-[#704222]/60 bg-black/30 text-[#bc9169] hover:border-[#b9783d]"}`}>
                  {STATE_LABELS[state]}
                </button>
              ))}
            </div>
            <p className="mt-3 text-[10px] leading-5 text-[#ae7554]">
              DND is absolute: critical reminders cannot override it. Busy and Away defer reminders. Changes are explicitly submitted and confirmed by the server.
            </p>
          </div>
          <div className="border border-[#704222]/60 bg-black/30 p-3">
            <h2 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#dca267]">Current policy</h2>
            <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-[11px]">
              <dt className="text-[#8b684a]">Attention</dt>
              <dd className="text-right text-[#eed0ac]">{verified && attention ? STATE_LABELS[attention.state] : "Unverified"}</dd>
              <dt className="text-[#8b684a]">Expires</dt>
              <dd className="text-right text-[#eed0ac]">{verified && attention ? (attention.state === "available" ? "No active override" : expiryText(attention.expiresAt)) : "Unverified"}</dd>
              <dt className="text-[#8b684a]">Proactive assistance</dt>
              <dd className="text-right text-[#eed0ac]">{verified && profile ? (profile.proactiveAssistanceEnabled ? "Enabled" : "Disabled") : "Unverified"}</dd>
              <dt className="text-[#8b684a]">Interruption threshold</dt>
              <dd className="text-right text-[#eed0ac]">{verified && profile ? profile.interruptionPreference : "Unverified"}</dd>
              <dt className="text-[#8b684a]">Authority</dt>
              <dd className="text-right text-[#eed0ac]">{verified && attention ? attention.source : "Unverified"}</dd>
            </dl>
            <p className="mt-3 text-[10px] leading-5 text-[#ac8867]">
              Proactive assistance and the interruption threshold are displayed for context only. Changing attention does not enable either one.
            </p>
          </div>
        </div>
      ) : null}
    </section>
  );
}
