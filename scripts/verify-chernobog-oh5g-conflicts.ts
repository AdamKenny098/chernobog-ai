import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { OH5ObsidianLayout } from "../packages/vault/src/oh5/layout";
import { GovernedMemoryStore, type MemoryRecord } from "../packages/vault/src/oh5/store";
import { OH5ConflictManager } from "../packages/vault/src/oh5/conflicts";
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"oh5g-"));
const root=path.join(tmp,"vault"),db=path.join(tmp,"memory.sqlite");
fs.mkdirSync(path.join(root,".obsidian"),{recursive:true});
const layout=new OH5ObsidianLayout(root);
layout.registerProject("malware","Malware",true); layout.registerProject("vestige","Vestige",true);
const store=new GovernedMemoryStore(db), manager=new OH5ConflictManager(db,root);
let count=0;
function check(name:string,fn:()=>void){fn();count++;console.log(`PASS ${name}`);}
function confirmed(projectId:string,body:string,sourceRef:string):MemoryRecord{
  const raw=store.ingest({projectId,body,sourceRef,channel:"owner-ui"});
  const candidate=store.propose({projectId,id:raw.id,expectedRevision:raw.revision,channel:"model"});
  return store.ownerDecision({action:"confirm",projectId,id:candidate.id,expectedRevision:candidate.revision,reason:"reviewed owner evidence",evidenceRefs:[sourceRef],approvalId:randomUUID()},true);
}
try{
  const old=confirmed("malware","Isaac works for team A","owner:old");
  const newer=confirmed("malware","Isaac works for team B","owner:new");
  const unrelated=confirmed("vestige","Isaac works for team C","owner:vestige");
  check("owner gate on preview",()=>assert.throws(()=>manager.preview("malware",old.id,newer.id,"correcting project lore",false)));
  check("no cross-project replacement",()=>assert.throws(()=>manager.preview("malware",old.id,unrelated.id,"correcting project lore",true)));
  check("no cross-project source",()=>assert.throws(()=>manager.preview("vestige",old.id,unrelated.id,"correcting project lore",true)));
  check("unregistered project denied",()=>assert.throws(()=>manager.suggest("foreign","Isaac")));
  check("identical records denied",()=>assert.throws(()=>manager.preview("malware",old.id,old.id,"correcting project lore",true)));
  check("meaningful reason required",()=>assert.throws(()=>manager.preview("malware",old.id,newer.id,"x",true)));
  const preview=manager.preview("malware",old.id,newer.id,"Owner explicitly changed the canonical team",true);
  const args={projectId:"malware",challengeId:preview.challengeId,fingerprint:preview.fingerprint,acknowledgement:"lock correction in"};
  check("preview includes both exact bodies",()=>{assert.equal(preview.previous.body,old.body);assert.equal(preview.replacement.body,newer.body);});
  check("preview includes provenance",()=>{assert.equal(preview.previous.sourceRef,"owner:old");assert.equal(preview.replacement.sourceRef,"owner:new");});
  check("no unauthenticated resolution",()=>assert.throws(()=>manager.resolve(args,false)));
  check("explicit owner phrase required",()=>assert.throws(()=>manager.resolve({...args,acknowledgement:"yes"},true)));
  check("fingerprint mismatch rejected",()=>assert.throws(()=>manager.resolve({...args,fingerprint:"0".repeat(64)},true)));
  check("wrong project cannot resolve",()=>assert.throws(()=>manager.resolve({...args,projectId:"vestige"},true)));
  check("old still confirmed before decision",()=>assert.equal(store.get("malware",old.id)?.tier,"confirmed"));
  const result=manager.resolve(args,true);
  check("old superseded",()=>assert.equal(result.previous.tier,"superseded"));
  check("replacement stays confirmed",()=>assert.equal(result.replacement.tier,"confirmed"));
  check("lineage maintained",()=>assert.equal(store.get("malware",old.id)?.supersededBy,newer.id));
  check("old excluded from recall",()=>assert.equal(store.recall("malware","team A").length,0));
  check("replacement visible in recall",()=>assert.equal(store.recall("malware","team B").length,1));
  check("history preserves rationale",()=>assert.match(manager.history("malware",old.id)[0].reason,/canonical team/));
  check("history isolated by project",()=>assert.equal(manager.history("vestige").length,0));
  check("replay blocked",()=>assert.throws(()=>manager.resolve(args,true)));
  check("governed audit retains event",()=>assert.ok(store.audit("malware",old.id).some((x:unknown)=>(x as {action:string}).action==="supersede")));
  check("suggestions do not change memory",()=>{assert.equal(manager.suggest("malware","team B").length,1);assert.equal(store.get("malware",newer.id)?.tier,"confirmed");});
  manager.close();
  const again=new OH5ConflictManager(db,root);
  check("correction history survives restart",()=>assert.equal(again.history("malware",old.id).length,1));
  again.close();
  console.log(`OH-5G CORRECTIONS AND CONFLICTS: PASS ${count}/${count}`);
}finally {store.close();fs.rmSync(tmp,{recursive:true,force:true});}