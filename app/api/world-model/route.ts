import {
  NextResponse,
} from "next/server";

import {
  getChernobogWorldModelRuntime,
} from "@/lib/chernobog/worldModel";

export const runtime = "nodejs";

export async function GET() {
  try {
    const worldModel =
      await getChernobogWorldModelRuntime();

    return NextResponse.json({
      ok: true,
      snapshot:
        worldModel.model.snapshot(),
      boundaries: {
        sourceOfTruth:
          "11G World State",
        readOnlyEndpoint: true,
        predictionsAreFacts: false,
        causalHypothesesAreFacts: false,
        executesActions: false,
        grantsPermissions: false,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "world_model_runtime_failed",
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
