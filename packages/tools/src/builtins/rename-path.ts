import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { ToolDefinition } from "../types";

const renamePathInputSchema = z.object({
  currentPath: z.string().min(1),
  newName: z.string().min(1),
});

type RenamePathInput = z.infer<typeof renamePathInputSchema>;

type RenamePathOutput = {
  success: boolean;
  oldPath: string;
  newPath: string;
  kind: "file" | "folder";
  message: string;
};

function sanitizeName(name: string) {
  return name.trim().replace(/[<>:"/\\|?*]/g, "").replace(/\s+/g, " ");
}

async function getPathKind(targetPath: string): Promise<"file" | "folder"> {
  const stats = await fs.stat(targetPath);

  if (stats.isDirectory()) return "folder";
  if (stats.isFile()) return "file";

  throw new Error("Target is not a regular file or folder.");
}

function buildRenamedPath(currentPath: string, newName: string, kind: "file" | "folder") {
  const safeName = sanitizeName(newName);

  if (!safeName) {
    throw new Error("New name is empty after sanitization.");
  }

  const parentDir = path.dirname(currentPath);
  const currentExt = path.extname(currentPath);
  const newExt = path.extname(safeName);

  if (kind === "file" && !newExt && currentExt) {
    return path.join(parentDir, `${safeName}${currentExt}`);
  }

  return path.join(parentDir, safeName);
}

export const renamePathTool: ToolDefinition<RenamePathInput, RenamePathOutput> = {
  name: "rename_path",
  description: "Rename an existing file or folder",
  inputSchema: renamePathInputSchema,
  execute: async (input) => {
    const currentPath = path.resolve(input.currentPath);
    const kind = await getPathKind(currentPath);
    const newPath = buildRenamedPath(currentPath, input.newName, kind);

    if (currentPath === newPath) {
      throw new Error("New path is the same as the current path.");
    }

    try {
      await fs.access(newPath);
      throw new Error(`Target already exists: ${newPath}`);
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "ENOENT"
      ) {
        // Destination does not exist. Good.
      } else {
        throw error;
      }
    }

    await fs.rename(currentPath, newPath);

    return {
      success: true,
      oldPath: currentPath,
      newPath,
      kind,
      message: `Renamed ${kind}: ${currentPath} -> ${newPath}`,
    };
  },
};