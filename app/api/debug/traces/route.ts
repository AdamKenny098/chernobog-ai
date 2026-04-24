import { NextResponse } from "next/server";
import {
  clearTrustTraces,
  getTrustTraceById,
  getTrustTraces,
} from "@/lib/chernobog/trust/store";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");

  if (id) {
    const trace = getTrustTraceById(id);

    if (!trace) {
      return NextResponse.json(
        {
          error: "Trace not found.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      trace,
    });
  }

  const traces = getTrustTraces(25);

  return NextResponse.json({
    traces,
  });
}

export async function DELETE() {
  const deletedCount = clearTrustTraces();

  return NextResponse.json({
    deletedCount,
  });
}