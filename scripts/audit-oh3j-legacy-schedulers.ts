import * as fs from "node:fs";
import * as path from "node:path";

type Finding = {
  file: string;
  line: number;
  pattern: string;
  excerpt: string;
};

const repo = process.cwd();

const roots = [
  path.join(repo, "app"),
  path.join(repo, "lib"),
  path.join(repo, "packages"),
];

const extensions = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
]);

const ignoredDirectories = new Set([
  "node_modules",
  ".next",
  "dist",
  "build",
  "coverage",
  ".git",
]);

const hardPatterns: Array<[string, RegExp]> = [
  ["node-cron import/use", /\bnode-cron\b/],
  ["cron.schedule", /\bcron\.schedule\s*\(/],
  ["scheduleJob", /\bscheduleJob\s*\(/],
  ["CronJob", /\bnew\s+CronJob\s*\(/],
  ["Agenda scheduler", /\bnew\s+Agenda\s*\(/],
  ["Bree scheduler", /\bnew\s+Bree\s*\(/],
];

const timerPattern = /\bsetInterval\s*\(/;
const schedulerishPath =
  /(?:game[-_/]?radar|vault[-_/]?brain|personal[-_/]?assistance|scheduler|background|recurr|cron|jobs?)/i;

const authoritativeTimerExemptions = new Set([
  "packages/runtime/src/schedulerRuntime.ts",
  "packages/runtime/src/jobWorkerRuntime.ts",
  "packages/runtime/src/jobRecoveryRuntime.ts",
  "packages/runtime/src/jobObservabilityRuntime.ts",
  "packages/runtime/src/jobControlRuntime.ts",
]);

function walk(directory: string, output: string[]): void {
  if (!fs.existsSync(directory)) return;

  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (ignoredDirectories.has(entry.name)) continue;

    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      walk(full, output);
      continue;
    }

    if (entry.isFile() && extensions.has(path.extname(entry.name))) {
      output.push(full);
    }
  }
}

function relative(file: string): string {
  return path.relative(repo, file).replaceAll("\\", "/");
}

function lineFor(content: string, index: number): number {
  return content.slice(0, index).split(/\r?\n/).length;
}

function excerptAt(content: string, index: number): string {
  const lineStart = content.lastIndexOf("\n", index) + 1;
  const lineEndRaw = content.indexOf("\n", index);
  const lineEnd = lineEndRaw === -1 ? content.length : lineEndRaw;
  return content.slice(lineStart, lineEnd).trim();
}

const files: string[] = [];
for (const root of roots) walk(root, files);

const hardFindings: Finding[] = [];
const timerCandidates: Finding[] = [];

for (const file of files) {
  const rel = relative(file);
  const content = fs.readFileSync(file, "utf8");

  for (const [label, pattern] of hardPatterns) {
    const match = pattern.exec(content);
    if (!match) continue;

    hardFindings.push({
      file: rel,
      line: lineFor(content, match.index),
      pattern: label,
      excerpt: excerptAt(content, match.index),
    });
  }

  if (
    schedulerishPath.test(rel) &&
    !authoritativeTimerExemptions.has(rel)
  ) {
    const match = timerPattern.exec(content);
    if (match) {
      timerCandidates.push({
        file: rel,
        line: lineFor(content, match.index),
        pattern: "setInterval in scheduler-related feature",
        excerpt: excerptAt(content, match.index),
      });
    }
  }
}

const duplicateStoreReferences: Finding[] = [];
for (const file of files) {
  const rel = relative(file);
  if (rel === "packages/core/src/jobStore.ts") continue;

  const content = fs.readFileSync(file, "utf8");
  const match =
    /(?:scheduler[\\/]+jobs\.json|CHERNOBOG_DATA_DIR[\s\S]{0,120}jobs\.json)/i.exec(
      content,
    );

  if (match) {
    duplicateStoreReferences.push({
      file: rel,
      line: lineFor(content, match.index),
      pattern: "direct scheduler store ownership",
      excerpt: excerptAt(content, match.index),
    });
  }
}

console.log("OH-3J legacy scheduler audit");
console.log("============================");

if (hardFindings.length > 0) {
  console.error("");
  console.error("FAIL unmistakable competing scheduler implementation(s):");
  for (const finding of hardFindings) {
    console.error(
      `  ${finding.file}:${finding.line} [${finding.pattern}] ${finding.excerpt}`,
    );
  }
  process.exit(1);
}

console.log("PASS no competing cron/scheduler library implementation detected");

if (duplicateStoreReferences.length > 0) {
  console.error("");
  console.error("FAIL duplicate scheduler persistence ownership detected:");
  for (const finding of duplicateStoreReferences) {
    console.error(
      `  ${finding.file}:${finding.line} ${finding.excerpt}`,
    );
  }
  process.exit(1);
}

console.log("PASS scheduler persistence remains Core-owned");

if (timerCandidates.length > 0) {
  console.log("");
  console.log(
    "AUDIT NOTE: timer candidates exist in scheduler-adjacent features.",
  );
  console.log(
    "These are not auto-deleted because a timer may be polling/heartbeat infrastructure rather than scheduled business work.",
  );
  for (const finding of timerCandidates) {
    console.log(
      `  REVIEW ${finding.file}:${finding.line} ${finding.excerpt}`,
    );
  }
} else {
  console.log("PASS no scheduler-adjacent setInterval candidates detected");
}

const commandBridge = path.join(
  repo,
  "lib",
  "chernobog",
  "jobs",
  "commandJobHandler.ts",
);
const bridgeSource = fs.readFileSync(commandBridge, "utf8");

if (!bridgeSource.includes("runCommandPipeline")) {
  console.error("FAIL OH-3 command jobs no longer re-enter OH-2 pipeline");
  process.exit(1);
}

for (const forbidden of [
  "executeGovernedToolAction(",
  "runExecutionTask(",
  "executeTool(",
  "invokeTool(",
]) {
  if (bridgeSource.includes(forbidden)) {
    console.error(
      `FAIL command job bridge bypasses OH-2 via ${forbidden}`,
    );
    process.exit(1);
  }
}

console.log("PASS OH-2 authoritative runtime path remains preserved");
console.log("");
console.log("OH-3J legacy scheduler audit complete.");
