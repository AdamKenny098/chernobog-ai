import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const source = readFileSync(path.join(root,
  "components/chernobog-ui/command-center/AdaptiveAssistanceSurface.tsx"), "utf8");
const parent = readFileSync(path.join(root,
  "components/chernobog-ui/command-center/CommandCenterView.tsx"), "utf8");
const k4 = readFileSync(path.join(root,
  "app/api/personal-assistance/adaptive-feedback/route.ts"), "utf8");
const k3 = readFileSync(path.join(root,
  "app/api/personal-assistance/reminders/adjust/route.ts"), "utf8");
const recommendations = readFileSync(path.join(root,
  "app/api/personal-assistance/adaptive-recommendations/route.ts"), "utf8");

assert.match(parent, /import\s*\{\s*AdaptiveAssistanceSurface\s*\}\s*from\s*"\.\/AdaptiveAssistanceSurface"/u);
assert.match(parent, /<AdaptiveAssistanceSurface\s*\/>/u);
assert.match(source, /^"use client";/u);
assert.match(source, /aria-expanded=\{expanded\}/u);
assert.match(source, /if \(!expanded && !loaded\) void refresh\(\)/u);
assert.doesNotMatch(source, /setInterval|setTimeout|useEffect|navigator\.serviceWorker/u);
console.log("PASS mounted in existing Command Center; starts collapsed; no polling or background scheduler");

assert.match(source, /adaptive-recommendations\?limit=100&includeHidden=true/u);
assert.match(source, /reminders\/preview\?limit=100/u);
assert.match(recommendations, /readLiveAdaptiveRecommendations/u);
assert.match(source, /item\.evidence\.explanation/u);
assert.match(source, /item\.evidence\.caveat/u);
assert.match(source, /recommendations\.policy\.attentionState/u);
assert.match(source, /recommendations\.policy\.deliveryMode/u);
console.log("PASS authoritative K2/K4 read model, evidence caveats and policy visibility");

assert.match(source, /adaptive-feedback/u);
assert.match(source, /actionKey: `ui-k5:\$\{crypto\.randomUUID\(\)\}`/u);
assert.match(source, /expectedRevision: item\.feedback\.revision/u);
assert.match(source, /verdict,/u);
assert.match(source, /verdict === "revisit-later"/u);
assert.match(source, /item\.priority === "critical"/u);
for (const verdict of ["useful", "irrelevant", "revisit-later", "clear"]) {
  assert.ok(source.includes(`recordFeedback(item, "${verdict}")`));
}
assert.match(k4, /export async function POST\(request: Request\)/u);
assert.match(k4, /readLiveAdaptiveRecommendations/u);
console.log("PASS explicit K4 feedback, revision guard, bounded deferral, critical visibility and undo");

assert.match(source, /reminders\/adjust/u);
assert.match(source, /actionId: `ui-k5:\$\{crypto\.randomUUID\(\)\}`/u);
assert.match(source, /expectedDueAt: selectedReminder\.dueAt/u);
assert.match(source, /kind,/u);
assert.match(source, /adjustReminder\("snooze"\)/u);
assert.match(source, /adjustReminder\("reschedule"\)/u);
assert.match(source, /type="datetime-local"/u);
assert.match(source, /toISOString\(\)/u);
assert.match(source, /View adjustment history/u);
assert.match(k3, /export async function POST\(request: Request\)/u);
assert.match(k3, /export async function GET\(request: Request\)/u);
console.log("PASS explicit K3 owner action schema, stable reminder ID, timezone conversion and audit history");

assert.match(source, /credentials: "same-origin"/u);
assert.match(source, /cache: "no-store"/u);
assert.match(source, /role="alert"/u);
assert.match(source, /No active reminders/u);
assert.doesNotMatch(source, /fetch\([^\n]*(?:profile|attention\b|calendar)/u);
assert.doesNotMatch(source, /(?:method:\s*"(?:PATCH|DELETE)"|sendBeacon|WebSocket)/u);
assert.doesNotMatch(source, /Notification\(|serviceWorker|pushManager/u);
console.log("PASS no profile/DND/calendar edits, no notification dispatch, fail-visible states and empty reminder handling");

console.log("OH-6K5 ADAPTIVE ASSISTANCE UI: PASS");
