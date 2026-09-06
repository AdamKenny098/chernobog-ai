export type SensoryModality =
  | "audio-input"
  | "audio-output"
  | "vision";

export type SensoryAvailability =
  | "unsupported"
  | "permission-required"
  | "unavailable"
  | "ready"
  | "active"
  | "failed";

export type SensoryProviderName =
  | "whisper.cpp"
  | "piper"
  | "ollama-vision";

export interface SensoryProviderHealth {
  provider: SensoryProviderName;
  configured: boolean;
  online: boolean;
  endpoint: string;
  detail?: string;
}

export interface SensoryStatusResponse {
  providers: {
    stt: SensoryProviderHealth;
    tts: SensoryProviderHealth;
    vision: SensoryProviderHealth & {
      model: string;
    };
  };
}

export const SENSORY_CLIENT_EVENT_TYPES = [
  "sensory.microphone.permission_required",
  "sensory.microphone.ready",
  "sensory.microphone.unavailable",
  "sensory.speech.started",
  "sensory.speech.ended",
  "sensory.vad.speech_started",
  "sensory.vad.silence_detected",
  "sensory.vad.timeout",
  "sensory.conversation.started",
  "sensory.conversation.turn_rearmed",
  "sensory.conversation.barge_in_armed",
  "sensory.conversation.barge_in_detected",
  "sensory.conversation.barge_in_unavailable",
  "sensory.conversation.stopped",
  "sensory.wake.armed",
  "sensory.wake.speech_detected",
  "sensory.wake.detected",
  "sensory.wake.rejected",
  "sensory.wake.failed",
  "sensory.wake.stopped",
  "sensory.tts.playback_started",
  "sensory.tts.playback_completed",
  "sensory.tts.interrupted",
  "sensory.camera.permission_required",
  "sensory.camera.ready",
  "sensory.camera.unavailable",
  "sensory.camera.capture_started",
  "sensory.camera.capture_completed",
  "sensory.vision.file_selected",
] as const;

export type SensoryClientEventType =
  (typeof SENSORY_CLIENT_EVENT_TYPES)[number];

export interface SensoryClientEventRequest {
  type: SensoryClientEventType;
  turnId?: string;
  payload?: Record<string, unknown>;
}

export interface SensoryTranscriptResponse {
  transcript: string;
  turnId: string;
  durationMs: number;
}

export interface SensoryVisionResponse {
  observation: string;
  turnId: string;
  model: string;
  durationMs: number;
}
