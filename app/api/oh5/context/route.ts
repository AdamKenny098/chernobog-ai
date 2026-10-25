import { NextResponse } from "next/server";
import { hasOwnerAuthorization } from "@/packages/vault/src/oh5/auth";
import { OH5RecallService } from "@/packages/vault/src/oh5/recall";
import { OH5ContextAssembler, composeEvidenceAnswer, formatContextForModel, type ContextMode } from "@/packages/vault/src/oh5/context";
import { defaultOH5BDatabasePath } from "@/packages/vault/src/oh5/store";
import { defaultObsidianRoot } from "@/packages/vault/src/oh5/layout";

export const runtime = "nodejs";
const headers = { "Cache-Control": "no-store" };
export async function POST(request: Request) {
  if (!hasOwnerAuthorization(request.headers.get("authorization"))) return NextResponse.json({ ok: false, error: "Owner authorization required" }, { status: 401, headers });
  let recall: OH5RecallService | undefined;
  try {
    const incoming: unknown = await request.json();
    if (!incoming || typeof incoming !== "object" || Array.isArray(incoming)) throw new Error("Invalid request body");
    const body = incoming as Record<string, unknown>;
    if (typeof body.mode !== "string" || !["vault-only", "vault-first", "general"].includes(body.mode) || typeof body.query !== "string") throw new Error("Invalid mode or query");
    if (body.mode !== "general") recall = new OH5RecallService(defaultOH5BDatabasePath(), defaultObsidianRoot());
    const adapter = recall ?? { search: () => [] };
    const assembler = new OH5ContextAssembler(adapter);
    const packet = assembler.build({ mode: body.mode as ContextMode, projectId: body.projectId as string | undefined, query: body.query, maxCharacters: body.maxCharacters as number | undefined, maxRecords: body.maxRecords as number | undefined });
    if (body.output === "answer") return NextResponse.json({ ok: true, result: composeEvidenceAnswer(packet) }, { headers });
    if (body.output === "model-context") return NextResponse.json({ ok: true, packet, formatted: formatContextForModel(packet) }, { headers });
    return NextResponse.json({ ok: true, packet }, { headers });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Context assembly failed" }, { status: 400, headers });
  } finally { recall?.close(); }
}