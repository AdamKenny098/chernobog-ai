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
import { createFolderTool } from "./builtins/create-folder";
import { createTextFileTool } from "./builtins/create-text-file";
import { appendTextFileTool } from "./builtins/append-text-file";
import { renamePathTool } from "./builtins/rename-path";
import { listDirectoryTool } from "./builtins/list-directory";
import { getPathInfoTool } from "./builtins/get-path-info";
import { copyPathTool } from "./builtins/copy-path";
import { movePathTool } from "./builtins/move-path";

export const toolRegistry = {
  get_time: getTimeTool,
  list_files: listFilesTool,
  read_text_file: readTextFileTool,
  open_file: openFileTool,
  open_folder: openFolderTool,
  open_app: openAppTool,
  open_url: openUrlTool,
  find_files: findFilesTool,
  create_folder:createFolderTool,
  create_text_file:createTextFileTool,
  append_text_file:appendTextFileTool,
  rename_path:renamePathTool,
  list_directory:listDirectoryTool,
  get_path_info:getPathInfoTool,
  copy_path:copyPathTool,
  move_path:movePathTool,

};

export type ToolName = keyof typeof toolRegistry;

export function getTool(name: string) {
  return toolRegistry[name as ToolName];
}