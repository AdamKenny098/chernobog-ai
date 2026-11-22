import assert from "node:assert/strict";
import { test } from "node:test";
import Database from "better-sqlite3";
import { guardCoreSQLiteConnection } from "../lib/chernobog/coreHost/guardCoreSQLite";
import { installCoreWriteAuthority } from "../lib/chernobog/coreHost/storageAuthority";

test("OH7B13 SQLite guard protects write statements and transactions on ownership loss", () => {
  const env = { ...process.env, CHERNOBOG_STORAGE_ROLE: "core" };
  const actual = new Database(":memory:");
  let owned = true;
  let checks = 0;
  const revoke = installCoreWriteAuthority(() => {
    checks++;
    if (!owned) throw new Error("owner lost");
  }, env);
  try {
    const db = guardCoreSQLiteConnection(actual, "isolated test SQLite", env);
    db.exec("CREATE TABLE check_owner (id INTEGER PRIMARY KEY, value TEXT)");
    const insert = db.prepare("INSERT INTO check_owner (value) VALUES (?)");
    insert.run("before");
    const read = db.prepare("SELECT value FROM check_owner");
    assert.equal((read.get() as { value: string }).value, "before");
    const tx = db.transaction(() => insert.run("during"));
    tx();
    assert.equal((read.all() as Array<{ value: string }>).length, 2);
    const checkedBeforeLoss = checks;
    owned = false;
    assert.throws(() => insert.run("after"), /CORE_OWNER_LOST/);
    assert.throws(() => db.exec("INSERT INTO check_owner (value) VALUES ('bad')"), /CORE_WRITER_DENIED/);
    assert.throws(() => tx(), /CORE_WRITER_DENIED/);
    assert.equal((read.all() as Array<{ value: string }>).length, 2);
    assert.ok(checks > checkedBeforeLoss);
  } finally {
    revoke();
    actual.close();
  }
});

test("OH7B13 legacy SQLite connection remains unwrapped", () => {
  const db = new Database(":memory:");
  try {
    const guarded = guardCoreSQLiteConnection(db, "legacy", {
      ...process.env, CHERNOBOG_STORAGE_ROLE: "legacy",
    });
    assert.equal(guarded, db);
    guarded.exec("CREATE TABLE preserved (id INTEGER)");
    guarded.prepare("INSERT INTO preserved (id) VALUES (1)").run();
    assert.equal((guarded.prepare("SELECT count(*) AS n FROM preserved").get() as { n: number }).n, 1);
  } finally { db.close(); }
});
