import { NextResponse } from "next/server";

import {
  CharacterProjectValidationError,
  readCharacterCanonicalPoseImage,
  readCharacterProject,
} from "@/lib/modules/character-generator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ projectId: string }>;
};

function notFound() {
  return NextResponse.json(
    { ok: false, error: "Character Forge canonical A-pose image not found." },
    { status: 404, headers: { "Cache-Control": "no-store" } }
  );
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const projectId = decodeURIComponent((await context.params).projectId);
    const project = await readCharacterProject(projectId);
    const pose = project?.canonicalPose ?? null;
    const visible = Boolean(
      project &&
        [
          "canonical_pose_review",
          "canonical_pose_ready",
          "model_generating",
          "model_ready",
          "rigged",
          "validated",
          "exported",
        ].includes(project.status),
    );

    if (!project || !pose || !pose.imagePath || !visible) {
      return notFound();
    }

    const bytes = await readCharacterCanonicalPoseImage({
      projectId,
      imagePath: pose.imagePath,
    });

    if (!bytes) {
      return notFound();
    }

    return new Response(new Uint8Array(bytes), {
      headers: {
        "Cache-Control": "private, max-age=3600",
        "Content-Type": pose.imageMimeType,
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

    console.error("Character Forge canonical pose image error:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to read the canonical A-pose image." },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
