import type { ParsedPlannerCommand } from "@/lib/chernobog/planner/types";
import type { MemoryArchitectureCommandKind } from "@/lib/chernobog/memory-architecture/commands";
import type { UnifiedCommand } from "./types";

type UnifiedToolCall =
  | {
      tool: "find_files";
      input: {
        query: string;
        maxResults?: number;
      };
    }
  | {
      tool: "read_text_file";
      input: {
        path: string;
      };
    }
  | {
      tool: "open_file";
      input: {
        path: string;
      };
    }
  | {
      tool: "open_app";
      input: {
        appName: string;
      };
    };

    export type UnifiedMemoryAction =
  | {
      kind: "remember";
      fact: string;
    }
  | {
      kind: "forget";
      fact: string;
    }
  | {
      kind: "wipe";
    }
  | {
      kind: "recall";
    };

    export function unifiedToMemoryAction(
        command: UnifiedCommand
      ): UnifiedMemoryAction | null {
        if (command.domain !== "memory") {
          return null;
        }
      
        if (command.action === "remember" && command.query) {
          return {
            kind: "remember",
            fact: command.query,
          };
        }
      
        if (command.action === "forget" && command.query) {
          return {
            kind: "forget",
            fact: command.query,
          };
        }
      
        if (command.action === "wipe") {
          return {
            kind: "wipe",
          };
        }
      
        if (command.action === "show" && command.target === "memory") {
          return {
            kind: "recall",
          };
        }
      
        return null;
      }

    export function unifiedToToolCall(command: UnifiedCommand): UnifiedToolCall | null {
        if (command.domain === "file") {
          if (command.action === "search" && command.query) {
            return {
              tool: "find_files",
              input: {
                query: command.query,
                maxResults: 8,
              },
            };
          }
      
          if (command.action === "read" && command.query) {
            return {
              tool: "read_text_file",
              input: {
                path: command.query,
              },
            };
          }
      
          if (command.action === "open" && command.query) {
            return {
              tool: "open_file",
              input: {
                path: command.query,
              },
            };
          }
        }
      
        if (command.domain === "app" && command.action === "open" && command.query) {
          return {
            tool: "open_app",
            input: {
              appName: command.query,
            },
          };
        }
      
        return null;
      }

export function unifiedToPlannerCommand(
  command: UnifiedCommand
): ParsedPlannerCommand | null {
  if (command.domain !== "planner") {
    return null;
  }

  if (command.action === "create") {
    return {
      kind: "create_plan",
      goal: command.query,
    };
  }

  if (command.action === "show") {
    return { kind: "show_plan" };
  }

  if (command.action === "continue") {
    return { kind: "next_step" };
  }

  if (command.action === "revise") {
    return {
      kind: "revise_plan",
      revision: command.query ?? command.raw,
    };
  }

  if (command.action === "complete") {
    return {
      kind: "complete_step",
      stepIndex: command.stepIndex,
    };
  }

  if (command.action === "block") {
    return {
      kind: "block_step",
      stepIndex: command.stepIndex,
    };
  }

  if (command.action === "clear") {
    return { kind: "clear_plan" };
  }

  return null;
}

export function unifiedToMemoryArchitectureCommand(
  command: UnifiedCommand
): MemoryArchitectureCommandKind | null {
  if (command.domain !== "memory") {
    return null;
  }

  if (command.action !== "show") {
    return null;
  }

  if (command.target === "memory_layers") {
    return "show_memory_layers";
  }

  if (command.target === "working_memory") {
    return "show_working_memory";
  }

  if (command.target === "short_term_memory") {
    return "show_short_term_memory";
  }

  if (command.target === "long_term_memory") {
    return "show_long_term_memory";
  }

  

  return null;
}