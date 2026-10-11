import {
  NextResponse,
} from "next/server";

import {
  createModelRegistryId,
  getModelControlCenter,
  type ModelCapability,
  type ModelRegistryEntry,
} from "@chernobog/models";
import type {
  ModelRole,
} from "@chernobog/models/modelRouter";

export const runtime =
  "nodejs";

function failure(
  error: unknown,
  status = 400,
) {
  return NextResponse.json(
    {
      ok:
        false,
      error:
        error instanceof Error
          ? error.message
          : String(error),
    },
    {
      status,
    },
  );
}

function stringArray(
  value: unknown,
): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(
      (item):
        item is string =>
          typeof item ===
          "string",
    )
    .map(
      (item) =>
        item.trim(),
    )
    .filter(Boolean);
}

function buildEntry(
  value: unknown,
): ModelRegistryEntry {
  if (
    !value ||
    typeof value !==
      "object"
  ) {
    throw new Error(
      "entry must be an object.",
    );
  }

  const input =
    value as Record<
      string,
      unknown
    >;

  const provider =
    typeof input.provider ===
      "string"
      ? input.provider.trim()
      : "";

  const model =
    typeof input.model ===
      "string"
      ? input.model.trim()
      : "";

  if (!provider || !model) {
    throw new Error(
      "entry.provider and entry.model are required.",
    );
  }

  const roles =
    stringArray(
      input.roles,
    ) as ModelRole[];

  const capabilities =
    stringArray(
      input.capabilities,
    ) as ModelCapability[];

  const local =
    input.local ===
      undefined
      ? provider.toLowerCase() ===
        "ollama"
      : input.local ===
        true;

  return {
    id:
      createModelRegistryId(
        provider,
        model,
      ),
    provider,
    model,
    displayName:
      typeof input.displayName ===
        "string" &&
      input.displayName.trim()
        ? input.displayName.trim()
        : model,
    roles:
      roles.length > 0
        ? roles
        : [
            "default",
          ],
    capabilities:
      capabilities.length > 0
        ? capabilities
        : [
            "chat",
          ],
    enabled:
      input.enabled !==
      false,
    local,
    availability:
      input.availability ===
        "available" ||
      input.availability ===
        "unavailable"
        ? input.availability
        : "unknown",
    version:
      typeof input.version ===
        "string"
        ? input.version
        : undefined,
    contextLimits: {
      known:
        false,
    },
    cost: {
      known:
        local,
      mode:
        local
          ? "local-compute"
          : "unknown",
    },
    privacy: {
      execution:
        local
          ? "local"
          : "unknown",
      promptLeavesDevice:
        local
          ? false
          : null,
      retention:
        "unknown",
    },
    strengths:
      [],
    weaknesses:
      [
        "Not yet calibrated",
      ],
    source:
      "user",
    tags:
      [
        "control-center",
      ],
  };
}

export async function GET() {
  try {
    return NextResponse.json({
      ok:
        true,
      snapshot:
        getModelControlCenter()
          .snapshot(),
    });
  } catch (error) {
    return failure(
      error,
      500,
    );
  }
}

export async function POST(
  request: Request,
) {
  let body:
    Record<string, unknown>;

  try {
    body =
      await request.json();
  } catch (error) {
    return failure(
      error,
    );
  }

  try {
    const action =
      body.action;

    const control =
      getModelControlCenter();

    switch (action) {
      case "add":
        return NextResponse.json({
          ok:
            true,
          model:
            control.add(
              buildEntry(
                body.entry,
              ),
            ),
          snapshot:
            control.snapshot(),
        });

      case "enable":
      case "disable":
        return NextResponse.json({
          ok:
            true,
          model:
            control.setEnabled(
              String(
                body.id ??
                "",
              ),
              action ===
                "enable",
            ),
          snapshot:
            control.snapshot(),
        });

      case "configure":
        return NextResponse.json({
          ok:
            true,
          model:
            control.configure(
              String(
                body.id ??
                "",
              ),
              (
                body.patch &&
                typeof body.patch ===
                  "object"
                  ? body.patch
                  : {}
              ) as never,
            ),
          snapshot:
            control.snapshot(),
        });

      case "inspect":
        return NextResponse.json({
          ok:
            true,
          model:
            control.inspect(
              String(
                body.id ??
                "",
              ),
            ),
        });

      case "test":
        return NextResponse.json({
          ok:
            true,
          result:
            await control.test({
              id:
                String(
                  body.id ??
                  "",
                ),
              prompt:
                String(
                  body.prompt ??
                  "",
                ),
              role:
                typeof body.role ===
                  "string"
                  ? body.role as
                    ModelRole
                  : undefined,
            }),
        });

      case "compare":
        return NextResponse.json({
          ok:
            true,
          results:
            await control.compare({
              ids:
                stringArray(
                  body.ids,
                ),
              prompt:
                String(
                  body.prompt ??
                  "",
                ),
              role:
                typeof body.role ===
                  "string"
                  ? body.role as
                    ModelRole
                  : undefined,
            }),
        });

      default:
        return failure(
          new Error(
            "Unknown model-control action.",
          ),
        );
    }
  } catch (error) {
    return failure(
      error,
    );
  }
}