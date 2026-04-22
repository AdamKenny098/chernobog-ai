import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { ToolDefinition } from "../types";
import {
  ensureAllowedPath,
  getNormalizedExtension,
  isReadableTextPath,
} from "../fs-policy"

const MAX_FILE_BYTES = 1024 * 1024;
const DEFAULT_MAX_CHARS = 12000;

const listFilesInputSchema = z.object({
  path: z.string().min(1),
});

type ListFilesInput = z.infer<typeof listFilesInputSchema>;

type ListFilesOutput = {
  path: string;
  entries: {
    name: string;
    type: "file" | "directory";
  }[];
};

export const listFilesTool: ToolDefinition<ListFilesInput, ListFilesOutput> = {
  name: "list_files",
  description: "List files and folders in an allowed directory",
  inputSchema: listFilesInputSchema,
  execute: async (input) => {
    const safePath = ensureAllowedPath(input.path);
    const stat = await fs.stat(safePath);

    if (!stat.isDirectory()) {
      throw new Error("Target path is not a directory");
    }

    const dirents = await fs.readdir(safePath, { withFileTypes: true });

    const entries = dirents
      .filter((entry) => !entry.name.startsWith("."))
      .map((entry) => ({
        name: entry.name,
        type: entry.isDirectory() ? ("directory" as const) : ("file" as const),
      }))
      .sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === "directory" ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });

    return {
      path: safePath,
      entries,
    };
  },
};

const readTextFileInputSchema = z.object({
  path: z.string().min(1),
  maxChars: z.number().int().positive().max(50000).optional(),
});

type ReadTextFileInput = z.infer<typeof readTextFileInputSchema>;

type ReadTextFileOutput = {
  path: string;
  content: string;
  truncated: boolean;
  extension: string;
};

export const readTextFileTool: ToolDefinition<
  ReadTextFileInput,
  ReadTextFileOutput
> = {
  name: "read_text_file",
  description: "Read a safe text file from an allowed location",
  inputSchema: readTextFileInputSchema,
  execute: async (input) => {
    const safePath = ensureAllowedPath(input.path);
    const extension = getNormalizedExtension(safePath).toLowerCase();

    if (!isReadableTextPath(safePath)) {
      throw new Error(`File type not allowed: ${extension || "(no extension)"}`);
    }

    const stat = await fs.stat(safePath);

    if (!stat.isFile()) {
      throw new Error("Target path is not a file");
    }

    if (stat.size > MAX_FILE_BYTES) {
      throw new Error("File is too large to read safely");
    }

    const raw = await fs.readFile(safePath, "utf8");
    const maxChars = input.maxChars ?? DEFAULT_MAX_CHARS;
    const truncated = raw.length > maxChars;
    const content = truncated ? raw.slice(0, maxChars) : raw;

    return {
      path: safePath,
      content,
      truncated,
      extension,
    };
  },
};