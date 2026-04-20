import { ToolDefinition } from "./types";
import { getTimeTool } from "./builtins/time";
import { listFilesTool, readTextFileTool } from "./builtins/files";
import { openAppTool } from "./builtins/apps";
import { openUrlTool } from "./builtins/web";

export const toolRegistry = {
  get_time: getTimeTool,
  list_files: listFilesTool,
  read_text_file: readTextFileTool,
  open_app: openAppTool,
  open_url: openUrlTool,
} satisfies Record<string, ToolDefinition<any, any>>;

export type ToolName = keyof typeof toolRegistry;

export function getTool(name: string) {
  return toolRegistry[name as ToolName] ?? null;
}