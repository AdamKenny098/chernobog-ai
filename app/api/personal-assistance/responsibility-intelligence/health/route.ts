import { NextResponse } from "next/server";
import { getResponsibilityLedger } from "@chernobog/personal-assistance/responsibilities";
import {
  buildResponsibilityIntegrationHealth,
} from "@chernobog/personal-assistance/responsibilityIntelligence/integrationHealth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Snapshot is deliberately bounded to avoid expensive repeated history reads.
 * If more records exist, `status: partial` prevents a false overall PASS.
 */
export async function GET(request: Request) {
  try {
    const rawLimit = new URL(request.url).searchParams.get("limit");
    const limit = rawLimit === null ? 25 : Number(rawLimit);
    if (rawLimit === "" || !Number.isInteger(limit) || limit < 1 || limit > 100) {
      return NextResponse.json(
        { ok: false, error: "limit must be an integer from 1 to 100." },
        { status: 400 },
      );
    }
    const ledger = getResponsibilityLedger();
    const all = await ledger.list({ includeClosed: true });
    const selected = all.slice(0, limit);
    const entries = await Promise.all(selected.map(async (responsibility) => ({
      responsibility,
      history: await ledger.history(responsibility.id),
    })));
    return NextResponse.json({
      ok: true,
      ...buildResponsibilityIntegrationHealth(entries, new Date(), all.length),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: "responsibility_integration_health_failed",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
