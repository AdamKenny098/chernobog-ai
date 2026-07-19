import type { ChernobogModule } from "@/lib/modules/types";

import { executeCharacterGeneratorCommand } from "./commands/executeCharacterGeneratorCommand";
import { parseCharacterGeneratorCommand } from "./commands/parseCharacterGeneratorCommand";
import type { CharacterGeneratorModuleCommand } from "./types";

function isCharacterGeneratorModuleCommand(
  value: unknown
): value is CharacterGeneratorModuleCommand {
  if (!value || typeof value !== "object") {
    return false;
  }

  const kind = (value as { kind?: unknown }).kind;

  if (
    kind === "character_generator_status" ||
    kind === "character_project_list"
  ) {
    return true;
  }

  if (kind === "character_project_create") {
    const candidate = value as { name?: unknown; prompt?: unknown };
    return (
      typeof candidate.prompt === "string" &&
      candidate.prompt.trim().length > 0 &&
      (candidate.name === undefined || typeof candidate.name === "string")
    );
  }

  if (kind === "character_project_show") {
    return (
      typeof (value as { projectId?: unknown }).projectId === "string"
    );
  }

  return false;
}

export const characterGeneratorModule: ChernobogModule = {
  id: "character-generator",
  displayName: "Character Forge",
  domains: ["character"],
  followUpPriority: 20,
  parseCommand: parseCharacterGeneratorCommand,

  async handleCommand(context) {
    if (!isCharacterGeneratorModuleCommand(context.command.moduleCommand)) {
      return {
        route: "tools",
        moduleId: "character-generator",
        reply:
          "Character Forge could not resolve that command. Use an explicit Character Forge command.",
      };
    }

    const result = await executeCharacterGeneratorCommand(
      context.command.moduleCommand
    );

    return {
      route: "tools",
      moduleId: "character-generator",
      reply: [result.title, "", result.message].join("\n"),
      modulePayload: {
        result,
      },
    };
  },
};
