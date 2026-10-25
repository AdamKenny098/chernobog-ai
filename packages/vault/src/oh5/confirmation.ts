import Database from "better-sqlite3";
import { createHash, randomUUID } from "node:crypto";
import { GovernedMemoryStore, type MemoryRecord } from "./store";
import { OH5ObsidianLayout, validateProjectId } from "./layout";

type PendingReview = { nonce: string; projectId: string; memoryId: string; revision: number; fingerprint: string; issuedAt: string; expiresAt: string; consumedAt: string | null };
export type ReviewPreview = { nonce: string; projectId: string; memoryId: string; revision: number; body: string; sourceRef: string; channel: string; fingerprint: string; expiresAt: string; warning: string };
export type ReviewAction = "confirm" | "reject";
const digest = (value: string) => createHash("sha256").update(value).digest("hex");

/** A preview does not confer authority: callers must independently authenticate the owner. */
export class OH5ConfirmationGate {
  private readonly db: Database.Database;
  private readonly store: GovernedMemoryStore;
  private readonly layout: OH5ObsidianLayout;
  constructor(dbFile: string, vaultRoot: string) {
    this.db = new Database(dbFile);
    this.db.pragma("busy_timeout = 5000");
    this.db.pragma("journal_mode = WAL");
    this.store = new GovernedMemoryStore(dbFile);
    this.layout = new OH5ObsidianLayout(vaultRoot);
    this.db.exec(`CREATE TABLE IF NOT EXISTS oh5_review_challenges (
      nonce TEXT PRIMARY KEY, projectId TEXT NOT NULL, memoryId TEXT NOT NULL,
      revision INTEGER NOT NULL, fingerprint TEXT NOT NULL, issuedAt TEXT NOT NULL,
      expiresAt TEXT NOT NULL, consumedAt TEXT);
      CREATE INDEX IF NOT EXISTS ix_oh5_review_scope ON oh5_review_challenges(projectId,memoryId);`);
  }
  close(): void { this.store.close(); this.db.close(); }
  private scope(projectId: string): string {
    const id = validateProjectId(projectId);
    if (!this.layout.projectRegistered(id)) throw new Error("Project not registered");
    return id;
  }
  private fingerprint(record: MemoryRecord): string {
    return digest(JSON.stringify([record.projectId,record.id,record.revision,record.body,record.sourceRef,record.channel,record.tier]));
  }
  queue(projectId: string): MemoryRecord[] {
    return this.store.list(this.scope(projectId),{tiers:["candidate"],limit:100});
  }
  preview(projectId: string, memoryId: string, authenticated: boolean): ReviewPreview {
    if (!authenticated) throw new Error("Owner authentication required");
    const scope = this.scope(projectId);
    const record = this.store.get(scope,memoryId);
    if (!record || record.tier!=="candidate") throw new Error("Review requires a candidate in this project");
    const issuedAt = new Date();
    const nonce = randomUUID();
    const challenge: PendingReview = {nonce,projectId:scope,memoryId:record.id,revision:record.revision,fingerprint:this.fingerprint(record),issuedAt:issuedAt.toISOString(),expiresAt:new Date(issuedAt.getTime()+10*60_000).toISOString(),consumedAt:null};
    this.db.prepare(`INSERT INTO oh5_review_challenges (nonce,projectId,memoryId,revision,fingerprint,issuedAt,expiresAt,consumedAt) VALUES (@nonce,@projectId,@memoryId,@revision,@fingerprint,@issuedAt,@expiresAt,@consumedAt)`).run(challenge);
    return {nonce,projectId:scope,memoryId:record.id,revision:record.revision,body:record.body,sourceRef:record.sourceRef,channel:record.channel,fingerprint:challenge.fingerprint,expiresAt:challenge.expiresAt,warning:"Review source, exact wording and project before confirming. Preview is not approval."};
  }
  decide(input:{projectId:string;memoryId:string;nonce:string;fingerprint:string;action:ReviewAction;reason:string;acknowledgement:string},authenticated:boolean):MemoryRecord {
    if (!authenticated) throw new Error("Owner authentication required");
    const projectId = this.scope(input.projectId);
    if (input.action!=="confirm" && input.action!=="reject") throw new Error("Unsupported decision");
    const expected = input.action==="confirm"?"lock it in":"reject";
    if(input.acknowledgement!==expected) throw new Error("Explicit owner acknowledgement required");
    if (typeof input.reason!=="string" || !input.reason.trim()) throw new Error("Decision reason required");
    const challenge = this.db.prepare("SELECT * FROM oh5_review_challenges WHERE nonce=? AND projectId=? AND memoryId=?").get(input.nonce,projectId,input.memoryId) as PendingReview|undefined;
    if (!challenge || challenge.consumedAt) throw new Error("Review challenge not found or already consumed");
    if(challenge.expiresAt<=new Date().toISOString()) throw new Error("Review challenge expired");
    const record = this.store.get(projectId,input.memoryId);
    if(!record || record.tier!=="candidate" || record.revision!==challenge.revision) throw new Error("Candidate changed since review");
    if(challenge.fingerprint!==input.fingerprint || this.fingerprint(record)!==challenge.fingerprint) throw new Error("Review content mismatch");
    // Both connections use the same SQLite database. The governed store performs its own
    // atomic memory+audit+approval transaction and rejects stale or reused approvals.
    const result=this.store.ownerDecision({action:input.action,projectId,id:record.id,expectedRevision:record.revision,reason:input.reason.trim(),evidenceRefs:[record.sourceRef],approvalId:challenge.nonce},true);
    this.db.prepare("UPDATE oh5_review_challenges SET consumedAt=? WHERE nonce=? AND consumedAt IS NULL").run(new Date().toISOString(),challenge.nonce);
    return result;
  }
}