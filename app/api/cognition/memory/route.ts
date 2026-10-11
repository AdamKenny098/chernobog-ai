import {
  NextResponse,
} from "next/server";

import {
  getCognitiveMemory,
  type CognitiveMemoryRecordInput,
} from "@chernobog/models/cognitiveMemory";

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
        record?:
          CognitiveMemoryRecordInput;
      };

    if (
      !body.record
    ) {
      throw new Error(
        "record is required. OH-4Y stores governed cognitive experience evidence, not arbitrary learned lessons.",
      );
    }

    const result =
      await getCognitiveMemory()
        .record(
          body.record,
        );

    return NextResponse.json({
      ok:
        true,
      result,
    });
  } catch (error) {
    return failure(error);
  }
}