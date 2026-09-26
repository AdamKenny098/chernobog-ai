import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { z } from "zod";
import { ToolDefinition } from "../types";

const movePathInputSchema = z.object({
  sourcePath: z.string().min(1),
  baseLocation: z.enum(["desktop", "downloads", "documents"]),
});

type MovePathInput = z.infer<typeof movePathInputSchema>;

type MovePathOutput = {
  success: boolean;
  oldPath: string;
  newPath: string;
  kind: "file" | "folder";
  message: string;
};

function resolveKnownBaseLocation(baseLocation: MovePathInput["baseLocation"]) {
  const home = os.homedir();

  switch (baseLocation) {
    case "desktop":
      return path.join(home, "Desktop");
    case "downloads":
      return path.join(home, "Downloads");
    case "documents":
      return path.join(home, "Documents");
  }
}

async function getPathKind(targetPath: string): Promise<"file" | "folder"> {
  const stats = await fs.stat(targetPath);

  if (stats.isDirectory()) return "folder";
  if (stats.isFile()) return "file";

  throw new Error("Target is not a regular file or folder.");
}

async function assertDestinationAvailable(destinationPath: string) {
  try {
    await fs.access(destinationPath);
    throw new Error(`Destination already exists: ${destinationPath}`);
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return;
    }

    throw error;
  }
}

export const movePathTool: ToolDefinition<MovePathInput, MovePathOutput> = {
  name: "move_path",
  description: "Move a file or folder to a whitelisted user directory",
  inputSchema: movePathInputSchema,
  execute: async (input) => {
    const sourcePath = path.resolve(input.sourcePath);
    const kind = await getPathKind(sourcePath);
    const destinationDir = resolveKnownBaseLocation(input.baseLocation);
    const newPath = path.join(destinationDir, path.basename(sourcePath));

    if (sourcePath === newPath) {
      throw new Error("Source and destination are the same.");
    }

    await assertDestinationAvailable(newPath);
    await fs.rename(sourcePath, newPath);

    return {
      success: true,
      oldPath: sourcePath,
      newPath,
      kind,
      message: `Moved ${kind}: ${sourcePath} -> ${newPath}`,
    };
  },
};