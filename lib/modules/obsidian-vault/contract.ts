import type { VaultModulePayload, VaultParsedCommand } from "./types";

export type ModuleCommandResult = {
  route: "tools" | "memory" | "planner" | "context" | "chat";
  reply: string;
  modulePayload?: VaultModulePayload;
};

export type ModuleCommandContext = {
  userMessage: string;
  sessionId: string;
  command: VaultParsedCommand;
};

export type ChernobogModule = {
  id: string;
  displayName: string;
  parseCommand?: (message: string) => VaultParsedCommand | null;
  handleCommand?: (
    context: ModuleCommandContext
  ) => Promise<ModuleCommandResult>;
  tools?: Record<string, unknown>;
};
