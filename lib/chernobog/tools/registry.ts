import { getTimeTool } from "@chernobog/tools/builtins/time";
import {
  listFilesTool,
  readTextFileTool,
  openFileTool,
  openFolderTool,
} from "@chernobog/tools/builtins/files";
import { openAppTool } from "@chernobog/tools/builtins/apps";
import { openUrlTool } from "@chernobog/tools/builtins/web";
import { findFilesTool } from "@chernobog/tools/builtins/search";
import { createFolderTool } from "@chernobog/tools/builtins/create-folder";
import { createTextFileTool } from "@chernobog/tools/builtins/create-text-file";
import { appendTextFileTool } from "@chernobog/tools/builtins/append-text-file";
import { renamePathTool } from "@chernobog/tools/builtins/rename-path";
import { listDirectoryTool } from "@chernobog/tools/builtins/list-directory";
import { getPathInfoTool } from "@chernobog/tools/builtins/get-path-info";
import { copyPathTool } from "@chernobog/tools/builtins/copy-path";
import { movePathTool } from "@chernobog/tools/builtins/move-path";
import { writeProjectFileTool } from "@chernobog/tools/builtins/write-project-file";
import { runProjectCommandTool } from "@chernobog/tools/builtins/run-project-command";
import { readProjectNoteTool } from "@chernobog/tools/builtins/read-project-note";
import { searchProjectNotesTool } from "@chernobog/tools/builtins/search-project-notes";
import { buildModuleToolRegistry } from "@/lib/modules/registry";
import { getProjectGitStateTool } from "@chernobog/tools/builtins/get-project-git-state";

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
  write_project_file:writeProjectFileTool,
  run_project_command:runProjectCommandTool,
  read_project_note:readProjectNoteTool,
  search_project_notes:searchProjectNotesTool,
  get_project_git_state:getProjectGitStateTool,
  ...buildModuleToolRegistry(),
};

export type ToolName = keyof typeof toolRegistry;

export function getTool(name: string) {
  return toolRegistry[name as ToolName];
}