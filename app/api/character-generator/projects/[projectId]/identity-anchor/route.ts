import { NextResponse } from "next/server";

import {
  CharacterProjectStateError,
  CharacterProjectValidationError,
  approveCharacterIdentityAnchor,
  clearCharacterIdentityAnchor,
  parseCharacterIdentityAnchorActionRequest,
  parseCharacterIdentityAnchorMetadata,
  retireLegacyCharacterReferenceSet,
  saveCharacterIdentityAnchor,
} from "@/lib/modules/character-generator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HEADERS = { "Cache-Control": "no-store" };
const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
const SUPPORTED_IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
]);

type RouteContext = {
  params: Promise<{ projectId: string }>;
};

async function projectIdFrom(context: RouteContext): Promise<string> {
  return decodeURIComponent((await context.params).projectId);
}

function notFound(projectId: string) {
  return NextResponse.json(
    { ok: false, error: `Character Forge project not found: ${projectId}.` },
    { status: 404, headers: HEADERS }
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
      { status: 400, headers: HEADERS }
    );
  }

  if (error instanceof CharacterProjectStateError) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 409, headers: HEADERS }
    );
  }

  console.error("Character Forge identity anchor error:", error);
  return NextResponse.json(
    { ok: false, error: "Failed to process the character identity anchor." },
    { status: 500, headers: HEADERS }
  );
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const projectId = await projectIdFrom(context);
    const formData = await request.formData();
    const image = formData.get("image");
    const metadataValue = formData.get("metadata");

    if (!(image instanceof File)) {
      throw new CharacterProjectValidationError(
        "Identity anchor upload must include an image file."
      );
    }

    if (typeof metadataValue !== "string") {
      throw new CharacterProjectValidationError(
        "Identity anchor upload must include crop metadata."
      );
    }

    if (!SUPPORTED_IMAGE_TYPES.has(image.type)) {
      throw new CharacterProjectValidationError(
        "Identity anchor image must be PNG, JPEG, or WebP."
      );
    }

    if (image.size === 0 || image.size > MAX_IMAGE_BYTES) {
      throw new CharacterProjectValidationError(
        "Identity anchor image must be between 1 byte and 20 MB."
      );
    }

    const metadata = parseCharacterIdentityAnchorMetadata(metadataValue);
    const project = await saveCharacterIdentityAnchor(projectId, {
      bytes: new Uint8Array(await image.arrayBuffer()),
      mimeType: image.type as "image/png" | "image/jpeg" | "image/webp",
      width: metadata.width,
      height: metadata.height,
      crop: metadata.crop,
    });

    if (!project) {
      return notFound(projectId);
    }

    return NextResponse.json(
      { ok: true, project },
      { status: 201, headers: HEADERS }
    );
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const projectId = await projectIdFrom(context);
    const input = parseCharacterIdentityAnchorActionRequest(
      (await request.json()) as unknown
    );
    const project =
      input.action === "approve"
        ? await approveCharacterIdentityAnchor(projectId)
        : input.action === "clear"
          ? await clearCharacterIdentityAnchor(projectId)
          : await retireLegacyCharacterReferenceSet(projectId);

    if (!project) {
      return notFound(projectId);
    }

    return NextResponse.json({ ok: true, project }, { headers: HEADERS });
  } catch (error) {
    return errorResponse(error);
  }
}
