// lib/chernobog/tools/builtins/read-project-note.ts

import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { ToolDefinition } from "../types";

const readProjectNoteInputSchema = z.object({
  noteName: z.string().min(1),
});

type ReadProjectNoteInput = z.infer<typeof readProjectNoteInputSchema>;

type ReadProjectNoteOutput = {
  noteName: string;
  relativePath: string;
  absolutePath: string;
  content: string;
};

function sanitizeNoteName(noteName: string) {
  return noteName
    .trim()
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .replace(/\.md$/i, "");
}

function resolveVaultNotePath(noteName: string) {
  const vaultRoot = path.resolve(process.cwd(), "vault", "chernobog");
  const safeName = sanitizeNoteName(noteName);
  const fileName = `${safeName}.md`;
  const resolved = path.resolve(vaultRoot, fileName);

  if (!resolved.startsWith(vaultRoot)) {
    throw new Error("Refusing to read outside the Chernobog vault.");
  }

  return {
    vaultRoot,
    safeName,
    fileName,
    resolved,
  };
}

export const readProjectNoteTool: ToolDefinition<
  ReadProjectNoteInput,
  ReadProjectNoteOutput
> = {
  name: "read_project_note",
  description: "Read a markdown note from the local Chernobog project knowledge vault",
  inputSchema: readProjectNoteInputSchema,
  execute: async (input) => {
    const resolved = resolveVaultNotePath(input.noteName);
    const content = await fs.readFile(resolved.resolved, "utf8");

    return {
      noteName: resolved.safeName,
      relativePath: path.join("vault", "chernobog", resolved.fileName),
      absolutePath: resolved.resolved,
      content,
    };
  },
};