import Database from "better-sqlite3";
import { createHash, randomUUID } from "node:crypto";
import { GovernedMemoryStore, type MemoryRecord } from "./store";
import { OH5ObsidianLayout, validateProjectId } from "./layout";

const hash = (text:string) => createHash("sha256").update(text).digest("hex");
type ConflictRow = { id:string; projectId:string; previousId:string; replacementId:string; previousRevision:number; replacementRevision:number; fingerprint:string; rationale:string; createdAt:string; expiresAt:string; resolvedAt:string|null };
export type ConflictPreview = { challengeId:string; projectId:string; previous:MemoryRecord; replacement:MemoryRecord; fingerprint:string; reason:string; expiresAt:string; warning:string };

/** Corrections are append-only: a newly confirmed replacement supersedes the prior fact. */
export class OH5ConflictManager {
  private readonly db:Database.Database;
  private readonly store:GovernedMemoryStore;
  private readonly layout:OH5ObsidianLayout;
  constructor(dbPath:string,vaultRoot:string){
    this.db=new Database(dbPath);
    this.db.pragma("busy_timeout = 5000"); this.db.pragma("journal_mode = WAL");
    this.store=new GovernedMemoryStore(dbPath);
    this.layout=new OH5ObsidianLayout(vaultRoot);
    this.db.exec(`CREATE TABLE IF NOT EXISTS oh5_conflict_reviews (
      id TEXT PRIMARY KEY,projectId TEXT NOT NULL,previousId TEXT NOT NULL,replacementId TEXT NOT NULL,
      previousRevision INTEGER NOT NULL,replacementRevision INTEGER NOT NULL,fingerprint TEXT NOT NULL,
      rationale TEXT NOT NULL,createdAt TEXT NOT NULL,expiresAt TEXT NOT NULL,resolvedAt TEXT);
      CREATE INDEX IF NOT EXISTS ix_oh5_conflict_project ON oh5_conflict_reviews(projectId,previousId);`);
  }
  close():void { this.store.close(); this.db.close(); }
  private scope(projectId:string):string { const id=validateProjectId(projectId); if(!this.layout.projectRegistered(id))throw new Error("Project not registered"); return id; }
  private confirmedPair(projectId:string,previousId:string,replacementId:string):{previous:MemoryRecord;replacement:MemoryRecord}{
    const p=this.scope(projectId);
    if(previousId===replacementId)throw new Error("Replacement must be a different memory");
    const previous=this.store.get(p,previousId),replacement=this.store.get(p,replacementId);
    if(!previous||!replacement)throw new Error("Memory not found in project");
    if(previous.tier!=="confirmed"||replacement.tier!=="confirmed")throw new Error("Both records must be confirmed before supersession");
    if(previous.body===replacement.body)throw new Error("Replacement must contain a substantive change");
    return {previous,replacement};
  }
  private signature(a:MemoryRecord,b:MemoryRecord,reason:string):string {
    return hash(JSON.stringify([a.projectId,a.id,a.revision,a.body,a.sourceRef,b.id,b.revision,b.body,b.sourceRef,reason]));
  }
  preview(projectId:string,previousId:string,replacementId:string,reason:string,authenticated:boolean):ConflictPreview {
    if(!authenticated)throw new Error("Owner authentication required");
    if(typeof reason!=="string"||reason.trim().length<8)throw new Error("Meaningful correction reason required");
    const {previous,replacement}=this.confirmedPair(projectId,previousId,replacementId);
    const createdAt=new Date().toISOString(),expiresAt=new Date(Date.now()+10*60_000).toISOString();
    const challengeId=randomUUID(),rationale=reason.trim(),fingerprint=this.signature(previous,replacement,rationale);
    this.db.prepare(`INSERT INTO oh5_conflict_reviews (id,projectId,previousId,replacementId,previousRevision,replacementRevision,fingerprint,rationale,createdAt,expiresAt,resolvedAt)
      VALUES (?,?,?,?,?,?,?,?,?,?,NULL)`).run(challengeId,previous.projectId,previous.id,replacement.id,previous.revision,replacement.revision,fingerprint,rationale,createdAt,expiresAt);
    return {challengeId,projectId:previous.projectId,previous,replacement,fingerprint,reason:rationale,expiresAt,warning:"Compare original, replacement, source evidence and rationale. Preview is not approval."};
  }
  resolve(input:{projectId:string;challengeId:string;fingerprint:string;acknowledgement:string},authenticated:boolean):{previous:MemoryRecord;replacement:MemoryRecord}{
    if(!authenticated)throw new Error("Owner authentication required");
    if(input.acknowledgement!=="lock correction in")throw new Error("Explicit correction acknowledgement required");
    const projectId=this.scope(input.projectId);
    const row=this.db.prepare("SELECT * FROM oh5_conflict_reviews WHERE id=? AND projectId=?").get(input.challengeId,projectId) as ConflictRow|undefined;
    if(!row||row.resolvedAt)throw new Error("Correction challenge missing or used");
    if(row.expiresAt<=new Date().toISOString())throw new Error("Correction challenge expired");
    const {previous,replacement}=this.confirmedPair(projectId,row.previousId,row.replacementId);
    if(previous.revision!==row.previousRevision||replacement.revision!==row.replacementRevision)throw new Error("Correction source changed since preview");
    if(input.fingerprint!==row.fingerprint||this.signature(previous,replacement,row.rationale)!==row.fingerprint)throw new Error("Correction fingerprint mismatch");
    // GovernedMemoryStore guarantees atomic state + audit + consumed approval ID.
    // The challenge marker is separate; approval ID reuse fails closed after interruption.
    const updated=this.store.ownerDecision({action:"supersede",projectId,id:previous.id,expectedRevision:previous.revision,
      reason:row.rationale,evidenceRefs:[previous.sourceRef,replacement.sourceRef],approvalId:row.id,replacementId:replacement.id},true);
    this.db.prepare("UPDATE oh5_conflict_reviews SET resolvedAt=? WHERE id=? AND resolvedAt IS NULL").run(new Date().toISOString(),row.id);
    return {previous:updated,replacement};
  }
  history(projectId:string,previousId?:string):Array<{id:string;previousId:string;replacementId:string;reason:string;resolvedAt:string}>{
    const p=this.scope(projectId);
    const rows=(previousId
      ?this.db.prepare("SELECT * FROM oh5_conflict_reviews WHERE projectId=? AND previousId=? AND resolvedAt IS NOT NULL ORDER BY resolvedAt DESC LIMIT 100").all(p,previousId)
      :this.db.prepare("SELECT * FROM oh5_conflict_reviews WHERE projectId=? AND resolvedAt IS NOT NULL ORDER BY resolvedAt DESC LIMIT 100").all(p)) as ConflictRow[];
    return rows.map(r=>({id:r.id,previousId:r.previousId,replacementId:r.replacementId,reason:r.rationale,resolvedAt:r.resolvedAt!}));
  }
  /** Potential conflicts are suggestions only. They never trigger changes. */
  suggest(projectId:string,query:string):MemoryRecord[]{
    const p=this.scope(projectId);
    if(typeof query!=="string"||query.trim().length<3)throw new Error("Query required");
    return this.store.recall(p,query.trim(),30);
  }
}