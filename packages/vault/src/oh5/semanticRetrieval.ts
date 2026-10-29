/** PSI 2B: opt-in local semantic candidate retrieval.
 * Never a source of truth: authoritative text and scope always come from governed memory.
 * Vector cache can be rebuilt; it never stores memory bodies or authorises reads.
 * Integration with PSI 2A hybrid retrieval occurs in PSI 2C.
 */
import Database from "better-sqlite3";
import { createHash } from "node:crypto";
import { dirname } from "node:path";
import { mkdirSync } from "node:fs";

export type EmbeddingProvider = { model: string; embed(text: string): Promise<number[]> };
export type SemanticHit = {
  id: string; projectId: string; body: string; sourceRef: string; channel: string;
  revision: number; updatedAt: string; score: number; retrievalMode: "semantic";
};
type Row = Omit<SemanticHit,"score"|"retrievalMode">;
const PROJECT = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
function validProject(id: string): void {
  if (typeof id !== "string" || id.length > 80 || !PROJECT.test(id)) throw new Error("Explicit project scope required");
}
function validatedVector(input: number[]): number[] {
  if (!Array.isArray(input) || input.length < 2 || input.length > 8192 || input.some(n => typeof n !== "number" || !Number.isFinite(n))) throw new Error("Invalid embedding vector");
  const norm = Math.hypot(...input);
  if (!Number.isFinite(norm) || norm <= 0) throw new Error("Zero/invalid embedding vector");
  return input.map(n => n / norm);
}
function similarity(a: number[], b: number[]): number {
  if (a.length !== b.length) throw new Error("Embedding dimensions mismatch; rebuild index for current model");
  return a.reduce((sum, x, i) => sum + x*b[i], 0);
}
function digest(text: string): string { return createHash("sha256").update(text).digest("hex"); }

/** Local Ollama /api/embed only. Reject non-loopback URLs to prevent memory exfiltration. */
export class OllamaLocalEmbeddingProvider implements EmbeddingProvider {
  readonly model: string;
  private readonly endpoint: string;
  constructor(model = "nomic-embed-text", baseUrl = "http://127.0.0.1:11434") {
    if (!/^[a-zA-Z0-9][a-zA-Z0-9_.:/-]{0,127}$/.test(model)) throw new Error("Invalid embedding model");
    const url = new URL(baseUrl);
    if (!(["localhost","127.0.0.1","::1","[::1]"].includes(url.hostname)) || url.protocol !== "http:" || url.username || url.password || url.search || url.hash || url.pathname !== "/") throw new Error("Only local Ollama endpoint permitted");
    this.model = model; this.endpoint = url.origin + "/api/embed";
  }
  async embed(text: string): Promise<number[]> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch(this.endpoint, { method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify({model:this.model,input:text}), signal:controller.signal, redirect:"error" });
      if (!response.ok) throw new Error(`Local embeddings unavailable: HTTP ${response.status}`);
      const result: unknown = await response.json();
      const embeddings = (result as {embeddings?: unknown})?.embeddings;
      if (!Array.isArray(embeddings) || !Array.isArray(embeddings[0])) throw new Error("Unexpected Ollama embedding response");
      return validatedVector(embeddings[0]);
    } finally { clearTimeout(timer); }
  }
}

export class OH5SemanticRetrieval {
  private readonly memory: Database.Database;
  private readonly cache: Database.Database;
  constructor(memoryPath: string, indexPath: string, private readonly provider: EmbeddingProvider) {
    if (!provider || !provider.model || !provider.embed) throw new Error("Embedding provider required");
    this.memory = new Database(memoryPath,{readonly:true,fileMustExist:true});
    try {
      mkdirSync(dirname(indexPath), {recursive:true});
      this.cache = new Database(indexPath);
      this.cache.pragma("journal_mode = WAL");
      this.cache.exec(`CREATE TABLE IF NOT EXISTS psi2b_vector_cache (
        projectId TEXT NOT NULL, memoryId TEXT NOT NULL, model TEXT NOT NULL,
        revision INTEGER NOT NULL, bodyHash TEXT NOT NULL, vector TEXT NOT NULL,
        PRIMARY KEY(projectId,memoryId,model))`);
    } catch (error) { this.memory.close(); throw error; }
  }
  close():void { this.memory.close(); this.cache.close(); }

  /** Index only confirmed, non-superseded records from one selected project. */
  async search(input:{projectId:string;query:string;limit?:number;scanLimit?:number}): Promise<SemanticHit[]> {
    validProject(input.projectId);
    if (typeof input.query !== "string" || input.query.trim().length < 2 || input.query.length > 300) throw new Error("Query must contain 2-300 characters");
    const limit = input.limit ?? 20;
    const scanLimit = input.scanLimit ?? 1000;
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 50 || !Number.isSafeInteger(scanLimit) || scanLimit < 1 || scanLimit > 1000) throw new Error("Invalid result/scan limit");
    const rows = this.memory.prepare(`SELECT id,projectId,body,sourceRef,channel,revision,updatedAt FROM memory
      WHERE projectId=? AND tier='confirmed' AND supersededBy IS NULL
      ORDER BY updatedAt DESC,id ASC LIMIT ?`).all(input.projectId,scanLimit) as Row[];
    if (!rows.length) return [];
    // Query embedding only after a trusted project filter; no global memory scan.
    const queryVector = validatedVector(await this.provider.embed(input.query.trim()));
    const candidates:SemanticHit[] = [];
    const get = this.cache.prepare("SELECT revision,bodyHash,vector FROM psi2b_vector_cache WHERE projectId=? AND memoryId=? AND model=?");
    const put = this.cache.prepare(`INSERT INTO psi2b_vector_cache (projectId,memoryId,model,revision,bodyHash,vector) VALUES (?,?,?,?,?,?)
      ON CONFLICT(projectId,memoryId,model) DO UPDATE SET revision=excluded.revision,bodyHash=excluded.bodyHash,vector=excluded.vector`);
    for (const row of rows) {
      if (row.projectId !== input.projectId) throw new Error("Cross-project row rejected");
      const hash = digest(row.body);
      const old = get.get(input.projectId,row.id,this.provider.model) as {revision:number;bodyHash:string;vector:string}|undefined;
      let vector: number[];
      if (old && old.revision === row.revision && old.bodyHash === hash) {
        vector = validatedVector(JSON.parse(old.vector) as number[]);
      } else {
        vector = validatedVector(await this.provider.embed(row.body));
        put.run(input.projectId,row.id,this.provider.model,row.revision,hash,JSON.stringify(vector));
      }
      const score = similarity(queryVector,vector);
      candidates.push({...row,score,retrievalMode:"semantic"});
    }
    return candidates.sort((a,b)=> b.score-a.score || b.updatedAt.localeCompare(a.updatedAt) || a.id.localeCompare(b.id)).slice(0,limit);
  }
}