/** PSI 2C: project-scoped hybrid retrieval for the OH-4 Context Engine.
 * Semantic index is an optional acceleration, never an authority boundary.
 */
import { OH5UnifiedRetrieval, type OH5RetrievalHit } from "./retrieval";
import { OH5SemanticRetrieval, type EmbeddingProvider, type SemanticHit } from "./semanticRetrieval";

export type HybridHit = {
  id:string; projectId:string; body:string; sourceRef:string; channel:string;
  revision:number; updatedAt:string; score:number; retrievalMode:"hybrid"|"lexical";
  lexicalScore:number; semanticScore:number;
};
export type HybridOptions = {
  projectId:string; query:string; limit?:number;
  /** Injecting a provider is for tests; production uses loopback Ollama. */
  embeddingProvider?: EmbeddingProvider;
};
const PROJECT = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
export function blendOH5Results(lexical:OH5RetrievalHit[], semantic:SemanticHit[], projectId:string, limit=12): HybridHit[] {
  if (!PROJECT.test(projectId) || projectId.length>80) throw new Error("Invalid hybrid project scope");
  if (!Number.isSafeInteger(limit) || limit<1 || limit>50) throw new Error("Invalid limit");
  const merged = new Map<string,HybridHit>();
  for (const item of lexical) {
    if(item.projectId!==projectId) throw new Error("Cross-project lexical candidate rejected");
    merged.set(item.id,{...item,score:item.score,retrievalMode:"lexical",lexicalScore:item.score,semanticScore:0});
  }
  for (const item of semantic) {
    if(item.projectId!==projectId) throw new Error("Cross-project semantic candidate rejected");
    // Suppress unrelated semantic candidates; a non-negative cosine score alone is insufficient.
    if (!Number.isFinite(item.score) || item.score < 0.42) continue;
    const existing=merged.get(item.id);
    if(existing) {
      if(existing.revision!==item.revision || existing.body!==item.body || existing.sourceRef!==item.sourceRef) {
        throw new Error("Inconsistent governed memory revision between retrieval sources");
      }
      existing.semanticScore=Math.min(1,Math.max(0,item.score));
      existing.retrievalMode="hybrid";
    } else {
      merged.set(item.id,{...item,lexicalScore:0,semanticScore:Math.min(1,Math.max(0,item.score)),retrievalMode:"hybrid"});
    }
  }
  return [...merged.values()].map(item=>({
    ...item,
    score: Math.min(1,Math.max(item.lexicalScore,0.75*item.semanticScore)+0.15*Math.min(item.lexicalScore,item.semanticScore)),
  })).sort((a,b)=>b.score-a.score||b.updatedAt.localeCompare(a.updatedAt)||a.id.localeCompare(b.id)).slice(0,limit);
}
export async function retrieveOH5Hybrid(memoryPath:string,indexPath:string,input:HybridOptions): Promise<HybridHit[]> {
  if(!PROJECT.test(input.projectId)||input.projectId.length>80) throw new Error("Explicit project scope required");
  if(typeof input.query!=="string" || input.query.trim().length<2 || input.query.length>300) throw new Error("Query must contain 2-300 characters");
  const limit=input.limit??12;
  if(!Number.isSafeInteger(limit)||limit<1||limit>50) throw new Error("Invalid limit");
  const lexical = new OH5UnifiedRetrieval(memoryPath);
  let lexicalHits:OH5RetrievalHit[];
  try { lexicalHits=lexical.search({projectId:input.projectId,query:input.query,limit:50}); }
  finally { lexical.close(); }
  // Missing Ollama, no model, corrupt cache, or model timeout must not break ordinary memory recall.
  let semanticHits:SemanticHit[]=[];
  try {
    const { OllamaLocalEmbeddingProvider } = await import("./semanticRetrieval");
    const provider=input.embeddingProvider??new OllamaLocalEmbeddingProvider(process.env.OH5_EMBEDDING_MODEL||"nomic-embed-text");
    const semantic=new OH5SemanticRetrieval(memoryPath,indexPath,provider);
    try {semanticHits=await semantic.search({projectId:input.projectId,query:input.query,limit:50,scanLimit:40});}
    finally {semantic.close();}
    return blendOH5Results(lexicalHits,semanticHits,input.projectId,limit);
  } catch(error) {
    // Fail closed if semantic retrieval itself detects cross-project inconsistency.
    if(error instanceof Error && /cross-project|scope|inconsistent governed memory revision/i.test(error.message)) throw error;
    return blendOH5Results(lexicalHits,[],input.projectId,limit);
  }
}