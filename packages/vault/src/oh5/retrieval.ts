/** PSI 2A: one read-only retrieval contract for confirmed project memories.
 * This is a lexical foundation. PSI 2B adds semantic candidates; PSI 2C
 * blends scores. It never promotes, confirms, or mutates memory records.
 */
import Database from "better-sqlite3";
import type { MemoryRecord } from "./store";

export type OH5RetrievalMode = "lexical";
export type OH5RetrievalRequest = {
  projectId: string;
  query: string;
  limit?: number;
  mode?: OH5RetrievalMode;
};
export type OH5RetrievalHit = {
  id: string;
  projectId: string;
  body: string;
  sourceRef: string;
  channel: MemoryRecord["channel"];
  revision: number;
  updatedAt: string;
  score: number;
  matchedTerms: string[];
  retrievalMode: "lexical";
};

const PROJECT_ID = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const MAX_SCAN = 1000;
const MAX_QUERY = 300;
const STOP = new Set(["a","an","and","are","as","at","be","by","can","did","do","does","for","from","how","i","in","is","it","me","my","of","on","or","our","the","their","them","this","to","was","we","were","what","when","where","which","who","why","will","with","would","you"]);

export function oh5RetrievalTokens(text: string): string[] {
  return [...new Set(text.toLowerCase().match(/[a-z0-9][a-z0-9_-]*/g) ?? [])]
    .filter(token => token.length >= 2 && !STOP.has(token)).slice(0, 32);
}

function validate(request: OH5RetrievalRequest): {projectId: string; query: string; limit: number} {
  if (!request || typeof request.projectId !== "string" || !PROJECT_ID.test(request.projectId) || request.projectId.length > 80) throw new Error("Explicit valid project scope required");
  if (typeof request.query !== "string" || request.query.trim().length < 2 || request.query.length > MAX_QUERY) throw new Error("Query must contain 2-300 characters");
  if (request.mode !== undefined && request.mode !== "lexical") throw new Error("Retrieval mode unavailable");
  const limit = request.limit ?? 20;
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 50) throw new Error("Retrieval limit must be 1-50");
  return {projectId: request.projectId, query: request.query.trim(), limit};
}

/** Read-only connection: no schema changes, audit writes, or WAL mutations. */
export class OH5UnifiedRetrieval {
  private readonly db: Database.Database;
  constructor(databasePath: string) {
    this.db = new Database(databasePath, {readonly: true, fileMustExist: true});
    this.db.pragma("busy_timeout = 5000");
  }
  close(): void { this.db.close(); }

  search(request: OH5RetrievalRequest): OH5RetrievalHit[] {
    const {projectId,query,limit} = validate(request);
    const queryTerms = oh5RetrievalTokens(query);
    if (queryTerms.length === 0) return [];
    // Scope and governance are enforced by SQLite BEFORE any scoring.
    const rows = this.db.prepare(`SELECT id, projectId, body, sourceRef, channel, revision, updatedAt
      FROM memory WHERE projectId = ? AND tier = 'confirmed' AND supersededBy IS NULL
      ORDER BY updatedAt DESC, id ASC LIMIT ?`)
      .all(projectId, MAX_SCAN) as Omit<OH5RetrievalHit,"score"|"matchedTerms"|"retrievalMode">[];
    const normalizedQuery = query.toLowerCase();
    return rows.flatMap(row => {
      if (row.projectId !== projectId) throw new Error("Cross-project retrieval rejected");
      const text = row.body.toLowerCase();
      const bodyTerms = new Set(oh5RetrievalTokens(row.body));
      const matchedTerms = queryTerms.filter(term => bodyTerms.has(term) || text.includes(term));
      if (!matchedTerms.length) return [];
      const coverage = matchedTerms.length / queryTerms.length;
      const exactPhraseBonus = text.includes(normalizedQuery) ? 0.3 : 0;
      const score = Math.min(1, coverage * 0.7 + exactPhraseBonus);
      return [{...row,matchedTerms,retrievalMode:"lexical" as const,score}];
    }).sort((a,b)=> b.score-a.score || b.updatedAt.localeCompare(a.updatedAt) || a.id.localeCompare(b.id)).slice(0,limit);
  }
}

export function retrieveOH5Confirmed(databasePath: string, request: OH5RetrievalRequest): OH5RetrievalHit[] {
  const retrieval = new OH5UnifiedRetrieval(databasePath);
  try { return retrieval.search(request); }
  finally { retrieval.close(); }
}