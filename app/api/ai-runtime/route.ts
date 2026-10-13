import {
  NextResponse,
} from "next/server";

import {
  getAiRuntimeStatus,
} from "@chernobog/models";
import {
  OLLAMA_LIFECYCLE_DEPENDENCY,
  getLifecycleRuntime,
} from "@chernobog/runtime";

export const runtime = "nodejs";

export async function GET() {
  try {
    const status =
      await getLifecycleRuntime()
        .runDependencyOperation({
          dependencyId:
            OLLAMA_LIFECYCLE_DEPENDENCY,
          operation:
            () =>
              getAiRuntimeStatus(),
          assess:
            (runtimeStatus) => ({
              status:
                runtimeStatus.status,
              ...(runtimeStatus.status ===
                "unavailable"
                ? {
                    reason:
                      "No configured model role is currently ready.",
                  }
                : {}),
              metadata: {
                readyRoleCount:
                  runtimeStatus
                    .readyRoles
                    .length,
                unavailableRoleCount:
                  runtimeStatus
                    .unavailableRoles
                    .length,
              },
            }),
        });

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
