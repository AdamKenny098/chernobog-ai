import { NextResponse } from "next/server";

import {
  createV6OperatingPacket,
  getV6PersonalIntelligenceSystemStatus,
} from "@/lib/modules/vault-brain";

export const runtime = "nodejs";

type JsonObject = Record<string, unknown>;

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getOptionalString(body: JsonObject, key: string): string | undefined {
  const value = body[key];
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    system: getV6PersonalIntelligenceSystemStatus(),
  });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as unknown;
    if (!isObject(body)) {
      throw new Error("Request body must be a JSON object.");
    }

    const request = getOptionalString(body, "request");
    if (!request) {
      throw new Error("Request body requires a non-empty request string.");
    }

    const packet = createV6OperatingPacket({
      request,
      projectId: getOptionalString(body, "projectId"),
      version: getOptionalString(body, "version"),
      createdBy: "ceo",
    });

    return NextResponse.json({
      ok: packet.governanceDecision.status !== "blocked",
      packet,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown V6 personal intelligence error.";

    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      { status: 400 }
    );
  }
}
