import { NextResponse } from "next/server";

import {
  CharacterProjectValidationError,
  createCharacterProject,
  listCharacterProjects,
  parseCreateCharacterProjectRequest,
} from "@/lib/modules/character-generator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store",
};

export async function GET() {
  try {
    const projects = await listCharacterProjects();

    return NextResponse.json(
      {
        ok: true,
        count: projects.length,
        projects,
      },
      { headers: NO_STORE_HEADERS }
    );
  } catch (error) {
    console.error("Character Forge project list error:", error);

    return NextResponse.json(
      {
        ok: false,
        error: "Failed to read Character Forge projects.",
      },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as unknown;
    const input = parseCreateCharacterProjectRequest(body);
    const project = await createCharacterProject(input);

    return NextResponse.json(
      {
        ok: true,
        project,
      },
      { status: 201, headers: NO_STORE_HEADERS }
    );
  } catch (error) {
    if (error instanceof CharacterProjectValidationError) {
      return NextResponse.json(
        {
          ok: false,
          error: error.message,
        },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        {
          ok: false,
          error: "Request body must contain valid JSON.",
        },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    console.error("Character Forge project creation error:", error);

    return NextResponse.json(
      {
        ok: false,
        error: "Failed to create Character Forge project.",
      },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
