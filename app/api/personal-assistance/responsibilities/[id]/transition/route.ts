import {
  NextResponse,
} from "next/server";
import {
  getResponsibilityLedger,
  parseTransitionResponsibility,
} from "@/lib/chernobog/personalAssistance/responsibilities";

export const dynamic =
  "force-dynamic";

type RouteContext = {
  params:
    Promise<{
      id: string;
    }>;
};

export async function POST(
  request: Request,
  context: RouteContext,
) {
  const {
    id,
  } =
    await context.params;

  try {
    const input =
      parseTransitionResponsibility(
        await request.json(),
      );

    const responsibility =
      await getResponsibilityLedger()
        .transition(
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
            : "Unable to transition responsibility.",
      },
      {
        status: 400,
      },
    );
  }
}
