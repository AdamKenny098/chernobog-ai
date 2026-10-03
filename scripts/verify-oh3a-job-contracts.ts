import fs from "node:fs";
import path from "node:path";

const repo = process.cwd();
const contractFile = path.join(repo, "packages", "contracts", "src", "jobs.ts");

function pass(message: string): void {
  console.log(`PASS ${message}`);
}

function fail(message: string): never {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

if (!fs.existsSync(contractFile)) {
  fail("packages/contracts/src/jobs.ts exists");
}
pass("packages/contracts/src/jobs.ts exists");

const source = fs.readFileSync(contractFile, "utf8");

const requiredExports = [
  "JobOwner",
  "JobSource",
  "JobRunStatus",
  "ScheduleStatus",
  "JobRetryPolicy",
  "JobConcurrencyPolicy",
  "JobExecutionPolicy",
  "ScheduleTrigger",
  "JobDefinition",
  "ScheduleDefinition",
  "JobRun",
];

for (const name of requiredExports) {
  const exportPattern = new RegExp(`export\\s+type\\s+${name}\\b`);
  if (!exportPattern.test(source)) {
    fail(`exports ${name}`);
  }
  pass(`exports ${name}`);
}

const forbiddenImplementationSignals = [
  "setInterval(",
  "setTimeout(",
  "node-cron",
  "cron.schedule",
  "better-sqlite3",
  "new Worker(",
  "publishEvent(",
  "executeTool(",
];

for (const signal of forbiddenImplementationSignals) {
  if (source.includes(signal)) {
    fail(`OH-3A contracts stay implementation-free (${signal})`);
  }
}
pass("OH-3A contracts stay implementation-free");

if (!source.includes('ownerId: string')) {
  fail("job ownership is explicit");
}
pass("job ownership is explicit");

if (!source.includes('mode: "single-active"')) {
  fail("future duplicate-prevention policy is declared");
}
pass("future duplicate-prevention policy is declared");

if (!source.includes('kind: "interval"')) {
  fail("interval schedules are representable");
}
pass("interval schedules are representable");

if (!source.includes('kind: "once"')) {
  fail("one-shot schedules are representable");
}
pass("one-shot schedules are representable");

console.log("");
console.log("OH-3A contract verifier complete.");
