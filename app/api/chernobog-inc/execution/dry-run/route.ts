import { NextResponse } from "next/server";

import { createControlledExecutionDryRun } from "@/lib/modules/vault-brain";

export const runtime = "nodejs";

type JsonObject = Record<string, unknown>;

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getRequiredString(body: JsonObject, key: string): string {
  const value = body[key];
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Request body requires ${key}.`);
  }

  return value.trim();
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as unknown;
    if (!isObject(body)) {
      throw new Error("Request body must be a JSON object.");
    }

    const planId = getRequiredString(body, "planId");
    const dryRun = await createControlledExecutionDryRun(planId);

    return NextResponse.json({ ok: true, dryRun });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown controlled execution dry-run error.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
