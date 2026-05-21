import { z } from "zod";
import type { ToolDefinition } from "@/lib/chernobog/tools/types";
import { createToolFailure, createToolSuccess } from "@/lib/chernobog/tools/types";
import { findBacklinks } from "../graph/backlinks";

const inputSchema = z.object({
  note: z.string().min(1),
});

type Input = z.infer<typeof inputSchema>;

export const vaultBacklinksTool: ToolDefinition<Input, unknown> = {
  name: "vault_backlinks",
  description: "Find notes that link to a target Obsidian note.",
  inputSchema,
  async execute(input) {
    try {
      const results = await findBacklinks(input.note);

      return createToolSuccess("vault_backlinks", {
        note: input.note,
        count: results.length,
        results,
      });
    } catch (error) {
      return createToolFailure(
        "vault_backlinks",
        error instanceof Error ? error.message : "Unknown vault backlink failure"
      );
    }
  },
};
