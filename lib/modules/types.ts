import type { UnifiedCommand } from "@/lib/chernobog/command-language";
import type { RouteName } from "@/lib/chernobog/session/types";

export type ModuleCommandContext = {
  userMessage: string;
  sessionId: string;
  command: UnifiedCommand;
};

export type ModuleFollowUpContext = {
  userMessage: string;
  sessionId: string;
};

export type ModuleHandlerResult = {
  route: RouteName;
  reply: string;
  moduleId?: string;
  modulePayload?: Record<string, unknown>;
};

export type ModuleCommandParser = (message: string) => UnifiedCommand | null;

export type ModuleCommandHandler = (
  context: ModuleCommandContext
) => Promise<ModuleHandlerResult>;

export type ModuleFollowUpHandler = (
  context: ModuleFollowUpContext
) => Promise<ModuleHandlerResult | null>;

export type ModuleRegistrySnapshot = {
  moduleCount: number;
  modules: Array<{
    id: string;
    displayName: string;
    domains: string[];
    toolCount: number;
    hasParser: boolean;
    hasCommandHandler: boolean;
    hasFollowUpHandler: boolean;
  }>;
};

export type ChernobogModule = {
  id: string;
  displayName: string;
  domains: string[];

  tools?: Record<string, unknown>;

  parseCommand?: ModuleCommandParser;
  handleCommand?: ModuleCommandHandler;
  handleFollowUp?: ModuleFollowUpHandler;
};