import type { ChernobogModule } from "@/lib/modules/types";
import { executeParsedMinecraftSchematicCommand } from "./commands/executeMinecraftSchematicCommand";
import { parseMinecraftSchematicUnifiedCommand } from "./commands/parseMinecraftSchematicCommand";

export const minecraftSchematicModule: ChernobogModule = {
  id: "minecraft-schematic",
  displayName: "Minecraft Schematic Generator",
  domains: ["schematic"],
  followUpPriority: 25,

  parseCommand: parseMinecraftSchematicUnifiedCommand,

  async handleCommand(context) {
    const commandPayload =
      context.command.moduleCommand ?? context.command ?? context.userMessage;

    const result = await executeParsedMinecraftSchematicCommand(commandPayload);

    return {
      route: "tools",
      moduleId: "minecraft-schematic",
      reply: [result.title, "", result.message].join("\n"),
      modulePayload: {
        result,
      },
    };
  },
};