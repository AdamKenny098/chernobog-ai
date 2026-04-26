import type { SessionContext } from "@/lib/chernobog/session/types";
import type { OllamaMessage } from "@/lib/chernobog/router";
import { buildMemoryContext } from "./contextBuilder";

export type MemoryArchitectureCommandKind =
  | "none"
  | "show_memory_layers"
  | "show_working_memory"
  | "show_short_term_memory"
  | "show_long_term_memory";

export function detectMemoryArchitectureCommand(
  message: string
): MemoryArchitectureCommandKind {
  const lower = message.trim().toLowerCase();

  if (
    /\bshow memory layers\b/.test(lower) ||
    /\bmemory architecture\b/.test(lower) ||
    /\bmemory layers\b/.test(lower)
  ) {
    return "show_memory_layers";
  }

  if (
    /\bshow working memory\b/.test(lower) ||
    /\bcurrent working memory\b/.test(lower) ||
    /\bworking memory\b/.test(lower)
  ) {
    return "show_working_memory";
  }

  if (
    /\bshow short term memory\b/.test(lower) ||
    /\bshort-term memory\b/.test(lower) ||
    /\bshort term memory\b/.test(lower)
  ) {
    return "show_short_term_memory";
  }

  if (
    /\bshow long term memory\b/.test(lower) ||
    /\blong-term memory\b/.test(lower) ||
    /\blong term memory\b/.test(lower)
  ) {
    return "show_long_term_memory";
  }

  return "none";
}

function formatLines(title: string, lines: string[]) {
  if (lines.length === 0) {
    return `${title}:\n- none`;
  }

  return [title, ...lines.map((line) => `- ${line}`)].join("\n");
}

export function runMemoryArchitectureCommand(
  kind: MemoryArchitectureCommandKind,
  input: {
    session: SessionContext;
    persistedMemories: string[];
    recentMessages: OllamaMessage[];
    userMessage: string;
  }
): string | null {
  if (kind === "none") {
    return null;
  }

  const context = buildMemoryContext({
    session: input.session,
    persistedMemories: input.persistedMemories,
    recentMessages: input.recentMessages,
    userMessage: input.userMessage,
  });

  if (kind === "show_working_memory") {
    return formatLines("Working memory", context.working.lines);
  }

  if (kind === "show_short_term_memory") {
    return formatLines("Short-term memory", context.shortTerm.lines);
  }

  if (kind === "show_long_term_memory") {
    return formatLines("Relevant long-term memory", context.longTerm.lines);
  }

  if (kind === "show_memory_layers") {
    return [
      "Memory layers:",
      "",
      formatLines("Short-term memory", context.shortTerm.lines),
      "",
      formatLines("Working memory", context.working.lines),
      "",
      formatLines("Relevant long-term memory", context.longTerm.lines),
    ].join("\n");
  }

  return null;
}