// lib/chernobog/execution/toolExecutionHandlers.ts

import { executeTool } from "../tools/executor";
import { ExecutionActionHandler } from "./runExecutionTask";

type ToolHandlerMapOptions = {
  /**
   * Optional mapper for actions whose execution step input differs
   * from the real tool input shape.
   */
  inputMappers?: Record<
    string,
    (input: unknown, taskContext: Record<string, unknown>) => unknown
  >;
};

function getFirstSearchResultPath(data: unknown): string | null {
    if (Array.isArray(data)) {
      const first = data[0];
  
      if (
        first &&
        typeof first === "object" &&
        "path" in first &&
        typeof first.path === "string"
      ) {
        return first.path;
      }
  
      return null;
    }
  
    if (
      data &&
      typeof data === "object" &&
      "matches" in data &&
      Array.isArray(data.matches)
    ) {
      const first = data.matches[0];
  
      if (
        first &&
        typeof first === "object" &&
        "path" in first &&
        typeof first.path === "string"
      ) {
        return first.path;
      }
    }
  
    return null;
  }

function getPathFromInput(input: unknown): string | undefined {
  if (
    input &&
    typeof input === "object" &&
    "path" in input &&
    typeof input.path === "string"
  ) {
    return input.path;
  }

  return undefined;
}

function extractReadableText(data: unknown): string | null {
    if (typeof data === "string") {
      return data;
    }
  
    if (!data || typeof data !== "object") {
      return null;
    }
  
    const possibleKeys = ["text", "content", "contents", "body", "data"];
  
    for (const key of possibleKeys) {
      if (
        key in data &&
        typeof data[key as keyof typeof data] === "string"
      ) {
        return data[key as keyof typeof data] as string;
      }
    }
  
    return null;
  }

export function createToolExecutionHandlers(
  options: ToolHandlerMapOptions = {}
): Record<string, ExecutionActionHandler> {
  const inputMappers = options.inputMappers ?? {};

  return {
    async find_files(step, task) {
        const mappedInput = inputMappers.find_files
          ? inputMappers.find_files(step.input, task.context)
          : step.input;
      
        const result = await executeTool("find_files", mappedInput);
      
        if (!result.ok) {
          return {
            success: false,
            error: result.error || "find_files failed.",
          };
        }
      
        const selectedFilePath = getFirstSearchResultPath(result.data);
      
        if (!selectedFilePath) {
          return {
            success: false,
            error: "Search completed, but no readable file path was found in the results.",
            output: result.data,
            context: {
              searchResults: result.data,
            },
          };
        }
      
        return {
          success: true,
          output: result.data,
          context: {
            searchResults: result.data,
            selectedFilePath,
          },
        };
      },

      async read_text_file(step, task) {
        const mappedInput = inputMappers.read_text_file
          ? inputMappers.read_text_file(step.input, task.context)
          : step.input;
      
        const finalInput =
          mappedInput && typeof mappedInput === "object"
            ? mappedInput
            : {
                path: task.context.selectedFilePath,
              };
      
        const result = await executeTool("read_text_file", finalInput);
      
        if (!result.ok) {
          return {
            success: false,
            error: result.error || "read_text_file failed.",
          };
        }
      
        const readableText = extractReadableText(result.data);
      
        return {
          success: true,
          output: result.data,
          context: {
            lastReadFilePath: getPathFromInput(finalInput) ?? task.context.selectedFilePath,
            lastReadText: readableText ?? result.data,
          },
        };
      },

    async open_file(step, task) {
      const mappedInput = inputMappers.open_file
        ? inputMappers.open_file(step.input, task.context)
        : step.input;

      const finalInput =
        mappedInput && typeof mappedInput === "object"
          ? mappedInput
          : {
              path: task.context.selectedFilePath,
            };

      const result = await executeTool("open_file", finalInput);

      if (!result.ok) {
        return {
          success: false,
          error: result.error || "open_file failed.",
        };
      }

      return {
        success: true,
        output: result.data,
        context: {
          openedFile: finalInput,
        },
      };
    },

    async open_folder(step, task) {
      const mappedInput = inputMappers.open_folder
        ? inputMappers.open_folder(step.input, task.context)
        : step.input;

      const finalInput =
        mappedInput && typeof mappedInput === "object"
          ? mappedInput
          : {
              path: task.context.selectedFolderPath ?? task.context.selectedFilePath,
            };

      const result = await executeTool("open_folder", finalInput);

      if (!result.ok) {
        return {
          success: false,
          error: result.error || "open_folder failed.",
        };
      }

      return {
        success: true,
        output: result.data,
        context: {
          openedFolder: finalInput,
        },
      };
    },
  };
}