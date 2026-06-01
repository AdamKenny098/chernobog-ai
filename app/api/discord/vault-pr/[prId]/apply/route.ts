import { NextResponse } from "next/server";

import { applyApprovedVaultPullRequest } from "@/lib/modules/discord-ingest/approval/applyVaultPullRequest";

type RouteContext = {
  params: Promise<{
    prId: string;
  }>;
};

type ApplyRequestBody = {
  confirm?: unknown;
};

export async function POST(request: Request, context: RouteContext) {
  const { prId } = await context.params;
  const body = (await request.json()) as ApplyRequestBody;

  if (body.confirm !== "apply-approved") {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Apply confirmation missing. Send { confirm: \"apply-approved\" }.",
      },
      {
        status: 400,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }

  try {
    const report = await applyApprovedVaultPullRequest(decodeURIComponent(prId));

    return NextResponse.json(
      {
        ok: true,
        report,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unknown vault pull request apply error.";

    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      {
        status: 400,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }
}