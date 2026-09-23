import {
  NextResponse,
} from "next/server";
import {
  getResponsibilityLedger,
  parseCreateResponsibility,
} from "@/lib/chernobog/personalAssistance/responsibilities";

export const dynamic =
  "force-dynamic";

export async function GET(
  request: Request,
) {
  const url =
    new URL(
      request.url,
    );

  const includeClosed =
    url.searchParams.get(
      "includeClosed",
    ) === "true";

  const requiresHumanParam =
    url.searchParams.get(
      "requiresHuman",
    );

  const requiresHuman =
    requiresHumanParam ===
      null
      ? undefined
      : requiresHumanParam ===
        "true";

  const responsibilities =
    await getResponsibilityLedger()
      .list({
        includeClosed,
        requiresHuman,
      });

  return NextResponse.json({
    ok: true,
    responsibilities,
    boundaries: {
      executesTools: false,
      grantsPermissions: false,
    },
  });
}

export async function POST(
  request: Request,
) {
  try {
    const input =
      parseCreateResponsibility(
        await request.json(),
      );

    const result =
      await getResponsibilityLedger()
        .create(input);

    return NextResponse.json({
      ok: true,
      ...result,
      boundaries: {
        executesTools: false,
        grantsPermissions: false,
      },
    });
  } catch (
    error
  ) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to create responsibility.",
      },
      {
        status: 400,
      },
    );
  }
}
