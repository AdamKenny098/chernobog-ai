import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

import { getChernobogDataDirectory } from "./runtimeConfig";

const dataDirectory = getChernobogDataDirectory();

fs.mkdirSync(dataDirectory, {
  recursive: true,
});

export const chernobogDatabasePath = path.join(
  dataDirectory,
  "chernobog.db",
);

export const db = new Database(chernobogDatabasePath);

db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    route TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS memories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fact TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS tool_calls (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tool_name TEXT NOT NULL,
    input_json TEXT NOT NULL,
    output_json TEXT,
    success INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS session_state (
    session_id TEXT PRIMARY KEY,
    state_json TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);

type LogToolCallInput = {
  toolName: string;
  input: unknown;
  output: unknown;
  success: boolean;
};

const insertToolCallStatement = db.prepare(`
  INSERT INTO tool_calls (
    tool_name,
    input_json,
    output_json,
    success
  )
  VALUES (?, ?, ?, ?)
`);

export function logToolCall({
  toolName,
  input,
  output,
  success,
}: LogToolCallInput): void {
  insertToolCallStatement.run(
    toolName,
    JSON.stringify(input ?? null),
    JSON.stringify(output ?? null),
    success ? 1 : 0,
  );
}

type ToolCallRow = {
  id: number;
  tool_name: string;
  input_json: string;
  output_json: string | null;
  success: number;
  created_at: string;
};

const getRecentToolCallsStatement = db.prepare(`
  SELECT
    id,
    tool_name,
    input_json,
    output_json,
    success,
    created_at
  FROM tool_calls
  ORDER BY id DESC
  LIMIT ?
`);

export function getRecentToolCalls(limit = 20): ToolCallRow[] {
  return getRecentToolCallsStatement.all(limit) as ToolCallRow[];
}

export default db;