import fs from "node:fs";
import path from "node:path";

import type {
  VaultProposedChangeStatus,
  VaultPullRequest,
  VaultPullRequestApplyReport,
  VaultPullRequestStatus,
} from "../types";

const RUNTIME_ROOT = path.join(
  process.cwd(),
  ".chernobog",
  "runtime",
  "discord-vault-pr"
);

const PULL_REQUEST_DIR = path.join(RUNTIME_ROOT, "pull-requests");
const SESSION_INDEX_PATH = path.join(RUNTIME_ROOT, "session-index.json");

const pullRequestsBySession = new Map<string, VaultPullRequest>();
const pullRequestsById = new Map<string, VaultPullRequest>();

type SessionIndex = Record<string, string>;

function ensureRuntimeFolders(): void {
  fs.mkdirSync(PULL_REQUEST_DIR, { recursive: true });
}

function getPullRequestPath(pullRequestId: string): string {
  const safeId = pullRequestId.replace(/[^a-zA-Z0-9._-]/g, "_");
  return path.join(PULL_REQUEST_DIR, `${safeId}.json`);
}

function readJsonFile<T>(filePath: string): T | null {
  try {
    if (!fs.existsSync(filePath)) {
      return null;
    }

    return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
  } catch (error) {
    console.error(`Failed to read JSON file at ${filePath}:`, error);
    return null;
  }
}

function writeJsonFile(filePath: string, value: unknown): void {
  ensureRuntimeFolders();
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), "utf8");
}

function readSessionIndex(): SessionIndex {
  return readJsonFile<SessionIndex>(SESSION_INDEX_PATH) ?? {};
}

function writeSessionIndex(index: SessionIndex): void {
  writeJsonFile(SESSION_INDEX_PATH, index);
}

function writePullRequest(pullRequest: VaultPullRequest): void {
  writeJsonFile(getPullRequestPath(pullRequest.id), pullRequest);
}

function summarizePullRequest(
  pullRequest: VaultPullRequest
): VaultPullRequest["summary"] {
  const createCount = pullRequest.changes.filter(
    (change) => change.action === "create_new_note"
  ).length;
  const appendCount = pullRequest.changes.filter(
    (change) => change.action === "append_existing_note"
  ).length;
  const inboxCount = pullRequest.changes.filter(
    (change) => change.action === "append_inbox"
  ).length;
  const approvedCount = pullRequest.changes.filter(
    (change) => change.status === "approved"
  ).length;
  const rejectedCount = pullRequest.changes.filter(
    (change) => change.status === "rejected"
  ).length;
  const pendingCount = pullRequest.changes.filter(
    (change) => change.status === "pending"
  ).length;

  return {
    totalChanges: pullRequest.changes.length,
    createCount,
    appendCount,
    inboxCount,
    approvedCount,
    rejectedCount,
    pendingCount,
  };
}

function derivePullRequestStatus(
  pullRequest: VaultPullRequest
): VaultPullRequestStatus {
  if (pullRequest.status === "applied" || pullRequest.status === "discarded") {
    return pullRequest.status;
  }

  const summary = summarizePullRequest(pullRequest);

  if (summary.totalChanges === 0) {
    return "draft";
  }

  if (summary.approvedCount === summary.totalChanges) {
    return "approved";
  }

  if (summary.rejectedCount === summary.totalChanges) {
    return "rejected";
  }

  if (summary.approvedCount > 0 || summary.rejectedCount > 0) {
    return "partially_approved";
  }

  return "draft";
}

function normalizePullRequest(pullRequest: VaultPullRequest): VaultPullRequest {
  pullRequest.summary = summarizePullRequest(pullRequest);
  pullRequest.status = derivePullRequestStatus(pullRequest);

  return pullRequest;
}

function cachePullRequest(pullRequest: VaultPullRequest): void {
  pullRequestsById.set(pullRequest.id, pullRequest);
}

function readPullRequest(pullRequestId: string): VaultPullRequest | null {
  const pullRequest = readJsonFile<VaultPullRequest>(
    getPullRequestPath(pullRequestId)
  );

  if (pullRequest) {
    const normalized = normalizePullRequest(pullRequest);
    cachePullRequest(normalized);
    return normalized;
  }

  return pullRequestsById.get(pullRequestId) ?? null;
}

function savePullRequest(pullRequest: VaultPullRequest): VaultPullRequest {
  const normalized = normalizePullRequest(pullRequest);

  cachePullRequest(normalized);
  writePullRequest(normalized);

  return normalized;
}

function canMutatePullRequest(pullRequest: VaultPullRequest): boolean {
  return pullRequest.status !== "applied" && pullRequest.status !== "discarded";
}

export function setLatestVaultPullRequest(
  sessionId: string,
  pullRequest: VaultPullRequest
): void {
  ensureRuntimeFolders();

  const normalized = savePullRequest(pullRequest);

  pullRequestsBySession.set(sessionId, normalized);
  pullRequestsById.set(normalized.id, normalized);

  const index = readSessionIndex();
  index[sessionId] = normalized.id;
  writeSessionIndex(index);
}

export function getLatestVaultPullRequest(
  sessionId: string
): VaultPullRequest | null {
  const cached = pullRequestsBySession.get(sessionId);

  if (cached) {
    return cached;
  }

  const index = readSessionIndex();
  const pullRequestId = index[sessionId];

  if (!pullRequestId) {
    return null;
  }

  const pullRequest = readPullRequest(pullRequestId);

  if (pullRequest) {
    pullRequestsBySession.set(sessionId, pullRequest);
  }

  return pullRequest;
}

export function getVaultPullRequestById(
  pullRequestId: string
): VaultPullRequest | null {
  return readPullRequest(pullRequestId);
}

export function clearLatestVaultPullRequest(sessionId: string): boolean {
  const pullRequest = getLatestVaultPullRequest(sessionId);

  if (!pullRequest) {
    return false;
  }

  pullRequest.status = "discarded";

  pullRequestsBySession.delete(sessionId);
  savePullRequest(pullRequest);

  const index = readSessionIndex();
  delete index[sessionId];
  writeSessionIndex(index);

  return true;
}

export function setVaultPullRequestChangeStatus(args: {
  pullRequestId: string;
  changeId: string;
  status: VaultProposedChangeStatus;
}): VaultPullRequest | null {
  const pullRequest = readPullRequest(args.pullRequestId);

  if (!pullRequest || !canMutatePullRequest(pullRequest)) {
    return null;
  }

  const change = pullRequest.changes.find(
    (candidate) => candidate.id === args.changeId
  );

  if (!change) {
    return null;
  }

  change.status = args.status;
  pullRequest.lastApplyReport = undefined;

  return savePullRequest(pullRequest);
}

export function setVaultPullRequestManyChangeStatuses(args: {
  pullRequestId: string;
  changeIds: string[];
  status: VaultProposedChangeStatus;
}): VaultPullRequest | null {
  const pullRequest = readPullRequest(args.pullRequestId);

  if (!pullRequest || !canMutatePullRequest(pullRequest)) {
    return null;
  }

  const changeIdSet = new Set(args.changeIds);

  for (const change of pullRequest.changes) {
    if (changeIdSet.has(change.id)) {
      change.status = args.status;
    }
  }

  pullRequest.lastApplyReport = undefined;

  return savePullRequest(pullRequest);
}

export function setAllVaultPullRequestChangeStatuses(args: {
  pullRequestId: string;
  status: VaultProposedChangeStatus;
}): VaultPullRequest | null {
  const pullRequest = readPullRequest(args.pullRequestId);

  if (!pullRequest || !canMutatePullRequest(pullRequest)) {
    return null;
  }

  for (const change of pullRequest.changes) {
    change.status = args.status;
  }

  pullRequest.lastApplyReport = undefined;

  return savePullRequest(pullRequest);
}

export function markVaultPullRequestApplied(args: {
  pullRequestId: string;
  report: VaultPullRequestApplyReport;
}): VaultPullRequest | null {
  const pullRequest = readPullRequest(args.pullRequestId);

  if (!pullRequest || pullRequest.status === "discarded") {
    return null;
  }

  pullRequest.status = "applied";
  pullRequest.lastApplyReport = args.report;

  return savePullRequest(pullRequest);
}