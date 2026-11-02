import Database from "better-sqlite3";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const filename = resolve(".chernobog/runtime/oh5/memory.sqlite");

if (!existsSync(filename)) {
  console.log("OH5 governed database does not exist.");
  process.exit(0);
}

const db = new Database(filename, { readonly: true });

try {
  const rows = db.prepare(`
    SELECT id, projectId, body, tier, revision, sourceRef, reason
    FROM memory
    WHERE lower(body) LIKE '%northstar%'
    ORDER BY updatedAt DESC
  `).all();

  console.log(JSON.stringify(rows, null, 2));
} finally {
  db.close();
}
