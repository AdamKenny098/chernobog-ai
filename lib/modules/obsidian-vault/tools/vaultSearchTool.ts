import { z } from "zod";
import type { ToolDefinition } from "@/lib/chernobog/tools/types";
import { createToolFailure, createToolSuccess } from "@/lib/chernobog/tools/types";
import { searchVaultNotes } from "../graph/scanVault";

const inputSchema = z.object({
  query: z.string().min(1),
  folder: z.string().optional(),
  maxResults: z.number().int().positive().max(100).optional(),
});

type Input = z.infer<typeof inputSchema>;

export const vaultSearchTool: ToolDefinition<Input, unknown> = {
  name: "vault_search",
  description: "Search markdown notes inside the configured Obsidian vault.",
  inputSchema,
  async execute(input) {
    try {
      const results = await searchVaultNotes(input.query, {
        folder: input.folder,
        maxResults: input.maxResults,
      });

      return createToolSuccess("vault_search", {
        query: input.query,
        resultCount: results.length,
        results,
      });
    } catch (error) {
      return createToolFailure(
        "vault_search",
        error instanceof Error ? error.message : "Unknown vault search failure"
      );
    }
  },
};
