import assert from "node:assert/strict";
import test from "node:test";
import {mkdtempSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import Database from "better-sqlite3";
import {blendOH5Results,retrieveOH5Hybrid} from "../packages/vault/src/oh5/hybridRetrieval";

test("PSI 2C: semantic paraphrase, lexical preference, and fallback",async()=>{
 const dir=mkdtempSync(join(tmpdir(),"psi2c-"));
 try {
  const file=join(dir,"memory.sqlite"), index=join(dir,"vectors.sqlite");
  const db=new Database(file);
  db.exec(`CREATE TABLE memory (id TEXT PRIMARY KEY,projectId TEXT,body TEXT,sourceRef TEXT,channel TEXT,tier TEXT,revision INTEGER,updatedAt TEXT,supersededBy TEXT);`);
  const insert=db.prepare("INSERT INTO memory VALUES (?,?,?,?,?,?,?,?,?)");
  insert.run("a","chernobog","Upcoming milestone Lantern Protocol","source-a","owner-cli","confirmed",1,"2026-10-28",null);
  insert.run("b","malware","Upcoming milestone shadow engine","source-b","owner-cli","confirmed",1,"2026-10-28",null);
  insert.run("c","chernobog","Upcoming milestone not approved","source-c","owner-cli","candidate",1,"2026-10-28",null);
  insert.run("d","chernobog","Upcoming milestone superseded","source-d","owner-cli","confirmed",1,"2026-10-28","a");
  try {
   const provider={model:"mock-embedding-v1",async embed(text:string){return /lantern|next step/i.test(text)?[1,0]:[0,1];}};
   const hits=await retrieveOH5Hybrid(file,index,{projectId:"chernobog",query:"What is our next step?",embeddingProvider:provider});
   assert.deepEqual(hits.map(x=>x.id),["a"]);
   assert.equal(hits[0].retrievalMode,"hybrid");
   const fallback=await retrieveOH5Hybrid(file,index,{projectId:"chernobog",query:"Lantern Protocol",embeddingProvider:{model:"unavailable",async embed(){throw new Error("offline")}}});
   assert.deepEqual(fallback.map(x=>x.id),["a"]);
   assert.equal(fallback[0].retrievalMode,"lexical");
   const other=await retrieveOH5Hybrid(file,index,{projectId:"malware",query:"Lantern Protocol",embeddingProvider:provider});
   assert.deepEqual(other,[]);
   await assert.rejects(retrieveOH5Hybrid(file,index,{projectId:"../../malware",query:"Lantern Protocol"}));
  } finally {db.close();}
 } finally {rmSync(dir,{recursive:true,force:true});}
});
test("PSI 2C: reject foreign candidates",()=>{
 assert.throws(()=>blendOH5Results([], [{id:"bad",projectId:"malware",body:"x",sourceRef:"s",channel:"owner-cli",revision:1,updatedAt:"2026",score:0.9,retrievalMode:"semantic"}],"chernobog"));
});