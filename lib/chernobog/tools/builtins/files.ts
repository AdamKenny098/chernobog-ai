import fs from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import { z } from "zod";
import { ToolDefinition } from "../types";
import {
  ensureAllowedPath,
  getNormalizedExtension,
  isReadableTextPath,
} from "../fs-policy";

const DEFAULT_MAX_CHARS = 12000;
const MAX_FILE_BYTES = 2 * 1024 * 1024;

const listFilesInputSchema = z.object({
  path: z.string().min(1),
});

const readTextFileInputSchema = z.object({
  path: z.string().min(1),
  maxChars: z.number().int().positive().max(50000).optional(),
});

const openFileInputSchema = z.object({
  path: z.string().min(1),
});

const openFolderInputSchema = z.object({
  path: z.string().min(1),
});

type ListFilesInput = z.infer<typeof listFilesInputSchema>;
type ReadTextFileInput = z.infer<typeof readTextFileInputSchema>;
type OpenFileInput = z.infer<typeof openFileInputSchema>;
type OpenFolderInput = z.infer<typeof openFolderInputSchema>;

function openPath(targetPath: string, platform: NodeJS.Platform): Promise<void> {
  return new Promise((resolve, reject) => {
    let child;

    if (platform === "win32") {
      child = spawn("cmd", ["/c", "start", "", targetPath], {
        detached: true,
        stdio: "ignore",
      });
    } else if (platform === "darwin") {
      child = spawn("open", [targetPath], {
        detached: true,
        stdio: "ignore",
      });
    } else if (platform === "linux") {
      child = spawn("xdg-open", [targetPath], {
        detached: true,
        stdio: "ignore",
      });
    } else {
      reject(new Error(`Unsupported platform: ${platform}`));
      return;
    }

    child.on("error", reject);
    child.unref();
    resolve();
  });
}

export const listFilesTool: ToolDefinition<
  ListFilesInput,
  {
    path: string;
    entries: {
      name: string;
      type: "file" | "directory";
    }[];
  }
> = {
  name: "list_files",
  description: "List files and folders within an allowed directory",
  inputSchema: listFilesInputSchema,
  execute: async (input) => {
    const safePath = ensureAllowedPath(input.path);
    const stat = await fs.stat(safePath);

    if (!stat.isDirectory()) {
      throw new Error("Target path is not a directory");
    }

    const dirents = await fs.readdir(safePath, { withFileTypes: true });

    const entries: { name: string; type: "file" | "directory" }[] = dirents
    .map((dirent) => ({
      name: dirent.name,
      type: (dirent.isDirectory() ? "directory" : "file") as "directory" | "file",
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

export const readTextFileTool: ToolDefinition<
  ReadTextFileInput,
  {
    path: string;
    content: string;
    truncated: boolean;
    extension: string;
  }
> = {
  name: "read_text_file",
  description: "Read a safe text file from an allowed path",
  inputSchema: readTextFileInputSchema,
  execute: async (input) => {
    const safePath = ensureAllowedPath(input.path);
    const extension = getNormalizedExtension(safePath);

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

export const openFileTool: ToolDefinition<
  OpenFileInput,
  {
    success: boolean;
    path: string;
    message: string;
  }
> = {
  name: "open_file",
  description: "Open a safe file with the system default application",
  inputSchema: openFileInputSchema,
  execute: async (input, context) => {
    const safePath = ensureAllowedPath(input.path);
    const stat = await fs.stat(safePath);

    if (!stat.isFile()) {
      throw new Error("Target path is not a file");
    }

    const platform = context?.platform ?? process.platform;
    await openPath(safePath, platform);

    return {
      success: true,
      path: safePath,
      message: `Opened file ${safePath}`,
    };
  },
};

export const openFolderTool: ToolDefinition<
  OpenFolderInput,
  {
    success: boolean;
    path: string;
    message: string;
  }
> = {
  name: "open_folder",
  description: "Open a safe folder in the system file manager",
  inputSchema: openFolderInputSchema,
  execute: async (input, context) => {
    const safePath = ensureAllowedPath(input.path);
    const stat = await fs.stat(safePath);

    if (!stat.isDirectory()) {
      throw new Error("Target path is not a directory");
    }

    const platform = context?.platform ?? process.platform;
    await openPath(safePath, platform);

    return {
      success: true,
      path: safePath,
      message: `Opened folder ${safePath}`,
    };
  },
};