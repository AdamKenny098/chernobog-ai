import {
  NextResponse,
} from "next/server";

import {
  getInputInterpreter,
  type InputModality,
} from "@chernobog/models/inputInterpreter";

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

function modality(
  value: unknown,
): InputModality {
  return value ===
    "spoken"
      ? "spoken"
      : "typed";
}

export async function POST(
  request: Request,
) {
  try {
    const body =
      await request.json() as
        Record<
          string,
          unknown
        >;

    const interpretation =
      await getInputInterpreter()
        .interpret({
          modality:
            modality(
              body.modality,
            ),
          text:
            String(
              body.text ??
              "",
            ),
          turnId:
            typeof body.turnId ===
              "string"
              ? body.turnId
              : undefined,
          receivedAt:
            typeof body.receivedAt ===
              "string"
              ? body.receivedAt
              : undefined,
        });

    return NextResponse.json({
      ok:
        true,
      interpretation,
    });
  } catch (error) {
    return failure(error);
  }
}