import path from "node:path";
import { promises as fs } from "node:fs";
import type { VaultMemoryEntry, VaultMemoryEntryInput } from "./memoryTypes";
import { buildVaultMemoryManifest, type VaultMemoryManifest } from "./memoryManifest";
import type { VaultMemoryStatus } from "./memoryStatus";
import { assertVaultMemoryStatusTransition } from "./memoryStatus";
import type { VaultMemoryType } from "./memoryTypes";
import { publishChernobogEventSafely } from "../../chernobog/events/publishers";

export type VaultMemoryAuditEvent = {
  id: string;
  memoryEntryId: string;
  action:
    | "created"
    | "updated"
    | "status-changed"
    | "reviewed"
    | "approved"
    | "rejected"
    | "stale"
    | "superseded";
  previousStatus?: VaultMemoryStatus;
  nextStatus?: VaultMemoryStatus;
  note?: string;
  actor?: string;
  createdAt: string;
};

export type VaultMemoryStorePaths = {
  rootDir: string;
  entriesPath: string;
  manifestPath: string;
  auditLogPath: string;
};

export type VaultMemoryStoreOptions = {
  rootDir?: string;
};

export type VaultMemoryListFilter = {
  status?: VaultMemoryStatus;
  statuses?: VaultMemoryStatus[];
  memoryType?: VaultMemoryType;
  memoryTypes?: VaultMemoryType[];
  projectId?: string;
  version?: string;
  tags?: string[];
  text?: string;
  limit?: number;
};

export type VaultMemoryStatusUpdate = {
  status: VaultMemoryStatus;
  note?: string;
  actor?: string;
  supersededBy?: string;
};

const DEFAULT_MEMORY_ROOT = path.join(
  process.cwd(),
  "vault",
  "chernobog",
  "system",
  "vault-brain",
  "structured-memory"
);

function stableId(prefix = "mem"): string {
  const stamp = new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14);
  const random = Math.random().toString(36).slice(2, 9);
  return `${prefix}-${stamp}-${random}`;
}

function clampConfidence(value: number): number {
  if (!Number.isFinite(value)) {
    return 0.5;
  }

  return Math.max(0, Math.min(1, value));
}

function unique(values: string[]): string[] {
  return Array.from(
    new Set(
      values
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean)
    )
  );
}

async function readJsonFile<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return fallback;
    }

    throw error;
  }
}

async function writeJsonFile<T>(filePath: string, value: T): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function matchesText(entry: VaultMemoryEntry, text: string): boolean {
  const query = text.trim().toLowerCase();
  if (!query) {
    return true;
  }

  const haystack = [
    entry.id,
    entry.title,
    entry.body,
    entry.projectId ?? "",
    entry.version ?? "",
    entry.memoryType,
    entry.status,
    ...entry.tags,
    entry.sourceRef?.path ?? "",
    entry.sourceRef?.url ?? "",
  ]
    .join("\n")
    .toLowerCase();

  return query.split(/\s+/g).every((token) => haystack.includes(token));
}

export class VaultMemoryStore {
  readonly paths: VaultMemoryStorePaths;

  constructor(options: VaultMemoryStoreOptions = {}) {
    const rootDir = options.rootDir ?? process.env.CHERNOBOG_STRUCTURED_MEMORY_ROOT ?? DEFAULT_MEMORY_ROOT;
    this.paths = {
      rootDir,
      entriesPath: path.join(rootDir, "entries.json"),
      manifestPath: path.join(rootDir, "manifest.json"),
      auditLogPath: path.join(rootDir, "audit-log.json"),
    };
  }

  async ensureReady(): Promise<void> {
    await fs.mkdir(this.paths.rootDir, { recursive: true });

    const entries = await this.loadEntries();
    await this.saveEntries(entries);
  }

  async loadEntries(): Promise<VaultMemoryEntry[]> {
    return readJsonFile<VaultMemoryEntry[]>(this.paths.entriesPath, []);
  }

  async saveEntries(entries: VaultMemoryEntry[]): Promise<VaultMemoryManifest> {
    const sorted = [...entries].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    const manifest = buildVaultMemoryManifest(sorted);

    await writeJsonFile(this.paths.entriesPath, sorted);
    await writeJsonFile(this.paths.manifestPath, manifest);

    return manifest;
  }

  async loadManifest(): Promise<VaultMemoryManifest> {
    const entries = await this.loadEntries();
    return this.saveEntries(entries);
  }

  async loadAuditLog(): Promise<VaultMemoryAuditEvent[]> {
    return readJsonFile<VaultMemoryAuditEvent[]>(this.paths.auditLogPath, []);
  }

  async appendAuditEvent(
    event: Omit<VaultMemoryAuditEvent, "id" | "createdAt">
  ): Promise<VaultMemoryAuditEvent> {
    const audit = await this.loadAuditLog();
    const next: VaultMemoryAuditEvent = {
      id: stableId("audit"),
      createdAt: new Date().toISOString(),
      ...event,
    };

    audit.push(next);
    await writeJsonFile(this.paths.auditLogPath, audit);
    return next;
  }

  async listEntries(filter: VaultMemoryListFilter = {}): Promise<VaultMemoryEntry[]> {
    const entries = await this.loadEntries();
    const statuses = filter.statuses ?? (filter.status ? [filter.status] : undefined);
    const memoryTypes = filter.memoryTypes ?? (filter.memoryType ? [filter.memoryType] : undefined);
    const tags = filter.tags ? unique(filter.tags) : undefined;

    const filtered = entries.filter((entry) => {
      if (statuses && !statuses.includes(entry.status)) {
        return false;
      }

      if (memoryTypes && !memoryTypes.includes(entry.memoryType)) {
        return false;
      }

      if (filter.projectId && entry.projectId !== filter.projectId) {
        return false;
      }

      if (filter.version && entry.version !== filter.version) {
        return false;
      }

      if (tags && !tags.every((tag) => entry.tags.includes(tag))) {
        return false;
      }

      if (filter.text && !matchesText(entry, filter.text)) {
        return false;
      }

      return true;
    });

    const sorted = filtered.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    return typeof filter.limit === "number" ? sorted.slice(0, filter.limit) : sorted;
  }

  async getEntry(id: string): Promise<VaultMemoryEntry | undefined> {
    const entries = await this.loadEntries();
    return entries.find((entry) => entry.id === id);
  }

  async upsertEntry(input: VaultMemoryEntryInput): Promise<VaultMemoryEntry> {
    const now = new Date().toISOString();
    const entries = await this.loadEntries();
    const id = input.id ?? stableId("mem");
    const existingIndex = entries.findIndex((entry) => entry.id === id);

    const next: VaultMemoryEntry = {
      id,
      title: input.title.trim(),
      body: input.body.trim(),
      source: input.source,
      memoryType: input.memoryType,
      status: input.status,
      projectId: input.projectId,
      version: input.version,
      tags: unique(input.tags ?? []),
      confidence: clampConfidence(input.confidence ?? 0.5),
      createdAt: input.createdAt ?? entries[existingIndex]?.createdAt ?? now,
      updatedAt: input.updatedAt ?? now,
      sourceRef: input.sourceRef,
      reviewNotes: input.reviewNotes,
      reviewedAt: entries[existingIndex]?.reviewedAt,
      approvedAt: entries[existingIndex]?.approvedAt,
      rejectedAt: entries[existingIndex]?.rejectedAt,
      staleAt: entries[existingIndex]?.staleAt,
      supersededAt: entries[existingIndex]?.supersededAt,
      supersededBy: entries[existingIndex]?.supersededBy,
    };

    if (existingIndex >= 0) {
      entries[existingIndex] = next;
      await this.appendAuditEvent({
        memoryEntryId: id,
        action: "updated",
        note: "Structured memory entry updated.",
      });
    } else {
      entries.push(next);
      await this.appendAuditEvent({
        memoryEntryId: id,
        action: "created",
        nextStatus: next.status,
        note: "Structured memory entry created.",
      });
    }

    await this.saveEntries(entries);

    const eventType =
      existingIndex >= 0
        ? "memory.updated"
        : "memory.created";

    await publishChernobogEventSafely({
      type: eventType,

      source: {
        subsystem: "vault-brain",
      },

      severity: "info",

      subject: next.id,

      scope: next.projectId
        ? `project:${next.projectId}`
        : "memory",

      payload: {
        memoryEntryId: next.id,
        memoryType: next.memoryType,
        status: next.status,
        projectId: next.projectId,
        version: next.version,
        confidence: next.confidence,
      },

      metadata: {
        tags: [
          "memory",
          next.memoryType,
          existingIndex >= 0
            ? "updated"
            : "created",
        ],
      },
    });

    return next;
  }

  async createRawEntry(
    input: Omit<VaultMemoryEntryInput, "status" | "memoryType">
  ): Promise<VaultMemoryEntry> {
    return this.upsertEntry({
      ...input,
      memoryType: "raw",
      status: "raw",
    });
  }

  async updateStatus(
    id: string,
    update: VaultMemoryStatusUpdate
  ): Promise<VaultMemoryEntry> {
    const entries = await this.loadEntries();
    const index = entries.findIndex((entry) => entry.id === id);

    if (index < 0) {
      throw new Error(`Structured memory entry not found: ${id}`);
    }

    const current = entries[index];
    assertVaultMemoryStatusTransition(current.status, update.status);

    const now = new Date().toISOString();
    const next: VaultMemoryEntry = {
      ...current,
      status: update.status,
      updatedAt: now,
      reviewNotes: update.note ?? current.reviewNotes,
      supersededBy: update.supersededBy ?? current.supersededBy,
    };

    if (update.status === "reviewed") {
      next.reviewedAt = now;
    }

    if (update.status === "approved") {
      next.approvedAt = now;
    }

    if (update.status === "rejected") {
      next.rejectedAt = now;
    }

    if (update.status === "stale") {
      next.staleAt = now;
    }

    if (update.status === "superseded") {
      next.supersededAt = now;
    }

    entries[index] = next;
    await this.saveEntries(entries);

    await this.appendAuditEvent({
      memoryEntryId: id,
      action:
        update.status === "reviewed"
          ? "reviewed"
          : update.status === "approved"
            ? "approved"
            : update.status === "rejected"
              ? "rejected"
              : update.status === "stale"
                ? "stale"
                : update.status === "superseded"
                  ? "superseded"
                  : "status-changed",
      previousStatus: current.status,
      nextStatus: update.status,
      note: update.note,
      actor: update.actor,
    });

    const eventType =
  update.status === "reviewed"
    ? "memory.reviewed"
    : update.status === "approved"
      ? "memory.approved"
      : update.status === "rejected"
        ? "memory.rejected"
        : update.status === "stale"
          ? "memory.stale"
          : update.status === "superseded"
            ? "memory.superseded"
            : "memory.status_changed";

await publishChernobogEventSafely({
  type: eventType,

  source: {
    subsystem: "vault-brain",
  },

  severity:
    update.status === "rejected" ||
    update.status === "stale"
      ? "notice"
      : "info",

  subject: next.id,

  scope: next.projectId
    ? `project:${next.projectId}`
    : "memory",

  payload: {
    memoryEntryId: next.id,
    memoryType: next.memoryType,

    previousStatus:
      current.status,

    nextStatus:
      next.status,

    projectId:
      next.projectId,

    version:
      next.version,

    confidence:
      next.confidence,

    supersededBy:
      next.supersededBy,
  },

  metadata: {
    tags: [
      "memory",
      "status-change",
      next.status,
    ],
  },
});

return next;
  }
}

export function createVaultMemoryStore(
  options?: VaultMemoryStoreOptions
): VaultMemoryStore {
  return new VaultMemoryStore(options);
}
