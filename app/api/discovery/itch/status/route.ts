import { NextResponse } from "next/server";

import { apiFailureResponseInit, toItchApiFailure } from "@/lib/modules/itch-discovery/api/http";
import { getItchDiscoveryStatus } from "@/lib/modules/itch-discovery/services/getItchDiscoveryStatus";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(getItchDiscoveryStatus());
  } catch (error) {
    const failure = toItchApiFailure(error);
    return NextResponse.json(failure.body, apiFailureResponseInit(failure));
  }
}
