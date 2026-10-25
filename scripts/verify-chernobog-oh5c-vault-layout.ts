import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { GovernedMemoryStore } from "../packages/vault/src/oh5/store";
import { OH5ObsidianLayout, sha256, toMarkdown, validateProjectId } from "../packages/vault/src/oh5/layout";
const root = fs.mkdtempSync(path.join(os.tmpdir(), "oh5c-"));
const vault = path.join(root, "chernobog"); fs.mkdirSync(path.join(vault, ".obsidian"), {recursive:true});
const db = new GovernedMemoryStore(path.join(root, "runtime", "oh5.sqlite"));
let passed = 0; function check(label: string, run: () => void) { run(); passed++; console.log("PASS", label); }
try {
  const layout = new OH5ObsidianLayout(vault);
  check("uses single existing Obsidian root", () => assert.equal(layout.manifest().schemaVersion, 1));
  check("owner-only registry", () => assert.throws(() => layout.registerProject("malware", "Malware", false)));
  layout.registerProject("malware", "Malware", true); layout.registerProject("vestige", "Vestige", true);
  check("two distinct project scopes", () => assert.notEqual(layout.projectFolder("malware"), layout.projectFolder("vestige")));
  check("unregistered projects fail closed", () => assert.throws(() => layout.projectFolder("unknown")));
  check("traversal and shared injection rejected", () => { assert.throws(() => validateProjectId("../escape"));assert.throws(() => validateProjectId("_shared")); });
  const raw = db.ingest({projectId:"malware",body:"Isaac is Malware",sourceRef:"test:1",channel:"file"});
  const projected = layout.projectFromGovernedStore(db, "malware", raw.id);
  check("raw evidence remains raw", () => assert.equal(projected.tier,"raw"));
  check("cannot export other project memory", () => assert.throws(() => layout.projectFromGovernedStore(db, "vestige", raw.id)));
  check("valid Markdown frontmatter", () => { const text=toMarkdown(raw);assert.match(text,/^---\noh5_schema: 1/m);assert.ok(text.includes("Isaac is Malware")); });
  check("hashes and revision retained", () => {assert.equal(projected.contentHash,sha256(raw.body));assert.equal(layout.readProjection("malware",raw.id)?.revision, 1);});
  check("repeated projection idempotent", () => assert.deepEqual(layout.projectFromGovernedStore(db,"malware",raw.id),projected));
  check("cross project reads blocked", () => assert.equal(layout.readProjection("vestige",raw.id),undefined));
  check("untrusted legacy read is never confirmed", () => {fs.writeFileSync(path.join(vault,"old.md"),"legacy note"); assert.deepEqual(layout.legacyNote("old.md"),{body:"legacy note",trusted:false});});
  check("legacy traversal blocked", () => assert.throws(() => layout.legacyNote("../private.md")));
  check("migration disabled by default", () => assert.deepEqual(layout.migrationPlan(),{mode:"dry-run",writesLegacyNotes:false,schemaVersion:1}));
  check("indexes separate from records", () => assert.ok(!layout.indexDirectory().includes(path.join("projects","malware"))));
  check("symlinks rejected", () => { const inside=path.join(vault,"_chernobog-oh5","projects","malware","memories"); if (process.platform !== "win32") { fs.rmSync(inside,{recursive:true,force:true});fs.symlinkSync(root,inside,"dir");assert.throws(()=>layout.projectFromGovernedStore(db,"malware",raw.id)); } });
  check("root project cannot be forged", () => assert.throws(() => layout.registerProject("vestige","Other",true)));
  check("memory identifier cannot traverse", () => assert.throws(() => layout.readProjection("malware","../foo")));
  check("project schema rejects bad registry", () => { const manifest=path.join(vault,"_chernobog-oh5","manifest.json");const original=fs.readFileSync(manifest,"utf8");try{fs.writeFileSync(manifest,'{"schemaVersion":2,"projects":[]}');assert.throws(()=>layout.manifest());}finally{fs.writeFileSync(manifest,original);} });
  console.log(`OH-5C ONE-VAULT STORAGE: PASS ${passed}/${passed}`);
} finally { db.close();fs.rmSync(root,{recursive:true,force:true}); }
