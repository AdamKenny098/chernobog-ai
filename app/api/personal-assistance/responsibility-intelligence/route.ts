import { NextResponse } from "next/server";
import { getResponsibilityLedger } from "@chernobog/personal-assistance/responsibilities";
import type {
  ResponsibilityReviewBucket,
} from "@chernobog/personal-assistance/responsibilityIntelligence/readModel";
import {
  buildResponsibilityIntelligenceSnapshot,
} from "@chernobog/personal-assistance/responsibilityIntelligence/readModel";
import type {
  ResponsibilitySourceType,
} from "@chernobog/personal-assistance/responsibilities";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKETS: readonly string[] = [
  "overdue", "due-soon", "high-priority", "standard", "waiting", "closed",
];
const SOURCES: readonly string[] = [
  "notification", "calendar", "email", "message", "work-schedule", "manual", "system",
];

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const rawClosed = params.get("includeClosed");
    const rawSource = params.get("sourceType");
    const rawBucket = params.get("bucket");
    const rawLimit = params.get("limit");

    if (rawClosed !== null && rawClosed !== "true" && rawClosed !== "false") {
      throw new Error("includeClosed must be true or false.");
    }
    if (rawSource !== null && !SOURCES.includes(rawSource)) {
      throw new Error("Unknown sourceType.");
    }
    if (rawBucket !== null && !BUCKETS.includes(rawBucket)) {
      throw new Error("Unknown review bucket.");
    }
    const limit = rawLimit === null ? 100 : Number(rawLimit);
    if (
      rawLimit === "" ||
      !Number.isInteger(limit) ||
      limit < 1 || limit > 200
    ) {
      throw new Error("limit must be an integer between 1 and 200.");
    }

    const ledger = getResponsibilityLedger();
    const responsibilities = await ledger.list({ includeClosed: true });
    const snapshot = buildResponsibilityIntelligenceSnapshot(
      responsibilities,
      new Date(),
      {
        includeClosed: rawClosed === "true",
        sourceType: rawSource === null ? undefined : rawSource as ResponsibilitySourceType,
        bucket: rawBucket === null ? undefined : rawBucket as ResponsibilityReviewBucket,
        limit,
      },
    );

    return NextResponse.json({ ok: true, ...snapshot });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: "responsibility_intelligence_read_failed",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 400 },
    );
  }
}
