import { z } from "zod";
import type { ToolDefinition } from "@/lib/chernobog/tools/types";
import { createToolFailure, createToolSuccess } from "@/lib/chernobog/tools/types";
import { appendVaultNote } from "../markdown/appendNote";

const inputSchema = z.object({
  note: z.string().min(1),
  content: z.string().min(1),
  folder: z.string().optional(),
  heading: z.string().optional(),
  createIfMissing: z.boolean().optional(),
});

type Input = z.infer<typeof inputSchema>;

export const vaultAppendNoteTool: ToolDefinition<Input, unknown> = {
  name: "vault_append_note",
  description: "Append text to an existing markdown note in the configured Obsidian vault.",
  inputSchema,
  async execute(input) {
    try {
      const result = await appendVaultNote(input.note, input.content, {
        folder: input.folder,
        heading: input.heading,
        createIfMissing: input.createIfMissing ?? false,
      });

      return createToolSuccess("vault_append_note", result);
    } catch (error) {
      return createToolFailure(
        "vault_append_note",
        error instanceof Error ? error.message : "Unknown vault append failure"
      );
    }
  },
};
