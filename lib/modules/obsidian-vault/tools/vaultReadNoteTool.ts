import { z } from "zod";
import type { ToolDefinition } from "@/lib/chernobog/tools/types";
import { createToolFailure, createToolSuccess } from "@/lib/chernobog/tools/types";
import { readVaultNote } from "../markdown/readNote";

const inputSchema = z.object({
  note: z.string().min(1),
  folder: z.string().optional(),
  maxChars: z.number().int().positive().max(50000).optional(),
});

type Input = z.infer<typeof inputSchema>;

export const vaultReadNoteTool: ToolDefinition<Input, unknown> = {
  name: "vault_read_note",
  description: "Read a markdown note from the configured Obsidian vault.",
  inputSchema,
  async execute(input) {
    try {
      const note = await readVaultNote(input.note, {
        folder: input.folder,
        maxChars: input.maxChars,
      });

      return createToolSuccess("vault_read_note", note);
    } catch (error) {
      return createToolFailure(
        "vault_read_note",
        error instanceof Error ? error.message : "Unknown vault read failure"
      );
    }
  },
};
