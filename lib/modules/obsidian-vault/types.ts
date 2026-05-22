export type VaultNoteType =
  | "note"
  | "project"
  | "feature"
  | "decision"
  | "dev_log"
  | "bug"
  | "task"
  | "concept"
  | "research";

export type VaultCommandAction =
  | "search"
  | "read"
  | "create"
  | "append"
  | "link"
  | "backlinks"
  | "orphans"
  | "index"
  | "daily_log"
  | "status";

export type VaultParsedCommand = {
  raw: string;
  normalized: string;
  domain: "vault";
  action: VaultCommandAction;
  note?: string;
  targetNote?: string;
  query?: string;
  content?: string;
  folder?: string;
  type?: VaultNoteType;
  project?: string;
  confidence: number;
  reasons: string[];
};

export type VaultNoteFrontmatter = Record<
  string,
  string | number | boolean | string[] | null | undefined
>;

export type VaultNoteSummary = {
  title: string;
  path: string;
  relativePath: string;
  extension: ".md";
  size: number;
  modifiedAt: string;
  createdAt?: string;
  frontmatter: VaultNoteFrontmatter;
  tags: string[];
  links: string[];
  excerpt: string;
};

export type VaultSearchResult = VaultNoteSummary & {
  score: number;
  matchedFields: string[];
};

export type VaultBacklink = {
  sourceTitle: string;
  sourcePath: string;
  sourceRelativePath: string;
  matchingLinks: string[];
};

export type VaultActiveNote = {
  title: string;
  path: string;
  relativePath: string;
  lastAction: "read" | "created" | "appended" | "linked" | "indexed" | "logged";
};

export type VaultGraphAction = {
  type: "backlinks" | "orphans" | "index";
  target?: string;
  resultCount?: number;
  updatedAt: string;
};

export type VaultSessionState = {
  sessionId: string;
  activeNote?: VaultActiveNote;
  lastSearch?: {
    query: string;
    resultCount: number;
    results: VaultSearchResult[];
    selectedIndex?: number;
    updatedAt: string;
  };
  lastGraphAction?: VaultGraphAction;
  lastBacklinks?: {
    note: string;
    count: number;
    results: VaultBacklink[];
    updatedAt: string;
  };
  lastOrphans?: {
    count: number;
    returnedCount: number;
    results: VaultNoteSummary[];
    updatedAt: string;
  };
  lastAction?: {
    action: VaultCommandAction;
    summary: string;
    updatedAt: string;
  };
};

export type VaultModulePayload = {
  activeVaultNote?: VaultActiveNote;
  vaultSearch?: {
    query: string;
    resultCount: number;
    results: VaultSearchResult[];
    selectedIndex?: number;
  };
  backlinks?: {
    note: string;
    count: number;
    results: VaultBacklink[];
  };
  orphans?: {
    count: number;
    returnedCount: number;
    results: VaultNoteSummary[];
  };
  graphAction?: VaultGraphAction;
  stateSummary?: string;
};
