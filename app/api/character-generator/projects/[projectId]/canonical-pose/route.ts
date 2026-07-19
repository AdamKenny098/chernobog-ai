import { NextResponse } from "next/server";

import {
  CharacterCanonicalPoseGenerationError,
  CharacterProjectStateError,
  CharacterProjectValidationError,
  approveCharacterCanonicalPose,
  generateCharacterCanonicalPose,
  getCharacterCanonicalPoseProviderStatus,
  parseCharacterCanonicalPoseActionRequest,
  parseCharacterCanonicalPoseGenerateRequest,
  readCharacterProject,
  rejectCharacterCanonicalPose,
  resetInterruptedCharacterCanonicalPoseGeneration,
} from "@/lib/modules/character-generator";

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

  if (error instanceof CharacterCanonicalPoseGenerationError) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 502, headers: HEADERS },
    );
  }

  console.error("Character Forge canonical pose error:", error);
  return NextResponse.json(
    { ok: false, error: "Failed to process the canonical A-pose gate." },
    { status: 500, headers: HEADERS },
  );
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const projectId = await projectIdFrom(context);
    const project = await readCharacterProject(projectId);

    if (!project) {
      return notFound(projectId);
    }

    const provider = await getCharacterCanonicalPoseProviderStatus();
    return NextResponse.json({ ok: true, provider }, { headers: HEADERS });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const projectId = await projectIdFrom(context);
    parseCharacterCanonicalPoseGenerateRequest(
      (await request.json()) as unknown,
    );
    const project = await generateCharacterCanonicalPose(projectId);

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
    const input = parseCharacterCanonicalPoseActionRequest(
      (await request.json()) as unknown,
    );
    const project =
      input.action === "approve"
        ? await approveCharacterCanonicalPose(projectId)
        : input.action === "reject"
          ? await rejectCharacterCanonicalPose(projectId)
          : await resetInterruptedCharacterCanonicalPoseGeneration(projectId);

    if (!project) {
      return notFound(projectId);
    }

    return NextResponse.json({ ok: true, project }, { headers: HEADERS });
  } catch (error) {
    return errorResponse(error);
  }
}
