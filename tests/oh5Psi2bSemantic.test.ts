import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtempSync,rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";
import {OH5SemanticRetrieval,OllamaLocalEmbeddingProvider} from "../packages/vault/src/oh5/semanticRetrieval";

test("PSI 2B: scoped semantics, governance, cache reuse, and revision invalidation", async () => {
 const dir=mkdtempSync(join(tmpdir(),"oh5-psi2b-"));
 try {
  const file=join(dir,"memory.sqlite"), cache=join(dir,"vectors.sqlite");
  const db=new Database(file);
  db.exec(`CREATE TABLE memory (id TEXT PRIMARY KEY,projectId TEXT,body TEXT,sourceRef TEXT,channel TEXT,tier TEXT,revision INTEGER,updatedAt TEXT,supersededBy TEXT);`);
  const insert=db.prepare("INSERT INTO memory VALUES (?,?,?,?,?,?,?,?,?)");
  insert.run("good","chernobog","Upcoming milestone Lantern Protocol","source-good","owner-cli","confirmed",1,"2026-10-28",null);
  insert.run("other","malware","Upcoming milestone secret villain","source-other","owner-cli","confirmed",1,"2026-10-28",null);
  insert.run("draft","chernobog","Upcoming milestone unapproved","source-draft","owner-cli","candidate",1,"2026-10-28",null);
  insert.run("old","chernobog","Upcoming milestone obsolete","source-old","owner-cli","confirmed",1,"2026-10-28","good");
  let calls=0;
  const provider={model:"mock-embeddings-v1",async embed(text:string){calls++;return text.toLowerCase().includes("milestone") ? [1,0,0] : [0,1,0];}};
  const semantic=new OH5SemanticRetrieval(file,cache,provider);
  try {
   const hits=await semantic.search({projectId:"chernobog",query:"What happens at our next milestone?"});
   assert.deepEqual(hits.map(h=>h.id),["good"]);
   assert.equal(hits[0].sourceRef,"source-good");
   assert.equal(hits[0].retrievalMode,"semantic");
   assert.equal(calls,2);
   await semantic.search({projectId:"chernobog",query:"What happens at our next milestone?"});
   assert.equal(calls,3,"memory body is not re-embedded when unchanged");
   assert.deepEqual(await semantic.search({projectId:"unknown",query:"milestone"}),[]);
   await assert.rejects(()=>semantic.search({projectId:"../../x",query:"milestone"}));
   db.prepare("UPDATE memory SET body=?,revision=revision+1 WHERE id=?").run("Updated milestone safely","good");
   await semantic.search({projectId:"chernobog",query:"milestone"});
   assert.equal(calls,5,"updated record must be re-embedded");
  } finally {semantic.close();db.close();}
 } finally {rmSync(dir,{recursive:true,force:true});}
});
test("PSI 2B: embedding endpoint must stay on loopback",()=>{
 assert.throws(()=>new OllamaLocalEmbeddingProvider("nomic-embed-text","https://example.com"));
 assert.throws(()=>new OllamaLocalEmbeddingProvider("nomic-embed-text","http://192.168.1.10:11434"));
 assert.equal(new OllamaLocalEmbeddingProvider().model,"nomic-embed-text");
});