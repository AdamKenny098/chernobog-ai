import type { UnifiedCommand } from "@/lib/chernobog/command-language";
import type { RouteName } from "@/lib/chernobog/session/types";
import {
  getModuleForDomain,
  handleRegisteredModuleCommand,
  tryHandleRegisteredModuleFollowUp,
} from "@/lib/modules/registry";

export type DomainHandlerContext = {
  userMessage: string;
  sessionId: string;
  command: UnifiedCommand;
};

export type DomainHandlerResult = {
  route: RouteName;
  reply: string;
  moduleId?: string;
  modulePayload?: Record<string, unknown>;
};

export type DomainHandler = (
  context: DomainHandlerContext
) => Promise<DomainHandlerResult>;

export function getDomainHandler(domain: string): DomainHandler | null {
  const module = getModuleForDomain(domain);

  if (!module || !module.handleCommand) {
    return null;
  }

  return async (context: DomainHandlerContext): Promise<DomainHandlerResult> => {
    const result = await handleRegisteredModuleCommand(context);

    if (!result) {
      return {
        route: "chat",
        moduleId: module.id,
        reply: `No module handler is registered for the "${domain}" domain.`,
      };
    }

    return result;
  };
}

export async function tryHandleModuleFollowUp(context: {
  userMessage: string;
  sessionId: string;
}): Promise<DomainHandlerResult | null> {
  return tryHandleRegisteredModuleFollowUp({
    userMessage: context.userMessage,
    sessionId: context.sessionId,
  });
}