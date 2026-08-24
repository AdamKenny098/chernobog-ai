import { NextResponse } from "next/server";

import {
  getChernobogEventBus,
} from "@/lib/chernobog/events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store",
};

export async function GET() {
  try {
    const diagnostics =
      await getChernobogEventBus()
        .getDiagnostics();

    return NextResponse.json(
      {
        ok: true,
        diagnostics,
      },
      {
        headers:
          NO_STORE_HEADERS,
      }
    );
  } catch (error) {
    console.error(
      "Chernobog event diagnostics error:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          "Failed to read Chernobog event diagnostics.",
      },
      {
        status: 500,
        headers:
          NO_STORE_HEADERS,
      }
    );
  }
}