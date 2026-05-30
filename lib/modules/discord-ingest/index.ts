import type { ChernobogModule } from "@/lib/modules/types";
import { parseDiscordCommand } from "./commands/parseDiscordCommand";
import { handleDiscordCommand } from "./commands/executeDiscordCommand";

export const discordIngestModule: ChernobogModule = {
  id: "discord-ingest",
  displayName: "Discord Ingest",
  domains: ["discord"],
  followUpPriority: 40,

  parseCommand: parseDiscordCommand,
  handleCommand: handleDiscordCommand,
};