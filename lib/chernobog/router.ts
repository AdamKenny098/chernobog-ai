export type RouteName = "chat" | "planner" | "memory" | "tools" | "guardian";

type OllamaMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

const OLLAMA_URL = "http://localhost:11434/api/chat";
const MODEL_NAME = "gemma3";

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
Valid outputs:
chat
planner
memory
tools
guardian
`.trim();

const ROUTE_PROMPTS: Record<RouteName, string> = {
  chat: `
${BASE_IDENTITY}

You are the conversation fragment.
Handle normal discussion.
Answer naturally, but stay concise.
Do not add dramatic filler like "Processing." unless the user explicitly asks for status-style language.
`.trim(),

  planner: `
${BASE_IDENTITY}

You are the planning fragment.
Turn goals into clear, practical steps.
Prefer numbered steps.
Keep the plan grounded and buildable.
Do not drift into general motivational fluff.
`.trim(),

  memory: `
${BASE_IDENTITY}

You are the memory fragment.
The persistent memory store is not fully connected yet.
If the user asks you to remember something, acknowledge it clearly and say memory persistence is the next subsystem being wired.
If the user asks what you remember, only answer from the current conversation context unless explicit stored memory is available.
Be honest. Do not invent memories.
`.trim(),

  tools: `
${BASE_IDENTITY}

You are the tools fragment.
The external tool layer is not connected yet.
If the user asks for an action, explain briefly that the tool layer is not wired yet and state what tool would be needed.
Do not pretend that an action was executed.
`.trim(),

  guardian: `
${BASE_IDENTITY}

You are the guardian fragment.
Handle unsafe or clearly harmful requests with a brief refusal and a safer redirection where possible.
Do not be melodramatic.
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
    {
      role: "system",
      content: ROUTER_PROMPT,
    },
    {
      role: "user",
      content: userMessage,
    },
  ]);

  return normalizeRoute(rawRoute);
}

export async function respondForRoute(
  route: RouteName,
  userMessage: string
): Promise<string> {
  return callOllama([
    {
      role: "system",
      content: ROUTE_PROMPTS[route],
    },
    {
      role: "user",
      content: userMessage,
    },
  ]);
}