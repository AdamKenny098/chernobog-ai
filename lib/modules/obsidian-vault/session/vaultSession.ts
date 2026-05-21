export type VaultSessionState = {
  activeNote?: {
    title: string;
    path: string;
    relativePath: string;
    lastAction: "read" | "created" | "appended" | "linked" | "indexed";
  };
  lastSearch?: {
    query: string;
    resultCount: number;
    selectedIndex?: number;
  };
  lastBacklinks?: {
    note: string;
    count: number;
  };
  lastOrphanCount?: number;
};

export function emptyVaultSessionState(): VaultSessionState {
  return {};
}
