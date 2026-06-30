import { NextResponse } from "next/server";
import { generateCurrentStateBriefing } from "@/lib/modules/vault-brain/currentStateBriefing";
import type { CurrentStateBriefingRequest } from "@/lib/modules/vault-brain/currentStateBriefingTypes";

function parseLimit(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }

  return value;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<CurrentStateBriefingRequest>;
    const briefing = await generateCurrentStateBriefing({
      query: typeof body.query === "string" ? body.query : undefined,
      projectId: typeof body.projectId === "string" ? body.projectId : undefined,
      version: typeof body.version === "string" ? body.version : undefined,
      limitPerSection: parseLimit(body.limitPerSection),
      includeCodeSummaries: typeof body.includeCodeSummaries === "boolean" ? body.includeCodeSummaries : undefined,
    });

    return NextResponse.json(briefing);
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown vault briefing error.",
      },
      { status: 400 }
    );
  }
}
