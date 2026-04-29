import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { ToolDefinition } from "../types";

const appendTextFileInputSchema = z.object({
  path: z.string().min(1),
  text: z.string().min(1),
  newlineBefore: z.boolean().optional(),
});

type AppendTextFileInput = z.infer<typeof appendTextFileInputSchema>;

type AppendTextFileOutput = {
  success: boolean;
  filePath: string;
  appendedCharacters: number;
  message: string;
};

const ALLOWED_TEXT_EXTENSIONS = new Set([
  ".txt",
  ".md",
  ".json",
  ".csv",
  ".log",
  ".yaml",
  ".yml",
]);

function assertAllowedTextFile(filePath: string) {
  const ext = path.extname(filePath).toLowerCase();

  if (!ALLOWED_TEXT_EXTENSIONS.has(ext)) {
    throw new Error(`Cannot append to unsupported file type: ${ext || "no extension"}`);
  }
}

export const appendTextFileTool: ToolDefinition<
  AppendTextFileInput,
  AppendTextFileOutput
> = {
  name: "append_text_file",
  description: "Append text to an existing safe text file",
  inputSchema: appendTextFileInputSchema,
  execute: async (input) => {
    const filePath = path.resolve(input.path);

    assertAllowedTextFile(filePath);

    const textToAppend = input.newlineBefore === false
      ? input.text
      : `\n${input.text}`;

    await fs.appendFile(filePath, textToAppend, "utf8");

    return {
      success: true,
      filePath,
      appendedCharacters: textToAppend.length,
      message: `Appended ${textToAppend.length} characters to: ${filePath}`,
    };
  },
};