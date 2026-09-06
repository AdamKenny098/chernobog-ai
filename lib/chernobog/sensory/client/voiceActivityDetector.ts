export type VoiceActivityPhase =
  | "idle"
  | "calibrating"
  | "armed"
  | "speech"
  | "silence";

export type VoiceActivityEvent =
  | "speech-started"
  | "speech-ended"
  | "no-speech-timeout"
  | "max-duration";

export interface VoiceActivityUpdate {
  phase: VoiceActivityPhase;
  event?: VoiceActivityEvent;
  level: number;
  rms: number;
  threshold: number;
  elapsedMs: number;
}

export interface AdaptiveVoiceActivityOptions {
  calibrationMs?: number;
  speechStartMs?: number;
  speechEndMs?: number;
  noSpeechTimeoutMs?: number;
  maxUtteranceMs?: number;
  absoluteSpeechFloor?: number;
  noiseMultiplier?: number;
  releaseRatio?: number;
  initialArmingMs?: number;
}

const DEFAULT_OPTIONS: Required<AdaptiveVoiceActivityOptions> = {
  calibrationMs: 450,
  speechStartMs: 170,
  speechEndMs: 950,
  noSpeechTimeoutMs: 20_000,
  maxUtteranceMs: 45_000,
  absoluteSpeechFloor: 0.014,
  noiseMultiplier: 3.25,
  releaseRatio: 0.68,
  initialArmingMs: 0,
};

function clamp(
  value: number,
  minimum: number,
  maximum: number,
): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function calculateRms(samples: Float32Array): number {
  if (samples.length === 0) {
    return 0;
  }

  let sum = 0;

  for (const sample of samples) {
    sum += sample * sample;
  }

  return Math.sqrt(sum / samples.length);
}

export class AdaptiveVoiceActivityGate {
  private readonly options: Required<AdaptiveVoiceActivityOptions>;

  private elapsedMs = 0;
  private speechRunMs = 0;
  private silenceRunMs = 0;
  private speechElapsedMs = 0;
  private noiseRms = 0.006;
  private hasSpeech = false;
  private terminal = false;

  constructor(options: AdaptiveVoiceActivityOptions = {}) {
    this.options = {
      ...DEFAULT_OPTIONS,
      ...options,
    };
  }

  push(
    samples: Float32Array,
    sampleRate: number,
  ): VoiceActivityUpdate {
    if (sampleRate <= 0) {
      throw new Error("Voice activity sample rate must be positive.");
    }

    const frameMs =
      (samples.length / sampleRate) * 1_000;
    const rms = calculateRms(samples);

    if (!this.terminal) {
      this.elapsedMs += frameMs;
    }

    // Optional anti-echo arming window. Barge-in monitoring uses this
    // brief period to learn the residual speaker bleed before speech
    // detection is allowed to fire. Normal conversation VAD leaves it at 0.
    if (
      !this.terminal &&
      !this.hasSpeech &&
      this.elapsedMs <= this.options.initialArmingMs
    ) {
      const smoothing = 0.18;
      this.noiseRms =
        this.noiseRms * (1 - smoothing) +
        rms * smoothing;
      this.speechRunMs = 0;

      const armingThreshold = clamp(
        Math.max(
          this.options.absoluteSpeechFloor,
          this.noiseRms * this.options.noiseMultiplier,
        ),
        this.options.absoluteSpeechFloor,
        0.2,
      );
      const armingLevel = clamp(
        rms / Math.max(armingThreshold * 1.8, 0.025),
        0,
        1,
      );

      return {
        phase: "calibrating",
        level: armingLevel,
        rms,
        threshold: armingThreshold,
        elapsedMs: this.elapsedMs,
      };
    }

    const speechThreshold = clamp(
      Math.max(
        this.options.absoluteSpeechFloor,
        this.noiseRms * this.options.noiseMultiplier,
      ),
      this.options.absoluteSpeechFloor,
      0.2,
    );
    const releaseThreshold =
      speechThreshold * this.options.releaseRatio;

    let event: VoiceActivityEvent | undefined;

    if (!this.terminal && !this.hasSpeech) {
      if (rms < speechThreshold) {
        const smoothing =
          this.elapsedMs <= this.options.calibrationMs
            ? 0.16
            : 0.025;
        this.noiseRms =
          this.noiseRms * (1 - smoothing) +
          rms * smoothing;
      }

      if (rms >= speechThreshold) {
        this.speechRunMs += frameMs;
      } else {
        this.speechRunMs = Math.max(
          0,
          this.speechRunMs - frameMs * 0.75,
        );
      }

      if (
        this.speechRunMs >= this.options.speechStartMs
      ) {
        this.hasSpeech = true;
        this.silenceRunMs = 0;
        this.speechElapsedMs = 0;
        event = "speech-started";
      } else if (
        this.elapsedMs >=
        this.options.noSpeechTimeoutMs
      ) {
        this.terminal = true;
        event = "no-speech-timeout";
      }
    } else if (!this.terminal) {
      this.speechElapsedMs += frameMs;

      if (rms <= releaseThreshold) {
        this.silenceRunMs += frameMs;
      } else {
        this.silenceRunMs = 0;
      }

      if (
        this.silenceRunMs >= this.options.speechEndMs
      ) {
        this.terminal = true;
        event = "speech-ended";
      } else if (
        this.speechElapsedMs >=
        this.options.maxUtteranceMs
      ) {
        this.terminal = true;
        event = "max-duration";
      }
    }

    const phase: VoiceActivityPhase = this.hasSpeech
      ? this.terminal
        ? "silence"
        : "speech"
      : this.elapsedMs < this.options.calibrationMs
        ? "calibrating"
        : "armed";

    const level = clamp(
      rms / Math.max(speechThreshold * 1.8, 0.025),
      0,
      1,
    );

    return {
      phase,
      event,
      level,
      rms,
      threshold: speechThreshold,
      elapsedMs: this.elapsedMs,
    };
  }
}
