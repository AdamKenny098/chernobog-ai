"use client";

import { useState } from "react";

type FeedbackVerdict = "useful" | "irrelevant" | "revisit-later" | "clear";
type FeedbackView = {
  state: string;
  verdict: FeedbackVerdict | null;
  revision: number;
  revisitAt: string | null;
};
type RecommendationItem = {
  id: string;
  rank: number;
  title: string;
  category: string;
  priority: "low" | "normal" | "important" | "critical";
  lane: string;
  suggestedAction: string;
  reasonCodes: string[];
  evidence: { confidence: string; explanation: string; caveat: string | null };
  feedback: FeedbackView;
};
type RecommendationResponse = {
  ok: boolean;
  error?: string;
  recommendations?: {
    totalMatching: number;
    returned: number;
    items: RecommendationItem[];
    policy: { attentionState: string; deliveryMode: string; pushEnabled: boolean };
    feedbackSummary: { hiddenIrrelevant: number; hiddenRevisit: number };
  };
};
type ReminderRow = {
  id: string;
  title: string;
  dueAt: string;
  priority: string;
};
type ReminderResponse = {
  ok: boolean;
  error?: string;
  preview?: { totalMatching: number; items: ReminderRow[] };
};
type AdjustmentHistory = {
  actionId: string;
  kind: string;
  previousDueAt: string;
  dueAt: string;
  changedAt: string;
};
type MutationResponse = { ok: boolean; error?: string };

const PANEL = "border border-[#754320]/70 bg-[#090603]/95";
const LABEL = "text-[9px] font-semibold uppercase tracking-[0.2em] text-[#b78350]";
const BUTTON = "border border-[#925d31]/75 bg-[#221408] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.09em] text-[#f2c58c] transition hover:border-[#e39a55] hover:bg-[#38200c] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ffad54] disabled:cursor-not-allowed disabled:opacity-40";
const FIELD = "w-full border border-[#795032]/75 bg-[#080604] px-2 py-2 text-[12px] text-[#f7d0a3] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#e69b55]";

function errorText(value: unknown): string {
  return value instanceof Error ? value.message : "Request failed. Refresh and try again.";
}

function dateText(iso: string | null): string {
  if (!iso) return "Not scheduled";
  const date = new Date(iso);
  return Number.isFinite(date.getTime()) ? date.toLocaleString() : "Unverified time";
}

function explicitInstant(local: string): string {
  if (!local) throw new Error("Choose a date and time first.");
  const parsed = new Date(local);
  if (!Number.isFinite(parsed.getTime())) throw new Error("Invalid date and time.");
  return parsed.toISOString();
}

async function requestJson<T extends { ok: boolean; error?: string }>(
  url: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(url, {
    credentials: "same-origin",
    cache: "no-store",
    ...init,
  });
  const body = await response.json() as T;
  if (!response.ok || !body.ok) throw new Error(body.error ?? `Request rejected (${response.status}).`);
  return body;
}

/** OH-6K5: owner-operated controls. No polling, scheduling, or autonomous actions. */
export function AdaptiveAssistanceSurface() {
  const [expanded, setExpanded] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<RecommendationResponse["recommendations"]>();
  const [reminderPreview, setReminderPreview] = useState<ReminderResponse["preview"]>();
  const [revisitLocal, setRevisitLocal] = useState("");
  const [reminderId, setReminderId] = useState("");
  const [snoozeMinutes, setSnoozeMinutes] = useState("15");
  const [rescheduleLocal, setRescheduleLocal] = useState("");
  const [adjustmentHistory, setAdjustmentHistory] = useState<AdjustmentHistory[] | null>(null);

  async function refresh(): Promise<boolean> {
    setLoading(true);
    setError(null);
    try {
      // Include hidden records so an owner can undo a dismissal or deferral.
      const [recommendationResult, reminderResult] = await Promise.all([
        requestJson<RecommendationResponse>(
          "/api/personal-assistance/adaptive-recommendations?limit=100&includeHidden=true",
        ),
        requestJson<ReminderResponse>(
          "/api/personal-assistance/reminders/preview?limit=100",
        ),
      ]);
      if (!recommendationResult.recommendations || !reminderResult.preview) {
        throw new Error("Chernobog returned an incomplete Personal Assistance snapshot.");
      }
      setRecommendations(recommendationResult.recommendations);
      setReminderPreview(reminderResult.preview);
      setLoaded(true);
      setAdjustmentHistory(null);
      return true;
    } catch (failure) {
      setError(errorText(failure));
      return false;
    } finally {
      setLoading(false);
    }
  }

  function toggle(): void {
    if (!expanded && !loaded) void refresh();
    setExpanded((previous) => !previous);
  }

  async function recordFeedback(item: RecommendationItem, verdict: FeedbackVerdict): Promise<void> {
    if (loading || pending) return;
    let revisitAt: string | undefined;
    try {
      if (verdict === "revisit-later") {
        revisitAt = explicitInstant(revisitLocal);
        // Revisit bounds are validated by the K4 server.
      }
    } catch (failure) {
      setError(errorText(failure));
      return;
    }
    setPending(item.id);
    setError(null);
    setNotice(null);
    try {
      await requestJson<MutationResponse>("/api/personal-assistance/adaptive-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actionKey: `ui-k5:${crypto.randomUUID()}`,
          recommendationId: item.id,
          expectedRevision: item.feedback.revision,
          verdict,
          ...(revisitAt === undefined ? {} : { revisitAt }),
        }),
      });
      const confirmed = await refresh();
      setNotice(confirmed
        ? `Feedback recorded: ${verdict}.`
        : `Feedback was accepted by the server; refresh failed. Click Refresh to verify the new state.`);
    } catch (failure) {
      setError(`${errorText(failure)} No action was assumed. Refresh before retrying.`);
    } finally {
      setPending(null);
    }
  }

  const reminders = reminderPreview?.items ?? [];
  const selectedReminder = reminders.find((item) => item.id === reminderId) ?? reminders[0];

  async function adjustReminder(kind: "snooze" | "reschedule"): Promise<void> {
    if (!selectedReminder || loading || pending) return;
    let change: { minutes: number } | { dueAt: string };
    try {
      if (kind === "snooze") {
        const minutes = Number(snoozeMinutes);
        if (!Number.isInteger(minutes) || minutes < 1 || minutes > 43200) {
          throw new Error("Snooze must be 1–43,200 whole minutes.");
        }
        change = { minutes };
      } else {
        const dueAt = explicitInstant(rescheduleLocal);
        if (Date.parse(dueAt) <= Date.now()) {
          throw new Error("Choose a future reschedule time.");
        }
        change = { dueAt };
      }
    } catch (failure) {
      setError(errorText(failure));
      return;
    }
    setPending(selectedReminder.id);
    setError(null);
    setNotice(null);
    try {
      await requestJson<MutationResponse>("/api/personal-assistance/reminders/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actionId: `ui-k5:${crypto.randomUUID()}`,
          reminderId: selectedReminder.id,
          expectedDueAt: selectedReminder.dueAt,
          kind,
          ...change,
        }),
      });
      const confirmed = await refresh();
      setNotice(confirmed
        ? `Reminder ${kind === "snooze" ? "snoozed" : "rescheduled"}; refreshed from server.`
        : `Adjustment was accepted by the server; refresh failed. Click Refresh to verify the new due time.`);
    } catch (failure) {
      setError(`${errorText(failure)} Reminder was not confirmed changed; refresh before retrying.`);
    } finally {
      setPending(null);
    }
  }

  async function loadHistory(): Promise<void> {
    if (!selectedReminder || loading || pending) return;
    setPending("history");
    setError(null);
    try {
      const result = await requestJson<{ ok: boolean; error?: string; history?: AdjustmentHistory[] }>(
        `/api/personal-assistance/reminders/adjust?reminderId=${encodeURIComponent(selectedReminder.id)}&limit=20`,
      );
      setAdjustmentHistory(result.history ?? []);
    } catch (failure) {
      setError(errorText(failure));
    } finally {
      setPending(null);
    }
  }

  return (
    <section aria-label="Adaptive Personal Assistance" className="relative z-30 border-b border-[#7b431c]/50 bg-[#050302]/90 px-5 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className={LABEL}>Personal Assistance / OH-6K5</div>
          <div className="mt-1 text-[12px] font-semibold text-[#ffd09a]">Adaptive recommendations and reminder controls</div>
          <p className="mt-1 text-[10px] text-[#a8835b]">On demand only. Feedback and reminder adjustments require your explicit action.</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" className={BUTTON} aria-expanded={expanded} aria-controls="oh6k5-body" onClick={toggle}>
            {expanded ? "Close assistance" : "Open assistance"}
          </button>
          {expanded ? <button type="button" className={BUTTON} disabled={loading || pending !== null} onClick={() => void refresh()}>
            {loading ? "Refreshing..." : "Refresh"}
          </button> : null}
        </div>
      </div>
      {expanded ? (
        <div id="oh6k5-body" className="mt-4 space-y-4 border-t border-[#754320]/60 pt-4">
          {error ? <div role="alert" className="border border-red-900/70 bg-red-950/30 px-3 py-2 text-[11px] text-[#ffc7b4]">{error}</div> : null}
          {notice ? <div role="status" className="border border-[#306548] bg-[#0c2418] px-3 py-2 text-[11px] text-[#b5e5c3]">{notice}</div> : null}
          {loading && !loaded ? <p role="status" className="text-[11px] text-[#cc9a65]">Loading authoritative Personal Assistance data...</p> : null}
          {recommendations && reminderPreview ? (
            <>
              <div className="flex flex-wrap gap-x-5 gap-y-1 border border-[#734520]/55 bg-black/30 px-3 py-2 text-[10px] text-[#b58b61]">
                <span>Recommendations: {recommendations.totalMatching}</span>
                <span>Reminders: {reminderPreview.totalMatching}</span>
                <span>Attention: {recommendations.policy.attentionState}</span>
                <span>Delivery: {recommendations.policy.deliveryMode}</span>
                <span>Push: {recommendations.policy.pushEnabled ? "configured" : "off"}</span>
              </div>
              <div className="grid gap-4 2xl:grid-cols-[minmax(0,3fr)_minmax(310px,2fr)]">
                <div className={PANEL + " min-w-0 p-3"}>
                  <h2 className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#ffd09a]">Recommendations</h2>
                  <p className="mt-1 text-[10px] text-[#ad855e]">Showing dismissed and deferred items so you can reverse feedback. This list does not initiate outreach.</p>
                  {recommendations.items.length === 0 ? <p className="mt-4 text-[11px] text-[#b38b69]">No current recommendations.</p> : null}
                  <div className="mt-3 space-y-3">
                    {recommendations.items.map((item) => (
                      <article key={item.id} className="border border-[#654027]/75 bg-[#100a05] p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h3 className="text-[12px] font-semibold text-[#f6cea1]">{item.rank}. {item.title}</h3>
                          <span className="text-[9px] uppercase tracking-[0.1em] text-[#cf9b61]">{item.priority} / {item.lane}</span>
                        </div>
                        <p className="mt-2 text-[11px] leading-5 text-[#ccb091]">{item.evidence.explanation}</p>
                        <p className="mt-1 text-[11px] leading-5 text-[#e3b783]">Action: {item.suggestedAction}</p>
                        {item.evidence.caveat ? <p className="mt-2 text-[10px] text-[#c99a72]">Evidence limitation: {item.evidence.caveat}</p> : null}
                        <div className="mt-2 flex flex-wrap gap-2 text-[9px] text-[#a17c5c]">
                          <span>Confidence: {item.evidence.confidence}</span>
                          <span>Feedback: {item.feedback.state}</span>
                          {item.feedback.revisitAt ? <span>Revisit: {dateText(item.feedback.revisitAt)}</span> : null}
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button type="button" className={BUTTON} disabled={pending !== null || loading} onClick={() => void recordFeedback(item, "useful")}>Useful</button>
                          <button type="button" className={BUTTON} disabled={pending !== null || loading || item.priority === "critical"} title={item.priority === "critical" ? "Critical recommendations remain visible" : undefined} onClick={() => void recordFeedback(item, "irrelevant")}>Irrelevant</button>
                          <button type="button" className={BUTTON} disabled={pending !== null || loading || !revisitLocal || item.priority === "critical"} onClick={() => void recordFeedback(item, "revisit-later")}>Revisit later</button>
                          {item.feedback.state !== "none" && item.feedback.state !== "cleared" ?
                            <button type="button" className={BUTTON} disabled={pending !== null || loading} onClick={() => void recordFeedback(item, "clear")}>Clear feedback</button>
                            : null}
                        </div>
                      </article>
                    ))}
                  </div>
                  <label className="mt-4 block max-w-xs">
                    <span className={LABEL}>Revisit date/time (local)</span>
                    <input aria-label="Revisit later date and time" type="datetime-local" value={revisitLocal} onChange={(event) => setRevisitLocal(event.target.value)} className={FIELD + " mt-2"} />
                  </label>
                </div>
                <div className={PANEL + " min-w-0 p-3"}>
                  <h2 className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#ffd09a]">Reminder adjustments</h2>
                  <p className="mt-1 text-[10px] leading-5 text-[#ad855e]">Snooze or reschedule an existing undelivered reminder. Active Android leases and previously delivered reminders cannot be changed.</p>
                  {reminders.length === 0 ? (
                    <p className="mt-4 border border-[#734520]/55 bg-black/25 px-3 py-3 text-[11px] text-[#cba47c]">No active reminders. Nothing needs adjusting.</p>
                  ) : (
                    <div className="mt-4 space-y-4">
                      <label className="block">
                        <span className={LABEL}>Select reminder</span>
                        <select aria-label="Select reminder to adjust" value={selectedReminder?.id ?? ""} onChange={(event) => { setReminderId(event.target.value); setAdjustmentHistory(null); }} className={FIELD + " mt-2"}>
                          {reminders.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
                        </select>
                      </label>
                      <div className="border border-[#654027]/75 bg-[#100a05] p-3 text-[11px] text-[#c9a27b]">
                        <div>Current due time: <span className="text-[#f6cea1]">{dateText(selectedReminder?.dueAt ?? null)}</span></div>
                        <div className="mt-1">Priority: {selectedReminder?.priority ?? "unknown"}</div>
                      </div>
                      <div>
                        <label className="block"><span className={LABEL}>Snooze duration (minutes)</span>
                          <input aria-label="Snooze duration in minutes" type="number" min={1} max={43200} step={1} value={snoozeMinutes} onChange={(event) => setSnoozeMinutes(event.target.value)} className={FIELD + " mt-2"} />
                        </label>
                        <button type="button" className={BUTTON + " mt-2 w-full"} disabled={pending !== null || loading} onClick={() => void adjustReminder("snooze")}>Snooze selected reminder</button>
                      </div>
                      <div>
                        <label className="block"><span className={LABEL}>New due time (local)</span>
                          <input aria-label="New reminder due date and time" type="datetime-local" value={rescheduleLocal} onChange={(event) => setRescheduleLocal(event.target.value)} className={FIELD + " mt-2"} />
                        </label>
                        <button type="button" className={BUTTON + " mt-2 w-full"} disabled={pending !== null || loading || !rescheduleLocal} onClick={() => void adjustReminder("reschedule")}>Reschedule selected reminder</button>
                      </div>
                      <button type="button" className={BUTTON + " w-full"} disabled={pending !== null || loading} onClick={() => void loadHistory()}>View adjustment history</button>
                      {adjustmentHistory ? (
                        <div className="space-y-2 border-t border-[#754320]/60 pt-3">
                          <h3 className={LABEL}>Recent adjustment history</h3>
                          {adjustmentHistory.length === 0 ? <p className="text-[11px] text-[#a8835b]">No recorded adjustments.</p> : adjustmentHistory.map((row) => (
                            <p key={row.actionId} className="text-[10px] leading-5 text-[#c4a17f]">{row.kind} — {dateText(row.previousDueAt)} to {dateText(row.dueAt)} ({dateText(row.changedAt)})</p>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>
              <p className="text-[10px] leading-5 text-[#9e7b5a]">No automatic feedback, reminder changes, calendar writes or notification dispatch is performed by this panel. Absolute DND remains authoritative. Changes are submitted only when you press an action button.</p>
            </>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
