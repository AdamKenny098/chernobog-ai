import { NextRequest, NextResponse } from "next/server";

import {
  SENSORY_CLIENT_EVENT_TYPES,
  SensoryClientEventRequest,
} from "@/lib/chernobog/sensory";
import { publishSensoryEvent } from "@/lib/chernobog/sensory/events";

const ALLOWED_EVENT_TYPES = new Set<string>(
  SENSORY_CLIENT_EVENT_TYPES,
);

function inferModality(
  type: string,
):
  | "audio-input"
  | "audio-output"
  | "vision" {
  if (type.includes("tts")) {
    return "audio-output";
  }

  if (
    type.includes("camera") ||
    type.includes("vision")
  ) {
    return "vision";
  }

  return "audio-input";
}

export async function POST(
  request: NextRequest,
): Promise<NextResponse> {
  const body =
    (await request.json()) as SensoryClientEventRequest;

  if (
    !body?.type ||
    !ALLOWED_EVENT_TYPES.has(body.type)
  ) {
    return NextResponse.json(
      {
        error:
          "Unsupported sensory client event type.",
      },
      { status: 400 },
    );
  }

  await publishSensoryEvent(body.type, {
    turnId: body.turnId,
    modality: inferModality(body.type),
    payload: body.payload,
  });

  return NextResponse.json({ ok: true });
}
