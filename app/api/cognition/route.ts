import {
  NextResponse,
} from "next/server";

import {
  getChernobogCognitiveRuntime,
} from "@/lib/chernobog/cognition";

import {
  personalAttentionProvider,
} from "@chernobog/personal-assistance";

export const runtime = "nodejs";

export async function GET() {
  try {
    const cognition =
      await getChernobogCognitiveRuntime({
        personalAttentionProvider,
      });

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
