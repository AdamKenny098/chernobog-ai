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
  | "daily_log";

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

export type VaultModulePayload = {
  activeVaultNote?: {
    title: string;
    path: string;
    relativePath: string;
    lastAction: "read" | "created" | "appended" | "linked" | "indexed";
  };
  vaultSearch?: {
    query: string;
    resultCount: number;
    results: VaultSearchResult[];
  };
  backlinks?: {
    note: string;
    count: number;
    results: VaultBacklink[];
  };
  orphans?: {
    count: number;
    results: VaultNoteSummary[];
  };
};
