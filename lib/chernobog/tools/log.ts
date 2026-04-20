import db from "../db";

type ToolCallLogInput = {
  toolName: string;
  input: unknown;
  output: unknown;
  success: boolean;
};

const insertToolCallStmt = db.prepare(`
  INSERT INTO tool_calls (tool_name, input_json, output_json, success)
  VALUES (@tool_name, @input_json, @output_json, @success)
`);

export function logToolCall({
  toolName,
  input,
  output,
  success,
}: ToolCallLogInput) {
  insertToolCallStmt.run({
    tool_name: toolName,
    input_json: JSON.stringify(input ?? null),
    output_json: JSON.stringify(output ?? null),
    success: success ? 1 : 0,
  });
}

type ToolCallRow = {
    id: number;
    tool_name: string;
    input_json: string;
    output_json: string | null;
    success: number;
    created_at: string;
  };
  
  const getRecentToolCallsStmt = db.prepare(`
    SELECT id, tool_name, input_json, output_json, success, created_at
    FROM tool_calls
    ORDER BY id DESC
    LIMIT ?
  `);
  
  export function getRecentToolCalls(limit = 20): ToolCallRow[] {
    return getRecentToolCallsStmt.all(limit) as ToolCallRow[];
  }