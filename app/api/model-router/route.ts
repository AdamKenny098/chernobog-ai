import {
  NextResponse,
} from "next/server";

import {
  getModelRouterStatus,
} from "@chernobog/models";
import {
  OLLAMA_LIFECYCLE_DEPENDENCY,
  getLifecycleRuntime,
} from "@chernobog/runtime";

export const runtime = "nodejs";

export async function GET() {
  try {
    const router =
      await getLifecycleRuntime()
        .runDependencyOperation({
          dependencyId:
            OLLAMA_LIFECYCLE_DEPENDENCY,
          operation:
            () =>
              getModelRouterStatus(),
          assess:
            (routerStatus) => ({
              status:
                routerStatus.status,
              ...(routerStatus.status ===
                "unavailable"
                ? {
                    reason:
                      "No model-router role is currently routable.",
                  }
                : {}),
              metadata: {
                primaryRoleCount:
                  routerStatus
                    .primaryRoles
                    .length,
                fallbackRoleCount:
                  routerStatus
                    .fallbackRoles
                    .length,
                unavailableRoleCount:
                  routerStatus
                    .unavailableRoles
                    .length,
              },
            }),
        });

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
