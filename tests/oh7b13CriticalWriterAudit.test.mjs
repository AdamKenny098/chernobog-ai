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
  assert.equal(report.files[0].path, "lib/chernobog/personalAssistance/unknownWriter.ts");
  assert.equal(report.files[0].guardReviewed, false);
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
