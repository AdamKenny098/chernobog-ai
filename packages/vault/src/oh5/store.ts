import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";
import { randomUUID } from "node:crypto";
import { evaluateMemoryMutation, evaluateRetrievalScope, type InputChannel, type MemoryTier, type Mutation } from "./governance";

export type MemoryRecord = { id:string; projectId:string; body:string; sourceRef:string; channel:InputChannel; tier:MemoryTier; revision:number; createdAt:string; updatedAt:string; supersededBy?:string; reason?:string };
export type OwnerDecision = { action:Exclude<Mutation,"ingest"|"propose">; projectId:string; id:string; expectedRevision:number; reason:string; evidenceRefs:string[]; approvalId:string; replacementId?:string };
const projectPattern = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
function required(value:string, label:string): string { if(typeof value!=="string"||!value.trim())throw new Error(`${label} required`); return value.trim(); }
function scope(value:string):string { const id=required(value,"Project ID");if(!projectPattern.test(id)||id.length>80)throw new Error("Invalid project ID");return id; }
function decode(row: unknown):MemoryRecord { const record=row as MemoryRecord;return {...record, supersededBy: record.supersededBy??undefined,reason:record.reason??undefined}; }
export class GovernedMemoryStore {
  private readonly db: Database.Database;
  constructor(filename:string){
    fs.mkdirSync(path.dirname(filename),{recursive:true});this.db=new Database(filename);
    this.db.pragma("journal_mode = WAL");this.db.pragma("busy_timeout = 5000");
    this.db.exec(`CREATE TABLE IF NOT EXISTS memory (
      id TEXT PRIMARY KEY, projectId TEXT NOT NULL, body TEXT NOT NULL, sourceRef TEXT NOT NULL,
      channel TEXT NOT NULL, tier TEXT NOT NULL, revision INTEGER NOT NULL,
      createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL, supersededBy TEXT, reason TEXT);
      CREATE INDEX IF NOT EXISTS ix_oh5_project ON memory(projectId,tier);
      CREATE TABLE IF NOT EXISTS audit (
      seq INTEGER PRIMARY KEY AUTOINCREMENT, id TEXT NOT NULL, projectId TEXT NOT NULL,
      action TEXT NOT NULL, oldTier TEXT, newTier TEXT, reason TEXT NOT NULL,
      sourceRef TEXT NOT NULL, approvalId TEXT, at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS approval_consumed (approvalId TEXT PRIMARY KEY, memoryId TEXT NOT NULL, action TEXT NOT NULL, at TEXT NOT NULL);`);
  }
  close(){this.db.close();}
  ingest(input:{projectId:string;body:string;sourceRef:string;channel:InputChannel}):MemoryRecord {
    const projectId=scope(input.projectId), body=required(input.body,"Body"),sourceRef=required(input.sourceRef,"Source reference");
    const allowed=evaluateMemoryMutation({action:"ingest",projectId,channel:input.channel,claimKind:"external-observation"});
    if(!allowed.allowed||allowed.nextTier!=="raw")throw new Error("Ingest denied");
    const at=new Date().toISOString(), entry:MemoryRecord={id:randomUUID(),projectId,body,sourceRef,channel:input.channel,tier:"raw",revision:1,createdAt:at,updatedAt:at};
    this.db.transaction(()=>{this.db.prepare(`INSERT INTO memory (id,projectId,body,sourceRef,channel,tier,revision,createdAt,updatedAt) VALUES (@id,@projectId,@body,@sourceRef,@channel,@tier,@revision,@createdAt,@updatedAt)`).run(entry);
      this.event(entry.id,projectId,"ingest",null,"raw","Raw evidence; not owner confirmed",sourceRef,null);})();
    return entry;
  }
  private event(id:string,projectId:string,action:string,oldTier:string|null,newTier:string|null,reason:string,sourceRef:string,approvalId:string|null){
    this.db.prepare(`INSERT INTO audit (id,projectId,action,oldTier,newTier,reason,sourceRef,approvalId,at) VALUES (?,?,?,?,?,?,?,?,?)`).run(id,projectId,action,oldTier,newTier,reason,sourceRef,approvalId,new Date().toISOString());
  }
  get(projectId:string,id:string):MemoryRecord|undefined{const row=this.db.prepare(`SELECT * FROM memory WHERE id=? AND projectId=?`).get(required(id,"Memory ID"),scope(projectId));return row?decode(row):undefined;}
  list(projectId:string,opts:{tiers?:MemoryTier[];limit?:number}={}):MemoryRecord[]{
    const id=scope(projectId),limit=Math.min(100,Math.max(1,opts.limit??50));
    const tiers=opts.tiers??["confirmed"];
    if(!tiers.length)return [];
    const sql=`SELECT * FROM memory WHERE projectId=? AND tier IN (${tiers.map(()=>"?").join(",")}) ORDER BY updatedAt DESC LIMIT ?`;
    return (this.db.prepare(sql).all(id,...tiers,limit) as unknown[]).map(decode);
  }
  propose(input:{projectId:string;id:string;expectedRevision:number;channel:InputChannel}):MemoryRecord {
    return this.db.transaction(()=>{
      const current=this.get(input.projectId,input.id);if(!current)throw new Error("Record not found in scope");
      if(current.revision!==input.expectedRevision)throw new Error("Stale revision");
      const decision=evaluateMemoryMutation({action:"propose",projectId:current.projectId,memoryId:current.id,previousTier:current.tier,channel:input.channel,claimKind:"external-observation"});
      if(!decision.allowed||decision.nextTier!=="candidate")throw new Error(`Proposal denied: ${decision.code}`);
      const next={...current,tier:"candidate" as const,revision:current.revision+1,updatedAt:new Date().toISOString()};
      this.db.prepare(`UPDATE memory SET tier=?,revision=?,updatedAt=? WHERE id=? AND projectId=?`).run(next.tier,next.revision,next.updatedAt,next.id,next.projectId);
      this.event(next.id,next.projectId,"propose",current.tier,next.tier,"Awaiting explicit owner review",next.sourceRef,null);
      return next;
    })();
  }
  ownerDecision(input:OwnerDecision,authenticated:boolean):MemoryRecord{
    if(!authenticated)throw new Error("Authenticated owner channel required");
    return this.db.transaction(()=>{
      const current=this.get(input.projectId,input.id);if(!current)throw new Error("Memory not found in scope");
      if(current.revision!==input.expectedRevision)throw new Error("Stale revision");
      const approvalId=required(input.approvalId,"Approval ID"),reason=required(input.reason,"Reason");
      if(!Array.isArray(input.evidenceRefs)||!input.evidenceRefs.length||input.evidenceRefs.some(s=>!s?.trim()))throw new Error("Approval evidence required");
      if(this.db.prepare(`SELECT 1 FROM approval_consumed WHERE approvalId=?`).get(approvalId))throw new Error("Approval token already used");
      if(input.action==="supersede"){
        const replacement=input.replacementId?this.get(current.projectId,input.replacementId):undefined;
        if(!replacement||replacement.id===current.id||replacement.tier!=="confirmed")throw new Error("Supersession requires confirmed replacement in same project");
      }
      const decision=evaluateMemoryMutation({action:input.action,channel:"owner-ui",projectId:current.projectId,memoryId:current.id,previousTier:current.tier,claimKind:"owner-decision",replacementId:input.replacementId,rationale:reason,approval:{actor:"owner",trustedChannel:"owner-ui",action:input.action,projectId:current.projectId,memoryId:current.id,confirmedAt:new Date().toISOString(),reason,evidenceRefs:input.evidenceRefs,approvalId}});
      if(!decision.allowed||!decision.nextTier)throw new Error(`Owner decision denied: ${decision.code}`);
      const next:MemoryRecord={...current,tier:decision.nextTier,revision:current.revision+1,updatedAt:new Date().toISOString(),reason,supersededBy:input.action==="supersede"?input.replacementId:current.supersededBy};
      this.db.prepare(`INSERT INTO approval_consumed (approvalId,memoryId,action,at) VALUES (?,?,?,?)`).run(approvalId,current.id,input.action,next.updatedAt);
      this.db.prepare(`UPDATE memory SET tier=?,revision=?,updatedAt=?,reason=?,supersededBy=? WHERE id=? AND projectId=?`).run(next.tier,next.revision,next.updatedAt,reason,next.supersededBy??null,next.id,next.projectId);
      this.event(next.id,next.projectId,input.action,current.tier,next.tier,reason,next.sourceRef,approvalId);
      return next;
    })();
  }
  recall(projectId:string,query:string,limit=20):MemoryRecord[]{
    const policy=evaluateRetrievalScope({projectId});if(!policy.allowed)throw new Error("Project isolation denied");
    const q=required(query,"Query").toLowerCase();
    return this.list(projectId,{tiers:["confirmed"],limit:100}).filter(r=>r.body.toLowerCase().includes(q)).slice(0,Math.min(50,Math.max(1,limit)));
  }
  audit(projectId:string,id?:string){const p=scope(projectId);if(id)return this.db.prepare(`SELECT * FROM audit WHERE projectId=? AND id=? ORDER BY seq ASC`).all(p,id);return this.db.prepare(`SELECT * FROM audit WHERE projectId=? ORDER BY seq DESC LIMIT 200`).all(p);}
}
export function defaultOH5BDatabasePath():string{return path.join(process.cwd(),".chernobog","runtime","oh5","memory.sqlite");}