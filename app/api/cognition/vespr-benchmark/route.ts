import {
  NextResponse,
} from "next/server";

import {
  runVesprBenchmark,
} from "@chernobog/models/vesprBenchmark";

export const runtime =
  "nodejs";

function failure(
  error: unknown,
  status = 500,
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

export async function POST() {
  try {
    const report =
      await runVesprBenchmark({
        reportPath:
          ".chernobog/cognition/vespr-benchmark/latest.json",
      });

    return NextResponse.json({
      ok:
        true,

      report,
    });
  } catch (error) {
    return failure(
      error,
    );
  }
}