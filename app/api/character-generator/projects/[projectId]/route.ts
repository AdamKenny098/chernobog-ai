import { NextResponse } from "next/server";

import {
  CharacterProjectStateError,
  CharacterProjectValidationError,
  parseUpdateCharacterProjectRequest,
  readCharacterProject,
  updateCharacterProject,
} from "@/lib/modules/character-generator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store",
};

type CharacterProjectRouteContext = {
  params: Promise<{
    projectId: string;
  }>;
};

async function readProjectId(
  context: CharacterProjectRouteContext
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

export async function GET(
  _request: Request,
  context: CharacterProjectRouteContext
) {
  try {
    const projectId = await readProjectId(context);
    const project = await readCharacterProject(projectId);

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
    if (error instanceof CharacterProjectValidationError || error instanceof URIError) {
      return NextResponse.json(
        {
          ok: false,
          error: error.message,
        },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    console.error("Character Forge project read error:", error);

    return NextResponse.json(
      {
        ok: false,
        error: "Failed to read Character Forge project.",
      },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}

export async function PATCH(
  request: Request,
  context: CharacterProjectRouteContext
) {
  try {
    const projectId = await readProjectId(context);
    const body = (await request.json()) as unknown;
    const input = parseUpdateCharacterProjectRequest(body);
    const project = await updateCharacterProject(projectId, input);

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
      return NextResponse.json(
        {
          ok: false,
          error:
            error instanceof SyntaxError
              ? "Request body must contain valid JSON."
              : error.message,
        },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    if (error instanceof CharacterProjectStateError) {
      return NextResponse.json(
        {
          ok: false,
          error: error.message,
        },
        { status: 409, headers: NO_STORE_HEADERS }
      );
    }

    console.error("Character Forge project update error:", error);

    return NextResponse.json(
      {
        ok: false,
        error: "Failed to update Character Forge project.",
      },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
