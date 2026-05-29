import type { UnifiedCommand } from "@/lib/chernobog/command-language";
import { obsidianVaultModule } from "@/lib/modules/adapters/obsidianVaultAdapter";
import { fileWorkflowModule } from "@/lib/modules/file-workflow";
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
];

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

validateRegisteredModules(registeredModules);

export function getRegisteredModules(): ChernobogModule[] {
  return [...registeredModules];
}

export function getModuleRegistrySnapshot(): ModuleRegistrySnapshot {
  return {
    moduleCount: registeredModules.length,
    modules: registeredModules.map((module) => ({
      id: module.id,
      displayName: module.displayName,
      domains: [...module.domains],
      toolCount: module.tools ? Object.keys(module.tools).length : 0,
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
  for (const module of registeredModules) {
    if (!module.parseCommand) {
      continue;
    }

    const parsed = module.parseCommand(message);

    if (parsed) {
      return {
        ...parsed,
        moduleId: parsed.moduleId ?? module.id,
      };
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

  const result = await module.handleCommand(context);

  return {
    ...result,
    moduleId: result.moduleId ?? module.id,
  };
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
      return {
        ...result,
        moduleId: result.moduleId ?? module.id,
      };
    }
  }

  return null;
}