import type { UnifiedCommand } from "@/lib/chernobog/command-language";
import { obsidianVaultModule } from "@/lib/modules/adapters/obsidianVaultAdapter";
import { fileWorkflowModule } from "@/lib/modules/file-workflow";
import { discordIngestModule } from "@/lib/modules/discord-ingest";
import { minecraftSchematicModule } from "@/lib/modules/minecraft-schematic";

import type {
  ChernobogModule,
  ModuleCommandContext,
  ModuleFollowUpContext,
  ModuleHandlerResult,
  ModuleRegistrySnapshot,
} from "@/lib/modules/types";

const registeredModules: ChernobogModule[] = [
  obsidianVaultModule,
  fileWorkflowModule,
  discordIngestModule,
  minecraftSchematicModule,
];

const activeModuleBySession = new Map<string, string>();

function getFollowUpPriority(module: ChernobogModule): number {
  return module.followUpPriority ?? 0;
}

function getModulesByFollowUpPriority(): ChernobogModule[] {
  return [...registeredModules].sort((a, b) => {
    const priorityDelta = getFollowUpPriority(b) - getFollowUpPriority(a);

    if (priorityDelta !== 0) {
      return priorityDelta;
    }

    return a.id.localeCompare(b.id);
  });
}

function validateRegisteredModules(modules: ChernobogModule[]) {
  const moduleIds = new Set<string>();
  const domains = new Map<string, string>();
  const errors: string[] = [];

  for (const module of modules) {
    if (moduleIds.has(module.id)) {
      errors.push(`Duplicate module id registered: ${module.id}`);
    }

    moduleIds.add(module.id);

    for (const domain of module.domains) {
      const existingOwner = domains.get(domain);

      if (existingOwner) {
        errors.push(
          `Domain "${domain}" is claimed by both "${existingOwner}" and "${module.id}".`
        );
      }

      domains.set(domain, module.id);
    }
  }

  if (errors.length > 0) {
    throw new Error(`Invalid Chernobog module registry:\n${errors.join("\n")}`);
  }
}

function markModuleActive(sessionId: string, moduleId: string) {
  activeModuleBySession.set(sessionId, moduleId);
}

function getActiveModuleForSession(sessionId: string): ChernobogModule | null {
  const moduleId = activeModuleBySession.get(sessionId);

  if (!moduleId) {
    return null;
  }

  return registeredModules.find((module) => module.id === moduleId) ?? null;
}

async function tryModuleFollowUp(
  module: ChernobogModule,
  context: ModuleFollowUpContext
): Promise<ModuleHandlerResult | null> {
  if (!module.handleFollowUp) {
    return null;
  }

  const result = await module.handleFollowUp(context);

  if (!result) {
    return null;
  }

  markModuleActive(context.sessionId, module.id);

  return {
    ...result,
    moduleId: result.moduleId ?? module.id,
  };
}

validateRegisteredModules(registeredModules);

export function getRegisteredModules(): ChernobogModule[] {
  return [...registeredModules];
}

export function getModuleRegistrySnapshot(): ModuleRegistrySnapshot {
  return {
    moduleCount: registeredModules.length,
    activeSessionCount: activeModuleBySession.size,
    modules: registeredModules.map((module) => ({
      id: module.id,
      displayName: module.displayName,
      domains: [...module.domains],
      toolCount: module.tools ? Object.keys(module.tools).length : 0,
      followUpPriority: getFollowUpPriority(module),
      hasParser: Boolean(module.parseCommand),
      hasCommandHandler: Boolean(module.handleCommand),
      hasFollowUpHandler: Boolean(module.handleFollowUp),
    })),
  };
}

export function buildModuleToolRegistry(): Record<string, unknown> {
  const tools: Record<string, unknown> = {};
  const owners = new Map<string, string>();

  for (const module of registeredModules) {
    if (!module.tools) {
      continue;
    }

    for (const [toolName, toolDefinition] of Object.entries(module.tools)) {
      const existingOwner = owners.get(toolName);

      if (existingOwner) {
        throw new Error(
          `Tool "${toolName}" is registered by both "${existingOwner}" and "${module.id}".`
        );
      }

      owners.set(toolName, module.id);
      tools[toolName] = toolDefinition;
    }
  }

  return tools;
}

export function parseRegisteredModuleCommand(
  message: string
): UnifiedCommand | null {
  const parsedCommands: UnifiedCommand[] = [];

  for (const registeredModule of registeredModules) {
    if (!registeredModule.parseCommand) {
      continue;
    }

    const parsed = registeredModule.parseCommand(message);

    if (!parsed) {
      continue;
    }

    parsedCommands.push({
      ...parsed,
      moduleId: parsed.moduleId ?? registeredModule.id,
    });
  }

  if (parsedCommands.length === 0) {
    return null;
  }

  return parsedCommands.sort((a, b) => {
    const confidenceDelta = b.confidence - a.confidence;

    if (confidenceDelta !== 0) {
      return confidenceDelta;
    }

    const aModule = registeredModules.find(
      (registeredModule) => registeredModule.id === a.moduleId
    );
    const bModule = registeredModules.find(
      (registeredModule) => registeredModule.id === b.moduleId
    );

    const aPriority = aModule?.followUpPriority ?? 0;
    const bPriority = bModule?.followUpPriority ?? 0;

    return bPriority - aPriority;
  })[0];
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

  const result = await module.handleCommand(context);

  markModuleActive(context.sessionId, module.id);

  return {
    ...result,
    moduleId: result.moduleId ?? module.id,
  };
}

export async function tryHandleRegisteredModuleFollowUp(
  context: ModuleFollowUpContext
): Promise<ModuleHandlerResult | null> {
  const activeModule = getActiveModuleForSession(context.sessionId);

  if (activeModule) {
    const activeResult = await tryModuleFollowUp(activeModule, context);

    if (activeResult) {
      return activeResult;
    }
  }

  const priorityModules = getModulesByFollowUpPriority();

  for (const module of priorityModules) {
    if (activeModule && module.id === activeModule.id) {
      continue;
    }

    const result = await tryModuleFollowUp(module, context);

    if (result) {
      return result;
    }
  }

  return null;
}