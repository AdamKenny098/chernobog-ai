import {
  NextResponse,
} from "next/server";
import {
  getResponsibilityLedger,
  parseUpdateResponsibility,
} from "@/lib/chernobog/personalAssistance/responsibilities";

export const dynamic =
  "force-dynamic";

type RouteContext = {
  params:
    Promise<{
      id: string;
    }>;
};

export async function GET(
  _request: Request,
  context: RouteContext,
) {
  const {
    id,
  } =
    await context.params;

  const responsibility =
    await getResponsibilityLedger()
      .get(id);

  if (
    !responsibility
  ) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Responsibility not found.",
      },
      {
        status: 404,
      },
    );
  }

  const history =
    await getResponsibilityLedger()
      .history(id);

  return NextResponse.json({
    ok: true,
    responsibility,
    history,
    boundaries: {
      executesTools: false,
      grantsPermissions: false,
    },
  });
}

export async function PATCH(
  request: Request,
  context: RouteContext,
) {
  const {
    id,
  } =
    await context.params;

  try {
    const input =
      parseUpdateResponsibility(
        await request.json(),
      );

    const responsibility =
      await getResponsibilityLedger()
        .update(
          id,
          input,
        );

    return NextResponse.json({
      ok: true,
      responsibility,
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
            : "Unable to update responsibility.",
      },
      {
        status: 400,
      },
    );
  }
}
