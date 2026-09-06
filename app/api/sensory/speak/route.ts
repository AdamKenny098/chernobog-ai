import { NextRequest, NextResponse } from "next/server";

import {
  getSensoryRuntimeConfig,
  publishSensoryEvent,
} from "@/lib/chernobog/sensory";

interface SpeakRequest {
  text?: string;
  turnId?: string;
}

export async function POST(
  request: NextRequest,
): Promise<NextResponse> {
  const startedAt = Date.now();
  const config = getSensoryRuntimeConfig();
  const body = (await request.json()) as SpeakRequest;
  const text = body.text?.trim() ?? "";
  const turnId =
    body.turnId?.trim() || crypto.randomUUID();

  if (!text) {
    return NextResponse.json(
      { error: "Speech text is required." },
      { status: 400 },
    );
  }

  if (
    text.length >
    config.maxSpeechCharacters
  ) {
    return NextResponse.json(
      {
        error:
          "Speech text exceeds the configured sensory limit.",
      },
      { status: 413 },
    );
  }

  await publishSensoryEvent(
    "sensory.tts.requested",
    {
      turnId,
      modality: "audio-output",
      payload: {
        characters: text.length,
        provider: "piper",
      },
    },
  );

  try {
    const response = await fetch(
      `${config.ttsBaseUrl}/synthesize`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
        signal: AbortSignal.timeout(
          config.requestTimeoutMs,
        ),
      },
    );

    if (!response.ok) {
      const detail = (
        await response.text()
      ).slice(0, 500);
      throw new Error(
        `Piper returned HTTP ${response.status}${
          detail ? `: ${detail}` : ""
        }`,
      );
    }

    const audio = await response.arrayBuffer();
    const durationMs = Date.now() - startedAt;

    await publishSensoryEvent(
      "sensory.tts.completed",
      {
        turnId,
        modality: "audio-output",
        payload: {
          bytes: audio.byteLength,
          durationMs,
          provider: "piper",
        },
      },
    );

    return new NextResponse(audio, {
      status: 200,
      headers: {
        "Content-Type":
          response.headers.get("content-type") ??
          "audio/wav",
        "Cache-Control": "no-store",
        "X-Chernobog-Sensory-Turn": turnId,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Speech synthesis failed.";

    await publishSensoryEvent(
      "sensory.tts.failed",
      {
        turnId,
        modality: "audio-output",
        severity: "warning",
        payload: { message },
      },
    );

    return NextResponse.json(
      { error: message, turnId },
      { status: 502 },
    );
  }
}
