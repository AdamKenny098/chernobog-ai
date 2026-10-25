import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { GovernedMemoryStore } from "../packages/vault/src/oh5/store";
import { inspectOH5Database, snapshotOH5Database, rehearseOH5Recovery } from "../packages/vault/src/oh5/resilience";
const root = fs.mkdtempSync(path.join(os.tmpdir(), "oh5m-check-"));
const filename = path.join(root, "runtime", "memory.sqlite");
const check = (name: string, run: () => void) => { run(); console.log("PASS", name); };
async function main(): Promise<void> {
  try {
    check("missing database fails closed", () => assert.equal(inspectOH5Database(filename).healthy, false));
    const store = new GovernedMemoryStore(filename);
    const raw = store.ingest({ projectId: "malware", body: "untrusted evidence", sourceRef: "test:1", channel: "file" });
    store.close();
    const db = new Database(filename);
    db.exec(`CREATE TABLE IF NOT EXISTS oh5_evidence_receipts (fingerprint TEXT PRIMARY KEY, projectId TEXT NOT NULL, channel TEXT NOT NULL, sourceRef TEXT NOT NULL, sourceTimestamp TEXT, receivedAt TEXT NOT NULL, bodySha256 TEXT NOT NULL, memoryId TEXT NOT NULL);`);
    db.close();
    check("healthy original inspected read-only", () => assert.equal(inspectOH5Database(filename).healthy, true));
    const result = await snapshotOH5Database(filename, path.join(root, "backups"));
    check("online backup created", () => assert.equal(fs.existsSync(result.backupPath), true));
    check("backup SHA256 valid", () => assert.match(result.sha256, /^[a-f0-9]{64}$/));
    check("isolated recovery succeeds", () => assert.equal(rehearseOH5Recovery(result.backupPath, result.sha256).healthy, true));
    check("wrong digest fails", () => assert.throws(() => rehearseOH5Recovery(result.backupPath, "0".repeat(64))));
    const bad = new Database(filename);
    bad.prepare("INSERT INTO oh5_evidence_receipts (fingerprint,projectId,channel,sourceRef,receivedAt,bodySha256,memoryId) VALUES (?,?,?,?,?,?,?)")
      .run("ghost", "malware", "file", "ghost", "2026-10-25T00:00:00Z", "ghost", "missing-id");
    bad.close();
    check("orphaned receipt detected", () => assert.equal(inspectOH5Database(filename).findings.some(f => f.code === "orphan-evidence-receipt"), true));
    await assert.rejects(snapshotOH5Database(filename, path.join(root, "bad-backups")));
    check("unhealthy source refuses backup", () => assert.equal(fs.existsSync(path.join(root, "bad-backups")), false));
    const scoped = new GovernedMemoryStore(filename);
    check("project boundaries still enforced", () => assert.equal(scoped.get("vestige", raw.id), undefined));
    scoped.close();
    console.log("OH-5M RESILIENCE: PASS 9/9");
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });