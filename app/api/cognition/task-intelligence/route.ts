import {
  NextResponse,
} from "next/server";

import {
  getTaskIntelligenceEngine,
  type TaskIntelligenceSignalInput,
} from "@chernobog/models/taskIntelligence";

export const runtime =
  "nodejs";

function failure(
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
      await request.json() as
        TaskIntelligenceSignalInput;

    return NextResponse.json({
      ok:
        true,
      profile:
        getTaskIntelligenceEngine()
          .classify(
            body,
          ),
    });
  } catch (error) {
    return failure(error);
  }
}