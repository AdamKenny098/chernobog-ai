import {
  NextResponse,
} from "next/server";

import {
  getChernobogCognitiveRuntime,
} from "@/lib/chernobog/cognition";

export const runtime = "nodejs";

export async function GET() {
  try {
    const cognition =
      await getChernobogCognitiveRuntime();

    const cycle =
      await cognition.evaluate();

    return NextResponse.json({
      ok: true,
      cycle,
      snapshot:
        cognition.snapshot(),
      executionBoundary: {
        executesTools: false,
        defaultGovernance:
          "advisory-only",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "cognitive_runtime_failed",
        message:
          error instanceof Error
            ? error.message
            : String(error),
      },
      {
        status: 500,
      },
    );
  }
}
