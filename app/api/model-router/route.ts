import {
  NextResponse,
} from "next/server";

import {
  getModelRouterStatus,
} from "@/lib/chernobog/llm";

export const runtime = "nodejs";

export async function GET() {
  try {
    const router =
      await getModelRouterStatus();

    return NextResponse.json({
      ok: true,
      router,
      boundaries: {
        readOnlyEndpoint:
          true,
        provider:
          "ollama",
        arbitraryInstalledModelSelection:
          false,
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
          "model_router_status_failed",
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
