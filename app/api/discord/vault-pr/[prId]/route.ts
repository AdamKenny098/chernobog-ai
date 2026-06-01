import { NextResponse } from "next/server";

import { getVaultPullRequestById } from "@/lib/modules/discord-ingest/approval/pullRequestStore";

type RouteContext = {
  params: Promise<{
    prId: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { prId } = await context.params;
  const pullRequest = getVaultPullRequestById(decodeURIComponent(prId));

  if (!pullRequest) {
    return NextResponse.json(
      {
        ok: false,
        error: "Vault pull request not found.",
      },
      {
        status: 404,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }

  return NextResponse.json(
    {
      ok: true,
      pullRequest,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}