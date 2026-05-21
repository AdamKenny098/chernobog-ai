import { z } from "zod";
import type { ToolDefinition } from "@/lib/chernobog/tools/types";
import { createToolFailure, createToolSuccess } from "@/lib/chernobog/tools/types";
import { generateProjectIndex } from "../graph/projectIndex";

const inputSchema = z.object({
  project: z.string().min(1),
  folder: z.string().optional(),
  overwrite: z.boolean().optional(),
});

type Input = z.infer<typeof inputSchema>;

export const vaultIndexTool: ToolDefinition<Input, unknown> = {
  name: "vault_generate_index",
  description: "Generate or update a project index note inside the configured Obsidian vault.",
  inputSchema,
  async execute(input) {
    try {
      const result = await generateProjectIndex(input.project, {
        folder: input.folder,
        overwrite: input.overwrite ?? true,
      });

      return createToolSuccess("vault_generate_index", result);
    } catch (error) {
      return createToolFailure(
        "vault_generate_index",
        error instanceof Error ? error.message : "Unknown vault index generation failure"
      );
    }
  },
};
