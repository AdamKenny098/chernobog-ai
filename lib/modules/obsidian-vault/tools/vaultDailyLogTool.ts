import { z } from "zod";
import type { ToolDefinition } from "@/lib/chernobog/tools/types";
import { createToolFailure, createToolSuccess } from "@/lib/chernobog/tools/types";
import { appendVaultNote } from "../markdown/appendNote";

const inputSchema = z.object({
  project: z.string().optional(),
  content: z.string().min(1),
  date: z.string().optional(),
});

type Input = z.infer<typeof inputSchema>;

function buildDailyLogTitle(date = new Date().toISOString().slice(0, 10)): string {
  return `Dev Log - ${date}`;
}

export const vaultDailyLogTool: ToolDefinition<Input, unknown> = {
  name: "vault_daily_log",
  description: "Append an entry to the daily Obsidian vault dev log.",
  inputSchema,
  async execute(input) {
    try {
      const date = input.date ?? new Date().toISOString().slice(0, 10);
      const title = buildDailyLogTitle(date);
      const projectLine = input.project ? `Project: [[${input.project}]]\n\n` : "";
      const result = await appendVaultNote(title, `${projectLine}${input.content}`, {
        folder: "05_Logs/Daily",
        heading: new Date().toLocaleTimeString(),
        createIfMissing: true,
      });

      return createToolSuccess("vault_daily_log", {
        ...result,
        date,
      });
    } catch (error) {
      return createToolFailure(
        "vault_daily_log",
        error instanceof Error ? error.message : "Unknown vault daily log failure"
      );
    }
  },
};
