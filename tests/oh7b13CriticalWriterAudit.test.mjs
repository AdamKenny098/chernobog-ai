import assert from "node:assert/strict";
import { test } from "node:test";
import { criticalWriterAudit } from "../scripts/oh7b13-critical-writer-audit.mjs";

test("OH7B13 critical audit fails closed and excludes unrelated UI", () => {
  const rows = [
    { path: "app/review/view.tsx", line: 2, kinds: ["async-file-write"], snippet: "window.open(url)" },
    { path: "lib/chernobog/events/store.ts", line: 10, kinds: ["async-file-write"], snippet: "await appendFile(path, content)" },
    { path: "lib/chernobog/personalAssistance/unknownWriter.ts", line: 11, kinds: ["sync-file-write"], snippet: "fs.writeFileSync(path, value)" },
  ];
  const report = criticalWriterAudit(rows);
  assert.equal(report.activationAuthorized, false);
  assert.equal(report.writerIsolationProven, false);
  assert.equal(report.candidateFiles, 2);
  assert.equal(report.needsManualReview, 1);
  const unknownWriter = report.files.find(
    (file) => file.path === "lib/chernobog/personalAssistance/unknownWriter.ts",
  );
  assert.ok(unknownWriter, "unreviewed writer must appear in report");
  assert.equal(unknownWriter.guardReviewed, false);
  assert.equal(unknownWriter.classification, "unreviewed");
});

test("OH7B13 read-only SQLite prepare is not misreported as independent connection", () => {
  const report = criticalWriterAudit([
    { path: "packages/personal-assistance/src/mobile/store.ts", line: 2, kinds: ["sqlite-direct-sql"], snippet: "db.prepare(sql)" },
    { path: "packages/vault/src/oh5/store.ts", line: 3, kinds: ["sqlite-open"], snippet: "new Database(file)" },
  ]);
  assert.equal(report.candidateFiles, 1);
  assert.equal(report.needsManualReview, 0);
  assert.equal(report.activationAuthorized, false);
});

test("OH7B13 audit separately identifies non-writers, guarded lessons, and backup rehearsal", () => {
  const report = criticalWriterAudit([
    { path: "lib/chernobog/execution/buildExecutionTask.ts", line: 49, kinds: ["async-file-write"], snippet: "/open (.+)/i" },
    { path: "packages/vault/src/oh5/retrieval.ts", line: 51, kinds: ["sqlite-open"], snippet: "new Database(path, {readonly:true})" },
    { path: "packages/vault/src/oh5/resilience.ts", line: 50, kinds: ["sync-file-write"], snippet: "fs.mkdirSync(dir)" },
    { path: "lib/chernobog/learning/lessonStore.ts", line: 6, kinds: ["async-file-write"], snippet: "await writeFile(temp)" },
  ]);
  assert.equal(report.needsManualReview, 0);
  assert.equal(report.specialReview, 1);
  assert.equal(report.files.find((f) => f.path.endsWith("resilience.ts"))?.classification, "special-review");
  assert.equal(report.files.find((f) => f.path.endsWith("retrieval.ts"))?.classification, "non-writer");
  assert.equal(report.files.find((f) => f.path.endsWith("lessonStore.ts"))?.classification, "guarded");
  assert.equal(report.activationAuthorized, false);
});
