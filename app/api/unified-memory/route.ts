import {
  NextResponse,
} from "next/server";

import {
  getUnifiedMemoryArchitectureStatus,
} from "@/lib/chernobog/memory-architecture";

export const runtime = "nodejs";

export async function GET() {
  try {
    const memory =
      getUnifiedMemoryArchitectureStatus();

    return NextResponse.json({
      ok: true,
      memory,
      boundaries: {
        readOnlyEndpoint: true,
        exposesMemoryContents: false,
        writesMemory: false,
        deletesMemory: false,
        promotesLessons: false,
        approvesVaultMemory: false,
        executesTasks: false,
        executesTools: false,
        changesPermissions: false,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "unified_memory_status_failed",
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
