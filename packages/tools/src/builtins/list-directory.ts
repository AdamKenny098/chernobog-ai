import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { z } from "zod";
import { ToolDefinition } from "../types";

const listDirectoryInputSchema = z.object({
  path: z.string().optional(),
  baseLocation: z.enum(["desktop", "downloads", "documents"]).optional(),
  maxResults: z.number().int().min(1).max(100).optional(),
});

type ListDirectoryInput = z.infer<typeof listDirectoryInputSchema>;

type DirectoryEntry = {
  name: string;
  path: string;
  kind: "file" | "folder" | "other";
};

type ListDirectoryOutput = {
  success: boolean;
  directoryPath: string;
  entries: DirectoryEntry[];
  count: number;
  message: string;
};

function resolveKnownBaseLocation(baseLocation: ListDirectoryInput["baseLocation"]) {
  if (!baseLocation) return undefined;

  const home = os.homedir();

  switch (baseLocation) {
    case "desktop":
      return path.join(home, "Desktop");
    case "downloads":
      return path.join(home, "Downloads");
    case "documents":
      return path.join(home, "Documents");
    default:
      return undefined;
  }
}

function resolveDirectoryPath(input: ListDirectoryInput) {
  const knownBase = resolveKnownBaseLocation(input.baseLocation);

  if (knownBase) {
    return knownBase;
  }

  if (input.path?.trim()) {
    return path.resolve(input.path);
  }

  return path.join(os.homedir(), "Documents");
}

export const listDirectoryTool: ToolDefinition<ListDirectoryInput, ListDirectoryOutput> = {
  name: "list_directory",
  description: "List files and folders in a directory",
  inputSchema: listDirectoryInputSchema,
  execute: async (input) => {
    const directoryPath = resolveDirectoryPath(input);
    const stats = await fs.stat(directoryPath);

    if (!stats.isDirectory()) {
      throw new Error("Target path is not a directory.");
    }

    const maxResults = input.maxResults ?? 50;
    const entries = await fs.readdir(directoryPath, {
      withFileTypes: true,
    });

    const mappedEntries = entries.slice(0, maxResults).map((entry) => {
      const entryPath = path.join(directoryPath, entry.name);

      return {
        name: entry.name,
        path: entryPath,
        kind: entry.isDirectory() ? "folder" : entry.isFile() ? "file" : "other",
      } satisfies DirectoryEntry;
    });

    return {
      success: true,
      directoryPath,
      entries: mappedEntries,
      count: mappedEntries.length,
      message: `Listed ${mappedEntries.length} entries in: ${directoryPath}`,
    };
  },
};