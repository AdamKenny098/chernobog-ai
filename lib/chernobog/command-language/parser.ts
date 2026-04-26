import type { UnifiedCommand } from "./types";
import {
  cleanQuery,
  confidenceLevel,
  extractStepIndex,
  normalizeCommandText,
} from "./utils";

function baseCommand(raw: string): UnifiedCommand {
  return {
    raw,
    normalized: normalizeCommandText(raw),
    domain: "none",
    action: "none",
    target: "none",
    reference: "none",
    confidence: 0,
    confidenceLevel: "low",
    reasons: [],
  };
}

function finalize(command: UnifiedCommand, confidence: number): UnifiedCommand {
  return {
    ...command,
    confidence,
    confidenceLevel: confidenceLevel(confidence),
  };
}

function stripMemoryPayload(message: string): string {
  return message
    .trim()
    .replace(/^(remember that|remember|store|save|note that)\s+/i, "")
    .replace(/^(forget that|forget|remove memory|delete memory)\s+/i, "")
    .trim();
}

function stripPlanGoal(message: string): string {
  return message
    .trim()
    .replace(/^(can you|could you|please)\s+/i, "")
    .replace(/^(make|create|build|give me|write|draft)\s+(a\s+)?plan\s+(for|to|about)?\s*/i, "")
    .replace(/^(plan)\s+(for|to|about)?\s*/i, "")
    .trim();
}

function stripFileQuery(message: string): string {
  return message
    .trim()
    .replace(/^(can you|could you|please)\s+/i, "")
    .replace(/\b(find|search for|search|look for|locate)\b/gi, "")
    .replace(/\b(read|open|show|display)\b/gi, "")
    .replace(/\b(first one|first result|top result|it|that|this|same one|same file)\b/gi, "")
    .replace(/\b(file|document|doc|folder)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseUnifiedCommand(message: string): UnifiedCommand {
  const command = baseCommand(message);
  const text = command.normalized;

  const reasons: string[] = [];

  const hasMemoryWord = /\b(memory|memories|remember|forget|recall)\b/.test(text);
  const hasPlanWord = /\b(plan|step|next step|current plan|active plan)\b/.test(text);
  const hasFileWord =
    /\b(file|folder|document|doc|txt|md|pdf|note|notes|readme|roadmap|json|csv|log)\b/.test(text);
  const hasAppOpen =
    /\b(open|launch|start)\b/.test(text) &&
    /\b(spotify|chrome|discord|opera|browser|vscode|visual studio code|steam)\b/.test(text);

  const hasSearch = /\b(find|search|look for|locate)\b/.test(text);
  const hasRead = /\b(read|show|display)\b/.test(text);
  const hasOpen = /\b(open|launch|reveal)\b/.test(text);
  const hasClear = /\b(clear|delete|discard|reset|wipe)\b/.test(text);
  const hasContinue = /\b(next step|continue|carry on|what next)\b/.test(text);
  const hasRevise = /\b(revise|change|update|modify)\b/.test(text);
  const hasComplete = /\b(mark|complete|finish|done)\b/.test(text);
  const hasBlock = /\b(block|blocked|stuck)\b/.test(text);
  const hasCurrent = /\b(current|active|working on|working memory)\b/.test(text);
  const hasFirstRef = /\b(first one|first result|top result|1st one)\b/.test(text);
  const hasSoftRef = /\b(it|that|this|same one|same file)\b/.test(text);
  const hasLastRead = /\b(last read|just read|file did you just read)\b/.test(text);
  const hasLastOpened = /\b(last opened|just opened|file did you just open)\b/.test(text);

  if (
    /\b(command help|commands help|show commands|command language|what commands can you understand)\b/.test(
      text
    )
  ) {
    reasons.push("command language help request detected");
  
    return finalize(
      {
        ...command,
        domain: "context",
        action: "show",
        target: "context",
        reference: "current",
        query: "command_help",
        reasons,
      },
      0.95
    );
  }

  if (/\b(wipe memories|clear all memories|delete all memories)\b/.test(text)) {
    reasons.push("memory wipe command detected");

    return finalize(
      {
        ...command,
        domain: "memory",
        action: "wipe",
        target: "memory",
        reference: "explicit",
        reasons,
      },
      0.98
    );
  }

  if (/^(remember that|remember|store|save|note that)\b/.test(text)) {
    reasons.push("memory remember command detected");

    return finalize(
      {
        ...command,
        domain: "memory",
        action: "remember",
        target: "memory",
        reference: "explicit",
        query: stripMemoryPayload(message),
        reasons,
      },
      0.95
    );
  }

  if (/^(forget that|forget|remove memory|delete memory)\b/.test(text)) {
    reasons.push("memory forget command detected");

    return finalize(
      {
        ...command,
        domain: "memory",
        action: "forget",
        target: "memory",
        reference: "explicit",
        query: stripMemoryPayload(message),
        reasons,
      },
      0.95
    );
  }

  if (
    /\b(show memory layers|memory architecture|memory layers)\b/.test(text)
  ) {
    reasons.push("memory architecture inspection detected");

    return finalize(
      {
        ...command,
        domain: "memory",
        action: "show",
        target: "memory_layers",
        reference: "current",
        reasons,
      },
      0.92
    );
  }

  if (/\b(short term memory|short-term memory)\b/.test(text)) {
    reasons.push("short-term memory inspection detected");

    return finalize(
      {
        ...command,
        domain: "memory",
        action: "show",
        target: "short_term_memory",
        reference: "current",
        reasons,
      },
      0.9
    );
  }

  if (/\b(working memory|what are we working on|what am i working on)\b/.test(text)) {
    reasons.push("working memory inspection detected");

    return finalize(
      {
        ...command,
        domain: "memory",
        action: "show",
        target: "working_memory",
        reference: "current",
        reasons,
      },
      0.9
    );
  }

  if (/\b(long term memory|long-term memory)\b/.test(text)) {
    reasons.push("long-term memory inspection detected");

    return finalize(
      {
        ...command,
        domain: "memory",
        action: "show",
        target: "long_term_memory",
        reference: "current",
        reasons,
      },
      0.9
    );
  }

  if (
    /\b(what do you remember|recall memories|show memories|list memories)\b/.test(text)
  ) {
    reasons.push("memory recall command detected");
  
    return finalize(
      {
        ...command,
        domain: "memory",
        action: "show",
        target: "memory",
        reference: "current",
        reasons,
      },
      0.92
    );
  }

  if (
    hasPlanWord &&
    hasClear &&
    /\b(plan|current plan|active plan)\b/.test(text)
  ) {
    reasons.push("planner clear command detected");

    return finalize(
      {
        ...command,
        domain: "planner",
        action: "clear",
        target: "plan",
        reference: "active",
        reasons,
      },
      0.94
    );
  }

  if (
    /\b(show|display|view|what is)\b.*\b(plan)\b/.test(text) ||
    /\b(current plan|active plan)\b/.test(text)
  ) {
    reasons.push("planner show command detected");

    return finalize(
      {
        ...command,
        domain: "planner",
        action: "show",
        target: "plan",
        reference: "active",
        reasons,
      },
      0.9
    );
  }

  if (hasContinue && hasPlanWord) {
    reasons.push("planner continue command detected");

    return finalize(
      {
        ...command,
        domain: "planner",
        action: "continue",
        target: "plan",
        reference: "active",
        reasons,
      },
      0.88
    );
  }

  if (hasComplete && /\b(step)?\s*\d{1,2}\b/.test(text)) {
    reasons.push("planner complete-step command detected");

    return finalize(
      {
        ...command,
        domain: "planner",
        action: "complete",
        target: "plan_step",
        reference: "explicit",
        stepIndex: extractStepIndex(text),
        reasons,
      },
      0.9
    );
  }

  if (hasBlock && /\b(step)?\s*\d{1,2}\b/.test(text)) {
    reasons.push("planner block-step command detected");

    return finalize(
      {
        ...command,
        domain: "planner",
        action: "block",
        target: "plan_step",
        reference: "explicit",
        stepIndex: extractStepIndex(text),
        reasons,
      },
      0.88
    );
  }

  if (hasRevise && hasPlanWord) {
    reasons.push("planner revise command detected");

    return finalize(
      {
        ...command,
        domain: "planner",
        action: "revise",
        target: "plan",
        reference: "active",
        query: message,
        reasons,
      },
      0.84
    );
  }

  if (
    /\b(make|create|build|give me|write|draft)\b.*\bplan\b/.test(text) ||
    /^plan\b/.test(text)
  ) {
    reasons.push("planner create command detected");

    return finalize(
      {
        ...command,
        domain: "planner",
        action: "create",
        target: "plan",
        reference: "explicit",
        query: stripPlanGoal(message),
        reasons,
      },
      0.92
    );
  }

  if (hasSearch && hasFileWord && hasRead) {
    reasons.push("compound search-read file command detected");

    return finalize(
      {
        ...command,
        domain: "file",
        action: "read",
        target: "file",
        reference: "explicit",
        query: stripFileQuery(message),
        reasons,
      },
      0.88
    );
  }

  if (hasSearch && hasFileWord && hasOpen) {
    reasons.push("compound search-open file command detected");

    return finalize(
      {
        ...command,
        domain: "file",
        action: "open",
        target: "file",
        reference: "explicit",
        query: stripFileQuery(message),
        reasons,
      },
      0.88
    );
  }

  if (hasSearch && hasFileWord) {
    reasons.push("file search command detected");

    return finalize(
      {
        ...command,
        domain: "file",
        action: "search",
        target: "file",
        reference: "explicit",
        query: stripFileQuery(message),
        reasons,
      },
      0.82
    );
  }

  if (hasRead && (hasFirstRef || hasSoftRef || hasLastRead)) {
    reasons.push("file read reference command detected");

    return finalize(
      {
        ...command,
        domain: "file",
        action: "read",
        target: "file",
        reference: hasFirstRef
          ? "first_result"
          : hasLastRead
            ? "last_read"
            : "same",
        reasons,
      },
      0.86
    );
  }

  if (hasOpen && (hasFirstRef || hasSoftRef || hasLastOpened)) {
    reasons.push("file open reference command detected");

    return finalize(
      {
        ...command,
        domain: "file",
        action: "open",
        target: "file",
        reference: hasFirstRef
          ? "first_result"
          : hasLastOpened
            ? "last_opened"
            : "same",
        reasons,
      },
      0.86
    );
  }

  if (hasAppOpen) {
    reasons.push("app open command detected");

    return finalize(
      {
        ...command,
        domain: "app",
        action: "open",
        target: "app",
        reference: "explicit",
        query: cleanQuery(message)
          .replace(/^(open|launch|start)\s+/i, "")
          .trim(),
        reasons,
      },
      0.82
    );
  }

  if (hasCurrent && /\b(workflow|context|file context)\b/.test(text)) {
    reasons.push("context status command detected");

    return finalize(
      {
        ...command,
        domain: "context",
        action: "status",
        target: "context",
        reference: "current",
        reasons,
      },
      0.8
    );
  }

  if (hasMemoryWord) {
    reasons.push("memory-related language detected but no deterministic action");
  }

  if (hasPlanWord) {
    reasons.push("planner-related language detected but no deterministic action");
  }

  if (hasFileWord) {
    reasons.push("file-related language detected but no deterministic action");
  }

  return finalize(
    {
      ...command,
      domain: "none",
      action: "none",
      target: "none",
      reference: "none",
      reasons,
    },
    reasons.length > 0 ? 0.25 : 0
  );
}