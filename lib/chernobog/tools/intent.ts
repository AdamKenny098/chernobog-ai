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

function buildToolIntentPrompt(message: string) {
  return `
You are a strict tool intent classifier for a local assistant called Chernobog.

Your job is to decide whether the user's message should call one of these local tools:

- get_time
- list_files
- read_text_file
- find_files
- open_app
- open_url

Return ONLY valid JSON.
Do not include markdown.
Do not include explanations.
Do not include prose.

Rules:
- If the user is explicitly or clearly asking for the current time, return:
  {"tool":"get_time","input":{}}

- If the user is asking to list folder contents, return:
  {"tool":"list_files","input":{"path":"..."}}

- If the user is asking to read a local text file, return:
  {"tool":"read_text_file","input":{"path":"..."}}

- If the user is asking to open a local app, return:
  {"tool":"open_app","input":{"appName":"..."}}

- If the user is asking to open a website or URL, return:
  {"tool":"open_url","input":{"url":"https://..."}}

- If the message does not clearly map to one of these tools, return:
  {"tool":"none","input":{}}

- If the user is asking to find or search for a local file by name, return:
  {"tool":"find_files","input":{"query":"..."}}

Safety and scope:
- Only use these six tools.
- Do not invent new tools.
- Do not answer the user's question.
- Do not pretend to execute anything.
- If unsure, return {"tool":"none","input":{}}

Path normalization hints:
- "downloads" can be used as a path string "Downloads"
- "desktop" can be used as a path string "Desktop"
- "documents" can be used as a path string "Documents"

User message:
${JSON.stringify(message)}
`.trim();
}

export async function classifyToolIntent(message: string): Promise<ToolIntent> {
  try {
    const prompt = buildToolIntentPrompt(message);

    const response = await fetch(OLLAMA_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt,
        stream: false,
        options: {
          temperature: 0,
        },
      }),
    });

    if (!response.ok) {
      return { tool: "none", input: {} };
    }

    const data = (await response.json()) as { response?: string };
    const raw = data.response ?? "";
    const jsonText = extractJsonObject(raw);

    if (!jsonText) {
      return { tool: "none", input: {} };
    }

    const parsed = JSON.parse(jsonText);
    return toolIntentSchema.parse(parsed);
  } catch {
    return { tool: "none", input: {} };
  }
}