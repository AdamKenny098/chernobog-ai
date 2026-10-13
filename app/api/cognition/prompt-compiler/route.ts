import {
  NextResponse,
} from "next/server";

import {
  getPromptCompiler,
  type PromptCompilerInput,
} from "@chernobog/models/promptCompiler";

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
      await request.json() as
        PromptCompilerInput;

    if (
      !body.interpretation
    ) {
      throw new Error(
        "interpretation is required. Run OH-4J before OH-4L.",
      );
    }

    if (
      !body.context
    ) {
      throw new Error(
        "context packet is required. Run OH-4K before OH-4L.",
      );
    }

    return NextResponse.json({
      ok:
        true,
      compiled:
        getPromptCompiler()
          .compile(
            body,
          ),
    });
  } catch (error) {
    return failure(error);
  }
}