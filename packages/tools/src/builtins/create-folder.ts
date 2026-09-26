import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { z } from "zod";
import { ToolDefinition } from "../types";

const createFolderInputSchema = z.object({
    folderName: z.string().min(1),
    basePath: z.string().optional(),
    baseLocation: z.enum(["desktop", "downloads", "documents"]).optional(),
  });

type CreateFolderInput = z.infer<typeof createFolderInputSchema>;

type CreateFolderOutput = {
  success: boolean;
  folderPath: string;
  message: string;
};

function sanitizeFolderName(folderName: string) {
  return folderName
    .trim()
    .replace(/[<>:"/\\|?*]/g, "")
    .replace(/\s+/g, " ");
}

function getDefaultBasePath() {
  return path.join(os.homedir(), "Documents");
}

function resolveTargetFolderPath(input: CreateFolderInput) {
    const safeFolderName = sanitizeFolderName(input.folderName);
  
    if (!safeFolderName) {
      throw new Error("Folder name is empty after sanitization.");
    }
  
    const knownBaseLocation = resolveKnownBaseLocation(input.baseLocation);
  
    const basePath = knownBaseLocation
      ? knownBaseLocation
      : input.basePath?.trim()
        ? path.resolve(input.basePath)
        : getDefaultBasePath();
  
    return path.join(basePath, safeFolderName);
  }

function resolveKnownBaseLocation(baseLocation: CreateFolderInput["baseLocation"]) {
    if (!baseLocation) {
      return undefined;
    }
  
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

export const createFolderTool: ToolDefinition<CreateFolderInput, CreateFolderOutput> = {
  name: "create_folder",
  description: "Create a new folder in a safe base directory",
  inputSchema: createFolderInputSchema,
  execute: async (input) => {
    const folderPath = resolveTargetFolderPath(input);

    await fs.mkdir(folderPath, {
      recursive: false,
    });

    return {
      success: true,
      folderPath,
      message: `Created folder: ${folderPath}`,
    };
  },
};