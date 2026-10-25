import Database from "better-sqlite3";
import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { OH5ObsidianLayout, validateProjectId } from "./layout";

export type WorkKind = "task" | "milestone" | "blocker" | "decision";
export type WorkStatus = "proposed" | "open" | "in-progress" | "blocked" | "completed" | "cancelled";
export type WorkItem = { id: string; projectId: string; kind: WorkKind; title: string; details: string; status: WorkStatus; evidenceMemoryId: string | null; createdAt: string; updatedAt: string; completedAt: string | null; revision: number };
export type ProjectBrief = { projectId: string; counts: Record<WorkStatus, number>; items: WorkItem[]; pendingSuggestions: WorkItem[] };
export type AttentionCandidate = { projectId: string; itemId: string; reason: string; priority: "normal" | "important"; delivery: "review-queue-only" };
const kinds: readonly WorkKind[] = ["task", "milestone", "blocker", "decision"];
const statuses: readonly WorkStatus[] = ["proposed", "open", "in-progress", "blocked", "completed", "cancelled"];
const transitions: Record<WorkStatus, readonly WorkStatus[]> = {
  proposed: ["open", "cancelled"], open: ["in-progress", "blocked", "completed", "cancelled"],
  "in-progress": ["blocked", "completed", "cancelled"], blocked: ["open", "in-progress", "completed", "cancelled"],
  completed: [], cancelled: [],
};
const schema = `CREATE TABLE IF NOT EXISTS oh5_work_item (
 id TEXT PRIMARY KEY, projectId TEXT NOT NULL, kind TEXT NOT NULL, title TEXT NOT NULL, details TEXT NOT NULL,
 status TEXT NOT NULL, evidenceMemoryId TEXT, createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL,
 completedAt TEXT, revision INTEGER NOT NULL);
 CREATE INDEX IF NOT EXISTS oh5_work_project_status ON oh5_work_item(projectId,status);
 CREATE TABLE IF NOT EXISTS oh5_work_audit (
 id TEXT PRIMARY KEY, projectId TEXT NOT NULL, itemId TEXT NOT NULL, action TEXT NOT NULL,
 previousStatus TEXT, nextStatus TEXT NOT NULL, actor TEXT NOT NULL, reason TEXT NOT NULL, at TEXT NOT NULL);
 CREATE INDEX IF NOT EXISTS oh5_work_audit_project ON oh5_work_audit(projectId,at);`;
function goodText(value: unknown, field: string, min: number, max: number): string {
  if (typeof value !== "string" || value.trim().length < min || value.length > max) throw new Error(`Invalid ${field}`);
  return value.trim();
}
function assertOwner(ownerAuthorized: boolean): void { if (ownerAuthorized !== true) throw new Error("Explicit owner authorization required"); }

/** Project-state operations never infer authority from imported source text. */
export class OH5ProjectState {
  private readonly db: Database.Database;
  private readonly layout: OH5ObsidianLayout;
  constructor(dbPath: string, vaultRoot: string) {
    mkdirSync(path.dirname(dbPath), { recursive: true });
    this.db = new Database(dbPath);
    this.db.pragma("busy_timeout = 5000");
    this.db.pragma("journal_mode = WAL");
    this.db.exec(schema);
    this.layout = new OH5ObsidianLayout(vaultRoot);
  }
  close(): void { this.db.close(); }
  private scope(id: string): string {
    const projectId = validateProjectId(id);
    if (!this.layout.projectRegistered(projectId)) throw new Error("Project must be registered");
    return projectId;
  }
  propose(input: { projectId: string; kind: WorkKind; title: string; details: string; evidenceMemoryId?: string }, actor: "external" | "owner" | "system"): WorkItem {
    const projectId = this.scope(input.projectId);
    if (!kinds.includes(input.kind)) throw new Error("Invalid work kind");
    if (!["external", "owner", "system"].includes(actor)) throw new Error("Invalid proposer");
    const title = goodText(input.title, "title", 3, 200);
    const details = goodText(input.details, "details", 1, 4000);
    const ref = input.evidenceMemoryId === undefined ? null : goodText(input.evidenceMemoryId, "evidence reference", 1, 120);
    const item: WorkItem = { id: randomUUID(), projectId, kind: input.kind, title, details, status: "proposed", evidenceMemoryId: ref, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), completedAt: null, revision: 1 };
    this.db.transaction(() => {
      this.db.prepare(`INSERT INTO oh5_work_item VALUES (@id,@projectId,@kind,@title,@details,@status,@evidenceMemoryId,@createdAt,@updatedAt,@completedAt,@revision)`).run(item);
      this.audit(projectId, item.id, "propose", null, "proposed", actor, "Unverified project-state suggestion");
    })();
    return item;
  }
  private audit(projectId: string, itemId: string, action: string, previousStatus: WorkStatus | null, nextStatus: WorkStatus, actor: string, reason: string): void {
    this.db.prepare("INSERT INTO oh5_work_audit VALUES (?,?,?,?,?,?,?,?,?)").run(randomUUID(), projectId, itemId, action, previousStatus, nextStatus, actor, reason, new Date().toISOString());
  }
  get(projectIdInput: string, itemId: string): WorkItem | null {
    const projectId = this.scope(projectIdInput);
    goodText(itemId, "work item ID", 1, 120);
    return this.db.prepare("SELECT * FROM oh5_work_item WHERE id=? AND projectId=?").get(itemId, projectId) as WorkItem | undefined ?? null;
  }
  change(input: { projectId: string; itemId: string; nextStatus: WorkStatus; expectedRevision: number; reason: string }, ownerAuthorized: boolean): WorkItem {
    assertOwner(ownerAuthorized);
    const projectId = this.scope(input.projectId);
    if (!statuses.includes(input.nextStatus)) throw new Error("Invalid status");
    if (!Number.isSafeInteger(input.expectedRevision) || input.expectedRevision < 1) throw new Error("Invalid expected revision");
    const reason = goodText(input.reason, "change reason", 8, 1000);
    return this.db.transaction(() => {
      const old = this.get(projectId, input.itemId);
      if (!old) throw new Error("Work item not found in project");
      if (old.revision !== input.expectedRevision) throw new Error("Stale revision");
      if (!transitions[old.status].includes(input.nextStatus)) throw new Error("Invalid status transition");
      const updatedAt = new Date().toISOString();
      const completedAt = input.nextStatus === "completed" ? updatedAt : null;
      const changed = this.db.prepare("UPDATE oh5_work_item SET status=?, updatedAt=?, completedAt=?, revision=revision+1 WHERE id=? AND projectId=? AND revision=?")
        .run(input.nextStatus, updatedAt, completedAt, old.id, projectId, old.revision);
      if (changed.changes !== 1) throw new Error("Concurrent revision changed");
      this.audit(projectId, old.id, "change", old.status, input.nextStatus, "owner", reason);
      const updated = this.get(projectId, old.id);
      if (!updated) throw new Error("Missing item after update");
      return updated;
    })();
  }
  list(projectIdInput: string, includeProposed = false): WorkItem[] {
    const projectId = this.scope(projectIdInput);
    return this.db.prepare(`SELECT * FROM oh5_work_item WHERE projectId=? ${includeProposed ? "" : "AND status<>'proposed'"} ORDER BY updatedAt DESC,id ASC LIMIT 300`).all(projectId) as WorkItem[];
  }
  brief(projectId: string): ProjectBrief {
    const items = this.list(projectId, true);
    const counts = Object.fromEntries(statuses.map(s => [s, 0])) as Record<WorkStatus, number>;
    for (const item of items) counts[item.status]++;
    return { projectId: this.scope(projectId), counts, items: items.filter(i => i.status !== "proposed"), pendingSuggestions: items.filter(i => i.status === "proposed") };
  }
  attention(projectId: string): AttentionCandidate[] {
    return this.list(projectId).filter(i => i.status === "blocked" || (i.kind === "milestone" && i.status === "open"))
      .map(item => ({ projectId: item.projectId, itemId: item.id, reason: item.status === "blocked" ? "Confirmed blocker needs review" : "Open milestone to review", priority: item.status === "blocked" ? "important" : "normal", delivery: "review-queue-only" }));
  }
  history(projectIdInput: string, itemId: string): { action: string; previousStatus: WorkStatus | null; nextStatus: WorkStatus; actor: string; reason: string; at: string }[] {
    const projectId = this.scope(projectIdInput);
    if (!this.get(projectId, itemId)) throw new Error("Work item not found in project");
    return this.db.prepare("SELECT action,previousStatus,nextStatus,actor,reason,at FROM oh5_work_audit WHERE itemId=? AND projectId=? ORDER BY at ASC,id ASC").all(itemId, projectId) as ReturnType<OH5ProjectState["history"]>;
  }
}