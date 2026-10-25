import { NextResponse } from "next/server";
import { hasOwnerAuthorization } from "@/packages/vault/src/oh5/auth";
import { OH5ProjectState, type WorkKind, type WorkStatus } from "@/packages/vault/src/oh5/projectState";
import { defaultOH5BDatabasePath } from "@/packages/vault/src/oh5/store";
import { defaultObsidianRoot } from "@/packages/vault/src/oh5/layout";

export const runtime = "nodejs";
const headers = { "Cache-Control": "no-store" };
export async function POST(request: Request) {
  if (!hasOwnerAuthorization(request.headers.get("authorization"))) return NextResponse.json({ ok: false, error: "Owner authorization required" }, { status: 401, headers });
  let service: OH5ProjectState | undefined;
  try {
    const raw: unknown = await request.json();
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("Invalid body");
    const body = raw as Record<string, unknown>;
    service = new OH5ProjectState(defaultOH5BDatabasePath(), defaultObsidianRoot());
    let result: unknown;
    switch (body.operation) {
      case "propose":
        result = service.propose({ projectId: body.projectId as string, kind: body.kind as WorkKind, title: body.title as string, details: body.details as string, evidenceMemoryId: body.evidenceMemoryId as string | undefined }, "owner");
        break;
      case "change":
        result = service.change({ projectId: body.projectId as string, itemId: body.itemId as string, nextStatus: body.nextStatus as WorkStatus, expectedRevision: body.expectedRevision as number, reason: body.reason as string }, true);
        break;
      case "brief": result = service.brief(body.projectId as string); break;
      case "attention": result = service.attention(body.projectId as string); break;
      case "history": result = service.history(body.projectId as string, body.itemId as string); break;
      default: throw new Error("Unsupported project-state operation");
    }
    return NextResponse.json({ ok: true, result }, { headers });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Project state error" }, { status: 400, headers });
  } finally { service?.close(); }
}