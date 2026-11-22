import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { GovernedMemoryStore } from "../packages/vault/src/oh5/store";
import { OH5ObsidianLayout } from "../packages/vault/src/oh5/layout";

test("OH7B13 core role denies OH5 database initialization and vault projection writes without owner", () => {
  const original = process.env.CHERNOBOG_STORAGE_ROLE;
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "chernobog-oh7b13-vault-"));
  const vault = path.join(root, "vault");
  fs.mkdirSync(path.join(vault, ".obsidian"), { recursive: true });
  try {
    process.env.CHERNOBOG_STORAGE_ROLE = "core";
    const dbFile = path.join(root, "memory.db");
    assert.throws(() => new GovernedMemoryStore(dbFile), /CORE_WRITER_DENIED/);
    assert.equal(fs.existsSync(dbFile), false);
    const layout = new OH5ObsidianLayout(vault);
    assert.throws(
      () => layout.registerProject("isolated-project", "Isolated", true),
      /CORE_WRITER_DENIED/,
    );
    assert.equal(fs.existsSync(path.join(vault, "_chernobog-oh5")), false);
  } finally {
    if (original === undefined) delete process.env.CHERNOBOG_STORAGE_ROLE;
    else process.env.CHERNOBOG_STORAGE_ROLE = original;
    fs.rmSync(root, { recursive: true, force: true });
  }
});
