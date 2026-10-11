import {
  NextResponse,
} from "next/server";

import {
  getFailureRecoveryEngine,
  type FailureRecoveryContext,
  type FailureRecoveryPolicy,
  type FailureSignal,
} from "@chernobog/models/failureRecovery";

export const runtime =
  "nodejs";

function failureResponse(
  error: unknown,
  status = 400,
) {
  return NextResponse.json(
    {
      ok:
        false,

      error:
        error instanceof Error
          ? error.message
          : String(error),
    },
    {
      status,
    },
  );
}

export async function POST(
  request: Request,
) {
  try {
    const body =
      await request.json() as {
        failure?:
          FailureSignal;

        context?:
          FailureRecoveryContext;

        policy?:
          Partial<
            FailureRecoveryPolicy
          >;
      };

    if (
      !body.failure
    ) {
      throw new Error(
        "failure is required. OH-4AB classifies a concrete failure and returns a bounded recovery directive.",
      );
    }

    const decision =
      getFailureRecoveryEngine()
        .decide({
          failure:
            body.failure,

          context:
            body.context,

          policy:
            body.policy,
        });

    return NextResponse.json({
      ok:
        true,

      decision,
    });
  } catch (error) {
    return failureResponse(
      error,
    );
  }
}