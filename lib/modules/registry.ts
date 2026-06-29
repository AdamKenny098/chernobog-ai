import type { UnifiedCommand } from "@/lib/chernobog/command-language";
import { obsidianVaultModule } from "@/lib/modules/adapters/obsidianVaultAdapter";
import { discordIngestModule } from "@/lib/modules/discord-ingest";
import { fileWorkflowModule } from "@/lib/modules/file-workflow";
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

function getFollowUpPriority(moduleEntry: ChernobogModule): number {
  return moduleEntry.followUpPriority ?? 0;
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

  for (const moduleEntry of modules) {
    if (moduleIds.has(moduleEntry.id)) {
      errors.push(`Duplicate module id registered: ${moduleEntry.id}`);
    }

    moduleIds.add(moduleEntry.id);

    for (const domain of moduleEntry.domains) {
      const existingOwner = domains.get(domain);

      if (existingOwner) {
        errors.push(
          `Domain "${domain}" is claimed by both "${existingOwner}" and "${moduleEntry.id}".`
        );
      }

      domains.set(domain, moduleEntry.id);
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

  return (
    registeredModules.find((moduleEntry) => moduleEntry.id === moduleId) ?? null
  );
}

async function tryModuleFollowUp(
  moduleEntry: ChernobogModule,
  context: ModuleFollowUpContext
): Promise<ModuleHandlerResult | null> {
  if (!moduleEntry.handleFollowUp) {
    return null;
  }

  const result = await moduleEntry.handleFollowUp(context);

  if (!result) {
    return null;
  }

  markModuleActive(context.sessionId, moduleEntry.id);

  return {
    ...result,
    moduleId: result.moduleId ?? moduleEntry.id,
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
    modules: registeredModules.map((moduleEntry) => ({
      id: moduleEntry.id,
      displayName: moduleEntry.displayName,
      domains: [...moduleEntry.domains],
      toolCount: moduleEntry.tools ? Object.keys(moduleEntry.tools).length : 0,
      followUpPriority: getFollowUpPriority(moduleEntry),
      hasParser: Boolean(moduleEntry.parseCommand),
      hasCommandHandler: Boolean(moduleEntry.handleCommand),
      hasFollowUpHandler: Boolean(moduleEntry.handleFollowUp),
    })),
  };
}

export function buildModuleToolRegistry(): Record<string, unknown> {
  const tools: Record<string, unknown> = {};
  const owners = new Map<string, string>();

  for (const moduleEntry of registeredModules) {
    if (!moduleEntry.tools) {
      continue;
    }

    for (const [toolName, toolDefinition] of Object.entries(moduleEntry.tools)) {
      const existingOwner = owners.get(toolName);

      if (existingOwner) {
        throw new Error(
          `Tool "${toolName}" is registered by both "${existingOwner}" and "${moduleEntry.id}".`
        );
      }

      owners.set(toolName, moduleEntry.id);
      tools[toolName] = toolDefinition;
    }
  }

  return tools;
}

export function parseRegisteredModuleCommand(
  message: string
): UnifiedCommand | null {
  const parsedCommands: UnifiedCommand[] = [];

  for (const moduleEntry of registeredModules) {
    if (!moduleEntry.parseCommand) {
      continue;
    }

    const parsed = moduleEntry.parseCommand(message);

    if (!parsed) {
      continue;
    }

    parsedCommands.push({
      ...parsed,
      moduleId: parsed.moduleId ?? moduleEntry.id,
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
      (moduleEntry) => moduleEntry.id === a.moduleId
    );
    const bModule = registeredModules.find(
      (moduleEntry) => moduleEntry.id === b.moduleId
    );

    const aPriority = aModule?.followUpPriority ?? 0;
    const bPriority = bModule?.followUpPriority ?? 0;

    return bPriority - aPriority;
  })[0];
}

export function getModuleForDomain(domain: string): ChernobogModule | null {
  return (
    registeredModules.find((moduleEntry) => moduleEntry.domains.includes(domain)) ??
    null
  );
}

export async function handleRegisteredModuleCommand(
  context: ModuleCommandContext
): Promise<ModuleHandlerResult | null> {
  const moduleEntry = getModuleForDomain(context.command.domain);

  if (!moduleEntry || !moduleEntry.handleCommand) {
    return null;
  }

  const result = await moduleEntry.handleCommand(context);
  markModuleActive(context.sessionId, moduleEntry.id);

  return {
    ...result,
    moduleId: result.moduleId ?? moduleEntry.id,
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

  for (const moduleEntry of priorityModules) {
    if (activeModule && moduleEntry.id === activeModule.id) {
      continue;
    }

    const result = await tryModuleFollowUp(moduleEntry, context);

    if (result) {
      return result;
    }
  }

  return null;
}
