import Database from "better-sqlite3";
import { randomUUID } from "node:crypto";
import { GovernedMemoryStore, type MemoryRecord } from "./store";
import { OH5ObsidianLayout, validateProjectId } from "./layout";

export type RecallHit = { id:string; projectId:string; body:string; sourceRef:string; channel:string; revision:number; updatedAt:string; score:number };
export type RecallRequest = { projectId:string; query:string; limit?:number };
type AuditRow = { id:string; projectId:string; actor:string; reason:string; at:string; hitCount:number };

/** Reads only the governed SQLite store. Never searches raw/candidate records or legacy vault notes. */
export class OH5RecallService {
  private readonly db: Database.Database;
  private readonly store: GovernedMemoryStore;
  private readonly layout: OH5ObsidianLayout;
  constructor(dbPath:string, vaultRoot:string) {
    this.db = new Database(dbPath);
    this.db.pragma("busy_timeout = 5000");
    this.store = new GovernedMemoryStore(dbPath);
    this.layout = new OH5ObsidianLayout(vaultRoot);
    this.db.exec(`CREATE TABLE IF NOT EXISTS oh5_cross_project_read_audit (
      id TEXT PRIMARY KEY, projectId TEXT NOT NULL, actor TEXT NOT NULL,
      reason TEXT NOT NULL, at TEXT NOT NULL, hitCount INTEGER NOT NULL);`);
  }
  close():void { this.store.close(); this.db.close(); }
  private scope(projectId:string):string {
    const p=validateProjectId(projectId);
    if(!this.layout.projectRegistered(p))throw new Error("Project not registered");
    return p;
  }
  private terms(query:string):string[] {
    if(typeof query!=="string"||query.trim().length<2||query.length>300)throw new Error("Query length invalid");
    const result=query.toLocaleLowerCase("en").trim().split(/\s+/).filter(Boolean);
    if(result.length>12)throw new Error("Too many search terms");
    return result;
  }
  search(input:RecallRequest):RecallHit[] {
    const projectId=this.scope(input.projectId), terms=this.terms(input.query);
    const limit=input.limit===undefined?20:input.limit;
    if(!Number.isSafeInteger(limit)||limit<1||limit>50)throw new Error("Limit must be 1 to 50");
    const rows=this.db.prepare(`SELECT id,projectId,body,sourceRef,channel,revision,updatedAt
      FROM memory WHERE projectId=? AND tier='confirmed' AND supersededBy IS NULL
      ORDER BY updatedAt DESC, id ASC`).all(projectId) as Omit<RecallHit,"score">[];
    return rows.flatMap(row=>{
      const text=row.body.toLocaleLowerCase("en");
      if(!terms.every(term=>text.includes(term)))return [];
      const score=terms.reduce((sum,term)=>sum+(text.split(term).length-1),0);
      return [{...row,score}];
    }).sort((a,b)=>b.score-a.score||b.updatedAt.localeCompare(a.updatedAt)||a.id.localeCompare(b.id)).slice(0,limit);
  }
  /** Exact ID/history lookups never infer a project from content or an ID. */
  history(projectId:string, memoryId:string, ownerAuthenticated:boolean):{record:MemoryRecord; events:unknown[]} {
    if(!ownerAuthenticated)throw new Error("Owner authentication required for historical recall");
    const p=this.scope(projectId);
    if(typeof memoryId!=="string"||memoryId.length>120||!memoryId.trim())throw new Error("Memory ID invalid");
    const record=this.store.get(p,memoryId);
    if(!record)throw new Error("Memory not found in requested project");
    return {record, events:this.store.audit(p,memoryId)};
  }
  /** Owner-only explicit cross-project operation, audited even for zero matches. */
  searchAcrossProjects(input:{projectIds:string[];query:string;reason:string;limit?:number},ownerAuthenticated:boolean):{hits:RecallHit[]; auditId:string} {
    if(!ownerAuthenticated)throw new Error("Owner authentication required");
    if(!Array.isArray(input.projectIds)||input.projectIds.length<2||input.projectIds.length>10)throw new Error("Explicit projects required");
    if(new Set(input.projectIds).size!==input.projectIds.length)throw new Error("Duplicate project scope");
    if(typeof input.reason!=="string"||input.reason.trim().length<12||input.reason.length>500)throw new Error("Meaningful cross-project reason required");
    const scopes=input.projectIds.map(p=>this.scope(p));
    const limit=input.limit===undefined?20:input.limit;
    if(!Number.isSafeInteger(limit)||limit<1||limit>50)throw new Error("Limit must be 1 to 50");
    const hits=scopes.flatMap(projectId=>this.search({projectId,query:input.query,limit}));
    hits.sort((a,b)=>b.score-a.score||b.updatedAt.localeCompare(a.updatedAt)||a.projectId.localeCompare(b.projectId));
    const selected=hits.slice(0,limit),auditId=randomUUID(),at=new Date().toISOString();
    this.db.prepare("INSERT INTO oh5_cross_project_read_audit (id,projectId,actor,reason,at,hitCount) VALUES (?,?,?,?,?,?)")
      .run(auditId,scopes.join(","),"owner",input.reason.trim(),at,selected.length);
    return {hits:selected,auditId};
  }
  crossProjectAudit(ownerAuthenticated:boolean):AuditRow[] {
    if(!ownerAuthenticated)throw new Error("Owner authentication required");
    return this.db.prepare("SELECT * FROM oh5_cross_project_read_audit ORDER BY at DESC LIMIT 100").all() as AuditRow[];
  }
}
