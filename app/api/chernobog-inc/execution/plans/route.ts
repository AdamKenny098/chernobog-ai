import { NextResponse } from "next/server";

import {
  createControlledExecutionPlan,
  readControlledExecutionPlans,
  type CreateControlledExecutionPlanInput,
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

function getStringArray(body: JsonObject, key: string): string[] | undefined {
  const value = body[key];
  if (!Array.isArray(value)) {
    return undefined;
  }

  const items = value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);

  return items.length > 0 ? items : undefined;
}

function parseCreatePlanRequest(body: unknown): CreateControlledExecutionPlanInput {
  if (!isObject(body)) {
    throw new Error("Request body must be a JSON object.");
  }

  const missionId = getOptionalString(body, "missionId");
  if (!missionId) {
    throw new Error("Request body requires missionId.");
  }

  return {
    missionId,
    title: getOptionalString(body, "title"),
    objective: getOptionalString(body, "objective"),
    projectId: getOptionalString(body, "projectId"),
    version: getOptionalString(body, "version"),
    departments: getStringArray(body, "departments"),
    createdBy: "ceo",
  };
}

export async function GET() {
  const plans = await readControlledExecutionPlans();
  return NextResponse.json({ ok: true, plans });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as unknown;
    const input = parseCreatePlanRequest(body);
    const plan = await createControlledExecutionPlan(input);

    return NextResponse.json({ ok: true, plan });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown controlled execution plan error.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
