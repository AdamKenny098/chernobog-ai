import { NextRequest, NextResponse } from "next/server";

import {
  getSensoryRuntimeConfig,
  publishSensoryEvent,
  SensoryVisionResponse,
} from "@/lib/chernobog/sensory";

function readObservation(
  value: unknown,
): string {
  if (
    !value ||
    typeof value !== "object"
  ) {
    return "";
  }

  const record = value as Record<string, unknown>;
  const message = record.message;

  if (
    message &&
    typeof message === "object"
  ) {
    const content = (
      message as Record<string, unknown>
    ).content;

    if (typeof content === "string") {
      return content.trim();
    }
  }

  if (typeof record.response === "string") {
    return record.response.trim();
  }

  return "";
}

export async function POST(
  request: NextRequest,
): Promise<NextResponse> {
  const startedAt = Date.now();
  const config = getSensoryRuntimeConfig();
  const form = await request.formData();
  const image = form.get("image");
  const promptValue = form.get("prompt");
  const turnIdValue = form.get("turnId");
  const turnId =
    typeof turnIdValue === "string" &&
    turnIdValue.trim()
      ? turnIdValue.trim()
      : crypto.randomUUID();

  if (
    !image ||
    typeof image === "string"
  ) {
    return NextResponse.json(
      { error: "An image is required." },
      { status: 400 },
    );
  }

  if (image.size > config.maxImageBytes) {
    return NextResponse.json(
      {
        error:
          "Image exceeds the configured sensory limit.",
      },
      { status: 413 },
    );
  }

  const prompt =
    typeof promptValue === "string" &&
    promptValue.trim()
      ? promptValue.trim()
      : [
          "Describe what is visible in this image.",
          "Prioritize concrete, useful details.",
          "Do not invent anything that is not visually supported.",
        ].join(" ");

  await publishSensoryEvent(
    "sensory.vision.requested",
    {
      turnId,
      modality: "vision",
      payload: {
        bytes: image.size,
        mimeType:
          image.type || "application/octet-stream",
        model: config.visionModel,
      },
    },
  );

  try {
    const encoded = Buffer.from(
      await image.arrayBuffer(),
    ).toString("base64");

    const response = await fetch(
      `${config.ollamaBaseUrl}/api/chat`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: config.visionModel,
          stream: false,
          messages: [
            {
              role: "user",
              content: prompt,
              images: [encoded],
            },
          ],
        }),
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
        `Ollama vision returned HTTP ${response.status}${
          detail ? `: ${detail}` : ""
        }`,
      );
    }

    const raw = (await response.json()) as unknown;
    const observation = readObservation(raw);

    if (!observation) {
      throw new Error(
        "Ollama vision returned no observation.",
      );
    }

    const durationMs = Date.now() - startedAt;

    await publishSensoryEvent(
      "sensory.vision.completed",
      {
        turnId,
        modality: "vision",
        payload: {
          characters: observation.length,
          durationMs,
          model: config.visionModel,
        },
      },
    );

    const payload: SensoryVisionResponse = {
      observation,
      turnId,
      model: config.visionModel,
      durationMs,
    };

    return NextResponse.json(payload);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Vision analysis failed.";

    await publishSensoryEvent(
      "sensory.vision.failed",
      {
        turnId,
        modality: "vision",
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
