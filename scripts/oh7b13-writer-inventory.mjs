#!/usr/bin/env node
/**
 * OH-7B13 independent writer inventory.
 *
 * This is a conservative, read-only source audit. It cannot prove that all
 * dynamic imports, dependencies, native modules, or runtime writes are covered.
 * It never imports application modules, opens databases, or writes files.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SCAN_DIRS = ["lib", "packages", "scripts", "app"];
const EXCLUDE_DIRS = new Set(["node_modules", ".git", ".next", "dist", "build", "coverage", "__tests__"]);
const SOURCE_FILE = /\.(?:mjs|cjs|js|jsx|ts|tsx|mts|cts)$/;
const RULES = [
  ["sqlite-open", /\bnew\s+(?:Database|BetterSqlite3|SQLiteDatabase)\s*\(/],
  ["sqlite-import", /(?:from\s*["']better-sqlite3["']|require\(["']better-sqlite3["']\))/],
  ["sqlite-direct-sql", /\b(?:db|database|connection)\.(?:exec|prepare|transaction|pragma)\s*\(/],
  ["sync-file-write", /\b(?:fs\.)?(?:writeFileSync|appendFileSync|renameSync|unlinkSync|rmSync|mkdirSync|openSync|copyFileSync|truncateSync)\s*\(/],
  ["async-file-write", /\b(?:fs\.)?(?:writeFile|appendFile|rename|unlink|rm|mkdir|open|copyFile|truncate)\s*\(/],
  ["stream-file-write", /\bcreateWriteStream\s*\(/],
  ["process-spawn", /\b(?:spawn|execFile|exec|fork|spawnSync|execSync)\s*\(/],
];

export function inventoryWriters(root = DEFAULT_ROOT) {
  const result = [];
  const visit = (directory) => {
    if (!fs.existsSync(directory)) return;
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (EXCLUDE_DIRS.has(entry.name)) continue;
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        visit(full);
      } else if (entry.isFile() && SOURCE_FILE.test(entry.name)) {
        const relative = path.relative(root, full).replaceAll(path.sep, "/");
        const lines = fs.readFileSync(full, "utf8").split(/\r?\n/);
        lines.forEach((line, index) => {
          const matches = RULES.filter(([, regex]) => regex.test(line)).map(([kind]) => kind);
          if (matches.length) result.push({ path: relative, line: index + 1, kinds: matches, snippet: line.trim().slice(0, 180) });
        });
      }
    }
  };
  SCAN_DIRS.forEach((dir) => visit(path.join(root, dir)));
  return result.sort((a, b) => a.path.localeCompare(b.path) || a.line - b.line);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const findings = inventoryWriters(DEFAULT_ROOT);
  const files = [...new Set(findings.map((finding) => finding.path))];
  console.log(`OH-7B13 SOURCE WRITER INVENTORY: ${findings.length} candidate lines in ${files.length} files`);
  for (const file of files) {
    console.log(`\n# ${file}`);
    for (const finding of findings.filter((row) => row.path === file)) {
      console.log(`  ${finding.line} [${finding.kinds.join(", ")}] ${finding.snippet}`);
    }
  }
  console.log("\nThis is a candidate inventory only. Review dynamic calls and external modules separately.");
}
