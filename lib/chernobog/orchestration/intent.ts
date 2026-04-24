import type { SessionContext } from "@/lib/chernobog/session/types";

export type OrchestrationIntent =
  | "none"
  | "search"
  | "read_selected"
  | "open_selected"
  | "search_then_read"
  | "search_then_open"
  | "open_containing_folder";;

export type ParsedOrchestrationIntent = {
  intent: OrchestrationIntent;
  query?: string;
  confidence: number;
};

function normalize(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function cleanSearchQuery(value: string) {
  return value
    .replace(/\b(can you|could you|please|chernobog)\b/g, "")
    .replace(/\b(find|search for|search|look for|locate)\b/g, "")
    .replace(/\b(and then|then|and)\b/g, " ")
    .replace(/\b(read|open|show|display)\b/g, "")
    .replace(/\b(the|a|an|file|document|doc|first one|first result|it|that)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseOrchestrationIntent(
    message: string,
    session: SessionContext
  ): ParsedOrchestrationIntent {
    const text = normalize(message);
  
    const hasSearch = /\b(find|search|search for|look for|locate)\b/.test(text);
    const hasRead = /\b(read|show|display)\b/.test(text);
    const hasOpen = /\b(open|launch|reveal)\b/.test(text);
  
    const hasFirstRef = /\b(first one|first result|top result|1st one)\b/.test(text);
    const hasSoftRef = /\b(it|that|this|same one|same file)\b/.test(text);
  
    const hasFileWord =
      /\b(file|folder|document|doc|txt|md|pdf|note|notes|roadmap|readme|json|csv|log)\b/.test(
        text
      );
  
    const wantsContainingFolder =
      /\b(containing folder|parent folder|folder it is in|folder of|where it is)\b/.test(
        text
      );
  
    const hasSearchContext =
      Boolean(session.fileContext?.lastSearch?.results?.length) ||
      (session.workflow.kind === "file" && session.workflow.candidates.length > 0);
  
    const hasReadContext = Boolean(session.fileContext?.lastRead?.path);
    const hasSelectedContext = Boolean(session.fileContext?.lastSelected?.path);
    const hasFileContext = hasSearchContext || hasReadContext || hasSelectedContext;
  
    if (hasSearch && hasRead) {
      return {
        intent: "search_then_read",
        query: cleanSearchQuery(text),
        confidence: 0.95,
      };
    }
  
    if (hasSearch && hasOpen) {
      return {
        intent: "search_then_open",
        query: cleanSearchQuery(text),
        confidence: 0.95,
      };
    }
  
    if (wantsContainingFolder && hasOpen && hasFileContext) {
      return {
        intent: "open_containing_folder",
        confidence: 0.9,
      };
    }
  
    if (hasSearch) {
      return {
        intent: "search",
        query: cleanSearchQuery(text),
        confidence: 0.85,
      };
    }
  
    if (hasRead && (hasFirstRef || hasSoftRef) && hasSearchContext) {
      return {
        intent: "read_selected",
        confidence: 0.9,
      };
    }
  
    if (hasOpen && (hasFirstRef || hasSoftRef) && hasFileContext) {
      return {
        intent: "open_selected",
        confidence: 0.9,
      };
    }
  
    if (hasOpen && hasFileWord) {
      return {
        intent: "search_then_open",
        query: cleanSearchQuery(text),
        confidence: 0.8,
      };
    }
  
    return {
      intent: "none",
      confidence: 0,
    };
  }