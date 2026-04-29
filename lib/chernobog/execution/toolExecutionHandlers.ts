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

    async open_app(step, task) {
        const mappedInput = inputMappers.open_app
          ? inputMappers.open_app(step.input, task.context)
          : step.input;
      
        const result = await executeTool("open_app", mappedInput);
      
        if (!result.ok) {
          return {
            success: false,
            error: result.error || "open_app failed.",
          };
        }
      
        return {
          success: true,
          output: result.data,
          context: {
            openedApp: mappedInput,
          },
        };
      },

      async create_folder(step, task) {
        const mappedInput = inputMappers.create_folder
          ? inputMappers.create_folder(step.input, task.context)
          : step.input;
      
        const result = await executeTool("create_folder", mappedInput);
      
        if (!result.ok) {
          return {
            success: false,
            error: result.error || "append_text_file failed.",
          };
        }
      
        return {
          success: true,
          output: result.data,
          context: {
            createdFolder: result.data,
            createdFolderPath:
              result.data &&
              typeof result.data === "object" &&
              "folderPath" in result.data &&
              typeof result.data.folderPath === "string"
                ? result.data.folderPath
                : undefined,
            selectedFolderPath:
              result.data &&
              typeof result.data === "object" &&
              "folderPath" in result.data &&
              typeof result.data.folderPath === "string"
                ? result.data.folderPath
                : undefined,
          },
        };
      },

      async create_text_file(step, task) {
        const mappedInput = inputMappers.create_text_file
          ? inputMappers.create_text_file(step.input, task.context)
          : step.input;
      
        const result = await executeTool("create_text_file", mappedInput);
      
        if (!result.ok) {
          return {
            success: false,
            error: result.error || "create_text_file failed.",
          };
        }
      
        return {
          success: true,
          output: result.data,
          context: {
            createdTextFile: result.data,
            createdFilePath:
              result.data &&
              typeof result.data === "object" &&
              "filePath" in result.data &&
              typeof result.data.filePath === "string"
                ? result.data.filePath
                : undefined,
            selectedFilePath:
              result.data &&
              typeof result.data === "object" &&
              "filePath" in result.data &&
              typeof result.data.filePath === "string"
                ? result.data.filePath
                : undefined,
          },
        };
      },

      async append_text_file(step, task) {
        const mappedInput = inputMappers.append_text_file
          ? inputMappers.append_text_file(step.input, task.context)
          : step.input;
      
        const result = await executeTool("append_text_file", mappedInput);
      
        if (!result.ok) {
          return {
            success: false,
            error: result.error || "append_text_file failed.",
          };
        }
      
        return {
          success: true,
          output: result.data,
          context: {
            appendedTextFile: result.data,
            appendedFilePath:
              result.data &&
              typeof result.data === "object" &&
              "filePath" in result.data &&
              typeof result.data.filePath === "string"
                ? result.data.filePath
                : undefined,
            selectedFilePath:
              result.data &&
              typeof result.data === "object" &&
              "filePath" in result.data &&
              typeof result.data.filePath === "string"
                ? result.data.filePath
                : task.context.selectedFilePath,
          },
        };
      },

      async rename_path(step, task) {
        const mappedInput = inputMappers.rename_path
          ? inputMappers.rename_path(step.input, task.context)
          : step.input;
      
        const result = await executeTool("rename_path", mappedInput);
      
        if (!result.ok) {
          return {
            success: false,
            error: result.error || "rename_path failed.",
          };
        }
      
        const newPath =
          result.data &&
          typeof result.data === "object" &&
          "newPath" in result.data &&
          typeof result.data.newPath === "string"
            ? result.data.newPath
            : undefined;
      
        const kind =
          result.data &&
          typeof result.data === "object" &&
          "kind" in result.data &&
          (result.data.kind === "file" || result.data.kind === "folder")
            ? result.data.kind
            : undefined;
      
        return {
          success: true,
          output: result.data,
          context: {
            renamedPath: result.data,
            renamedFrom:
              result.data &&
              typeof result.data === "object" &&
              "oldPath" in result.data &&
              typeof result.data.oldPath === "string"
                ? result.data.oldPath
                : undefined,
            renamedTo: newPath,
            ...(kind === "file" && newPath
              ? {
                  selectedFilePath: newPath,
                  lastRenamedFilePath: newPath,
                }
              : {}),
            ...(kind === "folder" && newPath
              ? {
                  selectedFolderPath: newPath,
                  lastRenamedFolderPath: newPath,
                }
              : {}),
          },
        };
      },

      async list_directory(step, task) {
        const mappedInput = inputMappers.list_directory
          ? inputMappers.list_directory(step.input, task.context)
          : step.input;
      
        const result = await executeTool("list_directory", mappedInput);
      
        if (!result.ok) {
          return {
            success: false,
            error: result.error || "list_directory failed.",
          };
        }
      
        const listing = result.data;
      
        let summary = "Directory listed.";
      
        if (
          listing &&
          typeof listing === "object" &&
          "directoryPath" in listing &&
          "entries" in listing &&
          Array.isArray(listing.entries)
        ) {
          const entries = listing.entries
            .slice(0, 25)
            .map((entry) => {
              if (
                entry &&
                typeof entry === "object" &&
                "kind" in entry &&
                "name" in entry
              ) {
                return `- [${String(entry.kind)}] ${String(entry.name)}`;
              }
      
              return null;
            })
            .filter(Boolean)
            .join("\n");
      
          summary = [
            `Directory: ${String(listing.directoryPath)}`,
            `Entries: ${String(listing.entries.length)}`,
            entries,
          ]
            .filter(Boolean)
            .join("\n");
        }
      
        return {
          success: true,
          output: summary,
          context: {
            listedDirectory: result.data,
            summary,
          },
        };
      },

      async get_path_info(step, task) {
        const mappedInput = inputMappers.get_path_info
          ? inputMappers.get_path_info(step.input, task.context)
          : step.input;
      
        const result = await executeTool("get_path_info", mappedInput);
      
        if (!result.ok) {
          return {
            success: false,
            error: result.error || "get_path_info failed.",
          };
        }
      
        const info = result.data;
      
        const summary =
          info &&
          typeof info === "object" &&
          "path" in info &&
          "kind" in info &&
          "sizeBytes" in info &&
          "modifiedAt" in info
            ? [
                "Path info:",
                `Path: ${String(info.path)}`,
                `Kind: ${String(info.kind)}`,
                `Size: ${String(info.sizeBytes)} bytes`,
                `Modified: ${String(info.modifiedAt)}`,
              ].join("\n")
            : "Path info retrieved.";
      
        return {
          success: true,
          output: summary,
          context: {
            pathInfo: result.data,
            summary,
          },
        };
      },

      async copy_path(step, task) {
        const mappedInput = inputMappers.copy_path
          ? inputMappers.copy_path(step.input, task.context)
          : step.input;
      
        const result = await executeTool("copy_path", mappedInput);
      
        if (!result.ok) {
          return {
            success: false,
            error: result.error || "copy_path failed.",
          };
        }
      
        const copiedPath =
          result.data &&
          typeof result.data === "object" &&
          "copiedPath" in result.data &&
          typeof result.data.copiedPath === "string"
            ? result.data.copiedPath
            : undefined;
      
        const kind =
          result.data &&
          typeof result.data === "object" &&
          "kind" in result.data &&
          (result.data.kind === "file" || result.data.kind === "folder")
            ? result.data.kind
            : undefined;
      
        return {
          success: true,
          output: result.data,
          context: {
            copiedPath: result.data,
            copiedTo: copiedPath,
            ...(kind === "file" && copiedPath
              ? {
                  selectedFilePath: copiedPath,
                  lastCopiedFilePath: copiedPath,
                }
              : {}),
            ...(kind === "folder" && copiedPath
              ? {
                  selectedFolderPath: copiedPath,
                  lastCopiedFolderPath: copiedPath,
                }
              : {}),
          },
        };
      },

      async move_path(step, task) {
        const mappedInput = inputMappers.move_path
          ? inputMappers.move_path(step.input, task.context)
          : step.input;
      
        const result = await executeTool("move_path", mappedInput);
      
        if (!result.ok) {
          return {
            success: false,
            error: result.error || "move_path failed.",
          };
        }
      
        const newPath =
          result.data &&
          typeof result.data === "object" &&
          "newPath" in result.data &&
          typeof result.data.newPath === "string"
            ? result.data.newPath
            : undefined;
      
        const kind =
          result.data &&
          typeof result.data === "object" &&
          "kind" in result.data &&
          (result.data.kind === "file" || result.data.kind === "folder")
            ? result.data.kind
            : undefined;
      
        return {
          success: true,
          output: result.data,
          context: {
            movedPath: result.data,
            movedTo: newPath,
            ...(kind === "file" && newPath
              ? {
                  selectedFilePath: newPath,
                  lastMovedFilePath: newPath,
                }
              : {}),
            ...(kind === "folder" && newPath
              ? {
                  selectedFolderPath: newPath,
                  lastMovedFolderPath: newPath,
                }
              : {}),
          },
        };
      },

      async open_url(step, task) {
        const mappedInput = inputMappers.open_url
          ? inputMappers.open_url(step.input, task.context)
          : step.input;
      
        const result = await executeTool("open_url", mappedInput);
      
        if (!result.ok) {
          return {
            success: false,
            error: result.error || "open_url failed.",
          };
        }
      
        return {
          success: true,
          output: result.data,
          context: {
            openedUrl: result.data,
          },
        };
      },
  };
}