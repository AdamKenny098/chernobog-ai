import { z } from "zod";

const OLLAMA_URL = process.env.OLLAMA_URL ?? "http://127.0.0.1:11434/api/generate";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "gemma3";

const toolIntentSchema = z.discriminatedUnion("tool", [
  z.object({
    tool: z.literal("get_time"),
    input: z.object({}).strict(),
  }),
  z.object({
    tool: z.literal("list_files"),
    input: z.object({
      path: z.string().min(1),
    }),
  }),
  z.object({
    tool: z.literal("read_text_file"),
    input: z.object({
      path: z.string().min(1),
      maxChars: z.number().int().positive().max(50000).optional(),
    }),
  }),
  z.object({
    tool: z.literal("find_files"),
    input: z.object({
      query: z.string().min(1),
      root: z.string().min(1).optional(),
      maxResults: z.number().int().positive().max(50).optional(),
    }),
  }),
  z.object({
    tool: z.literal("open_file"),
    input: z.object({
      path: z.string().min(1),
    }),
  }),
  z.object({
    tool: z.literal("open_folder"),
    input: z.object({
      path: z.string().min(1),
    }),
  }),
  z.object({
    tool: z.literal("open_app"),
    input: z.object({
      appName: z.string().min(1),
    }),
  }),
  z.object({
    tool: z.literal("open_url"),
    input: z.object({
      url: z.string().url(),
    }),
  }),
  z.object({
    tool: z.literal("none"),
    input: z.object({}).strict(),
  }),
]);

export type ToolIntent = z.infer<typeof toolIntentSchema>;

function extractJsonObject(raw: string): string | null {
  const trimmed = raw.trim();

  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    return trimmed;
  }

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    return null;
  }

  return trimmed.slice(firstBrace, lastBrace + 1);
}

export async function classifyToolIntent(message: string): Promise<ToolIntent> {
  const prompt = [
    "You are a tool intent classifier.",
    "Return exactly one JSON object and nothing else.",
    "Allowed tools:",
    '- get_time: current time queries',
    '- list_files: list directory contents',
    '- read_text_file: read a text file',
    '- find_files: search for files by name',
    '- open_file: open a file with the system default app',
    '- open_folder: open a folder in the system file manager',
    '- open_app: launch an application by name',
    '- open_url: open a safe http/https URL',
    '- none: if the message is not clearly a tool request',
    "Use the smallest correct tool.",
    "If the user wants to read file contents, use read_text_file, not open_file.",
    "If the user wants to launch or reveal a file or folder externally, use open_file or open_folder.",
    `Message: ${JSON.stringify(message)}`,
  ].join("\n");

  const response = await fetch(OLLAMA_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      prompt,
      stream: false,
      format: "json",
    }),
  });

  if (!response.ok) {
    return { tool: "none", input: {} };
  }

  const data = (await response.json()) as { response?: string };
  const raw = data.response ?? "";
  const extracted = extractJsonObject(raw);

  if (!extracted) {
    return { tool: "none", input: {} };
  }

  try {
    const parsed = JSON.parse(extracted);
    return toolIntentSchema.parse(parsed);
  } catch {
    return { tool: "none", input: {} };
  }
}