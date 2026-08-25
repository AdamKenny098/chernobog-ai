import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  WorldStateSnapshotCorruptionError,
  getChernobogWorldStateRuntime,
  parseWorldStateReadQuery,
  queryPersistedWorldState,
} from "@/lib/chernobog/worldState";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
) {
  try {
    const query =
      parseWorldStateReadQuery(
        request.nextUrl.searchParams,
      );

    await getChernobogWorldStateRuntime();

    const result =
      await queryPersistedWorldState({
        query,
      });

    if (
      result.status === "missing"
    ) {
      return NextResponse.json(
        {
          ok: true,
          status: "missing",
          message:
            "No persisted World State snapshot exists yet.",
          generatedAt:
            result.generatedAt,
          snapshotPath:
            result.snapshotPath,
          count: 0,
          items: [],
        },
        {
          status: 200,
        },
      );
    }

    return NextResponse.json({
      ok: true,
      status: "loaded",
      generatedAt:
        result.generatedAt,
      snapshotCreatedAt:
        result.snapshotCreatedAt,
      snapshotPath:
        result.snapshotPath,
      query,
      result:
        result.result,
      diagnostics:
        result.diagnostics,
    });
  } catch (error) {
    if (
      error instanceof
      WorldStateSnapshotCorruptionError
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "world_state_snapshot_corrupt",
          message:
            error.message,
        },
        {
          status: 503,
        },
      );
    }

    return NextResponse.json(
      {
        ok: false,
        error:
          "world_state_query_failed",
        message:
          error instanceof Error
            ? error.message
            : String(error),
      },
      {
        status: 400,
      },
    );
  }
}
