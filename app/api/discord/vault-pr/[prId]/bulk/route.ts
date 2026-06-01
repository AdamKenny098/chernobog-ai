import { NextResponse } from "next/server";

import {
  setAllVaultPullRequestChangeStatuses,
  setVaultPullRequestManyChangeStatuses,
} from "@/lib/modules/discord-ingest/approval/pullRequestStore";
import type { VaultProposedChangeStatus } from "@/lib/modules/discord-ingest/types";

type RouteContext = {
  params: Promise<{
    prId: string;
  }>;
};

type BulkStatusRequestBody = {
  status?: unknown;
  changeIds?: unknown;
  all?: unknown;
};

const VALID_STATUSES = new Set<VaultProposedChangeStatus>([
  "pending",
  "approved",
  "rejected",
]);

function isValidStatus(value: unknown): value is VaultProposedChangeStatus {
  return typeof value === "string" && VALID_STATUSES.has(value as VaultProposedChangeStatus);
}

function parseChangeIds(value: unknown): string[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const ids = value.filter((item): item is string => typeof item === "string");

  return ids.length === value.length ? ids : null;
}

export async function PATCH(request: Request, context: RouteContext) {
  const { prId } = await context.params;
  const body = (await request.json()) as BulkStatusRequestBody;

  if (!isValidStatus(body.status)) {
    return NextResponse.json(
      {
        ok: false,
        error: "Invalid change status.",
      },
      { status: 400 }
    );
  }

  const pullRequestId = decodeURIComponent(prId);

  if (body.all === true) {
    const pullRequest = setAllVaultPullRequestChangeStatuses({
      pullRequestId,
      status: body.status,
    });

    if (!pullRequest) {
      return NextResponse.json(
        {
          ok: false,
          error: "Vault pull request was not found or is locked.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      pullRequest,
    });
  }

  const changeIds = parseChangeIds(body.changeIds);

  if (!changeIds || changeIds.length === 0) {
    return NextResponse.json(
      {
        ok: false,
        error: "Provide changeIds or set all to true.",
      },
      { status: 400 }
    );
  }

  const pullRequest = setVaultPullRequestManyChangeStatuses({
    pullRequestId,
    changeIds,
    status: body.status,
  });

  if (!pullRequest) {
    return NextResponse.json(
      {
        ok: false,
        error: "Vault pull request was not found or is locked.",
      },
      { status: 404 }
    );
  }

  return NextResponse.json({
    ok: true,
    pullRequest,
  });
}