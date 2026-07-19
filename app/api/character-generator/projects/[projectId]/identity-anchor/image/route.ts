import { NextResponse } from "next/server";

import {
  CharacterProjectValidationError,
  readCharacterIdentityAnchorImage,
  readCharacterProject,
} from "@/lib/modules/character-generator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ projectId: string }>;
};

function notFound() {
  return NextResponse.json(
    { ok: false, error: "Character Forge identity anchor image not found." },
    { status: 404, headers: { "Cache-Control": "no-store" } }
  );
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const projectId = decodeURIComponent((await context.params).projectId);
    const project = await readCharacterProject(projectId);
    const anchor = project?.identityAnchor ?? null;

    if (!project || !anchor || !anchor.imagePath) {
      return notFound();
    }

    const bytes = await readCharacterIdentityAnchorImage({
      projectId,
      imagePath: anchor.imagePath,
    });

    if (!bytes) {
      return notFound();
    }

    return new Response(new Uint8Array(bytes), {
      headers: {
        "Cache-Control": "private, max-age=3600",
        "Content-Type": anchor.imageMimeType,
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

    console.error("Character Forge identity anchor image error:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to read the identity anchor image." },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
