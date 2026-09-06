import { NextRequest, NextResponse } from "next/server";

import {
  getSensoryRuntimeConfig,
  publishSensoryEvent,
  SensoryTranscriptResponse,
} from "@/lib/chernobog/sensory";

function readTranscript(
  value: unknown,
): string {
  if (
    value &&
    typeof value === "object"
  ) {
    const record = value as Record<string, unknown>;

    for (const key of [
      "text",
      "transcription",
      "result",
    ]) {
      const candidate = record[key];
      if (typeof candidate === "string") {
        return candidate.trim();
      }
    }
  }

  return "";
}

export async function POST(
  request: NextRequest,
): Promise<NextResponse> {
  const startedAt = Date.now();
  const config = getSensoryRuntimeConfig();
  const form = await request.formData();
  const audio = form.get("audio");
  const requestedTurnId = form.get("turnId");
  const turnId =
    typeof requestedTurnId === "string" &&
    requestedTurnId.trim()
      ? requestedTurnId.trim()
      : crypto.randomUUID();

  if (
    !audio ||
    typeof audio === "string"
  ) {
    return NextResponse.json(
      { error: "A WAV audio file is required." },
      { status: 400 },
    );
  }

  if (audio.size > config.maxAudioBytes) {
    return NextResponse.json(
      {
        error:
          "Audio payload exceeds the configured sensory limit.",
      },
      { status: 413 },
    );
  }

  await publishSensoryEvent(
    "sensory.transcription.started",
    {
      turnId,
      modality: "audio-input",
      payload: {
        bytes: audio.size,
        mimeType:
          audio.type || "application/octet-stream",
      },
    },
  );

  try {
    const upstream = new FormData();
    upstream.append(
      "file",
      audio,
      audio.name || "chernobog-speech.wav",
    );
    upstream.append("response_format", "json");

    const response = await fetch(
      `${config.sttBaseUrl}/inference`,
      {
        method: "POST",
        body: upstream,
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
        `whisper.cpp returned HTTP ${response.status}${
          detail ? `: ${detail}` : ""
        }`,
      );
    }

    const raw = (await response.json()) as unknown;
    const transcript = readTranscript(raw);

    if (!transcript) {
      throw new Error(
        "whisper.cpp returned no transcript.",
      );
    }

    const durationMs = Date.now() - startedAt;

    await publishSensoryEvent(
      "sensory.transcript.final",
      {
        turnId,
        modality: "audio-input",
        payload: {
          characters: transcript.length,
          durationMs,
          provider: "whisper.cpp",
        },
      },
    );

    const payload: SensoryTranscriptResponse = {
      transcript,
      turnId,
      durationMs,
    };

    return NextResponse.json(payload);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Speech transcription failed.";

    await publishSensoryEvent(
      "sensory.transcription.failed",
      {
        turnId,
        modality: "audio-input",
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
