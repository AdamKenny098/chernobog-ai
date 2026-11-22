import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { acquireOH7B13ProductionAuthority } from "../lib/chernobog/coreHost/oh7b13ProductionAuthority";
import { guardCoreSQLiteConnection } from "../lib/chernobog/coreHost/guardCoreSQLite";

const stopped = () => ({
  ActiveState: "inactive", SubState: "dead",
  UnitFileState: "masked", LoadState: "masked",
});

test("OH7B13 B12 lease authorizes guarded SQLite writes then latches ownership loss", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "chernobog-oh7b13-prodshape-"));
  const data = path.join(root, "data");
  const runtime = path.join(root, "runtime");
  const vault = path.join(root, "vault");
  for (const dir of [data, runtime, vault]) fs.mkdirSync(dir);
  const mainDb = path.join(data, "chernobog.db");
  const prepared = new Database(mainDb);
  prepared.exec("CREATE TABLE ownership_check (id INTEGER PRIMARY KEY, value TEXT)");
  prepared.close();
  let systemdState = stopped();
  const env = {
    ...process.env,
    CHERNOBOG_STORAGE_ROLE: "core",
    CHERNOBOG_DATA_DIR: data,
    CHERNOBOG_RUNTIME_DIR: runtime,
    CHERNOBOG_VAULT_PATH: vault,
  };
  let owned: ReturnType<typeof acquireOH7B13ProductionAuthority> | undefined;
  let sqlite: Database.Database | undefined;
  try {
    assert.throws(() => acquireOH7B13ProductionAuthority({
      root, env, explicitOptIn: false, getLegacyState: () => systemdState,
    }), /explicit operator opt-in/);
    assert.deepEqual(fs.readdirSync(runtime), []);

    owned = acquireOH7B13ProductionAuthority({
      root, env, explicitOptIn: true, getLegacyState: () => systemdState,
    });
    assert.equal(owned.guard.hasOwnership(), true);
    sqlite = guardCoreSQLiteConnection(new Database(mainDb), "B13 production-shaped SQLite", env);
    const statement = sqlite.prepare("INSERT INTO ownership_check (value) VALUES (?)");
    statement.run("accepted");
    assert.equal((sqlite.prepare("SELECT count(*) AS n FROM ownership_check").get() as { n: number }).n, 1);

    systemdState = { ...stopped(), ActiveState: "active" };
    assert.throws(() => statement.run("refused"), /CORE_OWNER_LOST/);
    assert.equal(owned.guard.hasOwnership(), false);
    systemdState = stopped();
    assert.throws(() => statement.run("still-refused"), /CORE_WRITER_DENIED/);
    assert.equal((sqlite.prepare("SELECT count(*) AS n FROM ownership_check").get() as { n: number }).n, 1);
  } finally {
    sqlite?.close();
    try { owned?.release(); } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  }
});
