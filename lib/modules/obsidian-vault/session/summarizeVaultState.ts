import type { VaultSessionState } from "../types";
import { summarizeVaultState as summarize } from "./vaultSession";

export function summarizeVaultState(state: VaultSessionState): string {
  return summarize(state);
}
