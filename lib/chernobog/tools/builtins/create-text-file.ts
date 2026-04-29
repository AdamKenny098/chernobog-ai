import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { z } from "zod";
import { ToolDefinition } from "../types";

const createTextFileInputSchema = z.object({
  fileName: z.string().min(1),
  content: z.string().optional(),
  basePath: z.string().optional(),
  baseLocation: z.enum(["desktop", "downloads", "documents"]).optional(),
});

type CreateTextFileInput = z.infer<typeof createTextFileInputSchema>;

type CreateTextFileOutput = {
  success: boolean;
  filePath: string;
  message: string;
};

function sanitizeFileName(fileName: string) {
  return fileName
    .trim()
    .replace(/[<>:"/\\|?*]/g, "")
    .replace(/\s+/g, " ");
}

function ensureTextExtension(fileName: string) {
  const ext = path.extname(fileName);

  if (ext.length > 0) {
    return fileName;
  }

  return `${fileName}.txt`;
}

function getDefaultBasePath() {
  return path.join(os.homedir(), "Documents");
}

function resolveKnownBaseLocation(baseLocation: CreateTextFileInput["baseLocation"]) {
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

function resolveTargetFilePath(input: CreateTextFileInput) {
  const safeFileName = ensureTextExtension(sanitizeFileName(input.fileName));

  if (!safeFileName) {
    throw new Error("File name is empty after sanitization.");
  }

  const knownBaseLocation = resolveKnownBaseLocation(input.baseLocation);

  const basePath = knownBaseLocation
    ? knownBaseLocation
    : input.basePath?.trim()
      ? path.resolve(input.basePath)
      : getDefaultBasePath();

  return path.join(basePath, safeFileName);
}

export const createTextFileTool: ToolDefinition<CreateTextFileInput, CreateTextFileOutput> = {
  name: "create_text_file",
  description: "Create a new text file in a safe base directory",
  inputSchema: createTextFileInputSchema,
  execute: async (input) => {
    const filePath = resolveTargetFilePath(input);
  
    try {
      await fs.writeFile(filePath, input.content ?? "", {
        encoding: "utf8",
        flag: "wx",
      });
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "EEXIST"
      ) {
        throw new Error(`File already exists: ${filePath}`);
      }
  
      throw error;
    }
  
    return {
      success: true,
      filePath,
      message: `Created text file: ${filePath}`,
    };
  },
};