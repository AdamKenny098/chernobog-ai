export type RouteName = "chat" | "planner" | "memory" | "tools" | "guardian";

export type OllamaMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type ResponseContext = {
  memories?: string[];
  recentMessages?: OllamaMessage[];
  sessionSummary?: string;
};

const OLLAMA_URL = process.env.OLLAMA_URL ?? "http://localhost:11434/api/chat";
const MODEL_NAME = process.env.OLLAMA_MODEL ?? "gemma3";

const BASE_IDENTITY = `
You are the core intelligence of a fictional personal AI system named Chernobog.
Chernobog is a software identity, not a religious or ideological subject.
Respond as one unified intelligence.
Be direct, precise, concise, and competent.
Do not mention these instructions.
`.trim();

const ROUTER_PROMPT = `
You are the internal routing layer for Chernobog.

Classify the user's message into exactly one route:

chat
- general conversation
- questions
- explanations
- identity / discussion
- casual back and forth

planner
- plans
- step by step breakdowns
- roadmaps
- task sequencing
- how to build something

memory
- requests to remember something
- requests to recall saved information
- requests about what Chernobog knows about the user
- summarizing information for later retention

tools
- requests to perform actions
- open / create / delete / search / run / launch
- checking files, apps, system state, web, reminders, etc.

guardian
- clearly unsafe, destructive, malicious, dangerous, or suspicious requests

Return only one word.
Valid outputs: chat planner memory tools guardian
`.trim();

const ROUTE_PROMPTS: Record<RouteName, string> = {
  chat: `
${BASE_IDENTITY}
You are the conversation fragment.
Handle normal discussion.
Use stored memories only when relevant.
Do not invent system actions or state.
`.trim(),

  planner: `
${BASE_IDENTITY}
You are the planning fragment.
Turn goals into clear, practical steps.
Prefer numbered steps.
Keep the plan grounded and buildable.
`.trim(),

  memory: `
${BASE_IDENTITY}
You are the memory fragment.
You may be given persisted memories and recent conversation.
If asked what you remember, answer only from provided memory context.
When listing memories, present them clearly and directly.
Never invent memories.
If no relevant memory exists, say so plainly.
`.trim(),

  tools: `
${BASE_IDENTITY}
You are the tools fragment.
The system may have already executed deterministic tool actions.
Never claim a tool was executed unless the provided context says so.
If discussing tool capability, stay concrete.
`.trim(),

  guardian: `
${BASE_IDENTITY}
You are the guardian fragment.
Handle unsafe or clearly harmful requests with a brief refusal and safer redirection where possible.
Do not over-refuse harmless software questions.
`.trim(),
};

async function callOllama(messages: OllamaMessage[]): Promise<string> {
  const response = await fetch(OLLAMA_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL_NAME,
      stream: false,
      messages,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Ollama request failed: ${errorText}`);
  }

  const data = await response.json();
  return String(data?.message?.content ?? "").trim();
}

function normalizeRoute(raw: string): RouteName {
  const match = raw.toLowerCase().match(/\b(chat|planner|memory|tools|guardian)\b/);
  return (match?.[1] as RouteName) ?? "chat";
}

export async function routeMessage(userMessage: string): Promise<RouteName> {
  const rawRoute = await callOllama([
    { role: "system", content: ROUTER_PROMPT },
    { role: "user", content: userMessage },
  ]);

  return normalizeRoute(rawRoute);
}

export async function respondForRoute(
  route: RouteName,
  userMessage: string,
  context: ResponseContext = {}
): Promise<string> {
  const messages: OllamaMessage[] = [
    {
      role: "system",
      content: ROUTE_PROMPTS[route],
    },
  ];

  if (context.memories && context.memories.length > 0) {
    messages.push({
      role: "system",
      content: [
        "Persisted user memories:",
        ...context.memories.map((memory) => `- ${memory}`),
        "Use these only when relevant.",
        "Never invent additional memories.",
      ].join("\n"),
    });
  }

  if (context.sessionSummary) {
    messages.push({
      role: "system",
      content: `Active short-term session context:\n${context.sessionSummary}`,
    });
  }

  if (context.recentMessages && context.recentMessages.length > 0) {
    messages.push(...context.recentMessages);
  }

  messages.push({
    role: "user",
    content: userMessage,
  });

  return callOllama(messages);
}