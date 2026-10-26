import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import Database from "better-sqlite3";

export type IntegrityFinding = { code: string; count: number };
export type IntegrityReport = { healthy: boolean; databaseExists: boolean; findings: IntegrityFinding[]; checkedAt: string };
const expectedTables = ["memory", "audit", "approval_consumed", "oh5_evidence_receipts"];
const sha256 = (b: Buffer) => createHash("sha256").update(b).digest("hex");

/** Read-only verification. Does not repair or trust arbitrary memory content. */
export function inspectOH5Database(filename: string): IntegrityReport {
  const findings: IntegrityFinding[] = [];
  if (!fs.existsSync(filename)) return { healthy: false, databaseExists: false, findings: [{ code: "database-missing", count: 1 }], checkedAt: new Date().toISOString() };
  const stat = fs.lstatSync(filename);
  if (!stat.isFile() || stat.isSymbolicLink()) throw new Error("Database path must be a regular, non-symlink file");
  const db = new Database(filename, { readonly: true, fileMustExist: true });
  try {
    const integrities = db.pragma("integrity_check") as { integrity_check: string }[];
    if (integrities.length !== 1 || integrities[0]?.integrity_check !== "ok") findings.push({ code: "sqlite-integrity-failed", count: integrities.length || 1 });
    const tables = new Set((db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as { name: string }[]).map(row => row.name));
    for (const table of expectedTables) if (!tables.has(table)) findings.push({ code: `missing-table:${table}`, count: 1 });
    if (tables.has("memory")) {
      const invalidScope = db.prepare("SELECT COUNT(*) AS n FROM memory WHERE projectId IS NULL OR length(trim(projectId))=0").get() as { n: number };
      if (invalidScope.n) findings.push({ code: "unscoped-memory", count: invalidScope.n });
      const invalidRevision = db.prepare("SELECT COUNT(*) AS n FROM memory WHERE revision < 1").get() as { n: number };
      if (invalidRevision.n) findings.push({ code: "invalid-revision", count: invalidRevision.n });
      const brokenSupersession = db.prepare("SELECT COUNT(*) AS n FROM memory AS old LEFT JOIN memory AS newer ON newer.id = old.supersededBy AND newer.projectId = old.projectId WHERE old.supersededBy IS NOT NULL AND newer.id IS NULL").get() as { n: number };
      if (brokenSupersession.n) findings.push({ code: "invalid-supersession", count: brokenSupersession.n });
    }
    if (tables.has("memory") && tables.has("oh5_evidence_receipts")) {
      const orphan = db.prepare("SELECT COUNT(*) AS n FROM oh5_evidence_receipts r LEFT JOIN memory m ON m.id=r.memoryId AND m.projectId=r.projectId WHERE m.id IS NULL").get() as { n: number };
      if (orphan.n) findings.push({ code: "orphan-evidence-receipt", count: orphan.n });
      const unreceipted = db.prepare("SELECT COUNT(*) AS n FROM memory m LEFT JOIN oh5_evidence_receipts r ON r.memoryId=m.id AND r.projectId=m.projectId WHERE r.memoryId IS NULL AND m.tier='raw'").get() as { n: number };
      // Some RAW entries are intentionally created by direct governed ingress, so this is advisory.
      if (unreceipted.n) findings.push({ code: "advisory-raw-without-evidence-receipt", count: unreceipted.n });
    }
  } finally { db.close(); }
  return { healthy: findings.every(f => f.code.startsWith("advisory-")), databaseExists: true, findings, checkedAt: new Date().toISOString() };
}

/** SQLite online backup provides one consistent snapshot, including WAL transactions. Never copies the live .sqlite file with fs.copyFile. */
export async function snapshotOH5Database(filename: string, directory: string): Promise<{ backupPath: string; sha256: string; bytes: number }> {
  const report = inspectOH5Database(filename);
  if (!report.healthy) throw new Error(`Source database fails integrity preflight: ${report.findings.map(f => f.code).join(",")}`);
  const resolvedSource = path.resolve(filename);
  const resolvedDirectory = path.resolve(directory);
  if (resolvedSource.startsWith(resolvedDirectory + path.sep)) throw new Error("Backup directory cannot contain source database");
  fs.mkdirSync(resolvedDirectory, { recursive: true, mode: 0o700 });
  if (fs.lstatSync(resolvedDirectory).isSymbolicLink()) throw new Error("Symlink backup destination rejected");
  const dest = path.join(resolvedDirectory, `oh5-${new Date().toISOString().replace(/[:.]/g, "-")}-${randomUUID()}.sqlite`);
  const source = new Database(resolvedSource, { readonly: true, fileMustExist: true });
  try { await source.backup(dest); } finally { source.close(); }
  try {
    const verified = inspectOH5Database(dest);
    if (!verified.healthy) throw new Error("Backup verification failed");
    const bytes = fs.readFileSync(dest);
    if (!bytes.length) throw new Error("Empty backup rejected");
    fs.chmodSync(dest, 0o600);
    return { backupPath: dest, sha256: sha256(bytes), bytes: bytes.length };
  } catch (e) { if (fs.existsSync(dest)) fs.unlinkSync(dest); throw e; }
}

/** A recovery rehearsal must happen in an isolated temp path, never the live database. */
export function rehearseOH5Recovery(backupPath: string, digest: string): { healthy: boolean; findings: IntegrityFinding[] } {
  if (!/^[a-f0-9]{64}$/i.test(digest)) throw new Error("SHA256 digest required");
  const file = fs.lstatSync(backupPath);
  if (!file.isFile() || file.isSymbolicLink()) throw new Error("Invalid backup file");
  const data = fs.readFileSync(backupPath);
  if (sha256(data) !== digest.toLowerCase()) throw new Error("Backup digest mismatch");
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "chernobog-oh5-recovery-"));
  try {
    const tmp = path.join(tmpDir, "rehearsal.sqlite");
    fs.writeFileSync(tmp, data, { flag: "wx", mode: 0o600 });
    const report = inspectOH5Database(tmp);
    return { healthy: report.healthy, findings: report.findings };
  } finally { fs.rmSync(tmpDir, { recursive: true, force: true }); }
}