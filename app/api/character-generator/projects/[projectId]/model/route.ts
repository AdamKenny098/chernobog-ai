import { NextResponse } from "next/server";

import {
  CharacterModelGenerationError,
  CharacterProjectStateError,
  CharacterProjectValidationError,
} from "@/lib/modules/character-generator/errors";
import {
  approveCharacterModel,
  generateCharacterModel,
  getCharacterModelReadiness,
  rejectCharacterModel,
  resetInterruptedCharacterModelGeneration,
} from "@/lib/modules/character-generator/model/characterModelService";
import {
  parseCharacterModelActionRequest,
  parseCharacterModelGenerateRequest,
} from "@/lib/modules/character-generator/api/characterModelRequests";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HEADERS = { "Cache-Control": "no-store" };

type RouteContext = {
  params: Promise<{ projectId: string }>;
};

async function projectIdFrom(context: RouteContext): Promise<string> {
  return decodeURIComponent((await context.params).projectId);
}

function notFound(projectId: string) {
  return NextResponse.json(
    { ok: false, error: `Character Forge project not found: ${projectId}.` },
    { status: 404, headers: HEADERS },
  );
}

function errorResponse(error: unknown) {
  if (
    error instanceof CharacterProjectValidationError ||
    error instanceof URIError ||
    error instanceof SyntaxError
  ) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof SyntaxError
            ? "Request body must contain valid JSON."
            : error.message,
      },
      { status: 400, headers: HEADERS },
    );
  }

  if (error instanceof CharacterProjectStateError) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 409, headers: HEADERS },
    );
  }

  if (error instanceof CharacterModelGenerationError) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 502, headers: HEADERS },
    );
  }

  console.error("Character Forge model error:", error);
  return NextResponse.json(
    { ok: false, error: "Failed to process the local image-to-3D stage." },
    { status: 500, headers: HEADERS },
  );
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const projectId = await projectIdFrom(context);
    const result = await getCharacterModelReadiness(projectId);

    if (!result) {
      return notFound(projectId);
    }

    return NextResponse.json(
      { ok: true, project: result.project, provider: result.provider },
      { headers: HEADERS },
    );
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const projectId = await projectIdFrom(context);
    parseCharacterModelGenerateRequest((await request.json()) as unknown);
    const project = await generateCharacterModel(projectId);

    if (!project) {
      return notFound(projectId);
    }

    return NextResponse.json({ ok: true, project }, { headers: HEADERS });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const projectId = await projectIdFrom(context);
    const input = parseCharacterModelActionRequest(
      (await request.json()) as unknown,
    );
    const project =
      input.action === "approve"
        ? await approveCharacterModel(projectId)
        : input.action === "reject"
          ? await rejectCharacterModel(projectId)
          : await resetInterruptedCharacterModelGeneration(projectId);

    if (!project) {
      return notFound(projectId);
    }

    return NextResponse.json({ ok: true, project }, { headers: HEADERS });
  } catch (error) {
    return errorResponse(error);
  }
}
