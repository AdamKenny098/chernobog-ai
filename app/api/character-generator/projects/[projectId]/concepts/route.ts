import { NextResponse } from "next/server";

import {
  CharacterConceptGenerationError,
  CharacterProjectStateError,
  CharacterProjectValidationError,
  approveCharacterProjectDesign,
  clearCharacterProjectConceptSelection,
  generateCharacterProjectConcepts,
  getCharacterConceptProviderStatus,
  parseCharacterConceptActionRequest,
  readCharacterProject,
  resetInterruptedCharacterConceptGeneration,
  selectCharacterProjectConcept,
} from "@/lib/modules/character-generator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store",
};

type CharacterConceptRouteContext = {
  params: Promise<{
    projectId: string;
  }>;
};

async function readProjectId(
  context: CharacterConceptRouteContext
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

function providerError(error: CharacterConceptGenerationError) {
  return NextResponse.json(
    {
      ok: false,
      error: error.message,
    },
    { status: 502, headers: NO_STORE_HEADERS }
  );
}

function internalError(error: unknown) {
  console.error("Character Forge concept error:", error);

  return NextResponse.json(
    {
      ok: false,
      error: "Failed to process Character Forge concepts.",
    },
    { status: 500, headers: NO_STORE_HEADERS }
  );
}

export async function GET(
  _request: Request,
  context: CharacterConceptRouteContext
) {
  try {
    const projectId = await readProjectId(context);
    const project = await readCharacterProject(projectId);

    if (!project) {
      return notFound(projectId);
    }

    const provider = await getCharacterConceptProviderStatus();

    return NextResponse.json(
      {
        ok: true,
        provider,
      },
      { headers: NO_STORE_HEADERS }
    );
  } catch (error) {
    if (error instanceof CharacterProjectValidationError || error instanceof URIError) {
      return validationError(error);
    }

    return internalError(error);
  }
}

export async function POST(
  _request: Request,
  context: CharacterConceptRouteContext
) {
  try {
    const projectId = await readProjectId(context);
    const result = await generateCharacterProjectConcepts(projectId);

    if (!result) {
      return notFound(projectId);
    }

    return NextResponse.json(
      {
        ok: true,
        project: result.project,
        provider: result.provider,
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

    if (error instanceof CharacterConceptGenerationError) {
      return providerError(error);
    }

    return internalError(error);
  }
}

export async function PATCH(
  request: Request,
  context: CharacterConceptRouteContext
) {
  try {
    const projectId = await readProjectId(context);
    const body = (await request.json()) as unknown;
    const input = parseCharacterConceptActionRequest(body);
    let project;

    switch (input.action) {
      case "select":
        project = await selectCharacterProjectConcept(
          projectId,
          input.conceptId
        );
        break;
      case "clear-selection":
        project = await clearCharacterProjectConceptSelection(projectId);
        break;
      case "approve":
        project = await approveCharacterProjectDesign(projectId);
        break;
      case "reset-generation":
        project = await resetInterruptedCharacterConceptGeneration(projectId);
        break;
    }

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
