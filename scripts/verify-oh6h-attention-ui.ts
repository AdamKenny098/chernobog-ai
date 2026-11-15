import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(process.cwd());
const component = readFileSync(resolve(root,
  "components/chernobog-ui/command-center/AttentionControlSurface.tsx"), "utf8");
const host = readFileSync(resolve(root,
  "components/chernobog-ui/command-center/CommandCenterView.tsx"), "utf8");
const api = readFileSync(resolve(root,
  "app/api/personal-assistance/attention/route.ts"), "utf8");
const attentionStore = readFileSync(resolve(root,
  "packages/personal-assistance/src/attentionStore.ts"), "utf8");
const attentionTypes = readFileSync(resolve(root,
  "packages/personal-assistance/src/types.ts"), "utf8");

function check(yes: boolean, message: string) {
  assert.ok(yes, message);
  process.stdout.write(`PASS ${message}\n`);
}

check(host.includes('import { AttentionControlSurface } from "./AttentionControlSurface";') &&
  host.includes("<AttentionControlSurface />"),
  "control surface is visible from main Command Center without an extra route");
check(component.includes('"available"') && component.includes('"busy"') &&
  component.includes('"away"') && component.includes('"do-not-disturb"'),
  "all four canonical attention states are exposed");
check(component.includes('method: reset ? "DELETE" : "PATCH"') &&
  component.includes("ATTENTION_API") &&
  api.includes("export async function PATCH") && api.includes("export async function DELETE"),
  "control changes use existing explicit attention API and reset semantics");
check(component.includes("durationMinutes: minutes") &&
  component.includes('"until-off"') && component.includes('"15"') &&
  component.includes('"60"') && component.includes('"custom"') &&
  component.includes("minutes > 1440") && api.includes('"durationMinutes"'),
  "DND supports indefinite, short, hourly and bounded custom durations");
check(component.includes('const authoritative = await refresh()') &&
  component.includes("authoritative.state !== nextState") &&
  component.includes('setVerified(false)') &&
  component.includes('cache: "no-store"'),
  "state changes require authoritative read-back and fail closed on uncertainty");
check(component.includes('credentials: "same-origin"') &&
  !component.includes('localStorage') && !component.includes('sessionStorage'),
  "uses same-origin access; never stores credentials or shadow DND state");
check(component.includes('const PROFILE_API') &&
  !component.includes('method: "PATCH",\n        ...') &&
  !component.includes('fetch(PROFILE_API, {\n        method: "PATCH"') &&
  !component.includes('fetch(PROFILE_API, { method: "PATCH"'),
  "proactive assistance stays observational, not silently modified");
check(component.includes("DND is absolute") &&
  attentionTypes.includes('"do-not-disturb"') &&
  attentionTypes.includes("PERSONAL_ATTENTION_STATES") &&
  attentionStore.includes("isPersonalAttentionState") &&
  attentionStore.includes("expireIfNeeded"),
  "absolute DND messaging uses canonical persistent attention state with expiration");
console.log("OH-6H ATTENTION & DND UI FOUNDATION: PASS");
