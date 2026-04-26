import { getTimeTool } from "./builtins/time";
import {
  listFilesTool,
  readTextFileTool,
  openFileTool,
  openFolderTool,
} from "./builtins/files";
import { openAppTool } from "./builtins/apps";
import { openUrlTool } from "./builtins/web";
import { findFilesTool } from "./builtins/search";

export const toolRegistry = {
  get_time: getTimeTool,
  list_files: listFilesTool,
  read_text_file: readTextFileTool,
  open_file: openFileTool,
  open_folder: openFolderTool,
  open_app: openAppTool,
  open_url: openUrlTool,
  find_files: findFilesTool,
};

export type ToolName = keyof typeof toolRegistry;

export function getTool(name: string) {
  return toolRegistry[name as ToolName];
}