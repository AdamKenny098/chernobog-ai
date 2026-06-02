import fs from "node:fs/promises";
import path from "node:path";

import {
  getVaultPullRequestById,
  markVaultPullRequestApplied,
} from "./pullRequestStore";
import type {
  VaultApplyChangeResult,
  VaultProposedChange,
  VaultPullRequest,
  VaultPullRequestApplyReport,
} from "../types";

const DEFAULT_VAULT_ROOT = path.join(process.cwd(), "vault", "chernobog");

function getVaultRoot(): string {
  return process.env.CHERNOBOG_VAULT_ROOT ?? DEFAULT_VAULT_ROOT;
}

function normalizeRelativePath(relativePath: string): string {
  return relativePath.replace(/\\/g, "/").replace(/^\/+/, "").trim();
}

function resolveVaultPath(relativePath: string): string {
  const vaultRoot = path.resolve(getVaultRoot());
  const normalizedRelativePath = normalizeRelativePath(relativePath);
  const resolvedPath = path.resolve(vaultRoot, normalizedRelativePath);

  if (
    resolvedPath !== vaultRoot &&
    !resolvedPath.startsWith(`${vaultRoot}${path.sep}`)
  ) {
    throw new Error(
      `Refusing to write outside vault root: ${normalizedRelativePath}`
    );
  }

  return resolvedPath;
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function ensureParentDirectory(filePath: string): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}

function getApplyDateLabel(): string {
  return new Date().toISOString().slice(0, 10);
}

function resultForChange(args: {
  change: VaultProposedChange;
  status: VaultApplyChangeResult["status"];
  reason: string;
}): VaultApplyChangeResult {
  return {
    changeId: args.change.id,
    title: args.change.title,
    action: args.change.action,
    destinationPath: args.change.destinationPath,
    status: args.status,
    reason: args.reason,
  };
}

async function applyCreateNewNote(
  change: VaultProposedChange
): Promise<VaultApplyChangeResult> {
  const targetPath = resolveVaultPath(change.destinationPath);

  if (await pathExists(targetPath)) {
    return resultForChange({
      change,
      status: "skipped",
      reason:
        "destination already exists; create_new_note never overwrites existing files",
    });
  }

  await ensureParentDirectory(targetPath);
  await fs.writeFile(targetPath, `${change.proposedContent.trim()}\n`, "utf8");

  return resultForChange({
    change,
    status: "applied",
    reason: "created new vault note",
  });
}

function groupChangesByDestination(
  changes: VaultProposedChange[]
): Map<string, VaultProposedChange[]> {
  const groups = new Map<string, VaultProposedChange[]>();

  for (const change of changes) {
    const existing = groups.get(change.destinationPath) ?? [];
    existing.push(change);
    groups.set(change.destinationPath, existing);
  }

  return groups;
}

function formatAppendBlock(changes: VaultProposedChange[]): string {
  const dateLabel = getApplyDateLabel();

  return [
    "",
    "",
    `## Discord Triage — ${dateLabel}`,
    "",
    ...changes.map((change) => change.proposedContent.trim()),
    "",
  ].join("\n");
}

async function ensureInboxFile(targetPath: string): Promise<void> {
  if (await pathExists(targetPath)) {
    return;
  }

  await ensureParentDirectory(targetPath);

  await fs.writeFile(
    targetPath,
    [
      "# Discord Ideas Inbox",
      "",
      "Captured Discord project ideas that need manual review before being routed into permanent notes.",
      "",
    ].join("\n"),
    "utf8"
  );
}

async function applyAppendGroup(args: {
  destinationPath: string;
  changes: VaultProposedChange[];
  allowCreateMissingFile: boolean;
}): Promise<VaultApplyChangeResult[]> {
  const targetPath = resolveVaultPath(args.destinationPath);

  if (args.allowCreateMissingFile) {
    await ensureInboxFile(targetPath);
  }

  if (!(await pathExists(targetPath))) {
    return args.changes.map((change) =>
      resultForChange({
        change,
        status: "skipped",
        reason:
          "target note does not exist; append_existing_note never creates missing destination notes",
      })
    );
  }

  const appendBlock = formatAppendBlock(args.changes);
  await fs.appendFile(targetPath, appendBlock, "utf8");

  return args.changes.map((change) =>
    resultForChange({
      change,
      status: "applied",
      reason: args.allowCreateMissingFile
        ? "appended to Discord ideas inbox"
        : "appended to existing vault note",
    })
  );
}

function createSkippedResult(
  change: VaultProposedChange,
  reason: string
): VaultApplyChangeResult {
  return resultForChange({
    change,
    status: "skipped",
    reason,
  });
}

function createFailedResult(
  change: VaultProposedChange,
  reason: string
): VaultApplyChangeResult {
  return resultForChange({
    change,
    status: "failed",
    reason,
  });
}

function summarizeReport(args: {
  pullRequest: VaultPullRequest;
  results: VaultApplyChangeResult[];
}): VaultPullRequestApplyReport {
  const approvedChangeCount = args.pullRequest.changes.filter(
    (change) => change.status === "approved"
  ).length;

  return {
    pullRequestId: args.pullRequest.id,
    appliedAt: new Date().toISOString(),
    approvedChangeCount,
    appliedCount: args.results.filter((result) => result.status === "applied")
      .length,
    skippedCount: args.results.filter((result) => result.status === "skipped")
      .length,
    failedCount: args.results.filter((result) => result.status === "failed")
      .length,
    results: args.results,
  };
}

export async function applyApprovedVaultPullRequest(
  pullRequestId: string
): Promise<VaultPullRequestApplyReport> {
  const pullRequest = getVaultPullRequestById(pullRequestId);

  if (!pullRequest) {
    throw new Error("Vault pull request not found.");
  }

  if (pullRequest.status === "discarded") {
    throw new Error("Cannot apply a discarded vault pull request.");
  }

  if (pullRequest.status === "applied") {
    throw new Error("Vault pull request has already been applied.");
  }

  const approvedChanges = pullRequest.changes.filter(
    (change) => change.status === "approved"
  );

  if (approvedChanges.length === 0) {
    throw new Error("No approved changes to apply.");
  }

  const results: VaultApplyChangeResult[] = [];

  for (const change of pullRequest.changes) {
    if (change.status === "pending") {
      results.push(createSkippedResult(change, "change is pending"));
    }

    if (change.status === "rejected") {
      results.push(createSkippedResult(change, "change is rejected"));
    }
  }

  const createChanges = approvedChanges.filter(
    (change) => change.action === "create_new_note"
  );
  const appendExistingChanges = approvedChanges.filter(
    (change) => change.action === "append_existing_note"
  );
  const inboxChanges = approvedChanges.filter(
    (change) => change.action === "append_inbox"
  );

  for (const change of createChanges) {
    try {
      results.push(await applyCreateNewNote(change));
    } catch (error) {
      results.push(
        createFailedResult(
          change,
          error instanceof Error ? error.message : "unknown create note error"
        )
      );
    }
  }

  for (const [destinationPath, changes] of groupChangesByDestination(
    appendExistingChanges
  )) {
    try {
      results.push(
        ...(await applyAppendGroup({
          destinationPath,
          changes,
          allowCreateMissingFile: false,
        }))
      );
    } catch (error) {
      results.push(
        ...changes.map((change) =>
          createFailedResult(
            change,
            error instanceof Error
              ? error.message
              : "unknown append existing note error"
          )
        )
      );
    }
  }

  for (const [destinationPath, changes] of groupChangesByDestination(
    inboxChanges
  )) {
    try {
      results.push(
        ...(await applyAppendGroup({
          destinationPath,
          changes,
          allowCreateMissingFile: true,
        }))
      );
    } catch (error) {
      results.push(
        ...changes.map((change) =>
          createFailedResult(
            change,
            error instanceof Error
              ? error.message
              : "unknown inbox append error"
          )
        )
      );
    }
  }

  const report = summarizeReport({
    pullRequest,
    results,
  });

  if (report.failedCount === 0) {
    markVaultPullRequestApplied({
      pullRequestId: pullRequest.id,
      report,
    });
  }

  return report;
}