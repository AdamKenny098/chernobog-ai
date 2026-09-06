function normalizeBaseUrl(value: string): string {
  return value.trim().replace(/\/+$/, "");
}

function readPositiveInteger(
  name: string,
  fallback: number,
): number {
  const raw = process.env[name];
  if (!raw) {
    return fallback;
  }

  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0
    ? parsed
    : fallback;
}

export interface SensoryRuntimeConfig {
  sttBaseUrl: string;
  ttsBaseUrl: string;
  ollamaBaseUrl: string;
  visionModel: string;
  requestTimeoutMs: number;
  maxAudioBytes: number;
  maxImageBytes: number;
  maxSpeechCharacters: number;
}

export function getSensoryRuntimeConfig(): SensoryRuntimeConfig {
  return {
    sttBaseUrl: normalizeBaseUrl(
      process.env.CHERNOBOG_STT_URL ??
        "http://127.0.0.1:8080",
    ),
    ttsBaseUrl: normalizeBaseUrl(
      process.env.CHERNOBOG_TTS_URL ??
        "http://127.0.0.1:5000",
    ),
    ollamaBaseUrl: normalizeBaseUrl(
      process.env.CHERNOBOG_OLLAMA_URL ??
        process.env.OLLAMA_BASE_URL ??
        process.env.OLLAMA_HOST ??
        "http://127.0.0.1:11434",
    ),
    visionModel:
      process.env.CHERNOBOG_VISION_MODEL ??
      process.env.OLLAMA_MODEL ??
      "gemma3:latest",
    requestTimeoutMs: readPositiveInteger(
      "CHERNOBOG_SENSORY_TIMEOUT_MS",
      60_000,
    ),
    maxAudioBytes: readPositiveInteger(
      "CHERNOBOG_SENSORY_MAX_AUDIO_BYTES",
      25 * 1024 * 1024,
    ),
    maxImageBytes: readPositiveInteger(
      "CHERNOBOG_SENSORY_MAX_IMAGE_BYTES",
      12 * 1024 * 1024,
    ),
    maxSpeechCharacters: readPositiveInteger(
      "CHERNOBOG_SENSORY_MAX_SPEECH_CHARACTERS",
      8_000,
    ),
  };
}
