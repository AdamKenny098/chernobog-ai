import { NextResponse } from "next/server";
import { runLiveOh4CommandPipeline } from "@/lib/chernobog/cognition/liveOh4CommandPipeline";
import { buildSpokenReply } from "@/lib/chernobog/personality";
import { hasOwnerAuthorization } from "@/packages/vault/src/oh5/auth";
import { OH5RecallService } from "@/packages/vault/src/oh5/recall";
import { OH5ContextAssembler, formatContextForModel } from "@/packages/vault/src/oh5/context";
import { defaultOH5BDatabasePath } from "@/packages/vault/src/oh5/store";
import { defaultObsidianRoot } from "@/packages/vault/src/oh5/layout";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const userMessage = String(body?.message ?? "").trim();
    const sessionId = String(body?.sessionId ?? "").trim();
    const responseMode =
      body?.responseMode === "voice"
        ? "voice"
        : "text";

    if (!userMessage) {
      return NextResponse.json(
        { error: "Message is required." },
        { status: 400 }
      );
    }

    // OH-5N: opt-in authenticated project-scoped context; never infer authority from message text.
    const memoryOptions = body?.oh5Memory;
    let memoryEvidence: string | undefined;
    let memoryCitations: unknown[] = [];
    // Natural-language questions may contain many words absent from the memory.
    // OH-5H uses an all-terms filter. Prefer an explicit ADR reference for that
    // specific lookup without broadening any project scope or memory authority.
    const adrReference = userMessage.match(/\bADR[-\s]?\d{4}\b/i);
    const recallQuery = adrReference
      ? adrReference[0].replace(/\s+/, "-").toUpperCase()
      : userMessage.slice(0, 300);
    if (memoryOptions !== undefined) {
      if (!hasOwnerAuthorization(req.headers.get("authorization"))) {
        return NextResponse.json({ error: "Owner authentication required for memory context" }, { status: 401 });
      }
      if (!memoryOptions || typeof memoryOptions !== "object" || Array.isArray(memoryOptions) ||
        memoryOptions.mode !== "vault-first" || typeof memoryOptions.projectId !== "string" ||
        !/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(memoryOptions.projectId)) {
        return NextResponse.json({ error: "Explicit project scope and vault-first mode required" }, { status: 400 });
      }
      let recall: OH5RecallService | undefined;
      try {
        recall = new OH5RecallService(defaultOH5BDatabasePath(), defaultObsidianRoot());
        const packet = new OH5ContextAssembler(recall).build({
          mode: "vault-first", projectId: memoryOptions.projectId, query: recallQuery, maxRecords: 6, maxCharacters: 3600,
        });
        memoryCitations = packet.citations;
        memoryEvidence = formatContextForModel(packet);
      } catch {
        return NextResponse.json({ error: "Project-scoped memory context unavailable or invalid" }, { status: 400 });
      } finally { recall?.close(); }
    }
    const result = await runLiveOh4CommandPipeline(
      userMessage,
      sessionId,
      { responseMode, oh5Evidence: memoryEvidence },
    );

    const spokenReply =
      responseMode === "voice"
        ? buildSpokenReply(result.payload.reply)
        : undefined;

    return NextResponse.json(
      spokenReply
        ? { ...result.payload, spokenReply, memoryCitations }
        : { ...result.payload, memoryCitations },
    );
  } catch (error) {
    console.error("Chat route error:", error);

    return NextResponse.json(
      {
        error: "Failed to process directive.",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}