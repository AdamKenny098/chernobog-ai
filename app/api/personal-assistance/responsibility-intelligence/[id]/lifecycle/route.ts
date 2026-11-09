import { NextResponse } from "next/server";
import {
  getResponsibilityLedger,
} from "@chernobog/personal-assistance/responsibilities";
import {
  assessResponsibilityLifecycle,
} from "@chernobog/personal-assistance/responsibilityIntelligence/lifecycle";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    if (!/^resp_[a-zA-Z0-9-]{8,100}$/u.test(id)) {
      return NextResponse.json(
        { ok: false, error: "invalid_responsibility_id" },
        { status: 400 },
      );
    }
    const ledger = getResponsibilityLedger();
    const responsibility = await ledger.get(id);
    if (!responsibility) {
      return NextResponse.json(
        { ok: false, error: "responsibility_not_found" },
        { status: 404 },
      );
    }
    const history = await ledger.history(id);
    const snapshot = assessResponsibilityLifecycle(responsibility, history);
    return NextResponse.json({ ok: true, ...snapshot });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: "responsibility_lifecycle_read_failed",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
