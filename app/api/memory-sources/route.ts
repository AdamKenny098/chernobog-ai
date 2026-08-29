import {
  NextResponse,
} from "next/server";

import {
  getUnifiedMemorySourceSnapshot,
} from "@/lib/chernobog/memory-architecture";

export const runtime = "nodejs";

export async function GET() {
  try {
    const memory =
      getUnifiedMemorySourceSnapshot();

    return NextResponse.json({
      ok: true,
      memory,
      boundaries: {
        readOnlyEndpoint: true,
        readsMemoryContents: false,
        writesMemory: false,
        deletesMemory: false,
        promotesLessons: false,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "memory_source_inventory_failed",
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
