import { NextResponse } from "next/server";

import {
  answerVaultOnlyQuestion,
  type VaultOnlyAnswerRequest,
} from "@/lib/modules/vault-brain";
import type { VaultMemoryType } from "@/lib/modules/vault-brain/memoryTypes";

export const runtime = "nodejs";

type JsonObject = Record<string, unknown>;

const ALLOWED_MEMORY_TYPES: readonly VaultMemoryType[] = [
  "raw",
  "summary",
  "task",
  "decision",
  "bug",
  "idea",
  "roadmap",
  "code-summary",
  "project-state",
  "identity",
  "rule",
];

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getOptionalString(body: JsonObject, key: string): string | undefined {
  const value = body[key];
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

function getOptionalBoolean(body: JsonObject, key: string): boolean | undefined {
  const value = body[key];
  return typeof value === "boolean" ? value : undefined;
}

function getOptionalNumber(body: JsonObject, key: string): number | undefined {
  const value = body[key];
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

function getStringArray(body: JsonObject, key: string): string[] | undefined {
  const value = body[key];
  if (!Array.isArray(value)) {
    return undefined;
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function filterMemoryTypes(values: readonly string[] | undefined): VaultMemoryType[] | undefined {
  if (!values?.length) {
    return undefined;
  }

  const allowed = new Set<string>(ALLOWED_MEMORY_TYPES);
  return values.filter((value): value is VaultMemoryType => allowed.has(value));
}

function parseVaultOnlyAnswerRequest(body: unknown): VaultOnlyAnswerRequest {
  if (!isObject(body)) {
    throw new Error("Request body must be a JSON object.");
  }

  const query = getOptionalString(body, "query");
  if (!query) {
    throw new Error("Request body requires a non-empty query string.");
  }

  return {
    query,
    projectId: getOptionalString(body, "projectId"),
    version: getOptionalString(body, "version"),
    tags: getStringArray(body, "tags"),
    memoryTypes: filterMemoryTypes(getStringArray(body, "memoryTypes")),
    limit: getOptionalNumber(body, "limit"),
    strictVersion: getOptionalBoolean(body, "strictVersion"),
  };
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: "/api/vault/answer",
    method: "POST",
    purpose:
      "Answer from approved structured vault memory only. Raw, candidate, rejected, stale, superseded, and outside model memory are not treated as truth.",
    example: {
      query: "What is next for V5.6?",
      projectId: "chernobog",
      version: "v5.6.6",
      memoryTypes: ["project-state", "roadmap", "decision"],
      limit: 8,
    },
  });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as unknown;
    const request = parseVaultOnlyAnswerRequest(body);
    const result = await answerVaultOnlyQuestion(request);

    return NextResponse.json(result, { status: result.ok ? 200 : 404 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown vault-only answer error.";

    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      { status: 400 }
    );
  }
}
