import path from "node:path";
import { promises as fs } from "node:fs";
import {
  createVaultMemoryStore,
  type VaultMemoryStoreOptions,
} from "./memoryStore";
import {
  isVaultMemorySource,
  isVaultMemoryType,
  type VaultMemoryEntry,
  type VaultMemorySource,
  type VaultMemoryType,
  type VaultSourceRef,
} from "./memoryTypes";

export const CORRECTABLE_VAULT_MEMORY_FIELDS = [
  "title",
  "body",
  "source",
  "memoryType",
  "projectId",
  "version",
  "tags",
  "confidence",
  "sourceRef",
  "reviewNotes",
] as const;

export type CorrectableVaultMemoryField = (typeof CORRECTABLE_VAULT_MEMORY_FIELDS)[number];

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export type VaultMemoryCorrection = {
  id: string;
  memoryEntryId: string;
  fieldChanged: CorrectableVaultMemoryField;
  previousValue: JsonValue;
  newValue: JsonValue;
  reason?: string;
  actor?: string;
  correctedAt: string;
};

export type VaultMemoryCorrectionRequest = {
  memoryEntryId: string;
  field: string;
  value: unknown;
  reason?: string;
  actor?: string;
};

export type VaultMemoryCorrectionResult = {
  entry: VaultMemoryEntry;
  correction: VaultMemoryCorrection;
};

export type VaultMemoryCorrectionListFilter = {
  memoryEntryId?: string;
  field?: CorrectableVaultMemoryField;
  limit?: number;
};

export type VaultMemoryCorrectionStorePaths = {
  rootDir: string;
  correctionsPath: string;
};

export type VaultMemoryCorrectionStoreOptions = VaultMemoryStoreOptions;

const FIELD_ALIASES: Record<string, CorrectableVaultMemoryField> = {
  title: "title",
  name: "title",
  body: "body",
  content: "body",
  text: "body",
  source: "source",
  type: "memoryType",
  memorytype: "memoryType",
  "memory-type": "memoryType",
  project: "projectId",
  projectid: "projectId",
  "project-id": "projectId",
  version: "version",
  milestone: "version",
  tags: "tags",
  tag: "tags",
  confidence: "confidence",
  score: "confidence",
  sourceref: "sourceRef",
  "source-ref": "sourceRef",
  ref: "sourceRef",
  reviewnotes: "reviewNotes",
  "review-notes": "reviewNotes",
  notes: "reviewNotes",
};

function stableId(prefix = "correction"): string {
  const stamp = new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14);
  const random = Math.random().toString(36).slice(2, 9);
  return `${prefix}-${stamp}-${random}`;
}

function normalizeAliasKey(value: string): string {
  return value.trim().toLowerCase().replace(/[\s_]+/g, "-");
}

function normalizeCompactAliasKey(value: string): string {
  return value.trim().toLowerCase().replace(/[\s_-]+/g, "");
}

function normalizeMaybeScope(value: unknown): string | undefined {
  if (value === null || typeof value === "undefined") {
    return undefined;
  }

  const text = String(value).trim().toLowerCase();
  if (!text || text === "none" || text === "null" || text === "undefined") {
    return undefined;
  }

  return text;
}

function normalizeText(value: unknown, field: CorrectableVaultMemoryField): string {
  const text = String(value ?? "").trim();
  if (!text) {
    throw new Error(`Memory correction field ${field} cannot be empty.`);
  }

  return text;
}

function normalizeOptionalText(value: unknown): string | undefined {
  if (value === null || typeof value === "undefined") {
    return undefined;
  }

  const text = String(value).trim();
  return text.length > 0 ? text : undefined;
}

function normalizeTags(value: unknown): string[] {
  const rawValues = Array.isArray(value)
    ? value.map((item) => String(item))
    : String(value ?? "").split(/[,|]/g);

  return Array.from(
    new Set(
      rawValues
        .flatMap((item) => item.split(/\s+#/g))
        .map((item) => item.replace(/^#/, "").trim().toLowerCase())
        .filter(Boolean)
    )
  );
}

function normalizeConfidence(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(String(value).trim());
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid memory confidence value: ${String(value)}`);
  }

  return Math.max(0, Math.min(1, Number(parsed.toFixed(4))));
}

function isJsonObject(value: unknown): value is { [key: string]: JsonValue } {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeSourceRef(value: unknown): VaultSourceRef | undefined {
  if (value === null || typeof value === "undefined") {
    return undefined;
  }

  const parsed = typeof value === "string" ? parsePossibleJson(value) : value;
  if (!isJsonObject(parsed)) {
    throw new Error("sourceRef corrections must be JSON objects with at least a type field.");
  }

  if (typeof parsed.type !== "string" || !parsed.type.trim()) {
    throw new Error("sourceRef corrections must include a non-empty string type field.");
  }

  return parsed as VaultSourceRef;
}

function parsePossibleJson(value: string): unknown {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) {
    return trimmed;
  }

  return JSON.parse(trimmed) as unknown;
}

function toJsonValue(value: unknown): JsonValue {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean" || value === null) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(toJsonValue);
  }

  if (typeof value === "undefined") {
    return null;
  }

  if (typeof value === "object") {
    const output: { [key: string]: JsonValue } = {};
    for (const [key, nested] of Object.entries(value)) {
      output[key] = toJsonValue(nested);
    }
    return output;
  }

  return String(value);
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

export function isCorrectableVaultMemoryField(value: string): value is CorrectableVaultMemoryField {
  return CORRECTABLE_VAULT_MEMORY_FIELDS.includes(value as CorrectableVaultMemoryField);
}

export function normalizeCorrectableVaultMemoryField(value: string): CorrectableVaultMemoryField | undefined {
  const dashed = normalizeAliasKey(value);
  const compact = normalizeCompactAliasKey(value);

  if (isCorrectableVaultMemoryField(value)) {
    return value;
  }

  return FIELD_ALIASES[dashed] ?? FIELD_ALIASES[compact];
}

export function getVaultMemoryCorrectionStorePaths(
  options: VaultMemoryCorrectionStoreOptions = {}
): VaultMemoryCorrectionStorePaths {
  const store = createVaultMemoryStore(options);
  return {
    rootDir: store.paths.rootDir,
    correctionsPath: path.join(store.paths.rootDir, "corrections.json"),
  };
}

export async function loadMemoryCorrections(
  filter: VaultMemoryCorrectionListFilter = {},
  options: VaultMemoryCorrectionStoreOptions = {}
): Promise<VaultMemoryCorrection[]> {
  const paths = getVaultMemoryCorrectionStorePaths(options);
  const corrections = await readJsonFile<VaultMemoryCorrection[]>(paths.correctionsPath, []);

  const filtered = corrections.filter((correction) => {
    if (filter.memoryEntryId && correction.memoryEntryId !== filter.memoryEntryId) {
      return false;
    }

    if (filter.field && correction.fieldChanged !== filter.field) {
      return false;
    }

    return true;
  });

  const sorted = filtered.sort((a, b) => b.correctedAt.localeCompare(a.correctedAt));
  return typeof filter.limit === "number" ? sorted.slice(0, filter.limit) : sorted;
}

export async function appendMemoryCorrection(
  correction: Omit<VaultMemoryCorrection, "id" | "correctedAt">,
  options: VaultMemoryCorrectionStoreOptions = {}
): Promise<VaultMemoryCorrection> {
  const paths = getVaultMemoryCorrectionStorePaths(options);
  const corrections = await readJsonFile<VaultMemoryCorrection[]>(paths.correctionsPath, []);
  const next: VaultMemoryCorrection = {
    id: stableId("correction"),
    correctedAt: new Date().toISOString(),
    ...correction,
  };

  corrections.push(next);
  await writeJsonFile(paths.correctionsPath, corrections);
  return next;
}

export function getVaultMemoryCorrectionFieldValue(
  entry: VaultMemoryEntry,
  field: CorrectableVaultMemoryField
): JsonValue {
  switch (field) {
    case "title":
      return entry.title;
    case "body":
      return entry.body;
    case "source":
      return entry.source;
    case "memoryType":
      return entry.memoryType;
    case "projectId":
      return entry.projectId ?? null;
    case "version":
      return entry.version ?? null;
    case "tags":
      return [...entry.tags];
    case "confidence":
      return entry.confidence;
    case "sourceRef":
      return toJsonValue(entry.sourceRef ?? null);
    case "reviewNotes":
      return entry.reviewNotes ?? null;
  }
}

function applyCorrectionValue(
  entry: VaultMemoryEntry,
  field: CorrectableVaultMemoryField,
  value: unknown
): VaultMemoryEntry {
  switch (field) {
    case "title":
      return { ...entry, title: normalizeText(value, field) };
    case "body":
      return { ...entry, body: normalizeText(value, field) };
    case "source": {
      const source = String(value ?? "").trim().toLowerCase();
      if (!isVaultMemorySource(source)) {
        throw new Error(`Invalid memory source correction: ${source}`);
      }
      return { ...entry, source: source as VaultMemorySource };
    }
    case "memoryType": {
      const memoryType = String(value ?? "").trim().toLowerCase();
      if (!isVaultMemoryType(memoryType)) {
        throw new Error(`Invalid memory type correction: ${memoryType}`);
      }
      return { ...entry, memoryType: memoryType as VaultMemoryType };
    }
    case "projectId":
      return { ...entry, projectId: normalizeMaybeScope(value) };
    case "version":
      return { ...entry, version: normalizeMaybeScope(value) };
    case "tags":
      return { ...entry, tags: normalizeTags(value) };
    case "confidence":
      return { ...entry, confidence: normalizeConfidence(value) };
    case "sourceRef":
      return { ...entry, sourceRef: normalizeSourceRef(value) };
    case "reviewNotes":
      return { ...entry, reviewNotes: normalizeOptionalText(value) };
  }
}

export async function applyMemoryCorrection(
  request: VaultMemoryCorrectionRequest,
  options: VaultMemoryCorrectionStoreOptions = {}
): Promise<VaultMemoryCorrectionResult> {
  const field = normalizeCorrectableVaultMemoryField(request.field);
  if (!field) {
    throw new Error(
      `Unsupported memory correction field: ${request.field}. Status changes must use the review/approval commands instead.`
    );
  }

  const store = createVaultMemoryStore(options);
  const entries = await store.loadEntries();
  const index = entries.findIndex((entry) => entry.id === request.memoryEntryId);
  if (index < 0) {
    throw new Error(`Structured memory entry not found: ${request.memoryEntryId}`);
  }

  const current = entries[index];
  const previousValue = getVaultMemoryCorrectionFieldValue(current, field);
  const corrected = applyCorrectionValue(current, field, request.value);
  const next: VaultMemoryEntry = {
    ...corrected,
    updatedAt: new Date().toISOString(),
  };
  const newValue = getVaultMemoryCorrectionFieldValue(next, field);

  entries[index] = next;
  await store.saveEntries(entries);

  const correction = await appendMemoryCorrection(
    {
      memoryEntryId: request.memoryEntryId,
      fieldChanged: field,
      previousValue,
      newValue,
      reason: request.reason,
      actor: request.actor,
    },
    options
  );

  await store.appendAuditEvent({
    memoryEntryId: request.memoryEntryId,
    action: "updated",
    note: request.reason
      ? `Correction applied to ${field}: ${request.reason}`
      : `Correction applied to ${field}.`,
    actor: request.actor,
  });

  return { entry: next, correction };
}
