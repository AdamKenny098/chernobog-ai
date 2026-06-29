import { vaultSearchTool } from "./vaultSearchTool";
import { vaultReadNoteTool } from "./vaultReadNoteTool";
import { vaultCreateNoteTool } from "./vaultCreateNoteTool";
import { vaultAppendNoteTool } from "./vaultAppendNoteTool";
import { vaultLinkNotesTool } from "./vaultLinkNotesTool";
import { vaultBacklinksTool } from "./vaultBacklinksTool";
import { vaultOrphansTool } from "./vaultOrphansTool";
import { vaultIndexTool } from "./vaultIndexTool";
import { vaultDailyLogTool } from "./vaultDailyLogTool";

export const vaultToolRegistry = {
  vault_search: vaultSearchTool,
  vault_read_note: vaultReadNoteTool,
  vault_create_note: vaultCreateNoteTool,
  vault_append_note: vaultAppendNoteTool,
  vault_link_notes: vaultLinkNotesTool,
  vault_backlinks: vaultBacklinksTool,
  vault_find_orphans: vaultOrphansTool,
  vault_generate_index: vaultIndexTool,
  vault_daily_log: vaultDailyLogTool,
} as const;

export type VaultToolName = keyof typeof vaultToolRegistry;
