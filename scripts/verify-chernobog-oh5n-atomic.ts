import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { ControlledEvidenceIngress } from "../packages/vault/src/oh5/ingestion";
import { OH5ObsidianLayout } from "../packages/vault/src/oh5/layout";
const base = fs.mkdtempSync(path.join(os.tmpdir(), "oh5n-atomic-"));
const vault = path.join(base,"vault"); fs.mkdirSync(path.join(vault,".obsidian"),{recursive:true});
const layout = new OH5ObsidianLayout(vault); layout.registerProject("malware","Malware",true); layout.registerProject("vestige","Vestige",true);
const filename = path.join(base,"runtime","memory.sqlite");
let ingress: ControlledEvidenceIngress | undefined;
try {
  ingress = new ControlledEvidenceIngress(filename,vault);
  const first = ingress.ingest({projectId:"malware",channel:"discord",sourceRef:"discord:1",body:"Nemesis Arcee test evidence"});
  assert.equal(first.record.tier,"raw");
  assert.equal(ingress.ingest({projectId:"malware",channel:"discord",sourceRef:"discord:1",body:"Nemesis Arcee test evidence"}).record.id,first.record.id);
  assert.equal(ingress.receipts("vestige").length,0);
  const db = new Database(filename);
  try {
    const before = (db.prepare("SELECT COUNT(*) n FROM memory").get() as {n:number}).n;
    db.exec("CREATE TRIGGER oh5n_reject_receipt BEFORE INSERT ON oh5_evidence_receipts BEGIN SELECT RAISE(ABORT,'simulated disk write failure'); END;");
    assert.throws(()=>ingress!.ingest({projectId:"malware",channel:"file",sourceRef:"failing:2",body:"new test evidence"}));
    assert.equal((db.prepare("SELECT COUNT(*) n FROM memory").get() as {n:number}).n,before,"Memory write rolled back with receipt");
    assert.equal((db.prepare("SELECT COUNT(*) n FROM audit").get() as {n:number}).n,before,"Audit write rolled back with receipt");
    db.exec("DROP TRIGGER oh5n_reject_receipt");
    const succeeded=ingress.ingest({projectId:"malware",channel:"file",sourceRef:"failing:2",body:"new test evidence"});
    assert.equal(succeeded.duplicate,false);
    assert.equal(succeeded.record.tier,"raw");
    assert.equal((db.prepare("SELECT COUNT(*) n FROM oh5_evidence_receipts").get() as {n:number}).n,2);
  } finally { db.close(); }
  console.log("OH-5N ATOMIC INGRESS: PASS (same-transaction commit, rollback, audit, replay, scope)");
} finally { ingress?.close(); fs.rmSync(base,{recursive:true,force:true}); }