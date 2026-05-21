import { z } from "zod";
import type { ToolDefinition } from "@/lib/chernobog/tools/types";
import { createToolFailure, createToolSuccess } from "@/lib/chernobog/tools/types";
import type { VaultNoteType } from "../types";
import { buildNoteTemplate, defaultFolderForType } from "../templates";
import { writeVaultNote } from "../markdown/writeNote";

const noteTypeSchema = z.enum([
  "note",
  "project",
  "feature",
  "decision",
  "dev_log",
  "bug",
  "task",
  "concept",
  "research",
]);

const inputSchema = z.object({
  title: z.string().min(1),
  type: noteTypeSchema.optional(),
  folder: z.string().optional(),
  project: z.string().optional(),
  content: z.string().optional(),
  overwrite: z.boolean().optional(),
});

type Input = z.infer<typeof inputSchema>;

export const vaultCreateNoteTool: ToolDefinition<Input, unknown> = {
  name: "vault_create_note",
  description: "Create a markdown note in the configured Obsidian vault.",
  inputSchema,
  async execute(input) {
    try {
      const type = (input.type ?? "note") as VaultNoteType;
      const folder = input.folder ?? defaultFolderForType(type, input.project);
      const body =
        input.content?.trim() ||
        buildNoteTemplate({
          title: input.title,
          type,
          project: input.project,
        });

      const result = await writeVaultNote(input.title, body, {
        folder,
        overwrite: input.overwrite ?? false,
        frontmatter: {
          type,
          project: input.project,
          status: type === "task" ? "todo" : undefined,
          created: new Date().toISOString().slice(0, 10),
          tags: ["chernobog/vault", `type/${type}`],
        },
      });

      return createToolSuccess("vault_create_note", result);
    } catch (error) {
      return createToolFailure(
        "vault_create_note",
        error instanceof Error ? error.message : "Unknown vault create failure"
      );
    }
  },
};
