// lib/chernobog/execution/demoHandlers.ts

import {
  ExecutionActionHandler,
} from "./runExecutionTask";

export const demoExecutionHandlers: Record<string, ExecutionActionHandler> = {
  async find_files(step) {
    const input = step.input as { query?: string } | undefined;
    const query = input?.query ?? "unknown";

    return {
      success: true,
      output: [
        {
          name: `${query}.md`,
          path: `C:/Mock/${query}.md`,
        },
      ],
      context: {
        searchResults: [
          {
            name: `${query}.md`,
            path: `C:/Mock/${query}.md`,
          },
        ],
        selectedFilePath: `C:/Mock/${query}.md`,
      },
    };
  },

  async read_text_file(_step, task) {
    const selectedFilePath = task.context.selectedFilePath;

    if (typeof selectedFilePath !== "string") {
      return {
        success: false,
        error: "No selected file path found in task context.",
      };
    }

    return {
      success: true,
      output: `Mock contents from ${selectedFilePath}`,
      context: {
        lastReadFilePath: selectedFilePath,
        lastReadText: `Mock contents from ${selectedFilePath}`,
      },
    };
  },

  async "model.summarize"(_step, task) {
    const lastReadText = task.context.lastReadText;

    if (typeof lastReadText !== "string") {
      return {
        success: false,
        error: "No readable text found to summarize.",
      };
    }

    return {
      success: true,
      output: `Summary: ${lastReadText}`,
      context: {
        summary: `Summary: ${lastReadText}`,
      },
    };
  },
};