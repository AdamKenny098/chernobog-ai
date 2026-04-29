// lib/chernobog/execution/defaultExecutionHandlers.ts

import path from "node:path";
import { ExecutionActionHandler } from "./runExecutionTask";
import { createToolExecutionHandlers } from "./toolExecutionHandlers";

export function createDefaultExecutionHandlers(): Record<string, ExecutionActionHandler> {
  return {
    ...createToolExecutionHandlers({
      inputMappers: {
        read_text_file(_input, context) {
          return {
            path: context.selectedFilePath,
          };
        },
        
        open_file(input, context) {
          if (
            input &&
            typeof input === "object" &&
            "path" in input &&
            typeof input.path === "string"
          ) {
            return input;
          }
        
          return {
            path: context.selectedFilePath,
          };
        },
        
        open_folder(input, context) {
          if (
            input &&
            typeof input === "object" &&
            "path" in input &&
            typeof input.path === "string" &&
            input.path.length > 0
          ) {
            return {
              path: input.path,
            };
          }
        
          const selectedFolderPath = context.selectedFolderPath;
          const selectedFilePath = context.selectedFilePath;
        
          if (typeof selectedFolderPath === "string" && selectedFolderPath.length > 0) {
            return {
              path: selectedFolderPath,
            };
          }
        
          if (typeof selectedFilePath === "string" && selectedFilePath.length > 0) {
            return {
              path: path.dirname(selectedFilePath),
            };
          }
        
          return {
            path: undefined,
          };
        },
        
        open_app(input) {
          return input;
        },
        
        create_folder(input) {
          return input;
        },
        
        create_text_file(input) {
          return input;
        },
        
        append_text_file(input, context) {
          if (
            input &&
            typeof input === "object" &&
            "path" in input &&
            typeof input.path === "string"
          ) {
            return input;
          }
        
          if (
            input &&
            typeof input === "object" &&
            "text" in input &&
            typeof input.text === "string" &&
            typeof context.selectedFilePath === "string"
          ) {
            return {
              path: context.selectedFilePath,
              text: input.text,
              newlineBefore: true,
            };
          }
        
          return input;
        },

        rename_path(input) {
          return input;
        },
        
        list_directory(input, context) {
          if (
            input &&
            typeof input === "object" &&
            "path" in input &&
            typeof input.path === "string"
          ) {
            return input;
          }
        
          if (
            input &&
            typeof input === "object" &&
            "baseLocation" in input
          ) {
            return input;
          }
        
          if (typeof context.selectedFolderPath === "string") {
            return {
              path: context.selectedFolderPath,
              maxResults: 50,
            };
          }
        
          if (typeof context.selectedFilePath === "string") {
            return {
              path: path.dirname(context.selectedFilePath),
              maxResults: 50,
            };
          }
        
          return input;
        },
        
        get_path_info(input, context) {
          if (
            input &&
            typeof input === "object" &&
            "path" in input &&
            typeof input.path === "string"
          ) {
            return input;
          }
        
          return {
            path: context.selectedFilePath ?? context.selectedFolderPath,
          };
        },
        
        copy_path(input) {
          return input;
        },
        
        move_path(input) {
          return input;
        },
        
        open_url(input) {
          return input;
        },
      },
    }),
  };
}