import {
  NextResponse,
} from "next/server";

import {
  getAiRuntimeStatus,
} from "@/lib/chernobog/llm";

export const runtime = "nodejs";

export async function GET() {
  try {
    const status =
      await getAiRuntimeStatus();

    return NextResponse.json({
      ok: true,
      runtime:
        status,
      boundaries: {
        readOnlyEndpoint:
          true,
        provider:
          "ollama",
        executesTools:
          false,
        grantsPermissions:
          false,
        selectsActions:
          false,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "ai_runtime_status_failed",
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
