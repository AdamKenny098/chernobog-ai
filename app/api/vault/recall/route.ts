import { NextResponse } from "next/server";

import {
  recallStructuredVaultMemory,
  type StructuredVaultRecallRequest,
} from "@/lib/modules/vault-brain";
import type { VaultAnswerMode } from "@/lib/modules/vault-brain/memoryContextPacket";

export const runtime = "nodejs";

type JsonObject = Record<string, unknown>;

const ALLOWED_ANSWER_MODES: readonly VaultAnswerMode[] = [
  "vault-only",
  "vault-first",
  "general",
];

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getOptionalString(body: JsonObject, key: string) {
  const value = body[key];
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

function getOptionalNumber(body: JsonObject, key: string) {
  const value = body[key];
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

function parseRecallRequest(body: unknown): StructuredVaultRecallRequest {
  if (!isObject(body)) {
    throw new Error("Request body must be a JSON object.");
  }

  const query = getOptionalString(body, "query");
  if (!query) {
    throw new Error("Request body requires a non-empty query string.");
  }

  const answerMode = getOptionalString(body, "answerMode");
  const allowedAnswerMode =
    answerMode && ALLOWED_ANSWER_MODES.includes(answerMode as VaultAnswerMode)
      ? (answerMode as VaultAnswerMode)
      : undefined;

  return {
    query,
    projectId: getOptionalString(body, "projectId"),
    version: getOptionalString(body, "version"),
    answerMode: allowedAnswerMode,
    limit: getOptionalNumber(body, "limit"),
  };
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: "/api/vault/recall",
    method: "POST",
    purpose:
      "Build a structured vault memory recall packet from approved/reviewed memory without promoting raw memory.",
    example: {
      query: "What is next for V5.6?",
      projectId: "chernobog",
      version: "v5.6",
      answerMode: "vault-only",
      limit: 8,
    },
  });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as unknown;
    const request = parseRecallRequest(body);
    const result = await recallStructuredVaultMemory(request);

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown recall error.";

    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      { status: 400 }
    );
  }
}