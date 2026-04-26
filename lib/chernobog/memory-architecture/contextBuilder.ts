import type { OllamaMessage } from "@/lib/chernobog/router";
import {
  buildWorkingMemorySnapshot,
  formatWorkingMemory,
} from "./workingMemory";
import { selectRelevantLongTermMemories } from "./relevance";
import type {
  BuildMemoryContextInput,
  BuiltMemoryContext,
  MemoryContextBlock,
} from "./types";

function formatRecentMessages(messages: OllamaMessage[]): string[] {
  return messages.slice(-8).map((message) => {
    return `${message.role}: ${message.content}`;
  });
}

function buildBlock(
  layer: MemoryContextBlock["layer"],
  title: string,
  lines: string[]
): MemoryContextBlock {
  return {
    layer,
    title,
    lines: lines.filter((line) => line.trim().length > 0),
  };
}

function blockToText(block: MemoryContextBlock): string {
  if (block.lines.length === 0) {
    return `${block.title}:\n- none`;
  }

  return `${block.title}:\n${block.lines.map((line) => `- ${line}`).join("\n")}`;
}

export function buildMemoryContext(
  input: BuildMemoryContextInput
): BuiltMemoryContext {
  const workingSnapshot = buildWorkingMemorySnapshot(input.session);

  const shortTerm = buildBlock(
    "short_term",
    "Short-term memory",
    formatRecentMessages(input.recentMessages)
  );

  const working = buildBlock(
    "working",
    "Working memory",
    formatWorkingMemory(workingSnapshot)
  );

  const relevantLongTermMemories = selectRelevantLongTermMemories(
    input.persistedMemories,
    input.userMessage ?? "",
    8
  );
  
  const longTerm = buildBlock(
    "long_term",
    "Long-term memory",
    relevantLongTermMemories
  );
  
  const systemText = [
    "Chernobog memory context is layered.",
    "Use short-term memory for recent conversation flow.",
    "Use working memory for the active session, files, workflows, and plans.",
    "Use long-term memory for durable user facts and preferences.",
    "Never invent memories that are not present in these blocks.",
    "",
    blockToText(shortTerm),
    "",
    blockToText(working),
    "",
    blockToText(longTerm),
  ].join("\n");

  return {
    shortTerm,
    working,
    longTerm,
    systemText,
  };
}