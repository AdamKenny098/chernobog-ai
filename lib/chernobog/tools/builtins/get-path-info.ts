import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { ToolDefinition } from "../types";

const getPathInfoInputSchema = z.object({
  path: z.string().min(1),
});

type GetPathInfoInput = z.infer<typeof getPathInfoInputSchema>;

type GetPathInfoOutput = {
  success: boolean;
  path: string;
  name: string;
  extension: string;
  kind: "file" | "folder" | "other";
  sizeBytes: number;
  createdAt: string;
  modifiedAt: string;
  message: string;
};

export const getPathInfoTool: ToolDefinition<GetPathInfoInput, GetPathInfoOutput> = {
  name: "get_path_info",
  description: "Get metadata about a file or folder",
  inputSchema: getPathInfoInputSchema,
  execute: async (input) => {
    const targetPath = path.resolve(input.path);
    const stats = await fs.stat(targetPath);

    const kind = stats.isDirectory() ? "folder" : stats.isFile() ? "file" : "other";

    return {
      success: true,
      path: targetPath,
      name: path.basename(targetPath),
      extension: path.extname(targetPath),
      kind,
      sizeBytes: stats.size,
      createdAt: stats.birthtime.toISOString(),
      modifiedAt: stats.mtime.toISOString(),
      message: `${kind}: ${targetPath}`,
    };
  },
};