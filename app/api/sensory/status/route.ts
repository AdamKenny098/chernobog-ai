import { NextResponse } from "next/server";

import {
  getSensoryRuntimeConfig,
  SensoryProviderHealth,
  SensoryStatusResponse,
} from "@/lib/chernobog/sensory";

async function probe(
  provider: SensoryProviderHealth["provider"],
  endpoint: string,
  url: string,
  timeoutMs: number,
): Promise<SensoryProviderHealth> {
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    Math.min(timeoutMs, 4_000),
  );

  try {
    const response = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      cache: "no-store",
    });

    return {
      provider,
      configured: true,
      online: response.ok,
      endpoint,
      detail: response.ok
        ? "online"
        : `HTTP ${response.status}`,
    };
  } catch (error) {
    return {
      provider,
      configured: true,
      online: false,
      endpoint,
      detail:
        error instanceof Error
          ? error.message
          : "unreachable",
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function GET(): Promise<NextResponse> {
  const config = getSensoryRuntimeConfig();

  const [stt, tts, vision] = await Promise.all([
    probe(
      "whisper.cpp",
      config.sttBaseUrl,
      `${config.sttBaseUrl}/`,
      config.requestTimeoutMs,
    ),
    probe(
      "piper",
      config.ttsBaseUrl,
      `${config.ttsBaseUrl}/`,
      config.requestTimeoutMs,
    ),
    probe(
      "ollama-vision",
      config.ollamaBaseUrl,
      `${config.ollamaBaseUrl}/api/tags`,
      config.requestTimeoutMs,
    ),
  ]);

  const payload: SensoryStatusResponse = {
    providers: {
      stt,
      tts,
      vision: {
        ...vision,
        model: config.visionModel,
      },
    },
  };

  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
