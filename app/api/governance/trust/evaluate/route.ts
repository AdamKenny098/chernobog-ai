import { NextResponse } from "next/server";
import type { TrustActionRequest } from "@/lib/modules/vault-brain/trustActionTypes";
import { createTrustDecision } from "@/lib/modules/vault-brain/trustDecision";
import { appendTrustAuditEvent } from "@/lib/modules/vault-brain/trustAuditLog";
import { normalizeTrustActionType } from "@/lib/modules/vault-brain/trustActionTypes";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as Partial<TrustActionRequest>;

  const actionRequest: TrustActionRequest = {
    title: body.title ?? body.description ?? "Untitled trust action",
    description: body.description,
    actionType: body.actionType ? normalizeTrustActionType(body.actionType) : "read",
    requestedTool: body.requestedTool,
    projectId: body.projectId,
    version: body.version,
    target: body.target,
    risk: body.risk,
    actor: body.actor ?? "api",
    metadata: body.metadata,
  };

  const decision = createTrustDecision(actionRequest);
  await appendTrustAuditEvent({
    action: decision.status === "blocked" ? "blocked" : decision.status === "notice" ? "notice" : "evaluated",
    request: actionRequest,
    decision,
    actor: actionRequest.actor,
    note: "Trust action evaluated through POST /api/governance/trust/evaluate.",
  });

  return NextResponse.json({
    ok: decision.status !== "blocked",
    decision,
  });
}
