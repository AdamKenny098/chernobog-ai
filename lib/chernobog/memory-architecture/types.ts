import type { SessionContext } from "@/lib/chernobog/session/types";
import type { OllamaMessage } from "@/lib/chernobog/router";

export type MemoryLayer = "short_term" | "working" | "long_term";

export type MemoryContextBlock = {
  layer: MemoryLayer;
  title: string;
  lines: string[];
};

export type WorkingMemorySnapshot = {
  sessionId: string;
  lastRoute: string | null;
  lastTool: string | null;
  activePlan: {
    id: string;
    title: string;
    status: string;
    stepCount: number;
    activeStep: string | null;
  } | null;
  fileContext: {
    lastSearchQuery: string | null;
    lastSearchRoot: string | null;
    lastSelectedFile: string | null;
    lastReadFile: string | null;
    workflowKind: string;
    workflowStep: string;
    workflowCandidateCount: number;
  };
};

export type BuiltMemoryContext = {
  shortTerm: MemoryContextBlock;
  working: MemoryContextBlock;
  longTerm: MemoryContextBlock;
  systemText: string;
};

export type BuildMemoryContextInput = {
    session: SessionContext;
    persistedMemories: string[];
    recentMessages: OllamaMessage[];
    userMessage?: string;
  };