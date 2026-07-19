import { NextResponse } from "next/server";

import {
  apiFailureResponseInit,
  optionalInteger,
  optionalString,
  readJsonObject,
  toItchApiFailure,
} from "@/lib/modules/itch-discovery/api/http";
import { guardItchMutationRequest } from "@/lib/modules/itch-discovery/api/security";
import {
  createItchDatabaseBackup,
  listItchDatabaseBackups,
  recoverItchRuntimeState,
  runItchDiagnostics,
} from "@/lib/modules/itch-discovery/maintenance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json({
      diagnostics: runItchDiagnostics(),
      backups: listItchDatabaseBackups(),
    });
  } catch (error) {
    const failure = toItchApiFailure(error);
    return NextResponse.json(failure.body, apiFailureResponseInit(failure));
  }
}

export async function POST(request: Request) {
  try {
    guardItchMutationRequest(request, "maintenance:post", {
      limit: 12,
      windowMs: 10 * 60_000,
    });
    const body = await readJsonObject(request);
    const action = optionalString(body.action, "action") ?? "diagnose";

    if (action === "diagnose") {
      return NextResponse.json({ diagnostics: runItchDiagnostics() });
    }
    if (action === "backup") {
      const result = await createItchDatabaseBackup({
        retentionCount: optionalInteger(body.retentionCount, "retentionCount", {
          minimum: 1,
          maximum: 365,
        }),
      });
      return NextResponse.json(result, { status: 201 });
    }
    if (action === "recover") {
      return NextResponse.json({ recovery: recoverItchRuntimeState() });
    }

    throw new TypeError(`Unsupported maintenance action: ${action}`);
  } catch (error) {
    const failure = toItchApiFailure(error);
    return NextResponse.json(failure.body, apiFailureResponseInit(failure));
  }
}
