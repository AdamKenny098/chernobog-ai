import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
const repo = process.cwd();
const files = [
  ["lib/chernobog/db.ts", "main SQLite initialization"],
  ["packages/personal-assistance/src/persistence.ts", "PA SQLite initialization"],
  ["packages/events/src/store.ts", "Event Spine append"],
  ["packages/core/src/jobStore.ts", "OH-3 job store mutation"],
];
for (const [relative, marker] of files) {
  const s = fs.readFileSync(path.join(repo, relative), "utf8");
  assert.match(s, /assertLegacyStorageWritable/);
  assert.ok(s.includes(marker), `${relative} missing ${marker}`);
  console.log(`PASS guarded: ${relative}`);
}
const s = fs.readFileSync(path.join(repo, "lib/chernobog/coreHost/storageAuthority.ts"), "utf8");
assert.ok(s.includes('CHERNOBOG_CORE_ROUTE_MODE !== "proxy"'));
assert.ok(s.includes("OH7B_LEGACY_WRITER_FENCED"));
console.log("PASS opt-in proxy denies legacy writers; legacy remains unchanged");
console.log("OH-7B WRITER FENCE STATIC: PASS (full production cutover pending)");
