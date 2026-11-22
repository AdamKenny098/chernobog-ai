import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { OH5ProjectState } from "../packages/vault/src/oh5/projectState";
import { OH5WorkingMemory } from "../packages/vault/src/oh5/classification";
import { OH5ConfirmationGate } from "../packages/vault/src/oh5/confirmation";
import { OH5ConflictManager } from "../packages/vault/src/oh5/conflicts";
import { ControlledEvidenceIngress } from "../packages/vault/src/oh5/ingestion";

test("OH7B13 unowned core cannot initialize independent OH5 SQL writers", () => {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), "oh7b13-independent-"));
  const root = path.join(parent, "vault");
  fs.mkdirSync(path.join(root, ".obsidian"), { recursive: true });
  const db = path.join(parent, "not-created", "memory.db");
  const oldRole = process.env.CHERNOBOG_STORAGE_ROLE;
  try {
    process.env.CHERNOBOG_STORAGE_ROLE = "core";
    const cases = [
      () => new OH5ProjectState(db, root),
      () => new OH5WorkingMemory(db, root),
      () => new OH5ConfirmationGate(db, root),
      () => new OH5ConflictManager(db, root),
      () => new ControlledEvidenceIngress(db, root),
    ];
    for (const make of cases) {
      assert.throws(make, /CORE_WRITER_DENIED/);
      assert.equal(fs.existsSync(db), false);
    }
  } finally {
    if (oldRole === undefined) delete process.env.CHERNOBOG_STORAGE_ROLE;
    else process.env.CHERNOBOG_STORAGE_ROLE = oldRole;
    fs.rmSync(parent, { recursive: true, force: true });
  }
});
