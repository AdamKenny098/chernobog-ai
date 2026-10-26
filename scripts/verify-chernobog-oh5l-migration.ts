import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { previewLegacyNotes, applyLegacyPlan } from "../packages/vault/src/oh5/migration";
import { OH5ObsidianLayout } from "../packages/vault/src/oh5/layout";
import { GovernedMemoryStore } from "../packages/vault/src/oh5/store";
const root = fs.mkdtempSync(path.join(os.tmpdir(), "chernobog-oh5l-"));
let count = 0;
function check(name: string, fn: () => void): void { fn(); count++; console.log(`PASS ${name}`); }
const vault = path.join(root,"vault"); fs.mkdirSync(path.join(vault,".obsidian"), {recursive:true});
const note = path.join(vault,"Legacy.md"); fs.writeFileSync(note,"# Test record\nUntrusted imported note");
const layout = new OH5ObsidianLayout(vault);
layout.registerProject("malware","Malware",true);
layout.registerProject("vestige","Vestige",true);
const db = path.join(root,"memory.sqlite");
try {
  const plan = previewLegacyNotes(vault,"malware",["Legacy.md"]);
  check("preview selects one note",()=>assert.equal(plan.items.length,1));
  check("preview does not create memory",()=>{ const store=new GovernedMemoryStore(db); try{ assert.equal(store.list("malware",{tiers:["raw"]}).length,0); }finally{store.close();} });
  check("preview content fingerprint",()=>assert.match(plan.items[0].sha256,/^[a-f0-9]{64}$/));
  check("unregistered scope blocked",()=>assert.throws(()=>previewLegacyNotes(vault,"unknown",["Legacy.md"])));
  check("cross boundary blocked",()=>assert.throws(()=>previewLegacyNotes(vault,"malware",["../escape.md"])));
  check("hidden notes blocked",()=>assert.throws(()=>previewLegacyNotes(vault,"malware",[".obsidian/settings.md"])));
  check("OH5 internal notes blocked",()=>assert.throws(()=>previewLegacyNotes(vault,"malware",["_chernobog-oh5/secret.md"])));
  check("non Markdown blocked",()=>assert.throws(()=>previewLegacyNotes(vault,"malware",["Legacy.json"])));
  check("repeated paths blocked",()=>assert.throws(()=>previewLegacyNotes(vault,"malware",["Legacy.md","Legacy.md"])));
  check("no automatic confirmation",()=>assert.throws(()=>applyLegacyPlan(plan,plan.digest,false,db)));
  check("digest mismatch rejected",()=>assert.throws(()=>applyLegacyPlan(plan,"incorrect",true,db)));
  check("source mutation detected",()=>{ fs.writeFileSync(note,"# Changed"); assert.throws(()=>applyLegacyPlan(plan,plan.digest,true,db)); fs.writeFileSync(note,"# Test record\nUntrusted imported note"); });
  check("symlink source blocked",()=>{ if(process.platform==="win32")return; fs.symlinkSync(note,path.join(vault,"link.md")); assert.throws(()=>previewLegacyNotes(vault,"malware",["link.md"])); });
  check("apply ingests as raw",()=>{const result=applyLegacyPlan(plan,plan.digest,true,db);assert.equal(result.imported,1);const store=new GovernedMemoryStore(db);try{assert.equal(store.list("malware",{tiers:["raw"]}).length,1);assert.equal(store.list("malware").length,0);}finally{store.close();}});
  check("replay idempotent",()=>{const result=applyLegacyPlan(plan,plan.digest,true,db);assert.equal(result.imported,0);assert.equal(result.duplicates,1);});
  check("no other project contamination",()=>{const store=new GovernedMemoryStore(db);try{assert.equal(store.list("vestige",{tiers:["raw"]}).length,0);}finally{store.close();}});
  check("legacy note unchanged",()=>assert.equal(fs.readFileSync(note,"utf8"),"# Test record\nUntrusted imported note"));
  console.log(`OH-5L SAFE MIGRATION: PASS ${count}/${count}`);
} finally {fs.rmSync(root,{recursive:true,force:true});}