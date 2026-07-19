import { NextResponse } from "next/server";

import { guardItchMutationRequest } from "@/lib/modules/itch-discovery/api/security";

import { apiFailureResponseInit, requiredString, readJsonObject, toItchApiFailure } from "@/lib/modules/itch-discovery/api/http";
import { tryHandleItchDiscoveryCommand } from "@/lib/modules/itch-discovery/commands";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    guardItchMutationRequest(request, "command:post", { limit: 60, windowMs: 60000 });
    const body = await readJsonObject(request);
    const result = await tryHandleItchDiscoveryCommand(
      requiredString(body.message, "message"),
    );
    return NextResponse.json(result, {
      status: result.handled && !result.ok ? 400 : 200,
    });
  } catch (error) {
    const failure = toItchApiFailure(error);
    return NextResponse.json(failure.body, apiFailureResponseInit(failure));
  }
}
