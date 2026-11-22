import assert from "node:assert/strict";
import path from "node:path";
import { test } from "node:test";
import { defaultOH5BDatabasePath } from "../packages/vault/src/oh5/store";
import { defaultObsidianRoot } from "../packages/vault/src/oh5/layout";

const names = [
  "CHERNOBOG_DATA_DIR",
  "CHERNOBOG_RUNTIME_DIR",
  "CHERNOBOG_VAULT_PATH",
  "CHERNOBOG_VAULT_ROOT",
  "OBSIDIAN_VAULT_PATH",
] as const;

function withStorageEnv(values: Partial<Record<(typeof names)[number], string>>, action: () => void): void {
  const previous = Object.fromEntries(names.map((name) => [name, process.env[name]]));
  try {
    for (const name of names) delete process.env[name];
    for (const [name, value] of Object.entries(values)) {
      if (value !== undefined) process.env[name] = value;
    }
    action();
  } finally {
    for (const name of names) {
      const old = previous[name];
      if (old === undefined) delete process.env[name];
      else process.env[name] = old;
    }
  }
}

test("OH5 keeps historical paths when storage is not configured", () => {
  withStorageEnv({}, () => {
    assert.equal(defaultOH5BDatabasePath(), path.join(process.cwd(), ".chernobog", "runtime", "oh5", "memory.sqlite"));
    assert.equal(defaultObsidianRoot(), path.join(process.cwd(), "vault", "chernobog"));
  });
});

test("OH5 honors production data and vault configuration", () => {
  withStorageEnv({
    CHERNOBOG_DATA_DIR: "/var/lib/chernobog/data",
    CHERNOBOG_VAULT_PATH: path.resolve("/srv/storage/chernobog/vault"),
  }, () => {
    assert.equal(defaultOH5BDatabasePath(), path.join(path.resolve("/var/lib/chernobog/data"), "runtime", "oh5", "memory.sqlite"));
    assert.equal(defaultObsidianRoot(), path.resolve("/srv/storage/chernobog/vault"));
  });
});

test("explicit runtime and vault paths override other storage settings", () => {
  withStorageEnv({
    CHERNOBOG_DATA_DIR: "/tmp/data",
    CHERNOBOG_RUNTIME_DIR: "/tmp/runtime",
    CHERNOBOG_VAULT_PATH: "/tmp/first-vault",
    CHERNOBOG_VAULT_ROOT: "/tmp/other-vault",
    OBSIDIAN_VAULT_PATH: "/tmp/legacy-vault",
  }, () => {
    assert.equal(defaultOH5BDatabasePath(), path.join(path.resolve("/tmp/runtime"), "oh5", "memory.sqlite"));
    assert.equal(defaultObsidianRoot(), path.resolve("/tmp/first-vault"));
  });
});

test("legacy vault environment aliases remain supported", () => {
  withStorageEnv({ OBSIDIAN_VAULT_PATH: "/tmp/obsidian-vault" }, () => {
    assert.equal(defaultObsidianRoot(), path.resolve("/tmp/obsidian-vault"));
    assert.equal(defaultOH5BDatabasePath(), path.join(process.cwd(), ".chernobog", "runtime", "oh5", "memory.sqlite"));
  });
});

