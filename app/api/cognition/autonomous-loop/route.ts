import {
  NextResponse,
} from "next/server";

import {
  getAutonomousCognitiveLoopRuntime,
  type AutonomousCognitiveLoopInput,
} from "@chernobog/models/autonomousCognitiveLoop";

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

export async function POST(
  request: Request,
) {
  try {
    const body =
      await request.json() as {
        action?:
          "start"
          | "run"
          | "resume"
          | "interrupt";

        id?: string;

        input?:
          AutonomousCognitiveLoopInput;

        humanInput?: unknown;

        reason?: string;
      };

    const loop =
      getAutonomousCognitiveLoopRuntime();

    switch (
      body.action
    ) {
      case "start":
        if (
          !body.input
        ) {
          throw new Error(
            "input is required for OH-4AD start.",
          );
        }

        return NextResponse.json({
          ok:
            true,

          state:
            await loop.start(
              body.input,
            ),
        });

      case "run":
        if (
          !body.id
        ) {
          throw new Error(
            "id is required for OH-4AD run.",
          );
        }

        return NextResponse.json({
          ok:
            true,

          state:
            await loop.run(
              body.id,
            ),
        });

      case "resume":
        if (
          !body.id
        ) {
          throw new Error(
            "id is required for OH-4AD resume.",
          );
        }

        return NextResponse.json({
          ok:
            true,

          state:
            await loop.resume(
              body.id,
              {
                humanInput:
                  body.humanInput,
              },
            ),
        });

      case "interrupt":
        if (
          !body.id
        ) {
          throw new Error(
            "id is required for OH-4AD interrupt.",
          );
        }

        return NextResponse.json({
          ok:
            true,

          state:
            await loop.interrupt(
              body.id,
              body.reason ??
              "Interrupted by caller.",
            ),
        });

      default:
        throw new Error(
          "action must be start, run, resume, or interrupt.",
        );
    }
  } catch (error) {
    return failure(
      error,
    );
  }
}

export async function GET(
  request: Request,
) {
  try {
    const url =
      new URL(
        request.url,
      );

    const id =
      url.searchParams
        .get(
          "id",
        )
        ?.trim();

    if (!id) {
      throw new Error(
        "id query parameter is required.",
      );
    }

    const state =
      await getAutonomousCognitiveLoopRuntime()
        .load(
          id,
        );

    return NextResponse.json({
      ok:
        true,

      state,
    });
  } catch (error) {
    return failure(
      error,
    );
  }
}