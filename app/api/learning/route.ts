import {
  NextResponse,
} from "next/server";

import {
  getChernobogLearningRuntime,
} from "@/lib/chernobog/learning";

export const runtime = "nodejs";

export async function GET() {
  try {
    const learning =
      await getChernobogLearningRuntime();

    return NextResponse.json({
      ok: true,
      snapshot:
        learning.snapshot(),
      boundaries: {
        readOnlyEndpoint: true,
        acceptsTrainingWrites: false,
        rewritesPrompts: false,
        rewritesCode: false,
        grantsExecutionPermission: false,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "learning_runtime_failed",
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
