import { z } from "zod";
import type { ToolDefinition } from "@/lib/chernobog/tools/types";
import { createToolFailure, createToolSuccess } from "@/lib/chernobog/tools/types";
import { linkVaultNotes } from "../graph/linkNotes";

const inputSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  relationship: z.string().optional(),
});

type Input = z.infer<typeof inputSchema>;

export const vaultLinkNotesTool: ToolDefinition<Input, unknown> = {
  name: "vault_link_notes",
  description: "Add an Obsidian wikilink from one vault note to another.",
  inputSchema,
  async execute(input) {
    try {
      const result = await linkVaultNotes(
        input.from,
        input.to,
        input.relationship ?? "Related"
      );

      return createToolSuccess("vault_link_notes", result);
    } catch (error) {
      return createToolFailure(
        "vault_link_notes",
        error instanceof Error ? error.message : "Unknown vault link failure"
      );
    }
  },
};
