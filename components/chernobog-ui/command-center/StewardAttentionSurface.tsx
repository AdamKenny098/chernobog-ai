"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type State =
  | "detected" | "triaged" | "waiting-user" | "waiting-external"
  | "scheduled" | "delegated" | "resolved" | "dismissed";
type Priority = "low" | "normal" | "important" | "critical";
type Source = { type: string; sourceId?: string; application?: string };
type Evidence = { id: string; source?: Source; observedAt?: string };
type Responsibility = {
  id: string; title: string; summary: string; source: Source; state: State;
  priority: Priority; requiresHuman: boolean; suggestedAction?: string | null;
  createdAt: string; updatedAt: string; dueAt?: string | null; confidence: number;
  evidence: Evidence[]; revision?: number;
};
type History = {
  id: string; responsibilityId: string; event: string; actor?: string;
  reason?: string; timestamp: string; fromState?: State; toState?: State;
  details?: Record<string, unknown>;
};
type Attention = {
  state: "available" | "busy" | "away" | "do-not-disturb";
  reason: string | null;
};
type Group = "all-active" | "needs-user" | "waiting-external" | "scheduled" | "delegated" | "closed";
type PriorityFilter = "all" | Priority;

const RESPONSIBILITIES_API = "/api/personal-assistance/responsibilities";
const ATTENTION_API = "/api/personal-assistance/attention";

const WEIGHT: Record<Priority, number> = { critical: 4, important: 3, normal: 2, low: 1 };
const PRIORITY_CLASS: Record<Priority, string> = {
  critical: "border-red-400/55 bg-red-950/30 text-red-100",
  important: "border-amber-300/55 bg-amber-950/28 text-amber-100",
  normal: "border-[#8f5b2a]/55 bg-[#1a0d04]/65 text-[#e9bd85]",
  low: "border-[#564633]/70 bg-black/35 text-[#8e785c]",
};
const GROUP_LABEL: Record<Group, string> = {
  "all-active": "All Active",
  "needs-user": "Needs You",
  "waiting-external": "Waiting Elsewhere",
  scheduled: "Scheduled",
  delegated: "Delegated",
  closed: "Closed",
};
const ALLOWED: Record<State, State[]> = {
  detected: ["triaged","waiting-user","waiting-external","scheduled","delegated","resolved","dismissed"],
  triaged: ["waiting-user","waiting-external","scheduled","delegated","resolved","dismissed"],
  "waiting-user": ["triaged","waiting-external","scheduled","delegated","resolved","dismissed"],
  "waiting-external": ["triaged","waiting-user","scheduled","delegated","resolved","dismissed"],
  scheduled: ["triaged","waiting-user","waiting-external","delegated","resolved","dismissed"],
  delegated: ["triaged","waiting-user","waiting-external","scheduled","resolved","dismissed"],
  resolved: ["triaged"],
  dismissed: ["triaged"],
};

function closed(r: Responsibility) { return r.state === "resolved" || r.state === "dismissed"; }
function needsUser(r: Responsibility) { return r.requiresHuman || r.state === "waiting-user"; }
function time(v?: string | null) { if (!v) return null; const n = Date.parse(v); return Number.isFinite(n) ? n : null; }
function shortDate(v?: string | null) {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return v;
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}
function sourceLabel(r: Responsibility) {
  return r.source.application ? `${r.source.application} / ${r.source.type}` : r.source.type;
}
function compare(a: Responsibility, b: Responsibility) {
  const p = WEIGHT[b.priority] - WEIGHT[a.priority];
  if (p) return p;
  if (needsUser(a) !== needsUser(b)) return needsUser(a) ? -1 : 1;
  const ad = time(a.dueAt) ?? Number.POSITIVE_INFINITY;
  const bd = time(b.dueAt) ?? Number.POSITIVE_INFINITY;
  if (ad !== bd) return ad - bd;
  return Date.parse(b.updatedAt) - Date.parse(a.updatedAt);
}
function matchesGroup(r: Responsibility, g: Group) {
  if (g === "closed") return closed(r);
  if (closed(r)) return false;
  if (g === "needs-user") return needsUser(r);
  if (g === "waiting-external") return r.state === "waiting-external";
  if (g === "scheduled") return r.state === "scheduled";
  if (g === "delegated") return r.state === "delegated";
  return true;
}
function localInput(v?: string | null) {
  if (!v) return "";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "";
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}
function attentionText(a: Attention | null) {
  if (!a) return "Attention state unavailable.";
  if (a.state === "do-not-disturb") return "Do Not Disturb is active. Steward stays passive: no interruption or autonomous action.";
  if (a.state === "busy") return "Busy mode is active. Human-required and time-sensitive items remain visually prioritized.";
  if (a.state === "away") return "Away mode is active. Responsibilities remain queued without autonomous action.";
  return "Available mode is active. Steward surfaces the current responsibility queue normally.";
}
function why(r: Responsibility, now: number) {
  const due = time(r.dueAt);
  if (due !== null && due < now && !closed(r)) return "The recorded due time has passed.";
  if (needsUser(r)) return "The canonical ledger says this responsibility needs explicit user attention.";
  if (r.priority === "critical" || r.priority === "important") return `The canonical ledger marks this responsibility ${r.priority}.`;
  if (r.state === "waiting-external") return "This is retained while an external party or system is expected to respond.";
  if (r.state === "scheduled") return "This is marked scheduled in the responsibility ledger; no calendar event is implied.";
  if (r.state === "delegated") return "This is marked delegated in the responsibility ledger.";
  return "This is an active responsibility in the canonical Steward ledger.";
}

export function StewardAttentionSurface() {
  const [items, setItems] = useState<Responsibility[]>([]);
  const [attention, setAttention] = useState<Attention | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [group, setGroup] = useState<Group>("all-active");
  const [query, setQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [selected, setSelected] = useState<Responsibility | null>(null);
  const [history, setHistory] = useState<History[]>([]);
  const [dueDraft, setDueDraft] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const load = useCallback(async () => {
    try {
      const [r, a] = await Promise.all([
        fetch(`${RESPONSIBILITIES_API}?includeClosed=true`, { cache: "no-store" }),
        fetch(ATTENTION_API, { cache: "no-store" }),
      ]);
      const rp = await r.json() as { ok?: boolean; responsibilities?: Responsibility[]; error?: string };
      const ap = await a.json() as { ok?: boolean; attention?: Attention; error?: string; message?: string };
      if (!r.ok || !rp.ok) throw new Error(rp.error ?? "Unable to read responsibilities.");
      if (!a.ok || !ap.ok || !ap.attention) throw new Error(ap.message ?? ap.error ?? "Unable to read attention state.");
      setItems(rp.responsibilities ?? []);
      setAttention(ap.attention);
      setNowMs(Date.now());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDetail = useCallback(async (id: string) => {
    try {
      setDetailError(null);
      const r = await fetch(`${RESPONSIBILITIES_API}/${encodeURIComponent(id)}`, { cache: "no-store" });
      const p = await r.json() as { ok?: boolean; responsibility?: Responsibility; history?: History[]; error?: string };
      if (!r.ok || !p.ok || !p.responsibility) throw new Error(p.error ?? "Unable to read responsibility detail.");
      setSelected(p.responsibility);
      setHistory(p.history ?? []);
      setDueDraft(localInput(p.responsibility.dueAt));
    } catch (e) {
      setDetailError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    const initialTimer = window.setTimeout(() => { void load(); }, 0);
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, 4_000);
    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(timer);
    };
  }, [load]);

  const sorted = useMemo(() => [...items].sort(compare), [items]);
  const active = sorted.filter((r) => !closed(r));
  const closedItems = sorted.filter(closed);
  const needs = active.filter(needsUser);
  const critical = active.filter((r) => r.priority === "critical").length;
  const important = active.filter((r) => r.priority === "important" || r.priority === "critical").length;
  const overdue = active.filter((r) => { const d = time(r.dueAt); return d !== null && d < nowMs; }).length;
  const sources = useMemo(
    () => Array.from(new Set(items.map((r) => r.source.application || r.source.type))).sort(),
    [items],
  );
  const counts: Record<Group, number> = {
    "all-active": active.length,
    "needs-user": needs.length,
    "waiting-external": active.filter((r) => r.state === "waiting-external").length,
    scheduled: active.filter((r) => r.state === "scheduled").length,
    delegated: active.filter((r) => r.state === "delegated").length,
    closed: closedItems.length,
  };
  const q = query.trim().toLowerCase();
  const filtered = sorted.filter((r) => {
    if (!matchesGroup(r, group)) return false;
    if (priorityFilter !== "all" && r.priority !== priorityFilter) return false;
    const src = r.source.application || r.source.type;
    if (sourceFilter !== "all" && src !== sourceFilter) return false;
    if (!q) return true;
    return [r.title,r.summary,r.suggestedAction ?? "",r.source.type,r.source.application ?? "",r.state,r.priority]
      .join(" ").toLowerCase().includes(q);
  });
  const preview = needs[0] ?? active[0] ?? null;
  const newestHistory = [...history].sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp));

  async function transition(r: Responsibility, state: State, reason: string) {
    setBusy(r.id);
    setError(null);
    try {
      const response = await fetch(`${RESPONSIBILITIES_API}/${encodeURIComponent(r.id)}/transition`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state, actor: "steward.attention-ui", reason }),
      });
      const payload = await response.json() as { ok?: boolean; error?: string };
      if (!response.ok || !payload.ok) throw new Error(payload.error ?? "Responsibility transition failed.");
      await load();
      if (selected?.id === r.id) await loadDetail(r.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  async function saveDue(r: Responsibility, raw: string | null) {
    setBusy(r.id);
    setDetailError(null);
    try {
      const dueAt = raw ? new Date(raw).toISOString() : null;
      const response = await fetch(`${RESPONSIBILITIES_API}/${encodeURIComponent(r.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dueAt,
          actor: "steward.attention-ui",
          reason: dueAt
            ? "User updated the responsibility due time from the Steward workspace."
            : "User cleared the responsibility due time from the Steward workspace.",
        }),
      });
      const payload = await response.json() as { ok?: boolean; error?: string };
      if (!response.ok || !payload.ok) throw new Error(payload.error ?? "Unable to update due time.");
      await load();
      await loadDetail(r.id);
    } catch (e) {
      setDetailError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  const attentionTone = attention?.state === "do-not-disturb"
    ? "text-red-200"
    : attention?.state === "busy"
      ? "text-amber-200"
      : attention?.state === "available"
        ? "text-emerald-200"
        : "text-[#c69a6a]";

  return (
    <section aria-label="Steward attention" className="relative z-50 border-b border-[#7b431c]/35 bg-[#040302]/96 backdrop-blur-sm">
      <div className="flex min-h-12 flex-wrap items-center gap-x-4 gap-y-2 px-5 py-2">
        <button type="button" onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#ff9d2e]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#ff9d2e] shadow-[0_0_10px_rgba(255,157,46,0.55)]" />
          <span className="text-[8px] font-semibold uppercase tracking-[0.28em] text-[#b7773e]">Steward Workspace</span>
          <span className="text-[7px] uppercase tracking-[0.18em] text-[#68462c]">{expanded ? "close" : "open"}</span>
        </button>
        <div className="h-5 w-px bg-[#5d3214]/45" />
        <div className="flex flex-wrap gap-3 font-mono text-[8px] uppercase tracking-[0.14em] text-[#765033]">
          <span>User <b className={`font-normal ${attentionTone}`}>{attention?.state ?? (loading ? "loading" : "unknown")}</b></span>
          <span>Needs you <b className="font-normal text-[#ffd09a]">{needs.length}</b></span>
          <span>Important+ <b className="font-normal text-amber-200">{important}</b></span>
          <span>Critical <b className={critical ? "font-normal text-red-200" : "font-normal text-[#8e785c]"}>{critical}</b></span>
          <span>Overdue <b className={overdue ? "font-normal text-red-200" : "font-normal text-[#8e785c]"}>{overdue}</b></span>
          <span>Active <b className="font-normal text-[#c68d50]">{active.length}</b></span>
        </div>
        {preview ? <div className="min-w-0 flex-1 truncate text-right text-[9px] text-[#c99a67]">
          <span className="mr-2 text-[7px] uppercase tracking-[0.17em] text-[#604329]">{needsUser(preview) ? "next for you" : "next active"}</span>
          {preview.title}
        </div> : null}
        <button type="button" onClick={() => void load()} className="border border-[#6f3b1a]/45 bg-black/25 px-2 py-1 text-[7px] uppercase tracking-[0.18em] text-[#8e623c]">sync</button>
      </div>

      {error ? <div className="border-t border-red-500/25 bg-red-950/15 px-5 py-2 text-[9px] text-red-200/80">{error}</div> : null}

      {expanded ? <div className="border-t border-[#5d3214]/45 px-5 py-4">
        <div className="mb-3 grid gap-3 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div>
            <div className="text-[8px] font-semibold uppercase tracking-[0.26em] text-[#d28b46]">Personal Responsibility Workspace</div>
            <p className="mt-1 text-[9px] leading-4 text-[#76583d]">PA-3A1 remains the canonical durable ledger. This workspace filters, explains and submits explicit user actions only.</p>
          </div>
          <div className="border border-[#5d3214]/45 bg-black/25 px-3 py-2">
            <div className={`text-[8px] uppercase tracking-[0.18em] ${attentionTone}`}>{attention?.state ?? "unknown"}</div>
            <p className="mt-1 text-[8px] leading-4 text-[#76583d]">{attentionText(attention)}</p>
          </div>
        </div>

        <div className="mb-3 flex flex-wrap gap-1.5">
          {(Object.keys(GROUP_LABEL) as Group[]).map((g) => (
            <button key={g} type="button" onClick={() => setGroup(g)}
              className={`border px-2.5 py-1.5 text-[7px] uppercase tracking-[0.16em] ${group === g ? "border-[#d27b31]/75 bg-[#2b1608]/80 text-[#ffd09a]" : "border-[#5d3214]/45 bg-black/25 text-[#856344]"}`}>
              {GROUP_LABEL[g]} <span className="ml-1 text-[#6d4c31]">{counts[g]}</span>
            </button>
          ))}
        </div>

        <div className="mb-3 grid gap-2 md:grid-cols-[minmax(0,1fr)_160px_190px]">
          <input value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="Search responsibilities, source, state, suggested action..."
            className="border border-[#5d3214]/55 bg-black/30 px-3 py-2 text-[9px] text-[#e9bd85] outline-none placeholder:text-[#60452f]" />
          <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value as PriorityFilter)}
            className="border border-[#5d3214]/55 bg-[#070503] px-2 py-2 text-[8px] text-[#b78557]">
            <option value="all">All priorities</option><option value="critical">Critical</option>
            <option value="important">Important</option><option value="normal">Normal</option><option value="low">Low</option>
          </select>
          <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)}
            className="border border-[#5d3214]/55 bg-[#070503] px-2 py-2 text-[8px] text-[#b78557]">
            <option value="all">All sources</option>
            {sources.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div className={`grid gap-3 ${selected ? "2xl:grid-cols-[minmax(0,1fr)_430px]" : ""}`}>
          <div className="grid max-h-[570px] gap-2 overflow-y-auto pr-1 xl:grid-cols-2 2xl:grid-cols-1">
            {filtered.length === 0 ? <div className="border border-dashed border-[#5d3214]/45 p-6 text-center text-[9px] text-[#76583d]">No matching responsibilities.</div> : null}
            {filtered.map((r) => {
              const due = time(r.dueAt);
              const isOverdue = due !== null && due < nowMs && !closed(r);
              return <article key={r.id} className={`border bg-[#070503]/92 p-3 ${selected?.id === r.id ? "border-[#c46f2e]/80" : "border-[#5d3214]/55"}`}>
                <button type="button" onClick={() => { setSelected(r); setHistory([]); setDueDraft(localInput(r.dueAt)); void loadDetail(r.id); }}
                  className="block w-full text-left focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#ff9d2e]">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className={`border px-1.5 py-0.5 text-[7px] uppercase tracking-[0.16em] ${PRIORITY_CLASS[r.priority]}`}>{r.priority}</span>
                    <span className="border border-[#5d3214]/55 bg-black/30 px-1.5 py-0.5 text-[7px] uppercase text-[#9a7048]">{r.state}</span>
                    {needsUser(r) ? <span className="border border-amber-400/35 px-1.5 py-0.5 text-[7px] uppercase text-amber-100">needs you</span> : null}
                    {isOverdue ? <span className="border border-red-400/40 px-1.5 py-0.5 text-[7px] uppercase text-red-200">overdue</span> : null}
                  </div>
                  <h3 className="mt-2 text-[11px] font-semibold text-[#e9bd85]">{r.title}</h3>
                  <p className="mt-1 line-clamp-2 text-[9px] leading-4 text-[#96704d]">{r.summary}</p>
                  <div className="mt-2 text-[7px] uppercase tracking-[0.13em] text-[#69492f]">
                    {sourceLabel(r)} / {Math.round(r.confidence * 100)}% / evidence {r.evidence.length}
                    {r.dueAt ? ` / due ${shortDate(r.dueAt)}` : ""}
                  </div>
                </button>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {closed(r) ? <button disabled={busy === r.id} onClick={() => void transition(r, "triaged", "User reopened this responsibility from the Steward workspace.")}
                    className="border border-[#c9782f]/55 px-2 py-1 text-[7px] uppercase text-[#ffd28a] disabled:opacity-35">Reopen</button> :
                    <>
                      <button disabled={busy === r.id} onClick={() => void transition(r, "resolved", "User resolved this responsibility from the Steward workspace.")}
                        className="border border-emerald-400/35 px-2 py-1 text-[7px] uppercase text-emerald-200 disabled:opacity-35">Resolve</button>
                      {ALLOWED[r.state].includes("waiting-external") ? <button disabled={busy === r.id} onClick={() => void transition(r, "waiting-external", "User marked this responsibility as waiting on an external party from the Steward workspace.")}
                        className="border border-cyan-300/30 px-2 py-1 text-[7px] uppercase text-cyan-100 disabled:opacity-35">Waiting elsewhere</button> : null}
                      <button disabled={busy === r.id} onClick={() => void transition(r, "dismissed", "User dismissed this responsibility from the Steward workspace.")}
                        className="border border-red-400/30 px-2 py-1 text-[7px] uppercase text-red-200 disabled:opacity-35">Dismiss</button>
                    </>}
                </div>
              </article>;
            })}
          </div>

          {selected ? <aside className="border border-[#6a3a1a]/65 bg-[#050301]/98">
            <div className="flex items-center justify-between border-b border-[#5d3214]/55 px-3 py-2">
              <span className="text-[7px] uppercase tracking-[0.22em] text-[#7b522f]">Responsibility Detail</span>
              <button type="button" onClick={() => { setSelected(null); setHistory([]); }} className="border border-[#5d3214]/45 px-2 py-1 text-[7px] uppercase text-[#866043]">Close</button>
            </div>
            <div className="max-h-[570px] overflow-y-auto p-3">
              {detailError ? <div className="mb-2 border border-red-400/25 p-2 text-[8px] text-red-200">{detailError}</div> : null}
              <div className="flex gap-1.5">
                <span className={`border px-1.5 py-0.5 text-[7px] uppercase ${PRIORITY_CLASS[selected.priority]}`}>{selected.priority}</span>
                <span className="border border-[#5d3214]/55 px-1.5 py-0.5 text-[7px] uppercase text-[#9a7048]">{selected.state}</span>
              </div>
              <h3 className="mt-3 text-sm font-semibold text-[#f0c793]">{selected.title}</h3>
              <p className="mt-2 text-[9px] leading-4 text-[#a47a53]">{selected.summary}</p>

              <div className="mt-3 border border-[#5d3214]/45 bg-black/20 p-2.5">
                <div className="text-[7px] uppercase tracking-[0.2em] text-[#7d522f]">Why this is surfaced</div>
                <p className="mt-1 text-[9px] text-[#c18d59]">{why(selected, nowMs)}</p>
                {newestHistory.find((h) => h.reason)?.reason ? <p className="mt-1 text-[8px] text-[#76583d]">Latest recorded rationale: {newestHistory.find((h) => h.reason)?.reason}</p> : null}
              </div>

              {selected.suggestedAction ? <div className="mt-3 border-l border-[#a35d27]/55 pl-2 text-[9px] text-[#bf8a57]">
                <div className="text-[7px] uppercase text-[#80522e]">Suggested Action</div>{selected.suggestedAction}
              </div> : null}

              <div className="mt-3 text-[8px] leading-5 text-[#7e5b3d]">
                Source: <span className="text-[#b38558]">{sourceLabel(selected)}</span><br />
                Confidence: <span className="text-[#b38558]">{Math.round(selected.confidence * 100)}%</span><br />
                Updated: <span className="text-[#b38558]">{shortDate(selected.updatedAt)}</span><br />
                Revision: <span className="text-[#b38558]">{selected.revision ?? "n/a"}</span>
              </div>

              <div className="mt-4 border-t border-[#4d2c16]/55 pt-3">
                <div className="text-[7px] uppercase tracking-[0.2em] text-[#7d522f]">Due time</div>
                <div className="mt-2 flex gap-1.5">
                  <input type="datetime-local" value={dueDraft} onChange={(e) => setDueDraft(e.target.value)}
                    className="min-w-0 flex-1 border border-[#5d3214]/55 bg-black/30 px-2 py-1 text-[8px] text-[#c18d59]" />
                  <button disabled={busy === selected.id} onClick={() => void saveDue(selected, dueDraft || null)}
                    className="border border-[#c9782f]/50 px-2 py-1 text-[7px] uppercase text-[#ffd28a] disabled:opacity-35">Save</button>
                  <button disabled={busy === selected.id} onClick={() => { setDueDraft(""); void saveDue(selected, null); }}
                    className="border border-[#5d3214]/45 px-2 py-1 text-[7px] uppercase text-[#866043] disabled:opacity-35">Clear</button>
                </div>
                <p className="mt-1 text-[7px] text-[#5f4128]">Ledger due time only; this does not create a calendar event.</p>
              </div>

              <div className="mt-4 border-t border-[#4d2c16]/55 pt-3">
                <div className="text-[7px] uppercase tracking-[0.2em] text-[#7d522f]">Ledger state actions</div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {closed(selected) ? <button disabled={busy === selected.id} onClick={() => void transition(selected, "triaged", "User reopened this responsibility from the Steward workspace detail view.")}
                    className="border border-[#c9782f]/55 px-2 py-1 text-[7px] uppercase text-[#ffd28a] disabled:opacity-35">Reopen to triaged</button> :
                    (["waiting-user","waiting-external","scheduled","delegated","triaged","resolved","dismissed"] as State[])
                      .filter((s) => ALLOWED[selected.state].includes(s))
                      .map((s) => <button key={s} disabled={busy === selected.id}
                        onClick={() => void transition(selected, s, `User changed this responsibility to ${s} from the Steward workspace detail view.`)}
                        className="border border-[#5d3214]/55 px-2 py-1 text-[7px] uppercase text-[#b78557] disabled:opacity-35">
                        {s === "scheduled" ? "Scheduled (ledger)" : s === "delegated" ? "Delegated (ledger)" : s}
                      </button>)}
                </div>
              </div>

              <div className="mt-4 border-t border-[#4d2c16]/55 pt-3">
                <div className="text-[7px] uppercase tracking-[0.2em] text-[#7d522f]">Evidence ({selected.evidence.length})</div>
                <div className="mt-2 grid gap-1">
                  {selected.evidence.map((e) => <div key={e.id} className="border border-[#4d2c16]/50 p-2 text-[8px] text-[#8f6746]">
                    {e.source?.application || e.source?.type || "Recorded evidence"} / {shortDate(e.observedAt) ?? "time unavailable"}
                  </div>)}
                </div>
              </div>

              <div className="mt-4 border-t border-[#4d2c16]/55 pt-3">
                <div className="text-[7px] uppercase tracking-[0.2em] text-[#7d522f]">Audit history ({newestHistory.length})</div>
                <div className="mt-2 grid gap-2">
                  {newestHistory.map((h) => <div key={h.id} className="border-l border-[#7f4822]/55 pl-2 text-[8px] text-[#8f6746]">
                    <div className="uppercase text-[#ad7748]">{h.event} <span className="float-right font-mono text-[7px] text-[#5f4128]">{shortDate(h.timestamp)}</span></div>
                    {h.fromState || h.toState ? <div className="mt-1 text-[7px] uppercase">{h.fromState ?? "—"} → {h.toState ?? "—"}</div> : null}
                    {h.actor ? <div className="mt-1">Actor: {h.actor}</div> : null}
                    {h.reason ? <div className="mt-1">{h.reason}</div> : null}
                    {h.details ? <pre className="mt-1 whitespace-pre-wrap break-words font-mono text-[7px] text-[#5f4128]">{JSON.stringify(h.details).slice(0, 320)}</pre> : null}
                  </div>)}
                </div>
              </div>
            </div>
          </aside> : null}
        </div>
      </div> : null}
    </section>
  );
}
