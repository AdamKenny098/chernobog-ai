import { z } from "zod";
import type { ToolDefinition } from "@/lib/chernobog/tools/types";
import { createToolFailure, createToolSuccess } from "@/lib/chernobog/tools/types";
import { findOrphanNotes } from "../graph/orphans";

const inputSchema = z.object({
  maxResults: z.number().int().positive().max(200).optional(),
});

type Input = z.infer<typeof inputSchema>;

export const vaultOrphansTool: ToolDefinition<Input, unknown> = {
  name: "vault_find_orphans",
  description: "Find vault notes with no outgoing links and no backlinks.",
  inputSchema,
  async execute(input) {
    try {
      const allResults = await findOrphanNotes();
      const results = allResults.slice(0, input.maxResults ?? 50);

      return createToolSuccess("vault_find_orphans", {
        count: allResults.length,
        returnedCount: results.length,
        results,
      });
    } catch (error) {
      return createToolFailure(
        "vault_find_orphans",
        error instanceof Error ? error.message : "Unknown vault orphan scan failure"
      );
    }
  },
};
