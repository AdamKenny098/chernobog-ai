import type { UnifiedCommand } from "@/lib/chernobog/command-language";
import type { RouteName } from "@/lib/chernobog/session/types";
import { handleVaultCommand } from "@/lib/modules/obsidian-vault";
import type { VaultParsedCommand } from "@/lib/modules/obsidian-vault";

export type DomainHandlerContext = {
  userMessage: string;
  sessionId: string;
  command: UnifiedCommand;
};

export type DomainHandlerResult = {
  route: RouteName;
  reply: string;
  modulePayload?: Record<string, unknown>;
};

export type DomainHandler = (
  context: DomainHandlerContext
) => Promise<DomainHandlerResult>;

function normalizeModuleRoute(route: string): RouteName {
  switch (route) {
    case "tools":
    case "memory":
    case "planner":
    case "guardian":
    case "chat":
      return route;

    default:
      return "chat";
  }
}

function getVaultModuleCommand(command: UnifiedCommand): VaultParsedCommand | null {
  if (command.domain !== "vault") {
    return null;
  }

  const moduleCommand = command.moduleCommand as VaultParsedCommand | undefined;

  if (!moduleCommand || moduleCommand.domain !== "vault") {
    return null;
  }

  return moduleCommand;
}

async function handleVaultDomain(
  context: DomainHandlerContext
): Promise<DomainHandlerResult> {
  const vaultCommand = getVaultModuleCommand(context.command);

  if (!vaultCommand) {
    return {
      route: "tools",
      reply:
        "Vault command was recognized, but the vault module payload was missing.",
    };
  }

  const result = await handleVaultCommand({
    userMessage: context.userMessage,
    sessionId: context.sessionId,
    command: vaultCommand,
  });

  return {
    route: normalizeModuleRoute(result.route),
    reply: result.reply,
    modulePayload: result.modulePayload,
  };
}

const domainHandlers: Record<string, DomainHandler> = {
  vault: handleVaultDomain,
};

export function getDomainHandler(domain: string): DomainHandler | null {
  return domainHandlers[domain] ?? null;
}