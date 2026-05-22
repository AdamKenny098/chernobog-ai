import { obsidianVaultModule } from "@/lib/modules/adapters/obsidianVaultAdapter";
import type {
  ChernobogModule,
  ModuleCommandContext,
  ModuleFollowUpContext,
  ModuleHandlerResult,
} from "@/lib/modules/types";
import type { UnifiedCommand } from "@/lib/chernobog/command-language";

const registeredModules: ChernobogModule[] = [
  obsidianVaultModule,
];

export function getRegisteredModules(): ChernobogModule[] {
  return [...registeredModules];
}

export function buildModuleToolRegistry(): Record<string, unknown> {
  const tools: Record<string, unknown> = {};

  for (const module of registeredModules) {
    if (!module.tools) {
      continue;
    }

    Object.assign(tools, module.tools);
  }

  return tools;
}

export function parseRegisteredModuleCommand(
  message: string
): UnifiedCommand | null {
  for (const module of registeredModules) {
    if (!module.parseCommand) {
      continue;
    }

    const parsed = module.parseCommand(message);

    if (parsed) {
      return parsed;
    }
  }

  return null;
}

export function getModuleForDomain(domain: string): ChernobogModule | null {
  return (
    registeredModules.find((module) => module.domains.includes(domain)) ?? null
  );
}

export async function handleRegisteredModuleCommand(
  context: ModuleCommandContext
): Promise<ModuleHandlerResult | null> {
  const module = getModuleForDomain(context.command.domain);

  if (!module || !module.handleCommand) {
    return null;
  }

  return module.handleCommand(context);
}

export async function tryHandleRegisteredModuleFollowUp(
  context: ModuleFollowUpContext
): Promise<ModuleHandlerResult | null> {
  for (const module of registeredModules) {
    if (!module.handleFollowUp) {
      continue;
    }

    const result = await module.handleFollowUp(context);

    if (result) {
      return result;
    }
  }

  return null;
}