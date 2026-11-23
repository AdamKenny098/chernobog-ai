import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const unit = fs.readFileSync(path.join(root,
  "deploy/oh7/chernobog-core-b15-draft.service"), "utf8");

test("B15 review unit cannot enable or start as a production writer", () => {
  assert.doesNotMatch(unit, /^\[Install\]/m);
  assert.match(unit, /^Environment=CHERNOBOG_STORAGE_ROLE=legacy$/m);
  assert.doesNotMatch(unit, /^Environment=CHERNOBOG_OH7B15_CUTOVER_APPROVAL=/m);
  assert.doesNotMatch(unit, /^EnvironmentFile=/m);
  assert.match(unit, /^ConditionPathExists=\/etc\/chernobog\/oh7b15-operator-approved$/m);
});

test("B15 review unit uses production service identity and limited filesystem grants", () => {
  assert.match(unit, /^User=chernobog$/m);
  assert.match(unit, /^Group=chernobog$/m);
  assert.match(unit, /^ProtectSystem=strict$/m);
  assert.match(unit, /^ReadWritePaths=\/var\/lib\/chernobog\/data \/srv\/storage\/chernobog\/vault$/m);
  assert.doesNotMatch(unit, /^Conflicts=/m);
  assert.doesNotMatch(unit, /^ExecStartPre=.*systemctl/m);
  assert.doesNotMatch(unit, /^ExecStopPost=.*systemctl/m);
});
