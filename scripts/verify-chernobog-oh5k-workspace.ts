import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const base = path.join(process.cwd(), "app", "oh5", "memory-review");
const ui = fs.readFileSync(path.join(base, "workspace.tsx"), "utf8");
const page = fs.readFileSync(path.join(base, "page.tsx"), "utf8");
const checks: Array<[string, boolean]> = [
  ["Next page renders workspace", page.includes("<OH5ReviewWorkspace />")],
  ["client component", ui.startsWith('"use client"')],
  ["owner token never saved to localStorage", !ui.includes("localStorage.")],
  ["owner token never saved to sessionStorage", !ui.includes("sessionStorage.")],
  ["bearer authorization", ui.includes("Authorization: `Bearer ${token.trim()}`")],
  ["no credentials on fetch", ui.includes('credentials: "omit"')],
  ["no browser cache", ui.includes('cache: "no-store"')],
  ["project field mandatory", ui.includes("registered project ID")],
  ["project switch clears old records", ui.includes("setRecords([]); setPreview(null)")],
  ["review queue connected", ui.includes('operation: "queue"')],
  ["review preview connected", ui.includes('operation: "preview", memoryId: id')],
  ["review decision bound to nonce", ui.includes("nonce: preview.nonce")],
  ["review decision bound to fingerprint", ui.includes("fingerprint: preview.fingerprint")],
  ["explicit lock phrase", ui.includes('"lock it in"')],
  ["explicit reject phrase", ui.includes('"reject"')],
  ["same-scope search", ui.includes('operation: "search", query')],
  ["history navigation", ui.includes('operation: "history", memoryId')],
  ["correction preview", ui.includes('operation: "preview", previousId: oldId')],
  ["correction challenge bound", ui.includes("challengeId: correction.challengeId")],
  ["correction fingerprint bound", ui.includes("fingerprint: correction.fingerprint")],
  ["work item proposals", ui.includes('operation: "propose"')],
  ["task revisions", ui.includes("expectedRevision: item.revision")],
  ["proactive suggestions passive", ui.includes("no notifications sent")],
  ["separate scoped API routes", ["review", "recall", "conflicts", "project-state"].every(s => ui.includes(`call("${s}"`))],
];
for (const [name, condition] of checks) { assert.ok(condition, name); console.log("PASS " + name); }
console.log(`OH-5K WORKSPACE DEVELOPMENT: PASS ${checks.length}/${checks.length}`);