import { NextResponse } from "next/server";

import {
  CharacterProjectStateError,
  CharacterProjectValidationError,
  approveCharacterProjectBrief,
  generateCharacterProjectBrief,
  parseCharacterBriefActionRequest,
  parseCharacterBriefUpdateRequest,
  reopenCharacterProjectBrief,
  saveCharacterProjectBrief,
} from "@/lib/modules/character-generator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store",
};

type CharacterBriefRouteContext = {
  params: Promise<{
    projectId: string;
  }>;
};

async function readProjectId(
  context: CharacterBriefRouteContext
): Promise<string> {
  const { projectId } = await context.params;
  return decodeURIComponent(projectId);
}

function notFound(projectId: string) {
  return NextResponse.json(
    {
      ok: false,
      error: `Character Forge project not found: ${projectId}.`,
    },
    { status: 404, headers: NO_STORE_HEADERS }
  );
}

function validationError(error: Error) {
  return NextResponse.json(
    {
      ok: false,
      error: error.message,
    },
    { status: 400, headers: NO_STORE_HEADERS }
  );
}

function stateError(error: CharacterProjectStateError) {
  return NextResponse.json(
    {
      ok: false,
      error: error.message,
    },
    { status: 409, headers: NO_STORE_HEADERS }
  );
}

function internalError(error: unknown) {
  console.error("Character Forge brief error:", error);

  return NextResponse.json(
    {
      ok: false,
      error: "Failed to process the Character Forge brief.",
    },
    { status: 500, headers: NO_STORE_HEADERS }
  );
}

export async function POST(
  _request: Request,
  context: CharacterBriefRouteContext
) {
  try {
    const projectId = await readProjectId(context);
    const result = await generateCharacterProjectBrief(projectId);

    if (!result) {
      return notFound(projectId);
    }

    return NextResponse.json(
      {
        ok: true,
        project: result.project,
        generation: result.generation,
      },
      { status: 201, headers: NO_STORE_HEADERS }
    );
  } catch (error) {
    if (error instanceof CharacterProjectValidationError || error instanceof URIError) {
      return validationError(error);
    }

    if (error instanceof CharacterProjectStateError) {
      return stateError(error);
    }

    return internalError(error);
  }
}

export async function PUT(
  request: Request,
  context: CharacterBriefRouteContext
) {
  try {
    const projectId = await readProjectId(context);
    const body = (await request.json()) as unknown;
    const brief = parseCharacterBriefUpdateRequest(body);
    const project = await saveCharacterProjectBrief(projectId, brief);

    if (!project) {
      return notFound(projectId);
    }

    return NextResponse.json(
      {
        ok: true,
        project,
      },
      { headers: NO_STORE_HEADERS }
    );
  } catch (error) {
    if (
      error instanceof CharacterProjectValidationError ||
      error instanceof URIError ||
      error instanceof SyntaxError
    ) {
      return validationError(
        error instanceof SyntaxError
          ? new Error("Request body must contain valid JSON.")
          : error
      );
    }

    if (error instanceof CharacterProjectStateError) {
      return stateError(error);
    }

    return internalError(error);
  }
}

export async function PATCH(
  request: Request,
  context: CharacterBriefRouteContext
) {
  try {
    const projectId = await readProjectId(context);
    const body = (await request.json()) as unknown;
    const input = parseCharacterBriefActionRequest(body);
    const project =
      input.action === "approve" && input.brief
        ? await approveCharacterProjectBrief(projectId, input.brief)
        : await reopenCharacterProjectBrief(projectId);

    if (!project) {
      return notFound(projectId);
    }

    return NextResponse.json(
      {
        ok: true,
        project,
      },
      { headers: NO_STORE_HEADERS }
    );
  } catch (error) {
    if (
      error instanceof CharacterProjectValidationError ||
      error instanceof URIError ||
      error instanceof SyntaxError
    ) {
      return validationError(
        error instanceof SyntaxError
          ? new Error("Request body must contain valid JSON.")
          : error
      );
    }

    if (error instanceof CharacterProjectStateError) {
      return stateError(error);
    }

    return internalError(error);
  }
}
