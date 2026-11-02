import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";
import { OH5RecallService } from "../packages/vault/src/oh5/recall";

test("OH5 recall: natural-language retrieval respects project isolation", () => {
  const dir = mkdtempSync(join(tmpdir(), "oh5-recall-"));
  const dbPath = join(dir, "memory.sqlite");
  const vaultRoot = join(dir, "vault");

  try {
    mkdirSync(join(vaultRoot, ".obsidian"), { recursive: true });

    const manifestDir = join(vaultRoot, "_chernobog-oh5");
    mkdirSync(manifestDir, { recursive: true });

    writeFileSync(
      join(manifestDir, "manifest.json"),
      JSON.stringify({
        schemaVersion: 1,
        projects: [
          {
            id: "chernobog",
            name: "Chernobog",
            createdAt: new Date().toISOString()
          },
          {
            id: "malware",
            name: "Malware",
            createdAt: new Date().toISOString()
          }
        ]
      })
    );
    const db = new Database(dbPath);

    db.exec(`
      CREATE TABLE memory (
        id TEXT PRIMARY KEY,
        projectId TEXT NOT NULL,
        body TEXT NOT NULL,
        sourceRef TEXT NOT NULL,
        channel TEXT NOT NULL,
        tier TEXT NOT NULL,
        revision INTEGER NOT NULL,
        updatedAt TEXT NOT NULL,
        supersededBy TEXT
      );
    `);

    const insert = db.prepare(
      "INSERT INTO memory VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    );

    insert.run(
      "confirmed",
      "chernobog",
      "Lantern Protocol is the next milestone.",
      "source-confirmed",
      "owner-cli",
      "confirmed",
      1,
      "2026-10-29",
      null
    );

    insert.run(
      "foreign",
      "malware",
      "Lantern Protocol belongs to another project.",
      "source-foreign",
      "owner-cli",
      "confirmed",
      1,
      "2026-10-29",
      null
    );

    insert.run(
      "candidate",
      "chernobog",
      "Lantern Protocol is cancelled.",
      "source-candidate",
      "owner-cli",
      "candidate",
      1,
      "2026-10-29",
      null
    );

    db.close();

    const recall = new OH5RecallService(dbPath, vaultRoot);

    try {
      const hits = recall.search({
        projectId: "chernobog",
        query: "What is our next Lantern Protocol milestone?"
      });

      assert.deepEqual(
        hits.map(hit => hit.id),
        ["confirmed"]
      );

      assert.equal(hits[0].sourceRef, "source-confirmed");
    } finally {
      recall.close();
    }
  } finally {
    try {
      rmSync(dir, {
        recursive: true,
        force: true,
        maxRetries: 10,
        retryDelay: 200
      });
    } catch (error) {
      console.warn("Temporary test cleanup failed:", error);
    }
  }
});
