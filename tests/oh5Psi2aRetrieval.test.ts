import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";
import { OH5UnifiedRetrieval, retrieveOH5Confirmed, oh5RetrievalTokens } from "../packages/vault/src/oh5/retrieval";

test("PSI 2A: scoped lexical retrieval respects governance and provenance", () => {
  const dir = mkdtempSync(join(tmpdir(),"oh5-psi2a-"));
  const filename = join(dir,"memory.sqlite");
  try {
    const db = new Database(filename);
    db.exec(`CREATE TABLE memory (id TEXT PRIMARY KEY, projectId TEXT NOT NULL, body TEXT NOT NULL, sourceRef TEXT NOT NULL, channel TEXT NOT NULL, tier TEXT NOT NULL, revision INTEGER NOT NULL, updatedAt TEXT NOT NULL, supersededBy TEXT);`);
    const insert = db.prepare(`INSERT INTO memory (id,projectId,body,sourceRef,channel,tier,revision,updatedAt,supersededBy) VALUES (?,?,?,?,?,?,?,?,?)`);
    const add = (id:string,project:string,body:string,tier:string,superseded:string|null=null) => insert.run(id,project,body,"source-"+id,"owner-cli",tier,3,"2026-10-28T12:00:00Z",superseded);
    add("good","chernobog","Silver Heron verification number 4827 and Lantern Protocol","confirmed");
    add("other","malware","Silver Heron verification number 9988","confirmed");
    add("raw","chernobog","Silver Heron secret 1234","raw");
    add("candidate","chernobog","Silver Heron secret 5678","candidate");
    add("archived","chernobog","Silver Heron secret 9012","archived");
    add("superseded","chernobog","Silver Heron obsolete 3333","confirmed","good");
    db.close();
    const hits = retrieveOH5Confirmed(filename,{projectId:"chernobog",query:"What is the Silver Heron verification number?"});
    assert.deepEqual(hits.map(x=>x.id),["good"]);
    assert.equal(hits[0].sourceRef,"source-good");
    assert.equal(hits[0].revision,3);
    assert.equal(hits[0].retrievalMode,"lexical");
    const malware = retrieveOH5Confirmed(filename,{projectId:"malware",query:"Silver Heron"});
    assert.deepEqual(malware.map(x=>x.id),["other"]);
    for (const bad of ["", "Malware", "../../other"]) assert.throws(()=>retrieveOH5Confirmed(filename,{projectId:bad,query:"Silver Heron"}));
    assert.throws(()=>retrieveOH5Confirmed(filename,{projectId:"chernobog",query:"Silver Heron",limit:51}));
    assert.deepEqual(oh5RetrievalTokens("What is the Silver Heron?"),["silver","heron"]);
    const instance = new OH5UnifiedRetrieval(filename);
    try { assert.deepEqual(instance.search({projectId:"chernobog",query:"completely unrelated"}),[]); }
    finally {instance.close();}
  } finally { rmSync(dir,{recursive:true,force:true}); }
});