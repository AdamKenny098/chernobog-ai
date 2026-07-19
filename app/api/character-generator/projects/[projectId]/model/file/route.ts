import { NextResponse } from "next/server";

import {
  CharacterProjectValidationError,
} from "@/lib/modules/character-generator/errors";
import {
  readCharacterModelGlb,
} from "@/lib/modules/character-generator/model/characterModelAssetStore";
import { readCharacterProject } from "@/lib/modules/character-generator/projects/characterProjectStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODEL_VISIBLE_STATUSES = new Set([
  "model_ready",
  "rigged",
  "validated",
  "exported",
]);

type RouteContext = {
  params: Promise<{ projectId: string }>;
};

function notFound() {
  return NextResponse.json(
    { ok: false, error: "Character Forge model artifact not found." },
    { status: 404, headers: { "Cache-Control": "no-store" } },
  );
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const projectId = decodeURIComponent((await context.params).projectId);
    const project = await readCharacterProject(projectId);
    const asset = project?.modelAsset ?? null;

    if (!project || !asset || !MODEL_VISIBLE_STATUSES.has(project.status)) {
      return notFound();
    }

    const bytes = await readCharacterModelGlb({
      projectId,
      filePath: asset.filePath,
    });

    if (!bytes) {
      return notFound();
    }

    return new Response(new Uint8Array(bytes), {
      headers: {
        "Cache-Control": "private, max-age=3600, immutable",
        "Content-Type": asset.mimeType,
        "Content-Length": String(bytes.length),
        "Content-Disposition": `inline; filename="${project.id}.glb"`,
        ETag: `"sha256-${asset.sha256}"`,
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
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

    console.error("Character Forge model artifact error:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to read the character model artifact." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
