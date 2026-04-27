// lib/chernobog/execution/defaultExecutionHandlers.ts

import path from "node:path";
import { ExecutionActionHandler } from "./runExecutionTask";
import { createToolExecutionHandlers } from "./toolExecutionHandlers";

export function createDefaultExecutionHandlers(): Record<string, ExecutionActionHandler> {
  return createToolExecutionHandlers({
    inputMappers: {
      read_text_file(_input, context) {
        return {
          path: context.selectedFilePath,
        };
      },

      open_file(_input, context) {
        return {
          path: context.selectedFilePath,
        };
      },

      open_folder(_input, context) {
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
    },
  });
}