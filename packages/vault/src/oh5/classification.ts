import { createHash } from "node:crypto";
import Database from "better-sqlite3";
import { GovernedMemoryStore, type MemoryRecord } from "./store";
import { OH5ObsidianLayout, validateProjectId } from "./layout";

export type EvidenceCategory = "project-update" | "task" | "preference" | "decision" | "conversation" | "reference" | "uncertain";
export type Handling = "temporary" | "candidate" | "ignore";
export type Classification = { category: EvidenceCategory; handling: Handling; confidence: number; reasons: string[]; needsOwnerReview: boolean };
export type WorkingItem = { id: string; projectId: string; evidenceId: string; category: EvidenceCategory; handling: Handling; summary: string; createdAt: string; expiresAt: string };
const sha = (v: string) => createHash("sha256").update(v).digest("hex");
const MAX_SUMMARY = 500;
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_TTL_MS = 7 * DEFAULT_TTL_MS;

/** Deterministic triage only. No classification outcome is an approval or a factual assertion. */
export function classifyRawEvidence(body: string): Classification {
  if (typeof body !== "string" || !body.trim()) throw new Error("Evidence text required");
  const text = body.trim();
  const rules: {category: EvidenceCategory; match: RegExp; reason: string}[] = [
    {category:"decision",match:/\b(decided|decision|agreed|approved plan|we will|lock that in)\b/i,reason:"Potential decision; owner review required"},
    {category:"task",match:/\b(todo|to-do|need to|must do|follow up|deadline|remind)\b/i,reason:"Possible task; not scheduled automatically"},
    {category:"project-update",match:/\b(completed|implemented|deployed|shipped|blocked|progress|milestone|passed)\b/i,reason:"Possible project update; unverified"},
    {category:"preference",match:/\b(i prefer|i like|i dislike|my preference)\b/i,reason:"Possible preference; unverified"},
    {category:"reference",match:/\b(reference|documentation|source|link|https?:\/\/)\b/i,reason:"Reference material"},
  ];
  if (/^(ok|okay|thanks|thank you|hello|hi|bye|yes|no)[.!\s]*$/i.test(text)) return {category:"conversation",handling:"ignore",confidence:0.95,reasons:["Low-information conversational utterance"],needsOwnerReview:false};
  for (const rule of rules) if (rule.match.test(text)) return {category:rule.category,handling:"candidate",confidence:0.65,reasons:[rule.reason],needsOwnerReview:true};
  return {category:"uncertain",handling:"temporary",confidence:0.3,reasons:["Insufficient evidence for durable-memory proposal"],needsOwnerReview:false};
}

/** Project-bound, TTL-limited scratchpad. Never included in confirmed-memory recall. */
export class OH5WorkingMemory {
  private readonly db: Database.Database;
  private readonly governed: GovernedMemoryStore;
  private readonly layout: OH5ObsidianLayout;
  constructor(dbFile: string, vaultRoot: string) {
    this.layout = new OH5ObsidianLayout(vaultRoot);
    this.db = new Database(dbFile);
    this.db.pragma("busy_timeout = 5000");
    this.db.pragma("journal_mode = WAL");
    this.governed = new GovernedMemoryStore(dbFile);
    this.db.exec(`CREATE TABLE IF NOT EXISTS oh5_working_memory (
      id TEXT PRIMARY KEY, projectId TEXT NOT NULL, evidenceId TEXT NOT NULL,
      category TEXT NOT NULL, handling TEXT NOT NULL, summary TEXT NOT NULL,
      createdAt TEXT NOT NULL, expiresAt TEXT NOT NULL,
      UNIQUE(projectId,evidenceId));
      CREATE INDEX IF NOT EXISTS oh5_working_scope_expiry ON oh5_working_memory(projectId,expiresAt);`);
  }
  close(): void { this.governed.close(); this.db.close(); }
  private scoped(projectId: string): string {
    validateProjectId(projectId);
    if (!this.layout.projectRegistered(projectId)) throw new Error("Project not registered");
    return projectId;
  }
  /** Classifies an already-ingested RAW evidence record. Neither source text nor model output is authority. */
  triage(projectId: string, evidenceId: string, opts: {now?: Date; ttlMs?: number} = {}): { classification: Classification; item?: WorkingItem; record: MemoryRecord } {
    const scope = this.scoped(projectId);
    if (typeof evidenceId !== "string" || !/^[a-zA-Z0-9_-]{1,100}$/.test(evidenceId)) throw new Error("Invalid evidence ID");
    const record = this.governed.get(scope,evidenceId);
    if (!record) throw new Error("Evidence not found in project");
    if (record.tier !== "raw") throw new Error("Only raw evidence may be classified");
    const now = opts.now ?? new Date();
    if (!Number.isFinite(now.getTime())) throw new Error("Invalid clock");
    const ttl = opts.ttlMs ?? DEFAULT_TTL_MS;
    if (!Number.isSafeInteger(ttl) || ttl < 1000 || ttl > MAX_TTL_MS) throw new Error("Invalid working-memory TTL");
    const classification = classifyRawEvidence(record.body);
    if (classification.handling === "ignore") return {classification,record};
    const existing = this.db.prepare("SELECT * FROM oh5_working_memory WHERE projectId=? AND evidenceId=?").get(scope,evidenceId) as WorkingItem|undefined;
    if (existing) return {classification,item:existing,record};
    const item: WorkingItem = {id:sha(`${scope}:${evidenceId}`).slice(0,32),projectId:scope,evidenceId,category:classification.category,handling:classification.handling,summary:record.body.slice(0,MAX_SUMMARY),createdAt:now.toISOString(),expiresAt:new Date(now.getTime()+ttl).toISOString()};
    this.db.prepare("INSERT OR IGNORE INTO oh5_working_memory (id,projectId,evidenceId,category,handling,summary,createdAt,expiresAt) VALUES (@id,@projectId,@evidenceId,@category,@handling,@summary,@createdAt,@expiresAt)").run(item);
    return {classification,item: (this.db.prepare("SELECT * FROM oh5_working_memory WHERE projectId=? AND evidenceId=?").get(scope,evidenceId) as WorkingItem),record};
  }
  list(projectId: string, now: Date = new Date()): WorkingItem[] {
    const scope=this.scoped(projectId);
    if (!Number.isFinite(now.getTime())) throw new Error("Invalid clock");
    return this.db.prepare("SELECT * FROM oh5_working_memory WHERE projectId=? AND expiresAt>? ORDER BY createdAt DESC LIMIT 100").all(scope,now.toISOString()) as WorkingItem[];
  }
  purgeExpired(now: Date = new Date()): number {
    if (!Number.isFinite(now.getTime())) throw new Error("Invalid clock");
    return this.db.prepare("DELETE FROM oh5_working_memory WHERE expiresAt<=?").run(now.toISOString()).changes;
  }
  /** Explicit promotion creates a review CANDIDATE, never a confirmed memory. */
  proposeForReview(projectId:string,evidenceId:string,expectedRevision:number): MemoryRecord {
    const scope=this.scoped(projectId);
    const item=this.db.prepare("SELECT * FROM oh5_working_memory WHERE projectId=? AND evidenceId=?").get(scope,evidenceId) as WorkingItem|undefined;
    if (!item || item.handling!=="candidate" || item.expiresAt<=new Date().toISOString()) throw new Error("No eligible, unexpired candidate");
    const record=this.governed.get(scope,evidenceId);
    if (!record || record.tier!=="raw") throw new Error("Raw record required");
    return this.governed.propose({projectId:scope,id:evidenceId,expectedRevision,channel:"model"});
  }
}