// lib/chernobog/tools/builtins/write-project-file.ts

import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { ToolDefinition } from "../types";

const writeProjectFileInputSchema = z.object({
  relativePath: z.string().min(1),
  content: z.string(),
});

type WriteProjectFileInput = z.infer<typeof writeProjectFileInputSchema>;

type WriteProjectFileOutput = {
  success: boolean;
  relativePath: string;
  absolutePath: string;
  bytesWritten: number;
  message: string;
};

function resolveProjectPath(relativePath: string) {
  const projectRoot = process.cwd();
  const resolved = path.resolve(projectRoot, relativePath);

  if (!resolved.startsWith(projectRoot)) {
    throw new Error("Refusing to write outside project root.");
  }

  return resolved;
}

export const writeProjectFileTool: ToolDefinition<
  WriteProjectFileInput,
  WriteProjectFileOutput
> = {
  name: "write_project_file",
  description: "Overwrite a file inside the current Chernobog project directory",
  inputSchema: writeProjectFileInputSchema,
  execute: async (input) => {
    const absolutePath = resolveProjectPath(input.relativePath);

    await fs.mkdir(path.dirname(absolutePath), { recursive: true });
    await fs.writeFile(absolutePath, input.content, "utf8");

    return {
      success: true,
      relativePath: input.relativePath,
      absolutePath,
      bytesWritten: Buffer.byteLength(input.content, "utf8"),
      message: `Wrote ${input.relativePath}`,
    };
  },
};