import { NextResponse } from "next/server";
import {
  createChernobogIncWorkProposal,
  listChernobogIncWorkProposals,
} from "@/lib/modules/vault-brain/chernobogIncProposals";
import type { ChernobogIncDepartmentId } from "@/lib/modules/vault-brain/chernobogIncTypes";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

function readStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : undefined;
}

export async function GET() {
  const proposals = await listChernobogIncWorkProposals();
  return NextResponse.json({ ok: true, proposals });
}

export async function POST(request: Request) {
  const body: unknown = await request.json();
  if (!isRecord(body)) {
    return NextResponse.json(
      { ok: false, error: "Expected a JSON object body." },
      { status: 400 }
    );
  }

  const title = readString(body.title);
  const description = readString(body.description);
  if (!title || !description) {
    return NextResponse.json(
      { ok: false, error: "title and description are required." },
      { status: 400 }
    );
  }

  const proposal = await createChernobogIncWorkProposal({
    title,
    description,
    requestedBy: readString(body.requestedBy),
    departmentIds: readStringArray(body.departmentIds) as ChernobogIncDepartmentId[] | undefined,
    projectId: readString(body.projectId),
    version: readString(body.version),
    tags: readStringArray(body.tags),
  });

  return NextResponse.json({ ok: true, proposal });
}
