import { NextResponse } from "next/server";

import { setVaultPullRequestChangeStatus } from "@/lib/modules/discord-ingest/approval/pullRequestStore";
import type { VaultProposedChangeStatus } from "@/lib/modules/discord-ingest/types";

type RouteContext = {
  params: Promise<{
    prId: string;
    changeId: string;
  }>;
};

type ChangeStatusRequestBody = {
  status?: unknown;
};

const VALID_STATUSES = new Set<VaultProposedChangeStatus>([
  "pending",
  "approved",
  "rejected",
]);

function isValidStatus(value: unknown): value is VaultProposedChangeStatus {
  return typeof value === "string" && VALID_STATUSES.has(value as VaultProposedChangeStatus);
}

export async function PATCH(request: Request, context: RouteContext) {
  const { prId, changeId } = await context.params;
  const body = (await request.json()) as ChangeStatusRequestBody;

  if (!isValidStatus(body.status)) {
    return NextResponse.json(
      {
        ok: false,
        error: "Invalid change status.",
      },
      { status: 400 }
    );
  }

  const pullRequest = setVaultPullRequestChangeStatus({
    pullRequestId: decodeURIComponent(prId),
    changeId: decodeURIComponent(changeId),
    status: body.status,
  });

  if (!pullRequest) {
    return NextResponse.json(
      {
        ok: false,
        error: "Vault pull request or change was not found, or the pull request is locked.",
      },
      { status: 404 }
    );
  }

  return NextResponse.json({
    ok: true,
    pullRequest,
  });
}