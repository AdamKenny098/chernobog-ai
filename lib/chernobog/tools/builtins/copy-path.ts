import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { z } from "zod";
import { ToolDefinition } from "../types";

const copyPathInputSchema = z.object({
  sourcePath: z.string().min(1),
  baseLocation: z.enum(["desktop", "downloads", "documents"]).optional(),
});

type CopyPathInput = z.infer<typeof copyPathInputSchema>;

type CopyPathOutput = {
  success: boolean;
  sourcePath: string;
  copiedPath: string;
  kind: "file" | "folder";
  message: string;
};

function resolveKnownBaseLocation(baseLocation: CopyPathInput["baseLocation"]) {
  const home = os.homedir();

  switch (baseLocation) {
    case "desktop":
      return path.join(home, "Desktop");
    case "downloads":
      return path.join(home, "Downloads");
    case "documents":
    default:
      return path.join(home, "Documents");
  }
}

async function getPathKind(targetPath: string): Promise<"file" | "folder"> {
  const stats = await fs.stat(targetPath);

  if (stats.isDirectory()) return "folder";
  if (stats.isFile()) return "file";

  throw new Error("Target is not a regular file or folder.");
}

async function buildAvailableCopyPath(destinationDir: string, sourcePath: string) {
  const parsed = path.parse(sourcePath);
  let candidate = path.join(destinationDir, `${parsed.name} copy${parsed.ext}`);

  for (let i = 2; i <= 99; i++) {
    try {
      await fs.access(candidate);
      candidate = path.join(destinationDir, `${parsed.name} copy ${i}${parsed.ext}`);
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "ENOENT"
      ) {
        return candidate;
      }

      throw error;
    }
  }

  throw new Error("Could not find an available copy name.");
}

export const copyPathTool: ToolDefinition<CopyPathInput, CopyPathOutput> = {
  name: "copy_path",
  description: "Copy a file or folder to a whitelisted user directory",
  inputSchema: copyPathInputSchema,
  execute: async (input) => {
    const sourcePath = path.resolve(input.sourcePath);
    const kind = await getPathKind(sourcePath);
    const destinationDir = resolveKnownBaseLocation(input.baseLocation);
    const copiedPath = await buildAvailableCopyPath(destinationDir, sourcePath);

    await fs.cp(sourcePath, copiedPath, {
      recursive: kind === "folder",
      errorOnExist: true,
      force: false,
    });

    return {
      success: true,
      sourcePath,
      copiedPath,
      kind,
      message: `Copied ${kind}: ${sourcePath} -> ${copiedPath}`,
    };
  },
};