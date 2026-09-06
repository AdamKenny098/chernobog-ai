import {
  generateWithReliableOllama as generateWithOllama,
} from "./llm/reliableOllama";
import type {
  OllamaChatMessage,
} from "./llm/ollamaClient";
import type {
  ModelRole,
} from "./llm/modelRouter";
import {
  buildChernobogPersonalityPrompt,
  type ChernobogResponseMode,
} from "./personality";

import {
  buildWorldModelRepairPrompt,
  shouldValidateWorldModelResponse,
  validateWorldModelResponse,
} from "./worldModel/responseValidation";

const ROUTED_RESPONSE_NUM_PREDICT = 2048;

export type RouteName = "chat" | "planner" | "memory" | "tools" | "guardian";

export type OllamaMessage = OllamaChatMessage;

type ResponseContext = {
  memories?: string[];
  recentMessages?: OllamaMessage[];
  sessionSummary?: string;
  responseMode?: ChernobogResponseMode;
};


const WORLD_MODEL_CRITICAL_START =
  "WORLD MODEL CRITICAL DEPENDENCY BACKBONE";

const WORLD_MODEL_VERBOSE_START =
  "World Model entities (current evidence first; historical tail explicitly labelled):";

function extractCriticalWorldModelReinforcement(
  sessionSummary?: string,
): string | null {
  if (!sessionSummary) {
    return null;
  }

  const start =
    sessionSummary.indexOf(
      WORLD_MODEL_CRITICAL_START,
    );

  if (start < 0) {
    return null;
  }

  const verboseStart =
    sessionSummary.indexOf(
      WORLD_MODEL_VERBOSE_START,
      start,
    );

  const criticalEvidence =
    sessionSummary
      .slice(
        start,
        verboseStart >= 0
          ? verboseStart
          : undefined,
      )
      .trim();

  if (!criticalEvidence) {
    return null;
  }

  return [
    "FINAL AUTHORITATIVE WORLD MODEL EVIDENCE:",
    "The following block is a verbatim reinforcement of the canonical 11J critical evidence already present earlier in the system context.",
    "Use this block as the highest-priority source for World Model relationships, dependencies, consequences, prediction status, and missing-model claims.",
    "",
    criticalEvidence,
    "",
    "FINAL WORLD MODEL ANSWER CONTRACT:",
    "- DEPENDENCIES: only explicit dependency relationships such as requires-model and served-by are dependencies. has-state and has-role are not dependency edges.",
    "- CONSEQUENCES: use the precomputed impactSource assessments. If model:ollama has listed direct or transitive dependents, do not say that no Ollama dependency path exists.",
    "- PROVIDERS: preserve every explicit served-by edge and every complete DEPENDENCY_CHAIN.",
    "- PREDICTIONS: if SUPPORTED_PREDICTION_STATUS=none, answer exactly: No supported predictions.",
    "- MISSING MODEL: never claim an entity, relationship, provider edge, or dependency chain is missing when it appears in the reinforced evidence.",
    "- CONCLUSION: if RELATIONAL_STATUS=substantive, do not emit any conclusion that the World Model lacks substantive relational evidence.",
  ].join("\n");
}

const BASE_IDENTITY = `
You are Chernobog, the core intelligence of a real personal AI system.
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

function roleForRoute(route: RouteName): ModelRole {
  return route === "planner"
    ? "planner"
    : "default";
}

async function callOllama(
  messages: OllamaMessage[],
  options: {
    role?: ModelRole;
    temperature?: number;
    numPredict?: number;
  } = {},
): Promise<string> {
  const result = await generateWithOllama({
    role: options.role ?? "default",
    messages,
    temperature: options.temperature ?? 0.4,
    numPredict: options.numPredict ?? 500,
  });

  if (!result.ok || !result.text) {
    throw new Error(
      result.error ??
        "No response returned from the local model.",
    );
  }

  return result.text;
}

function normalizeRoute(raw: string): RouteName {
  const match = raw.toLowerCase().match(/\b(chat|planner|memory|tools|guardian)\b/);
  return (match?.[1] as RouteName) ?? "chat";
}

export async function routeMessage(userMessage: string): Promise<RouteName> {
  const rawRoute = await callOllama(
    [
      { role: "system", content: ROUTER_PROMPT },
      { role: "user", content: userMessage },
    ],
    {
      role: "default",
    },
  );

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

  if (
    context.sessionSummary &&
    context.recentMessages &&
    context.recentMessages.length > 0
  ) {
    messages.push({
      role: "system",
      content: [
        "Authoritative context precedence:",
        "The current runtime/session context supplied above is newer and more authoritative than earlier assistant statements in conversation history.",
        "If an earlier assistant response conflicts with current runtime state, project state, scoped memory, or current user instructions, disregard the stale assistant response.",
        "Do not repeat an earlier claim that information is missing when the current authoritative context now supplies that information.",
      ].join("\n"),
    });
  }



  const worldModelReinforcement =
    extractCriticalWorldModelReinforcement(
      context.sessionSummary,
    );

  if (worldModelReinforcement) {
    messages.push({
      role: "system",
      content: worldModelReinforcement,
    });
  }


  messages.push({
    role: "system",
    content: buildChernobogPersonalityPrompt(
      context.responseMode ?? "text",
    ),
  });

  messages.push({
    role: "user",
    content: userMessage,
  });

  const initialReply =
    await callOllama(
      messages,
      {
        role:
          roleForRoute(route),
        numPredict:
          ROUTED_RESPONSE_NUM_PREDICT,
      },
    );

  if (
    !shouldValidateWorldModelResponse(
      userMessage,
      context.sessionSummary,
    )
  ) {
    return initialReply;
  }

  const validation =
    await validateWorldModelResponse(
      userMessage,
      initialReply,
    );

  if (validation.valid) {
    return initialReply;
  }

  try {
    const repairedReply =
      await callOllama(
        [
          {
            role: "system",
            content: [
              "You are the Chernobog grounded World Model response repair pass.",
              "Repair only semantic grounding errors identified by the validator.",
              "Canonical 11J evidence below is authoritative.",
              "Do not execute tools or claim that any tool was executed.",
            ].join("\n"),
          },
          {
            role: "system",
            content:
              validation.canonicalEvidenceText,
          },
          {
            role: "user",
            content:
              buildWorldModelRepairPrompt(
                userMessage,
                initialReply,
                validation,
              ),
          },
        ],
        {
          role:
            roleForRoute(route),
          temperature: 0.1,
          numPredict:
            ROUTED_RESPONSE_NUM_PREDICT,
        },
      );

    const repairedValidation =
      await validateWorldModelResponse(
        userMessage,
        repairedReply,
      );

    if (repairedValidation.valid) {
      return repairedReply;
    }

    return repairedValidation.fallbackText;
  } catch {
    return validation.fallbackText;
  }
}

