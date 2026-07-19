import { NextResponse } from "next/server";

import {
  CharacterProjectValidationError,
  readCharacterConceptImage,
  readCharacterProject,
} from "@/lib/modules/character-generator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CharacterConceptImageRouteContext = {
  params: Promise<{
    projectId: string;
    conceptId: string;
  }>;
};

function imageNotFound() {
  return NextResponse.json(
    {
      ok: false,
      error: "Character Forge concept image not found.",
    },
    { status: 404, headers: { "Cache-Control": "no-store" } }
  );
}

export async function GET(
  _request: Request,
  context: CharacterConceptImageRouteContext
) {
  try {
    const params = await context.params;
    const projectId = decodeURIComponent(params.projectId);
    const conceptId = decodeURIComponent(params.conceptId);
    const project = await readCharacterProject(projectId);

    if (!project) {
      return imageNotFound();
    }

    const concept = project.concepts.find(
      (candidate) => candidate.id === conceptId
    );

    if (!concept || concept.status !== "ready" || !concept.imagePath) {
      return imageNotFound();
    }

    const bytes = await readCharacterConceptImage({
      projectId,
      conceptId,
      imagePath: concept.imagePath,
    });

    if (!bytes) {
      return imageNotFound();
    }

    return new Response(new Uint8Array(bytes), {
      headers: {
        "Cache-Control": "private, max-age=3600",
        "Content-Type": concept.imageMimeType,
        "Content-Length": String(bytes.length),
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if (error instanceof CharacterProjectValidationError || error instanceof URIError) {
      return NextResponse.json(
        {
          ok: false,
          error: error.message,
        },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    console.error("Character Forge concept image error:", error);

    return NextResponse.json(
      {
        ok: false,
        error: "Failed to read the Character Forge concept image.",
      },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
