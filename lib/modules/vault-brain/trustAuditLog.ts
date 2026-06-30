import path from "node:path";
import { promises as fs } from "node:fs";
import type { TrustActionRequest, TrustDecision } from "./trustActionTypes";

export type TrustAuditAction = "evaluated" | "approved" | "denied" | "blocked" | "notice";

export type TrustAuditEvent = {
  id: string;
  action: TrustAuditAction;
  request: TrustActionRequest;
  decision: TrustDecision;
  actor?: string;
  note?: string;
  createdAt: string;
};

export type TrustAuditStoreOptions = {
  rootDir?: string;
};

const DEFAULT_GOVERNANCE_ROOT = path.join(
  process.cwd(),
  "vault",
  "chernobog",
  "system",
  "trust-governance"
);

function stableId(prefix = "trust-audit"): string {
  const stamp = new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14);
  const random = Math.random().toString(36).slice(2, 9);
  return `${prefix}-${stamp}-${random}`;
}

function getAuditPath(options: TrustAuditStoreOptions = {}): string {
  const rootDir = options.rootDir ?? process.env.CHERNOBOG_TRUST_GOVERNANCE_ROOT ?? DEFAULT_GOVERNANCE_ROOT;
  return path.join(rootDir, "trust-audit-log.json");
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

export async function loadTrustAuditLog(options: TrustAuditStoreOptions = {}): Promise<TrustAuditEvent[]> {
  return readJsonFile<TrustAuditEvent[]>(getAuditPath(options), []);
}

export async function appendTrustAuditEvent(
  event: Omit<TrustAuditEvent, "id" | "createdAt">,
  options: TrustAuditStoreOptions = {}
): Promise<TrustAuditEvent> {
  const auditPath = getAuditPath(options);
  const audit = await loadTrustAuditLog(options);
  const next: TrustAuditEvent = {
    id: stableId(),
    createdAt: new Date().toISOString(),
    ...event,
  };

  audit.push(next);
  await writeJsonFile(auditPath, audit);
  return next;
}
