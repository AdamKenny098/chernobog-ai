import { NextResponse } from "next/server";

import {
  CharacterProjectValidationError,
  readCharacterProject,
  readCharacterReferenceImage,
} from "@/lib/modules/character-generator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ projectId: string; viewId: string }>;
};

function notFound() {
  return NextResponse.json(
    { ok: false, error: "Character Forge reference image not found." },
    { status: 404, headers: { "Cache-Control": "no-store" } }
  );
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const params = await context.params;
    const projectId = decodeURIComponent(params.projectId);
    const viewId = decodeURIComponent(params.viewId);
    const project = await readCharacterProject(projectId);
    const view = project?.referenceSheet?.views.find(
      (candidate) => candidate.id === viewId
    );

    if (!project || !view || view.status !== "ready" || !view.imagePath) {
      return notFound();
    }

    const bytes = await readCharacterReferenceImage({
      projectId,
      viewId,
      imagePath: view.imagePath,
    });

    if (!bytes) {
      return notFound();
    }

    return new Response(new Uint8Array(bytes), {
      headers: {
        "Cache-Control": "private, max-age=3600",
        "Content-Type": view.imageMimeType,
        "Content-Length": String(bytes.length),
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if (
      error instanceof CharacterProjectValidationError ||
      error instanceof URIError
    ) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    console.error("Character Forge reference image error:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to read the reference image." },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
