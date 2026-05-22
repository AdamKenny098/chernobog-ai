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
export { handleVaultCommand, handleVaultFollowUp } from "./commands/executeVaultCommand";
export { vaultToolRegistry } from "./tools/registry";
export type {
  VaultParsedCommand,
  VaultNoteSummary,
  VaultSearchResult,
  VaultSessionState,
  VaultModulePayload,
} from "./types";

export { parseVaultFollowUp } from "./commands/parseVaultFollowUp";
export { parseVaultMemoryBridge } from "./commands/parseVaultMemoryBridge";
export { getVaultSessionState, buildVaultModulePayload } from "./session/vaultSession";
