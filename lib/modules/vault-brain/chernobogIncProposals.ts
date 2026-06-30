import { promises as fs } from "fs";
import path from "path";
import type {
  ChernobogIncDepartmentId,
  ChernobogIncProposalStore,
  ChernobogIncWorkProposal,
  ChernobogIncWorkProposalInput,
} from "./chernobogIncTypes";
import { isChernobogIncDepartmentId } from "./chernobogIncFoundation";

const STORE_VERSION = "v5.8" as const;
const DEFAULT_DEPARTMENT: ChernobogIncDepartmentId = "operations";

export type ChernobogIncStoreOptions = {
  rootDir?: string;
};

function getChernobogIncRoot(options: ChernobogIncStoreOptions = {}) {
  return path.join(
    options.rootDir ?? process.cwd(),
    "vault",
    "chernobog",
    "system",
    "chernobog-inc"
  );
}

function getProposalStorePath(options: ChernobogIncStoreOptions = {}) {
  return path.join(getChernobogIncRoot(options), "proposals.json");
}

async function ensureStoreDir(options: ChernobogIncStoreOptions = {}) {
  await fs.mkdir(getChernobogIncRoot(options), { recursive: true });
}

function createEmptyStore(): ChernobogIncProposalStore {
  return {
    version: STORE_VERSION,
    updatedAt: new Date().toISOString(),
    proposals: [],
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeDepartmentIds(
  input: ChernobogIncDepartmentId[] | undefined
): ChernobogIncDepartmentId[] {
  if (!input || input.length === 0) {
    return [DEFAULT_DEPARTMENT];
  }

  const validDepartments = input.filter(isChernobogIncDepartmentId);
  return validDepartments.length > 0 ? validDepartments : [DEFAULT_DEPARTMENT];
}

function parseStore(raw: string): ChernobogIncProposalStore {
  const parsed: unknown = JSON.parse(raw);
  if (!isObject(parsed) || !Array.isArray(parsed.proposals)) {
    return createEmptyStore();
  }

  return {
    version: STORE_VERSION,
    updatedAt:
      typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date().toISOString(),
    proposals: parsed.proposals.filter(isObject) as ChernobogIncWorkProposal[],
  };
}

export async function readChernobogIncProposalStore(
  options: ChernobogIncStoreOptions = {}
): Promise<ChernobogIncProposalStore> {
  try {
    const raw = await fs.readFile(getProposalStorePath(options), "utf8");
    return parseStore(raw);
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return createEmptyStore();
    }
    throw error;
  }
}

export async function writeChernobogIncProposalStore(
  store: ChernobogIncProposalStore,
  options: ChernobogIncStoreOptions = {}
): Promise<void> {
  await ensureStoreDir(options);
  await fs.writeFile(
    getProposalStorePath(options),
    `${JSON.stringify({ ...store, version: STORE_VERSION }, null, 2)}\n`,
    "utf8"
  );
}

export async function listChernobogIncWorkProposals(
  options: ChernobogIncStoreOptions = {}
): Promise<ChernobogIncWorkProposal[]> {
  const store = await readChernobogIncProposalStore(options);
  return store.proposals;
}

export async function createChernobogIncWorkProposal(
  input: ChernobogIncWorkProposalInput,
  options: ChernobogIncStoreOptions = {}
): Promise<ChernobogIncWorkProposal> {
  const now = new Date().toISOString();
  const title = input.title.trim();
  const description = input.description.trim();

  if (!title) {
    throw new Error("A Chernobog Inc work proposal requires a title.");
  }

  if (!description) {
    throw new Error("A Chernobog Inc work proposal requires a description.");
  }

  const proposal: ChernobogIncWorkProposal = {
    id: `inc-proposal-${Date.now().toString(36)}`,
    title,
    description,
    requestedBy: input.requestedBy?.trim() || "CEO",
    status: "proposed",
    departmentIds: normalizeDepartmentIds(input.departmentIds),
    projectId: input.projectId?.trim() || undefined,
    version: input.version?.trim() || undefined,
    tags: input.tags ?? [],
    approvalGate: {
      required: true,
      reason:
        "V5.8 proposals are planning artifacts only. Approval is required before execution can be considered by a later layer.",
      requiredBy: "governance",
    },
    executionAllowed: false,
    createdAt: now,
    updatedAt: now,
  };

  const store = await readChernobogIncProposalStore(options);
  const nextStore: ChernobogIncProposalStore = {
    version: STORE_VERSION,
    updatedAt: now,
    proposals: [proposal, ...store.proposals],
  };
  await writeChernobogIncProposalStore(nextStore, options);
  return proposal;
}

export function formatChernobogIncWorkProposal(
  proposal: ChernobogIncWorkProposal
): string {
  return [
    `Proposal: ${proposal.title}`,
    `ID: ${proposal.id}`,
    `Status: ${proposal.status}`,
    `Requested by: ${proposal.requestedBy}`,
    `Departments: ${proposal.departmentIds.join(", ")}`,
    proposal.projectId ? `Project: ${proposal.projectId}` : "Project: unscoped",
    proposal.version ? `Version: ${proposal.version}` : "Version: unscoped",
    `Execution allowed: ${proposal.executionAllowed ? "yes" : "no"}`,
    `Approval required: ${proposal.approvalGate.required ? "yes" : "no"}`,
    `Approval reason: ${proposal.approvalGate.reason}`,
    "",
    proposal.description,
  ].join("\n");
}

export function formatChernobogIncProposalList(
  proposals: ChernobogIncWorkProposal[]
): string {
  if (proposals.length === 0) {
    return [
      "No Chernobog Inc work proposals found.",
      "Create one with: draft inc work proposal <title> :: <description>",
    ].join("\n");
  }

  return [
    `Chernobog Inc Work Proposals (${proposals.length})`,
    "",
    ...proposals.slice(0, 20).map((proposal) =>
      [
        `- ${proposal.title}`,
        `  ID: ${proposal.id}`,
        `  Status: ${proposal.status}`,
        `  Departments: ${proposal.departmentIds.join(", ")}`,
        `  Approval required: ${proposal.approvalGate.required ? "yes" : "no"}`,
      ].join("\n")
    ),
  ].join("\n");
}
