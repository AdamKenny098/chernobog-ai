import type { ChernobogModule } from "./contract";
import { parseVaultCommand } from "./commands/parseVaultCommand";
import { handleVaultCommand } from "./commands/executeVaultCommand";
import { vaultToolRegistry } from "./tools/registry";

export const obsidianVaultModule = {
  id: "obsidian-vault",
  displayName: "Obsidian Vault",
  parseCommand: parseVaultCommand,
  handleCommand: handleVaultCommand,
  tools: vaultToolRegistry,
} satisfies ChernobogModule;

export { parseVaultCommand } from "./commands/parseVaultCommand";
export { handleVaultCommand } from "./commands/executeVaultCommand";
export { vaultToolRegistry } from "./tools/registry";
export type { VaultParsedCommand, VaultNoteSummary, VaultSearchResult } from "./types";
