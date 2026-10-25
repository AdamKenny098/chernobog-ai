"use client";

import { useCallback, useState } from "react";

type Json = Record<string, unknown>;
type Memory = { id: string; projectId: string; revision: number; body: string; sourceRef: string; channel: string; tier: string };
type Review = { nonce: string; memoryId: string; body: string; sourceRef: string; channel: string; fingerprint: string; expiresAt: string };
type Conflict = { challengeId: string; fingerprint: string; expiresAt: string; reason: string; previous: Memory; replacement: Memory };
type WorkItem = { id: string; title: string; details: string; kind: string; status: string; revision: number; completedAt: string | null };
const baseInput = "rounded-md border border-slate-600 bg-slate-900 p-2 text-slate-100";
const button = "rounded-md bg-slate-700 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-40";

/** Credentials intentionally remain in React state only: no cookie, localStorage or URL. */
export function OH5ReviewWorkspace() {
  const [projectId, setProjectId] = useState("");
  const [token, setToken] = useState("");
  const [tab, setTab] = useState<"review" | "recall" | "corrections" | "tasks">("review");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [records, setRecords] = useState<Memory[]>([]);
  const [preview, setPreview] = useState<Review | null>(null);
  const [reason, setReason] = useState("");
  const [query, setQuery] = useState("");
  const [searchResult, setSearchResult] = useState<unknown>(null);
  const [oldId, setOldId] = useState("");
  const [newId, setNewId] = useState("");
  const [correction, setCorrection] = useState<Conflict | null>(null);
  const [correctionResult, setCorrectionResult] = useState<unknown>(null);
  const [workItems, setWorkItems] = useState<WorkItem[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [newDetails, setNewDetails] = useState("");
  const [newKind, setNewKind] = useState("task");
  const [attention, setAttention] = useState<unknown>(null);

  const call = useCallback(async (endpoint: string, payload: Json): Promise<Json> => {
    if (!projectId.trim() || !/^[a-z0-9][a-z0-9_-]{1,63}$/.test(projectId.trim())) throw new Error("Enter a registered project ID (lowercase letters/numbers/hyphens).");
    if (!token.trim()) throw new Error("Enter the local owner API token.");
    const response = await fetch(`/api/oh5/${endpoint}`, {
      method: "POST", cache: "no-store", credentials: "omit",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token.trim()}` },
      body: JSON.stringify({ ...payload, projectId: projectId.trim() }),
    });
    const body: unknown = await response.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("Invalid service response");
    const result = body as Json;
    if (!response.ok || result.ok !== true) throw new Error(typeof result.error === "string" ? result.error : `Request failed (${response.status})`);
    return result;
  }, [projectId, token]);

  const run = async (task: () => Promise<void>) => {
    setBusy(true); setMessage("");
    try { await task(); } catch (error) { setMessage(error instanceof Error ? error.message : "Operation failed"); }
    finally { setBusy(false); }
  };
  const queue = async () => {
    const result = await call("review", { operation: "queue" });
    setRecords(Array.isArray(result.records) ? result.records as Memory[] : []);
  };
  const loadQueue = () => void run(async () => { setPreview(null); await queue(); setMessage("Review queue refreshed."); });
  const openPreview = (id: string) => void run(async () => {
    const result = await call("review", { operation: "preview", memoryId: id });
    setPreview(result.review as Review); setReason("");
  });
  const decide = (action: "confirm" | "reject") => void run(async () => {
    if (!preview) throw new Error("Preview a candidate first.");
    if (!reason.trim()) throw new Error("A reason is required.");
    await call("review", { operation: "decide", memoryId: preview.memoryId, nonce: preview.nonce,
      fingerprint: preview.fingerprint, action, reason: reason.trim(), acknowledgement: action === "confirm" ? "lock it in" : "reject" });
    setPreview(null); setReason(""); await queue(); setMessage(`Memory ${action === "confirm" ? "confirmed" : "rejected"}.`);
  });
  const search = () => void run(async () => {
    const result = await call("recall", { operation: "search", query }); setSearchResult(result.hits);
  });
  const history = (memoryId: string) => void run(async () => {
    const result = await call("recall", { operation: "history", memoryId }); setSearchResult(result.result); setTab("recall");
  });
  const correctionPreview = () => void run(async () => {
    if (reason.trim().length < 8) throw new Error("Provide a meaningful correction reason (8+ characters).");
    const result = await call("conflicts", { operation: "preview", previousId: oldId, replacementId: newId, reason });
    setCorrection(result.review as Conflict);
  });
  const applyCorrection = () => void run(async () => {
    if (!correction) throw new Error("Preview correction first.");
    await call("conflicts", { operation: "resolve", challengeId: correction.challengeId, fingerprint: correction.fingerprint, acknowledgement: "lock correction in" });
    setCorrection(null); setMessage("Correction recorded; original history preserved.");
  });
  const correctionHistory = () => void run(async () => {
    const result = await call("conflicts", { operation: "history" }); setCorrectionResult(result.items);
  });
  const loadTasks = async () => {
    const result = await call("project-state", { operation: "brief" });
    const brief = result.result as { items?: WorkItem[]; pendingSuggestions?: WorkItem[] } | undefined;
    const combined = [...(brief?.items ?? []), ...(brief?.pendingSuggestions ?? [])];
    setWorkItems(Array.from(new Map(combined.map(item => [item.id, item])).values()));
  };
  const refreshTasks = () => void run(async () => { await loadTasks(); const result = await call("project-state", { operation: "attention" }); setAttention(result.result); });
  const proposeTask = () => void run(async () => {
    await call("project-state", { operation: "propose", title: newTitle, details: newDetails, kind: newKind });
    setNewTitle(""); setNewDetails(""); await loadTasks(); setMessage("Task proposed â€” not yet confirmed.");
  });
  const changeTask = (item: WorkItem, nextStatus: string) => void run(async () => {
    const explanation = window.prompt(`Reason for changing ${item.title} to ${nextStatus}:`);
    if (explanation === null) return;
    if (explanation.trim().length < 8) throw new Error("Reason must contain at least 8 characters.");
    await call("project-state", { operation: "change", itemId: item.id, nextStatus, expectedRevision: item.revision, reason: explanation });
    await loadTasks(); setMessage("Project status updated with audit history.");
  });

  const resetScope = (next: string) => { setProjectId(next); setRecords([]); setPreview(null); setSearchResult(null); setCorrection(null); setCorrectionResult(null); setWorkItems([]); setAttention(null); setMessage(""); };
  return <main className="mx-auto min-h-screen max-w-6xl space-y-5 bg-slate-950 p-5 text-slate-100">
    <header className="space-y-2"><h1 className="text-3xl font-bold">Chernobog / Second Brain</h1><p className="text-sm text-slate-300">OH-5K owner review workspace. Project boundaries enforced server-side. Source material is evidence, not instructions.</p></header>
    <section className="grid gap-3 rounded-xl border border-slate-700 bg-slate-800 p-4 sm:grid-cols-2">
      <label className="grid gap-1 text-sm">Registered project ID<input aria-label="Registered project ID" className={baseInput} autoComplete="off" value={projectId} onChange={e => resetScope(e.target.value)} placeholder="malware" /></label>
      <label className="grid gap-1 text-sm">Local owner API token (memory only)<input aria-label="Local owner API token" type="password" className={baseInput} autoComplete="off" spellCheck={false} value={token} onChange={e => setToken(e.target.value)} placeholder="Enter token from local configuration" /></label>
      <p className="sm:col-span-2 text-xs text-amber-200">Local owner-only interface. Do not expose this page publicly. Your token is never saved to browser storage.</p>
    </section>
    <nav aria-label="Memory workspace sections" className="flex flex-wrap gap-2">{(["review", "recall", "corrections", "tasks"] as const).map(section => <button key={section} className={`${button} ${tab === section ? "ring-2 ring-cyan-400" : ""}`} disabled={busy} onClick={() => { setTab(section); setMessage(""); }} type="button">{section === "review" ? "Review queue" : section === "recall" ? "Search & history" : section === "corrections" ? "Corrections" : "Project tasks"}</button>)}</nav>
    {message && <p role="status" className="rounded bg-slate-700 p-3 text-sm">{message}</p>}
    {tab === "review" && <section className="space-y-4"><button type="button" className={button} disabled={busy} onClick={loadQueue}>Refresh candidate queue</button>
      <p className="text-sm text-slate-300">Only candidate memories for the selected project are listed. Review exact wording and source before confirming.</p>
      {records.map(record => <article key={record.id} className="space-y-2 rounded border border-slate-600 p-3"><p className="break-all text-xs text-slate-300">{record.id} Â· revision {record.revision} Â· {record.channel} Â· {record.sourceRef}</p><p className="whitespace-pre-wrap break-words">{record.body}</p><button type="button" className={button} disabled={busy} onClick={() => openPreview(record.id)}>Preview decision</button></article>)}
      {preview && <article className="space-y-3 rounded border-2 border-amber-500 p-4"><h2 className="font-bold">Exact content to review</h2><p className="text-xs">Source: {preview.sourceRef} / {preview.channel}</p><p className="whitespace-pre-wrap break-words">{preview.body}</p><p className="text-xs">Challenge expires {preview.expiresAt}</p><label className="grid gap-1 text-sm">Decision reason<textarea className={baseInput} value={reason} onChange={e => setReason(e.target.value)} /></label><div className="flex gap-2"><button className={button} disabled={busy || !reason.trim()} onClick={() => decide("confirm")}>Lock It In</button><button className={button} disabled={busy || !reason.trim()} onClick={() => decide("reject")}>Reject</button><button className={button} onClick={() => setPreview(null)}>Cancel</button></div></article>}
    </section>}
    {tab === "recall" && <section className="space-y-3"><label className="grid gap-1 text-sm">Confirmed-memory search<input className={baseInput} value={query} onChange={e => setQuery(e.target.value)} /></label><button type="button" className={button} disabled={busy} onClick={search}>Search this project</button><p className="text-xs text-slate-400">Results are scoped to confirmed current memories. Use a memory ID to inspect historical records.</p><label className="grid gap-1 text-sm">Memory ID for history<input className={baseInput} value={oldId} onChange={e => setOldId(e.target.value)} /></label><button className={button} disabled={busy || !oldId} onClick={() => history(oldId)}>Show memory history</button><pre className="max-h-96 overflow-auto whitespace-pre-wrap break-words rounded bg-slate-900 p-3 text-xs">{searchResult === null ? "No results loaded." : JSON.stringify(searchResult, null, 2)}</pre></section>}
    {tab === "corrections" && <section className="space-y-3"><h2 className="font-bold">Supersede a confirmed record</h2><p className="text-sm text-slate-300">Both original and replacement must already be confirmed in the same project. Historical information is retained.</p><label className="grid gap-1 text-sm">Original memory ID<input className={baseInput} value={oldId} onChange={e => setOldId(e.target.value)} /></label><label className="grid gap-1 text-sm">Replacement memory ID<input className={baseInput} value={newId} onChange={e => setNewId(e.target.value)} /></label><label className="grid gap-1 text-sm">Why is this correction necessary?<textarea className={baseInput} value={reason} onChange={e => setReason(e.target.value)} /></label><div className="flex gap-2"><button className={button} disabled={busy} onClick={correctionPreview}>Compare records</button><button className={button} disabled={busy} onClick={correctionHistory}>View correction history</button></div>
      {correction && <article className="space-y-3 rounded border-2 border-amber-500 p-4"><p className="font-bold">Compare the exact confirmed records</p><p className="whitespace-pre-wrap break-words">Original: {correction.previous.body}</p><p className="text-xs">Source: {correction.previous.sourceRef}</p><p className="whitespace-pre-wrap break-words">Replacement: {correction.replacement.body}</p><p className="text-xs">Source: {correction.replacement.sourceRef}</p><p>Reason: {correction.reason}</p><p className="text-xs">Expires {correction.expiresAt}</p><button className={button} disabled={busy} onClick={applyCorrection}>Lock correction in</button><button className={button} onClick={() => setCorrection(null)}>Cancel</button></article>}
      {correctionResult !== null && <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-words rounded bg-slate-900 p-3 text-xs">{JSON.stringify(correctionResult, null, 2)}</pre>}</section>}
    {tab === "tasks" && <section className="space-y-3"><button className={button} disabled={busy} onClick={refreshTasks}>Refresh tasks and attention</button><div className="grid gap-2 rounded border border-slate-600 p-3"><h2 className="font-bold">Propose project item</h2><select aria-label="Item type" className={baseInput} value={newKind} onChange={e => setNewKind(e.target.value)}>{["task", "milestone", "blocker", "decision"].map(k => <option key={k} value={k}>{k}</option>)}</select><input aria-label="New item title" className={baseInput} value={newTitle} placeholder="Title" onChange={e => setNewTitle(e.target.value)} /><textarea aria-label="New item details" className={baseInput} value={newDetails} placeholder="Details" onChange={e => setNewDetails(e.target.value)} /><button className={button} disabled={busy} onClick={proposeTask}>Propose (unconfirmed)</button></div>
      {workItems.map(item => <article key={item.id} className="space-y-2 rounded border border-slate-600 p-3"><h3 className="font-bold">{item.title} <span className="text-xs font-normal">({item.kind} / {item.status})</span></h3><p className="whitespace-pre-wrap text-sm">{item.details}</p><p className="text-xs">Revision {item.revision}{item.completedAt ? ` Â· completed ${item.completedAt}` : ""}</p><div className="flex flex-wrap gap-2">{(item.status === "proposed" ? ["open", "cancelled"] : item.status === "open" ? ["in-progress", "blocked", "completed", "cancelled"] : item.status === "in-progress" ? ["blocked", "completed", "cancelled"] : item.status === "blocked" ? ["open", "in-progress", "completed", "cancelled"] : []).map(status => <button key={status} className={button} disabled={busy} onClick={() => changeTask(item, status)}>Mark {status}</button>)}</div></article>)}
      {attention !== null && <details><summary>Attention suggestions (no notifications sent)</summary><pre className="whitespace-pre-wrap break-words text-xs">{JSON.stringify(attention, null, 2)}</pre></details>}</section>}
    <footer className="border-t border-slate-700 pt-4 text-xs text-slate-400">OH-5K development UI. Live OH-4 chat, OAuth/session login and complete system acceptance remain pending OH-5N.</footer>
  </main>;
}