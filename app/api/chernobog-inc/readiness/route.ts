import { NextResponse } from "next/server";

import {
  formatV6ReadinessReport,
  generateV6ReadinessReport,
  writeV6ReadinessReportFile,
} from "@/lib/modules/vault-brain";

export const runtime = "nodejs";

type JsonObject = Record<string, unknown>;

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function shouldPersist(body: unknown): boolean {
  return isObject(body) && body.persist === true;
}

export async function GET() {
  const report = generateV6ReadinessReport();
  return NextResponse.json({
    ok: report.ok,
    report,
  });
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => undefined)) as unknown;
  const report = generateV6ReadinessReport();
  const writtenPath = shouldPersist(body)
    ? writeV6ReadinessReportFile(report)
    : undefined;

  return NextResponse.json({
    ok: report.ok,
    report,
    markdown: formatV6ReadinessReport(report),
    writtenPath,
  });
}
