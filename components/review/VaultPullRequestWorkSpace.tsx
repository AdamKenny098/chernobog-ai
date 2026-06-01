"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import type {
  VaultProposedChange,
  VaultProposedChangeAction,
  VaultProposedChangeStatus,
  VaultPullRequest,
  VaultPullRequestApplyReport,
} from "@/lib/modules/discord-ingest/types";

type VaultPullRequestWorkspaceProps = {
  pullRequest: VaultPullRequest;
};

type ActionFilter = "all" | VaultProposedChangeAction;
type StatusFilter = "all" | VaultProposedChangeStatus;

type ApiPullRequestResponse = {
  ok: boolean;
  pullRequest?: VaultPullRequest;
  error?: string;
};

type ApiApplyResponse = {
  ok: boolean;
  report?: VaultPullRequestApplyReport;
  error?: string;
};

const ACTION_LABELS: Record<VaultProposedChangeAction, string> = {
  create_new_note: "Create note",
  append_existing_note: "Append existing",
  append_inbox: "Append inbox",
};

const STATUS_LABELS: Record<VaultProposedChangeStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
};

function getActionLabel(action: VaultProposedChangeAction): string {
  return ACTION_LABELS[action] ?? action;
}

function getStatusLabel(status: VaultProposedChangeStatus): string {
  return STATUS_LABELS[status] ?? status;
}

function getActionClass(action: VaultProposedChangeAction): string {
  switch (action) {
    case "create_new_note":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";
    case "append_existing_note":
      return "border-blue-500/30 bg-blue-500/10 text-blue-200";
    case "append_inbox":
      return "border-amber-500/30 bg-amber-500/10 text-amber-200";
    default:
      return "border-zinc-500/30 bg-zinc-500/10 text-zinc-200";
  }
}

function getStatusClass(status: VaultProposedChangeStatus): string {
  switch (status) {
    case "approved":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";
    case "rejected":
      return "border-red-500/30 bg-red-500/10 text-red-200";
    case "pending":
    default:
      return "border-zinc-500/30 bg-zinc-500/10 text-zinc-300";
  }
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString();
}

function filterChanges(args: {
  changes: VaultProposedChange[];
  actionFilter: ActionFilter;
  statusFilter: StatusFilter;
  searchQuery: string;
}): VaultProposedChange[] {
  const query = args.searchQuery.trim().toLowerCase();

  return args.changes.filter((change) => {
    if (args.actionFilter !== "all" && change.action !== args.actionFilter) {
      return false;
    }

    if (args.statusFilter !== "all" && change.status !== args.statusFilter) {
      return false;
    }

    if (!query) {
      return true;
    }

    const haystack = [
      change.title,
      change.destinationPath,
      change.sourceText,
      change.classificationKind,
      change.action,
      change.status,
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(query);
  });
}

async function parsePullRequestResponse(
  response: Response
): Promise<ApiPullRequestResponse> {
  const text = await response.text();

  try {
    return JSON.parse(text) as ApiPullRequestResponse;
  } catch {
    return {
      ok: false,
      error: text || "Invalid server response.",
    };
  }
}

async function parseApplyResponse(
  response: Response
): Promise<ApiApplyResponse> {
  const text = await response.text();

  try {
    return JSON.parse(text) as ApiApplyResponse;
  } catch {
    return {
      ok: false,
      error: text || "Invalid server response.",
    };
  }
}

function MetricCard(props: {
  label: string;
  value: number | string;
  detail?: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4 shadow-[0_0_30px_rgba(0,0,0,0.35)]">
      <div className="text-xs uppercase tracking-[0.25em] text-zinc-500">
        {props.label}
      </div>
      <div className="mt-2 text-2xl font-semibold text-zinc-100">
        {props.value}
      </div>
      {props.detail ? (
        <div className="mt-1 text-xs text-zinc-500">{props.detail}</div>
      ) : null}
    </div>
  );
}

function FilterButton<T extends string>(props: {
  value: T;
  activeValue: string;
  onClick: (value: T) => void;
  children: ReactNode;
}) {
  const active = props.value === props.activeValue;

  return (
    <button
      type="button"
      onClick={() => props.onClick(props.value)}
      className={[
        "rounded-xl border px-3 py-2 text-left text-xs transition",
        active
          ? "border-red-500/60 bg-red-500/15 text-red-100"
          : "border-zinc-800 bg-zinc-950/50 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200",
      ].join(" ")}
    >
      {props.children}
    </button>
  );
}

function ActionButton(props: {
  children: ReactNode;
  disabled?: boolean;
  variant: "approve" | "reject" | "pending" | "neutral";
  onClick: () => void;
}) {
  const variantClass = {
    approve:
      "border-emerald-500/40 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/20",
    reject:
      "border-red-500/40 bg-red-500/10 text-red-100 hover:bg-red-500/20",
    pending:
      "border-zinc-600/60 bg-zinc-800/40 text-zinc-200 hover:bg-zinc-700/50",
    neutral:
      "border-zinc-700 bg-zinc-950 text-zinc-300 hover:border-zinc-500",
  }[props.variant];

  return (
    <button
      type="button"
      disabled={props.disabled}
      onClick={props.onClick}
      className={[
        "rounded-xl border px-3 py-2 text-xs font-medium uppercase tracking-[0.16em] transition",
        variantClass,
        props.disabled ? "cursor-not-allowed opacity-45" : "",
      ].join(" ")}
    >
      {props.children}
    </button>
  );
}

function ChangeListItem(props: {
  change: VaultProposedChange;
  selected: boolean;
  index: number;
  onSelect: (changeId: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => props.onSelect(props.change.id)}
      className={[
        "w-full rounded-2xl border p-4 text-left transition",
        props.selected
          ? "border-red-500/70 bg-red-500/10 shadow-[0_0_35px_rgba(239,68,68,0.12)]"
          : "border-zinc-800 bg-zinc-950/60 hover:border-zinc-700 hover:bg-zinc-900/60",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-[0.2em] text-zinc-600">
            Change {props.index + 1}
          </div>
          <div className="mt-1 truncate text-sm font-medium text-zinc-100">
            {props.change.title}
          </div>
        </div>

        <div
          className={[
            "shrink-0 rounded-full border px-2 py-1 text-[10px] uppercase tracking-[0.16em]",
            getStatusClass(props.change.status),
          ].join(" ")}
        >
          {getStatusLabel(props.change.status)}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <span
          className={[
            "rounded-full border px-2 py-1 text-[10px] uppercase tracking-[0.16em]",
            getActionClass(props.change.action),
          ].join(" ")}
        >
          {getActionLabel(props.change.action)}
        </span>

        <span className="rounded-full border border-zinc-700 bg-zinc-900 px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-zinc-400">
          {formatPercent(props.change.classificationConfidence)}
        </span>
      </div>

      <div className="mt-3 truncate font-mono text-xs text-zinc-500">
        {props.change.destinationPath}
      </div>
    </button>
  );
}

function DiffPreview(props: { content: string }) {
  const lines = props.content.split("\n");

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-[#070708]">
      <div className="border-b border-zinc-800 bg-zinc-950 px-4 py-3 text-xs uppercase tracking-[0.25em] text-zinc-500">
        Proposed content
      </div>

      <pre className="max-h-[58vh] overflow-auto p-0 text-xs leading-5">
        {lines.map((line, index) => (
          <div
            key={`${index}-${line}`}
            className="grid grid-cols-[64px_1fr] border-b border-zinc-900/70"
          >
            <span className="select-none border-r border-zinc-900 bg-zinc-950 px-3 py-1 text-right text-zinc-700">
              +{index + 1}
            </span>
            <span className="whitespace-pre-wrap px-3 py-1 text-emerald-200">
              {line || " "}
            </span>
          </div>
        ))}
      </pre>
    </div>
  );
}

function ApplyReportPanel(props: {
  report: VaultPullRequestApplyReport | null;
}) {
  if (!props.report) {
    return null;
  }

  const notableResults = props.report.results.filter(
    (result) => result.status === "applied" || result.status === "failed"
  );

  return (
    <section className="rounded-3xl border border-emerald-500/30 bg-emerald-500/10 p-4">
      <div className="text-xs uppercase tracking-[0.25em] text-emerald-300">
        Apply Report
      </div>

      <div className="mt-4 grid gap-3 text-sm text-zinc-300">
        <div>Approved changes: {props.report.approvedChangeCount}</div>
        <div>Applied: {props.report.appliedCount}</div>
        <div>Skipped: {props.report.skippedCount}</div>
        <div>Failed: {props.report.failedCount}</div>
      </div>

      {notableResults.length > 0 ? (
        <div className="mt-4 space-y-2">
          {notableResults.slice(0, 8).map((result) => (
            <div
              key={result.changeId}
              className="rounded-xl border border-zinc-800 bg-black/30 px-3 py-2 text-xs text-zinc-300"
            >
              <div className="font-medium text-zinc-100">{result.title}</div>
              <div className="mt-1 text-zinc-500">
                {result.status} — {result.reason}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function DetailPanel(props: {
  change: VaultProposedChange | null;
  disabled: boolean;
  onSetStatus: (
    changeId: string,
    status: VaultProposedChangeStatus
  ) => Promise<void>;
}) {
  if (!props.change) {
    return (
      <section className="flex min-h-[520px] items-center justify-center rounded-3xl border border-zinc-800 bg-zinc-950/60 p-8 text-center">
        <div>
          <div className="text-sm font-medium text-zinc-300">
            No change selected
          </div>
          <p className="mt-2 max-w-md text-sm text-zinc-500">
            Select a proposed vault change to inspect the generated content,
            destination, source fragment, and routing reasoning.
          </p>
        </div>
      </section>
    );
  }

  const change = props.change;

  return (
    <section className="min-h-[520px] rounded-3xl border border-zinc-800 bg-zinc-950/60 p-5 shadow-[0_0_40px_rgba(0,0,0,0.35)]">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <div className="text-xs uppercase tracking-[0.25em] text-red-400/80">
            Selected Change
          </div>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-100">
            {change.title}
          </h2>
          <div className="mt-2 font-mono text-xs text-zinc-500">
            {change.destinationPath}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <span
            className={[
              "rounded-full border px-3 py-2 text-xs uppercase tracking-[0.16em]",
              getActionClass(change.action),
            ].join(" ")}
          >
            {getActionLabel(change.action)}
          </span>

          <span
            className={[
              "rounded-full border px-3 py-2 text-xs uppercase tracking-[0.16em]",
              getStatusClass(change.status),
            ].join(" ")}
          >
            {getStatusLabel(change.status)}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 border-b border-zinc-800 py-5">
        <ActionButton
          variant="approve"
          disabled={props.disabled || change.status === "approved"}
          onClick={() => props.onSetStatus(change.id, "approved")}
        >
          Approve
        </ActionButton>

        <ActionButton
          variant="reject"
          disabled={props.disabled || change.status === "rejected"}
          onClick={() => props.onSetStatus(change.id, "rejected")}
        >
          Reject
        </ActionButton>

        <ActionButton
          variant="pending"
          disabled={props.disabled || change.status === "pending"}
          onClick={() => props.onSetStatus(change.id, "pending")}
        >
          Reset
        </ActionButton>
      </div>

      <div className="grid gap-4 border-b border-zinc-800 py-5 md:grid-cols-2">
        <div>
          <div className="text-xs uppercase tracking-[0.25em] text-zinc-500">
            Source
          </div>
          <div className="mt-2 text-sm text-zinc-300">
            {change.sourceAuthor}
          </div>
          <div className="mt-1 font-mono text-xs text-zinc-600">
            {change.sourceMessageId} / {change.sourceFragmentId}
          </div>
        </div>

        <div>
          <div className="text-xs uppercase tracking-[0.25em] text-zinc-500">
            Confidence
          </div>
          <div className="mt-2 text-sm text-zinc-300">
            Classification: {formatPercent(change.classificationConfidence)}
          </div>
          <div className="mt-1 text-sm text-zinc-300">
            Route: {formatPercent(change.routeConfidence)}
          </div>
        </div>
      </div>

      <div className="border-b border-zinc-800 py-5">
        <div className="text-xs uppercase tracking-[0.25em] text-zinc-500">
          Source fragment
        </div>
        <p className="mt-3 rounded-2xl border border-zinc-800 bg-black/30 p-4 text-sm leading-6 text-zinc-300">
          {change.sourceText}
        </p>
      </div>

      <div className="py-5">
        <div className="mb-3 text-xs uppercase tracking-[0.25em] text-zinc-500">
          Reasoning
        </div>
        <div className="space-y-2">
          {change.reasoning.map((reason) => (
            <div
              key={reason}
              className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-400"
            >
              {reason}
            </div>
          ))}
        </div>
      </div>

      <DiffPreview content={change.proposedContent} />
    </section>
  );
}

export function VaultPullRequestWorkspace({
  pullRequest,
}: VaultPullRequestWorkspaceProps) {
  const [currentPullRequest, setCurrentPullRequest] =
    useState<VaultPullRequest>(pullRequest);
  const [selectedChangeId, setSelectedChangeId] = useState<string | null>(
    pullRequest.changes[0]?.id ?? null
  );
  const [actionFilter, setActionFilter] = useState<ActionFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isMutating, setIsMutating] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [applyReport, setApplyReport] =
    useState<VaultPullRequestApplyReport | null>(null);

  const filteredChanges = useMemo(
    () =>
      filterChanges({
        changes: currentPullRequest.changes,
        actionFilter,
        statusFilter,
        searchQuery,
      }),
    [currentPullRequest.changes, actionFilter, statusFilter, searchQuery]
  );

  const selectedChange = useMemo(() => {
    return (
      currentPullRequest.changes.find(
        (change) => change.id === selectedChangeId
      ) ??
      filteredChanges[0] ??
      null
    );
  }, [currentPullRequest.changes, selectedChangeId, filteredChanges]);

  const isLocked =
    currentPullRequest.status === "applied" ||
    currentPullRequest.status === "discarded";

  const isBusy = isMutating || isApplying;

  async function applyUpdatedPullRequest(response: Response): Promise<void> {
    const data = await parsePullRequestResponse(response);

    if (!response.ok || !data.ok || !data.pullRequest) {
      throw new Error(data.error ?? "Failed to update vault pull request.");
    }

    setCurrentPullRequest(data.pullRequest);
  }

  async function refreshPullRequest(): Promise<void> {
    const response = await fetch(
      `/api/discord/vault-pr/${currentPullRequest.id}`,
      {
        cache: "no-store",
      }
    );

    await applyUpdatedPullRequest(response);
  }

  async function applyApprovedChanges(): Promise<void> {
    setIsApplying(true);
    setErrorMessage(null);
    setApplyReport(null);

    try {
      const response = await fetch(
        `/api/discord/vault-pr/${currentPullRequest.id}/apply`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            confirm: "apply-approved",
          }),
        }
      );

      const data = await parseApplyResponse(response);

      if (!response.ok || !data.ok || !data.report) {
        throw new Error(data.error ?? "Failed to apply approved changes.");
      }

      setApplyReport(data.report);
      await refreshPullRequest();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown PR apply error.";
      setErrorMessage(message);
    } finally {
      setIsApplying(false);
    }
  }

  async function setChangeStatus(
    changeId: string,
    status: VaultProposedChangeStatus
  ): Promise<void> {
    if (isLocked) {
      setErrorMessage("This vault pull request is locked and cannot be edited.");
      return;
    }

    setIsMutating(true);
    setErrorMessage(null);
    setApplyReport(null);

    try {
      const response = await fetch(
        `/api/discord/vault-pr/${currentPullRequest.id}/changes/${changeId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status }),
        }
      );

      await applyUpdatedPullRequest(response);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown PR update error.";
      setErrorMessage(message);
    } finally {
      setIsMutating(false);
    }
  }

  async function setManyStatuses(args: {
    status: VaultProposedChangeStatus;
    changeIds?: string[];
    all?: boolean;
  }): Promise<void> {
    if (isLocked) {
      setErrorMessage("This vault pull request is locked and cannot be edited.");
      return;
    }

    setIsMutating(true);
    setErrorMessage(null);
    setApplyReport(null);

    try {
      const response = await fetch(
        `/api/discord/vault-pr/${currentPullRequest.id}/bulk`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(args),
        }
      );

      await applyUpdatedPullRequest(response);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown PR bulk update error.";
      setErrorMessage(message);
    } finally {
      setIsMutating(false);
    }
  }

  const filteredChangeIds = filteredChanges.map((change) => change.id);

  return (
    <main className="min-h-screen bg-[#050506] text-zinc-100">
      <div className="border-b border-zinc-800 bg-black/40 px-6 py-5 backdrop-blur">
        <div className="mx-auto max-w-[1800px]">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <div className="text-xs uppercase tracking-[0.35em] text-red-500/80">
                Vault Pull Request Review
              </div>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight">
                Discord Triage Change Set
              </h1>
              <div className="mt-2 font-mono text-xs text-zinc-500">
                {currentPullRequest.id}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <div className="rounded-full border border-zinc-800 bg-zinc-950 px-4 py-2 text-xs uppercase tracking-[0.18em] text-zinc-400">
                {currentPullRequest.status}
              </div>
              <div className="rounded-full border border-zinc-800 bg-zinc-950 px-4 py-2 text-xs uppercase tracking-[0.18em] text-zinc-400">
                {formatDate(currentPullRequest.createdAt)}
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-7">
            <MetricCard
              label="Total"
              value={currentPullRequest.summary.totalChanges}
              detail="proposed changes"
            />
            <MetricCard
              label="New Notes"
              value={currentPullRequest.summary.createCount}
              detail="create operations"
            />
            <MetricCard
              label="Appends"
              value={currentPullRequest.summary.appendCount}
              detail="existing notes"
            />
            <MetricCard
              label="Inbox"
              value={currentPullRequest.summary.inboxCount}
              detail="review queue"
            />
            <MetricCard
              label="Approved"
              value={currentPullRequest.summary.approvedCount}
              detail="accepted"
            />
            <MetricCard
              label="Rejected"
              value={currentPullRequest.summary.rejectedCount}
              detail="declined"
            />
            <MetricCard
              label="Pending"
              value={currentPullRequest.summary.pendingCount}
              detail="unreviewed"
            />
          </div>

          {errorMessage ? (
            <div className="mt-4 rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {errorMessage}
            </div>
          ) : null}
        </div>
      </div>

      <div
        className="mx-auto grid max-w-[1800px] gap-5 px-6 py-6"
        style={{
          gridTemplateColumns: "280px minmax(360px, 520px) minmax(0, 1fr)",
        }}
      >
        <aside className="space-y-5">
          <section className="rounded-3xl border border-zinc-800 bg-zinc-950/60 p-4">
            <div className="text-xs uppercase tracking-[0.25em] text-zinc-500">
              Bulk Review
            </div>

            <div className="mt-4 grid gap-2">
              <ActionButton
                variant="approve"
                disabled={
                  isBusy || isLocked || filteredChangeIds.length === 0
                }
                onClick={() =>
                  setManyStatuses({
                    status: "approved",
                    changeIds: filteredChangeIds,
                  })
                }
              >
                Approve filtered
              </ActionButton>

              <ActionButton
                variant="reject"
                disabled={
                  isBusy || isLocked || filteredChangeIds.length === 0
                }
                onClick={() =>
                  setManyStatuses({
                    status: "rejected",
                    changeIds: filteredChangeIds,
                  })
                }
              >
                Reject filtered
              </ActionButton>

              <ActionButton
                variant="pending"
                disabled={
                  isBusy || isLocked || filteredChangeIds.length === 0
                }
                onClick={() =>
                  setManyStatuses({
                    status: "pending",
                    changeIds: filteredChangeIds,
                  })
                }
              >
                Reset filtered
              </ActionButton>
            </div>

            <div className="mt-4 border-t border-zinc-800 pt-4">
              <div className="grid gap-2">
                <ActionButton
                  variant="approve"
                  disabled={isBusy || isLocked}
                  onClick={() =>
                    setManyStatuses({
                      status: "approved",
                      all: true,
                    })
                  }
                >
                  Approve all
                </ActionButton>

                <ActionButton
                  variant="reject"
                  disabled={isBusy || isLocked}
                  onClick={() =>
                    setManyStatuses({
                      status: "rejected",
                      all: true,
                    })
                  }
                >
                  Reject all
                </ActionButton>

                <ActionButton
                  variant="pending"
                  disabled={isBusy || isLocked}
                  onClick={() =>
                    setManyStatuses({
                      status: "pending",
                      all: true,
                    })
                  }
                >
                  Reset all
                </ActionButton>
              </div>
            </div>

            <div className="mt-4 border-t border-zinc-800 pt-4">
              <ActionButton
                variant="approve"
                disabled={
                  isBusy ||
                  isLocked ||
                  currentPullRequest.summary.approvedCount === 0
                }
                onClick={applyApprovedChanges}
              >
                {isApplying ? "Applying..." : "Apply Approved"}
              </ActionButton>

              <p className="mt-3 text-xs leading-5 text-zinc-500">
                Applies approved changes only. Pending and rejected changes are
                ignored.
              </p>
            </div>
          </section>

          <ApplyReportPanel report={applyReport} />

          <section className="rounded-3xl border border-zinc-800 bg-zinc-950/60 p-4">
            <div className="text-xs uppercase tracking-[0.25em] text-zinc-500">
              Action Filter
            </div>

            <div className="mt-4 grid gap-2">
              <FilterButton
                value="all"
                activeValue={actionFilter}
                onClick={setActionFilter}
              >
                All actions
              </FilterButton>
              <FilterButton
                value="create_new_note"
                activeValue={actionFilter}
                onClick={setActionFilter}
              >
                Create new notes
              </FilterButton>
              <FilterButton
                value="append_existing_note"
                activeValue={actionFilter}
                onClick={setActionFilter}
              >
                Append existing
              </FilterButton>
              <FilterButton
                value="append_inbox"
                activeValue={actionFilter}
                onClick={setActionFilter}
              >
                Inbox appends
              </FilterButton>
            </div>
          </section>

          <section className="rounded-3xl border border-zinc-800 bg-zinc-950/60 p-4">
            <div className="text-xs uppercase tracking-[0.25em] text-zinc-500">
              Status Filter
            </div>

            <div className="mt-4 grid gap-2">
              <FilterButton
                value="all"
                activeValue={statusFilter}
                onClick={setStatusFilter}
              >
                All statuses
              </FilterButton>
              <FilterButton
                value="pending"
                activeValue={statusFilter}
                onClick={setStatusFilter}
              >
                Pending
              </FilterButton>
              <FilterButton
                value="approved"
                activeValue={statusFilter}
                onClick={setStatusFilter}
              >
                Approved
              </FilterButton>
              <FilterButton
                value="rejected"
                activeValue={statusFilter}
                onClick={setStatusFilter}
              >
                Rejected
              </FilterButton>
            </div>
          </section>

          <section className="rounded-3xl border border-zinc-800 bg-zinc-950/60 p-4">
            <div className="text-xs uppercase tracking-[0.25em] text-zinc-500">
              Safety State
            </div>

            <p className="mt-4 text-sm leading-6 text-zinc-400">
              Approved changes can now be applied to the vault. Pending and
              rejected changes are ignored. Applied pull requests are locked.
            </p>
          </section>
        </aside>

        <section className="min-h-[720px] rounded-3xl border border-zinc-800 bg-zinc-950/60 p-4">
          <div className="mb-4">
            <div className="text-xs uppercase tracking-[0.25em] text-zinc-500">
              Proposed Changes
            </div>

            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search title, path, source text..."
              className="mt-3 w-full rounded-2xl border border-zinc-800 bg-black/40 px-4 py-3 text-sm text-zinc-200 outline-none transition placeholder:text-zinc-600 focus:border-red-500/60"
            />

            <div className="mt-3 text-xs text-zinc-500">
              Showing {filteredChanges.length} of{" "}
              {currentPullRequest.changes.length}
            </div>
          </div>

          <div className="max-h-[70vh] space-y-3 overflow-auto pr-2">
            {filteredChanges.map((change, index) => (
              <ChangeListItem
                key={change.id}
                change={change}
                index={index}
                selected={change.id === selectedChange?.id}
                onSelect={setSelectedChangeId}
              />
            ))}
          </div>
        </section>

        <DetailPanel
          change={selectedChange}
          disabled={isBusy || isLocked}
          onSetStatus={setChangeStatus}
        />
      </div>
    </main>
  );
}