"use client";

import {
  Camera,
  Eye,
  FileImage,
  LoaderCircle,
  Mic,
  Power,
  Square,
  Volume2,
  VolumeX,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import type { ChangeEvent } from "react";

import { publishChernobogCoreState } from "@/lib/chernobog/ui/coreStateBridge";
import type {
  SensoryClientEventType,
  SensoryStatusResponse,
  SensoryTranscriptResponse,
  SensoryVisionResponse,
} from "@/lib/chernobog/sensory/types";
import { WavRecorder } from "@/lib/chernobog/sensory/client/wavRecorder";
import {
  AdaptiveVoiceActivityGate,
  type VoiceActivityPhase,
} from "@/lib/chernobog/sensory/client/voiceActivityDetector";

type HardwareState =
  | "checking"
  | "unsupported"
  | "permission-required"
  | "unavailable"
  | "ready"
  | "active"
  | "failed";

interface ChatPayload {
  reply?: string;
  spokenReply?: string;
  error?: string;
}

type ListeningMode = "manual" | "conversation";
type BargeInState =
  | "idle"
  | "arming"
  | "armed"
  | "detected"
  | "unavailable";
type WakeState =
  | "off"
  | "arming"
  | "armed"
  | "speech"
  | "checking"
  | "summoned"
  | "failed";
type ListeningStopReason =
  | "manual"
  | "silence"
  | "no-speech"
  | "max-duration";
type SensoryShutdownReason =
  | "manual"
  | "voice-command";

const SENSORY_SESSION_KEY =
  "chernobog.sensory.session.v1";

// Survives React component remounts inside the Command Center.
// It intentionally does not survive a full page/module reload.
let conversationLeaseActive = false;

// Wake mode is a separate user-owned dormant lease. It survives
// Command Center component remounts, but not a full page/module reload.
let wakeLeaseActive = false;

const WAKE_PHRASE = "Chernobog";
const WAKE_ALIASES = ["chernobog", "chernabog"] as const;

interface WakeMatch {
  matched: boolean;
  command: string;
}

function normalizeWakeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function matchWakePhrase(transcript: string): WakeMatch {
  const normalized = normalizeWakeText(transcript);

  for (const alias of WAKE_ALIASES) {
    for (const prefix of [
      alias,
      `hey ${alias}`,
      `okay ${alias}`,
      `ok ${alias}`,
    ]) {
      if (normalized === prefix) {
        return { matched: true, command: "" };
      }

      if (normalized.startsWith(`${prefix} `)) {
        const command = normalized
          .slice(prefix.length)
          .trim()
          .replace(/^(wake up|listen|please)\s+/, "")
          .trim();
        return { matched: true, command };
      }
    }
  }

  return { matched: false, command: "" };
}

const SENSORY_OFF_COMMANDS = new Set([
  "go to sleep",
  "sleep",
  "go dormant",
  "stop listening",
  "stop listening to me",
  "turn off listening",
  "disable listening",
  "sensory off",
]);

function isSensoryOffCommand(transcript: string): boolean {
  const normalized = normalizeWakeText(transcript);
  const candidates = new Set<string>([normalized]);

  for (const alias of WAKE_ALIASES) {
    for (const prefix of [
      alias,
      `hey ${alias}`,
      `okay ${alias}`,
      `ok ${alias}`,
    ]) {
      if (normalized.startsWith(`${prefix} `)) {
        candidates.add(
          normalized.slice(prefix.length).trim(),
        );
      }
    }
  }

  for (const candidate of candidates) {
    const stripped = candidate
      .replace(/^please\s+/, "")
      .replace(/\s+please$/, "")
      .trim();

    if (SENSORY_OFF_COMMANDS.has(stripped)) {
      return true;
    }
  }

  return false;
}

function makeTurnId(): string {
  return crypto.randomUUID();
}

function getSensorySessionId(): string {
  const existing = window.localStorage.getItem(
    SENSORY_SESSION_KEY,
  );

  if (existing) {
    return existing;
  }

  const created = `sensory-${crypto.randomUUID()}`;
  window.localStorage.setItem(
    SENSORY_SESSION_KEY,
    created,
  );
  return created;
}

function statusLabel(state: HardwareState): string {
  return state.replaceAll("-", " ").toUpperCase();
}

function statusClass(state: HardwareState): string {
  if (state === "ready" || state === "active") {
    return "text-emerald-300";
  }

  if (
    state === "unsupported" ||
    state === "unavailable" ||
    state === "failed"
  ) {
    return "text-red-300";
  }

  return "text-amber-200";
}

async function responseError(
  response: Response,
  fallback: string,
): Promise<string> {
  try {
    const body = (await response.json()) as {
      error?: string;
    };
    return body.error ?? fallback;
  } catch {
    return fallback;
  }
}

async function createVisionSelfTestImage(): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = 960;
  canvas.height = 540;
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error(
      "Canvas is unavailable in this browser.",
    );
  }

  context.fillStyle = "#090b10";
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.strokeStyle = "#ff7a18";
  context.lineWidth = 18;
  context.beginPath();
  context.moveTo(480, 90);
  context.lineTo(720, 430);
  context.lineTo(240, 430);
  context.closePath();
  context.stroke();

  context.fillStyle = "#f4f4f5";
  context.font = "700 54px sans-serif";
  context.textAlign = "center";
  context.fillText(
    "CHERNOBOG VISION SELF TEST",
    480,
    250,
  );

  context.fillStyle = "#ffb067";
  context.font = "700 76px monospace";
  context.fillText("42", 480, 350);

  return await new Promise<Blob>(
    (resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(
              new Error(
                "Unable to create vision self-test image.",
              ),
            );
          }
        },
        "image/png",
        0.95,
      );
    },
  );
}

async function captureSingleCameraFrame(): Promise<Blob> {
  const stream =
    await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
      audio: false,
    });

  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.srcObject = stream;

  try {
    await video.play();

    if (!video.videoWidth || !video.videoHeight) {
      await new Promise<void>((resolve, reject) => {
        const timer = window.setTimeout(
          () =>
            reject(
              new Error(
                "Camera did not produce a frame.",
              ),
            ),
          5_000,
        );

        video.onloadedmetadata = () => {
          window.clearTimeout(timer);
          resolve();
        };
      });
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error(
        "Canvas is unavailable in this browser.",
      );
    }

    context.drawImage(
      video,
      0,
      0,
      canvas.width,
      canvas.height,
    );

    return await new Promise<Blob>(
      (resolve, reject) => {
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(
                new Error(
                  "Unable to capture camera frame.",
                ),
              );
            }
          },
          "image/jpeg",
          0.9,
        );
      },
    );
  } finally {
    for (const track of stream.getTracks()) {
      track.stop();
    }
    video.srcObject = null;
  }
}

export function SensoryControlDeck() {
  const recorderRef = useRef<WavRecorder | null>(
    null,
  );
  const playbackRef = useRef<HTMLAudioElement | null>(
    null,
  );
  const playbackUrlRef = useRef<string | null>(null);
  const bargeRecorderRef = useRef<WavRecorder | null>(
    null,
  );
  const bargeMonitorGenerationRef = useRef(0);
  const bargeDetectedRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement | null>(
    null,
  );
  const idleTimerRef = useRef<number | null>(null);
  const conversationRestartTimerRef = useRef<
    number | null
  >(null);
  const conversationActiveRef = useRef(
    conversationLeaseActive,
  );
  const activeTurnIdRef = useRef<string | null>(null);
  const vadGateRef = useRef<
    AdaptiveVoiceActivityGate | null
  >(null);
  const autoStopRef = useRef<
    ((reason: ListeningStopReason) => void) | null
  >(null);
  const rearmConversationRef = useRef<
    (() => void) | null
  >(null);
  const stoppingRef = useRef(false);
  const conversationRearmAttemptsRef = useRef(0);
  const sttHealthFailuresRef = useRef(0);
  const wakeRecorderRef = useRef<WavRecorder | null>(
    null,
  );
  const wakeGenerationRef = useRef(0);
  const wakeActiveRef = useRef(wakeLeaseActive);
  const wakeRestartTimerRef = useRef<number | null>(
    null,
  );
  const wakeStoppingRef = useRef(false);
  const wakeRearmRef = useRef<(() => void) | null>(
    null,
  );
  const sensoryOffRef = useRef<
    ((reason: SensoryShutdownReason) => Promise<void>) | null
  >(null);

  const [expanded, setExpanded] = useState(true);
  const [micState, setMicState] =
    useState<HardwareState>("checking");
  const [cameraState, setCameraState] =
    useState<HardwareState>("checking");
  const [providers, setProviders] =
    useState<SensoryStatusResponse | null>(null);
  const [providersLoading, setProvidersLoading] =
    useState(false);
  const [autoSpeak, setAutoSpeak] = useState(false);
  const [bargeInState, setBargeInState] =
    useState<BargeInState>("idle");
  const [conversationActive, setConversationActive] =
    useState(conversationLeaseActive);
  const [wakeArmed, setWakeArmed] =
    useState(wakeLeaseActive);
  const [wakeState, setWakeState] =
    useState<WakeState>(wakeLeaseActive ? "arming" : "off");
  const [vadState, setVadState] =
    useState<VoiceActivityPhase>("idle");
  const [vadLevel, setVadLevel] = useState(0);
  const [busy, setBusy] = useState<
    "idle" | "transcribing" | "command" | "vision"
  >("idle");
  const [lastTranscript, setLastTranscript] =
    useState("");
  const [lastReply, setLastReply] = useState("");
  const [lastVision, setLastVision] = useState("");
  const [error, setError] = useState("");

  const emitClientEvent = useCallback(
    async (
      type: SensoryClientEventType,
      turnId?: string,
      payload?: Record<string, unknown>,
    ) => {
      await fetch("/api/sensory/event", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type,
          turnId,
          payload,
        }),
      }).catch(() => undefined);
    },
    [],
  );

  const settleToIdle = useCallback(() => {
    if (idleTimerRef.current !== null) {
      window.clearTimeout(idleTimerRef.current);
    }

    publishChernobogCoreState("success");
    idleTimerRef.current = window.setTimeout(() => {
      publishChernobogCoreState("idle");
      idleTimerRef.current = null;
    }, 650);
  }, []);

  const clearConversationRestart = useCallback(() => {
    if (conversationRestartTimerRef.current !== null) {
      window.clearTimeout(
        conversationRestartTimerRef.current,
      );
      conversationRestartTimerRef.current = null;
    }
  }, []);

  const clearWakeRestart = useCallback(() => {
    if (wakeRestartTimerRef.current !== null) {
      window.clearTimeout(wakeRestartTimerRef.current);
      wakeRestartTimerRef.current = null;
    }
  }, []);

  const stopConversationState = useCallback(
    (reason: string) => {
      // Automatic faults are now non-terminal. CONVERSE is a
      // user-owned session lease and only END CHAT may release it.
      if (!conversationActiveRef.current) {
        return;
      }

      clearConversationRestart();
      conversationRearmAttemptsRef.current = 0;
      setVadState("idle");
      setVadLevel(0);
      publishChernobogCoreState("waiting");

      const retryDelayMs = reason.includes("microphone")
        ? 2_500
        : reason.includes("stt")
          ? 1_500
          : 900;

      setError((current) =>
        current ||
          `CONVERSE remains active after ${reason}. Re-arming...`,
      );

      conversationRestartTimerRef.current =
        window.setTimeout(() => {
          conversationRestartTimerRef.current = null;

          if (!conversationActiveRef.current) {
            return;
          }

          rearmConversationRef.current?.();
        }, retryDelayMs);
    },
    [clearConversationRestart],
  );

  const scheduleConversationRearm = useCallback(
    (delayMs = 650) => {
      if (!conversationActiveRef.current) {
        settleToIdle();
        return;
      }

      if (idleTimerRef.current !== null) {
        window.clearTimeout(idleTimerRef.current);
        idleTimerRef.current = null;
      }

      clearConversationRestart();
      publishChernobogCoreState("success");

      conversationRestartTimerRef.current =
        window.setTimeout(() => {
          conversationRestartTimerRef.current = null;

          if (!conversationActiveRef.current) {
            publishChernobogCoreState("idle");
            return;
          }

          void emitClientEvent(
            "sensory.conversation.turn_rearmed",
          );
          rearmConversationRef.current?.();
        }, delayMs);
    },
    [
      clearConversationRestart,
      emitClientEvent,
      settleToIdle,
    ],
  );

  const settleAfterTurn = useCallback(() => {
    if (conversationActiveRef.current) {
      scheduleConversationRearm();
      return;
    }

    settleToIdle();
  }, [scheduleConversationRearm, settleToIdle]);

  const cleanupPlayback = useCallback(() => {
    if (playbackRef.current) {
      const audio = playbackRef.current;
      audio.onplay = null;
      audio.onended = null;
      audio.onerror = null;
      audio.pause();
      audio.src = "";
      playbackRef.current = null;
    }

    if (playbackUrlRef.current) {
      URL.revokeObjectURL(playbackUrlRef.current);
      playbackUrlRef.current = null;
    }
  }, []);

  const stopBargeInMonitor = useCallback(async () => {
    bargeMonitorGenerationRef.current += 1;
    bargeDetectedRef.current = false;

    const monitor = bargeRecorderRef.current;
    bargeRecorderRef.current = null;

    if (monitor) {
      await monitor.cancel().catch(() => undefined);
    }

    setBargeInState("idle");

    if (
      !recorderRef.current &&
      conversationActiveRef.current
    ) {
      setMicState((current) =>
        current === "unavailable" ||
        current === "unsupported"
          ? current
          : "ready",
      );
      setVadState("idle");
      setVadLevel(0);
    }
  }, []);

  const interruptPlayback = useCallback(
    async (
      reason: "barge-in" | "manual" = "manual",
    ) => {
      if (!playbackRef.current) {
        return;
      }

      if (reason === "manual") {
        await stopBargeInMonitor();
      }

      cleanupPlayback();
      await emitClientEvent(
        "sensory.tts.interrupted",
        undefined,
        { reason },
      );

      if (
        reason === "manual" &&
        conversationActiveRef.current
      ) {
        publishChernobogCoreState("waiting");
        scheduleConversationRearm(150);
        return;
      }

      publishChernobogCoreState("idle");
    },
    [
      cleanupPlayback,
      emitClientEvent,
      scheduleConversationRearm,
      stopBargeInMonitor,
    ],
  );

  const armBargeInMonitor = useCallback(
    async (interruptedTurnId: string) => {
      if (
        !conversationActiveRef.current ||
        !playbackRef.current ||
        recorderRef.current ||
        bargeRecorderRef.current
      ) {
        return;
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        setBargeInState("unavailable");
        void emitClientEvent(
          "sensory.conversation.barge_in_unavailable",
          undefined,
          { reason: "media-devices-unavailable" },
        );
        return;
      }

      const generation =
        bargeMonitorGenerationRef.current + 1;
      bargeMonitorGenerationRef.current = generation;
      bargeDetectedRef.current = false;
      setBargeInState("arming");

      try {
        const stream =
          await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
              channelCount: 1,
            },
            video: false,
          });

        if (
          generation !==
            bargeMonitorGenerationRef.current ||
          !conversationActiveRef.current ||
          !playbackRef.current
        ) {
          for (const track of stream.getTracks()) {
            track.stop();
          }
          return;
        }

        const interruptionTurnId = makeTurnId();
        const gate = new AdaptiveVoiceActivityGate({
          // Anti-echo calibration learns residual TTS speaker bleed
          // before interruption detection is allowed to fire.
          initialArmingMs: 650,
          calibrationMs: 650,
          speechStartMs: 260,
          speechEndMs: 850,
          noSpeechTimeoutMs: 120_000,
          maxUtteranceMs: 45_000,
          absoluteSpeechFloor: 0.02,
          noiseMultiplier: 2.4,
          releaseRatio: 0.65,
        });
        let monitor: WavRecorder | null = null;
        let armedPublished = false;

        monitor = await WavRecorder.start(stream, {
          onAudioFrame: (samples, sampleRate) => {
            if (
              generation !==
                bargeMonitorGenerationRef.current ||
              !conversationActiveRef.current
            ) {
              return;
            }

            const update = gate.push(
              samples,
              sampleRate,
            );
            setVadLevel(update.level);

            if (!bargeDetectedRef.current) {
              if (update.phase === "calibrating") {
                setBargeInState("arming");
              } else if (!armedPublished) {
                armedPublished = true;
                setBargeInState("armed");
                void emitClientEvent(
                  "sensory.conversation.barge_in_armed",
                  interruptionTurnId,
                  {
                    interruptedTurnId,
                    antiEchoCalibrationMs: 650,
                    threshold: update.threshold,
                  },
                );
              }

              if (
                update.event !== "speech-started"
              ) {
                return;
              }

              bargeDetectedRef.current = true;
              setBargeInState("detected");

              // Keep a short pre-roll so the first word survives the
              // VAD confirmation window, while discarding earlier TTS echo.
              monitor?.retainRecentAudio(500);
              bargeRecorderRef.current = null;
              recorderRef.current = monitor;
              activeTurnIdRef.current =
                interruptionTurnId;
              vadGateRef.current = gate;
              setMicState("active");
              setVadState("speech");
              setBusy("idle");

              void emitClientEvent(
                "sensory.conversation.barge_in_detected",
                interruptionTurnId,
                {
                  interruptedTurnId,
                  threshold: update.threshold,
                  level: update.level,
                },
              );
              void emitClientEvent(
                "sensory.speech.started",
                interruptionTurnId,
                {
                  mode: "conversation",
                  trigger: "barge-in",
                },
              );

              void interruptPlayback("barge-in").then(
                () => {
                  if (
                    conversationActiveRef.current &&
                    recorderRef.current === monitor
                  ) {
                    publishChernobogCoreState(
                      "listening",
                    );
                  }
                },
              );
              return;
            }

            setVadState(update.phase);

            if (update.event === "speech-ended") {
              void emitClientEvent(
                "sensory.vad.silence_detected",
                interruptionTurnId,
                { silenceMs: 850, trigger: "barge-in" },
              );
              queueMicrotask(() =>
                autoStopRef.current?.("silence"),
              );
            } else if (
              update.event === "max-duration"
            ) {
              void emitClientEvent(
                "sensory.vad.timeout",
                interruptionTurnId,
                {
                  reason: "max-duration",
                  elapsedMs: update.elapsedMs,
                  trigger: "barge-in",
                },
              );
              queueMicrotask(() =>
                autoStopRef.current?.(
                  "max-duration",
                ),
              );
            }
          },
        });

        if (
          generation !==
            bargeMonitorGenerationRef.current ||
          !conversationActiveRef.current ||
          !playbackRef.current
        ) {
          await monitor.cancel().catch(() => undefined);
          return;
        }

        if (!bargeDetectedRef.current) {
          bargeRecorderRef.current = monitor;
          setMicState("active");
        }
      } catch (bargeError) {
        if (
          generation !==
          bargeMonitorGenerationRef.current
        ) {
          return;
        }

        bargeRecorderRef.current = null;
        setBargeInState("unavailable");
        void emitClientEvent(
          "sensory.conversation.barge_in_unavailable",
          undefined,
          {
            reason:
              bargeError instanceof Error
                ? bargeError.message
                : "barge-in-monitor-failed",
          },
        );

        // Barge-in is an enhancement, not a requirement for the
        // conversation lease. Let Chernobog finish speaking, then
        // the normal post-TTS re-arm path resumes listening.
      }
    },
    [emitClientEvent, interruptPlayback],
  );

  const refreshHardware = useCallback(async () => {
    if (!navigator.mediaDevices) {
      setMicState("unsupported");
      setCameraState("unsupported");
      return;
    }

    try {
      const devices =
        await navigator.mediaDevices.enumerateDevices();
      const hasMic = devices.some(
        (device) => device.kind === "audioinput",
      );
      const hasCamera = devices.some(
        (device) => device.kind === "videoinput",
      );

      setMicState((current) =>
        hasMic
          ? current === "ready" || current === "active"
            ? current
            : "permission-required"
          : "unavailable",
      );
      setCameraState(
        hasCamera
          ? "permission-required"
          : "unavailable",
      );

      if (!hasMic) {
        void emitClientEvent(
          "sensory.microphone.unavailable",
        );
      }

      if (!hasCamera) {
        void emitClientEvent(
          "sensory.camera.unavailable",
        );
      }
    } catch {
      setMicState("failed");
      setCameraState("failed");
    }
  }, [emitClientEvent]);

  const refreshProviders = useCallback(async () => {
    setProvidersLoading(true);

    try {
      const response = await fetch(
        "/api/sensory/status",
        {
          cache: "no-store",
        },
      );

      if (!response.ok) {
        throw new Error(
          await responseError(
            response,
            "Unable to read sensory provider status.",
          ),
        );
      }

      setProviders(
        (await response.json()) as SensoryStatusResponse,
      );
    } catch (statusError) {
      setError(
        statusError instanceof Error
          ? statusError.message
          : "Unable to read sensory provider status.",
      );
    } finally {
      setProvidersLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshHardware();
    void refreshProviders();

    return () => {
      if (idleTimerRef.current !== null) {
        window.clearTimeout(idleTimerRef.current);
      }

      clearConversationRestart();
      clearWakeRestart();
      rearmConversationRef.current = null;
      wakeRearmRef.current = null;
      autoStopRef.current = null;
      vadGateRef.current = null;

      const recorder = recorderRef.current;
      recorderRef.current = null;
      if (recorder) {
        void recorder.cancel();
      }

      bargeMonitorGenerationRef.current += 1;
      const bargeMonitor = bargeRecorderRef.current;
      bargeRecorderRef.current = null;
      if (bargeMonitor) {
        void bargeMonitor.cancel();
      }

      wakeGenerationRef.current += 1;
      const wakeRecorder = wakeRecorderRef.current;
      wakeRecorderRef.current = null;
      if (wakeRecorder) {
        void wakeRecorder.cancel();
      }

      cleanupPlayback();
    };
  }, [
    cleanupPlayback,
    clearConversationRestart,
    clearWakeRestart,
    refreshHardware,
    refreshProviders,
  ]);

  const speak = useCallback(
    async (text: string, turnId: string) => {
      if (!text.trim()) {
        settleAfterTurn();
        return;
      }

      cleanupPlayback();

      const response = await fetch(
        "/api/sensory/speak",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text,
            turnId,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(
          await responseError(
            response,
            "Speech synthesis failed.",
          ),
        );
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      playbackRef.current = audio;
      playbackUrlRef.current = url;

      audio.onplay = () => {
        publishChernobogCoreState("speaking");
        void emitClientEvent(
          "sensory.tts.playback_started",
          turnId,
        );

        if (conversationActiveRef.current) {
          void armBargeInMonitor(turnId);
        }
      };

      audio.onended = () => {
        void (async () => {
          await stopBargeInMonitor();
          cleanupPlayback();
          void emitClientEvent(
            "sensory.tts.playback_completed",
            turnId,
          );
          settleAfterTurn();
        })();
      };

      audio.onerror = () => {
        void (async () => {
          await stopBargeInMonitor();
          cleanupPlayback();
          setError("Audio playback failed.");
          publishChernobogCoreState("failure");

          if (conversationActiveRef.current) {
            stopConversationState(
              "tts-playback-failed",
            );
          }
        })();
      };

      await audio.play();
    },
    [
      armBargeInMonitor,
      cleanupPlayback,
      emitClientEvent,
      settleAfterTurn,
      stopBargeInMonitor,
      stopConversationState,
    ],
  );

  const runCommand = useCallback(
    async (
      transcript: string,
      turnId: string,
      speakReply = autoSpeak,
    ) => {
      setBusy("command");
      publishChernobogCoreState("thinking");

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: transcript,
          sessionId: getSensorySessionId(),
          responseMode: "voice",
        }),
      });

      if (!response.ok) {
        throw new Error(
          await responseError(
            response,
            "Chernobog command execution failed.",
          ),
        );
      }

      const payload =
        (await response.json()) as ChatPayload;
      const reply = payload.reply?.trim() ?? "";
      const spokenReply =
        payload.spokenReply?.trim() || reply;

      if (!reply) {
        throw new Error(
          "Chernobog returned no spoken reply.",
        );
      }

      setLastReply(reply);
      setBusy("idle");

      if (speakReply) {
        await speak(spokenReply, turnId);
      } else {
        settleAfterTurn();
      }
    },
    [autoSpeak, settleAfterTurn, speak],
  );

  const startListening = useCallback(
    async (mode: ListeningMode = "manual") => {
      setError("");

      if (recorderRef.current) {
        return;
      }

      if (playbackRef.current) {
        await interruptPlayback("barge-in");
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        setMicState("unsupported");
        setError(
          "Microphone capture is not available in this browser/context.",
        );

        if (mode === "conversation") {
          stopConversationState("microphone-unsupported");
        }
        return;
      }

      if (
        providers &&
        !providers.providers.stt.online
      ) {
        setError(
          "whisper.cpp is offline. The microphone is available, but transcription cannot run yet.",
        );

        if (mode === "conversation") {
          stopConversationState("stt-offline");
        }
        return;
      }

      const turnId = makeTurnId();
      activeTurnIdRef.current = turnId;
      setBargeInState("idle");

      try {
        const stream =
          await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
              channelCount: 1,
            },
            video: false,
          });

        const vad =
          mode === "conversation"
            ? new AdaptiveVoiceActivityGate()
            : null;
        vadGateRef.current = vad;

        const recorder = await WavRecorder.start(
          stream,
          {
            onAudioFrame: vad
              ? (samples, sampleRate) => {
                  const update = vad.push(
                    samples,
                    sampleRate,
                  );

                  setVadState(update.phase);
                  setVadLevel(update.level);

                  if (
                    update.event === "speech-started"
                  ) {
                    void emitClientEvent(
                      "sensory.vad.speech_started",
                      turnId,
                      {
                        threshold: update.threshold,
                      },
                    );
                  } else if (
                    update.event === "speech-ended"
                  ) {
                    void emitClientEvent(
                      "sensory.vad.silence_detected",
                      turnId,
                      {
                        silenceMs: 950,
                      },
                    );
                    queueMicrotask(() =>
                      autoStopRef.current?.("silence"),
                    );
                  } else if (
                    update.event ===
                    "no-speech-timeout"
                  ) {
                    void emitClientEvent(
                      "sensory.vad.timeout",
                      turnId,
                      {
                        reason: "no-speech",
                        elapsedMs: update.elapsedMs,
                      },
                    );
                    queueMicrotask(() =>
                      autoStopRef.current?.("no-speech"),
                    );
                  } else if (
                    update.event === "max-duration"
                  ) {
                    void emitClientEvent(
                      "sensory.vad.timeout",
                      turnId,
                      {
                        reason: "max-duration",
                        elapsedMs: update.elapsedMs,
                      },
                    );
                    queueMicrotask(() =>
                      autoStopRef.current?.(
                        "max-duration",
                      ),
                    );
                  }
                }
              : undefined,
          },
        );

        recorderRef.current = recorder;
        conversationRearmAttemptsRef.current = 0;
        setMicState("active");
        setBusy("idle");
        setVadState(
          mode === "conversation"
            ? "calibrating"
            : "idle",
        );
        setVadLevel(0);
        publishChernobogCoreState("listening");
        void emitClientEvent(
          "sensory.speech.started",
          turnId,
          { mode },
        );
      } catch (captureError) {
        activeTurnIdRef.current = null;
        vadGateRef.current = null;
        setVadState("idle");
        setVadLevel(0);

        const name =
          captureError instanceof DOMException
            ? captureError.name
            : "";

        if (
          name === "NotAllowedError" ||
          name === "SecurityError"
        ) {
          setMicState("permission-required");
          void emitClientEvent(
            "sensory.microphone.permission_required",
            turnId,
          );
        } else if (
          name === "NotFoundError" ||
          name === "DevicesNotFoundError"
        ) {
          setMicState("unavailable");
          void emitClientEvent(
            "sensory.microphone.unavailable",
            turnId,
          );
        } else {
          setMicState("failed");
        }

        const message =
          captureError instanceof Error
            ? captureError.message
            : "Unable to start microphone capture.";

        const fatalConversationCapture =
          name === "NotAllowedError" ||
          name === "SecurityError" ||
          name === "NotFoundError" ||
          name === "DevicesNotFoundError";

        if (
          mode === "conversation" &&
          conversationActiveRef.current &&
          !fatalConversationCapture
        ) {
          conversationRearmAttemptsRef.current += 1;
          const attempt =
            conversationRearmAttemptsRef.current;

          if (attempt <= 6) {
            setError(
              `Microphone re-arm delayed (${message}). Retrying ${attempt}/6...`,
            );
            publishChernobogCoreState("waiting");
            scheduleConversationRearm(
              Math.min(1_500, 300 + attempt * 200),
            );
            return;
          }

          setError(
            `Microphone could not re-arm after ${attempt} attempts: ${message}`,
          );
          publishChernobogCoreState("failure");
          stopConversationState(
            "microphone-rearm-exhausted",
          );
          return;
        }

        setError(message);
        publishChernobogCoreState("failure");

        if (mode === "conversation") {
          stopConversationState("microphone-start-failed");
        }
      }
    },
    [
      emitClientEvent,
      interruptPlayback,
      providers,
      scheduleConversationRearm,
      stopConversationState,
    ],
  );

  const stopListening = useCallback(
    async (
      reason: ListeningStopReason = "manual",
    ) => {
      if (stoppingRef.current) {
        return;
      }

      const recorder = recorderRef.current;
      if (!recorder) {
        return;
      }

      stoppingRef.current = true;
      recorderRef.current = null;
      vadGateRef.current = null;

      const turnId =
        activeTurnIdRef.current ?? makeTurnId();
      activeTurnIdRef.current = null;

      setMicState("ready");
      setVadState("idle");
      setVadLevel(0);
      setBargeInState("idle");
      bargeDetectedRef.current = false;

      if (reason === "no-speech") {
        try {
          await recorder.cancel();
        } finally {
          setBusy("idle");

          if (conversationActiveRef.current) {
            // Legacy compatibility contract: quiet periods automatically re-arm listening.
            // The old "inactivity-timeout" behavior ended the whole hands-free
            // session; a quiet turn now simply re-arms so CONVERSE stays alive
            // until END CHAT.
            publishChernobogCoreState("waiting");
            scheduleConversationRearm(350);
          } else {
            publishChernobogCoreState("idle");
          }

          stoppingRef.current = false;
        }
        return;
      }

      setBusy("transcribing");
      publishChernobogCoreState("thinking");
      void emitClientEvent(
        "sensory.speech.ended",
        turnId,
        { reason },
      );

      try {
        const audio = await recorder.stop();

        const form = new FormData();
        form.append(
          "audio",
          audio,
          "chernobog-speech.wav",
        );
        form.append("turnId", turnId);

        const response = await fetch(
          "/api/sensory/transcribe",
          {
            method: "POST",
            body: form,
          },
        );

        if (!response.ok) {
          throw new Error(
            await responseError(
              response,
              "Speech transcription failed.",
            ),
          );
        }

        const transcript =
          (await response.json()) as SensoryTranscriptResponse;
        const heard = transcript.transcript.trim();
        setLastTranscript(heard);

        if (!heard) {
          setBusy("idle");
          settleAfterTurn();
          return;
        }

        // Local sensory safety command. This is deliberately intercepted
        // before /api/chat so disabling listening never depends on the LLM.
        if (isSensoryOffCommand(heard)) {
          setBusy("idle");
          setLastReply("Sensory systems offline.");
          await sensoryOffRef.current?.("voice-command");
          return;
        }

        await runCommand(heard, transcript.turnId);
      } catch (listenError) {
        setError(
          listenError instanceof Error
            ? listenError.message
            : "Listening pipeline failed.",
        );
        setBusy("idle");
        publishChernobogCoreState("failure");

        if (conversationActiveRef.current) {
          stopConversationState("turn-failed");
        }
      } finally {
        stoppingRef.current = false;
        if (recorderRef.current === null) {
          setMicState("ready");
        }
        setBusy((current) =>
          current === "transcribing" ? "idle" : current,
        );
      }
    },
    [
      emitClientEvent,
      runCommand,
      scheduleConversationRearm,
      settleAfterTurn,
      stopConversationState,
    ],
  );

  useEffect(() => {
    autoStopRef.current = (reason) => {
      void stopListening(reason);
    };

    return () => {
      autoStopRef.current = null;
    };
  }, [stopListening]);

  useEffect(() => {
    rearmConversationRef.current = () => {
      if (!conversationActiveRef.current) {
        return;
      }

      if (
        recorderRef.current ||
        bargeRecorderRef.current ||
        playbackRef.current ||
        stoppingRef.current
      ) {
        scheduleConversationRearm(250);
        return;
      }

      void (async () => {
        await startListening("conversation");

        if (
          conversationActiveRef.current &&
          !recorderRef.current &&
          !playbackRef.current &&
          !stoppingRef.current
        ) {
          scheduleConversationRearm(350);
        }
      })();
    };

    return () => {
      rearmConversationRef.current = null;
    };
  }, [scheduleConversationRearm, startListening]);

  useEffect(() => {
    // Self-healing session lease: if the deck is remounted or a
    // callback/timer is lost after a response, an active CONVERSE
    // session repairs itself instead of falling back to MANUAL.
    if (
      !conversationActive ||
      !providers?.providers.stt.online ||
      recorderRef.current ||
      bargeRecorderRef.current ||
      playbackRef.current ||
      stoppingRef.current ||
      conversationRestartTimerRef.current !== null
    ) {
      return;
    }

    conversationActiveRef.current = true;
    conversationLeaseActive = true;
    scheduleConversationRearm(150);
  }, [
    conversationActive,
    providers,
    scheduleConversationRearm,
  ]);

  const startConversation = useCallback(async () => {
    setError("");

    if (conversationActiveRef.current) {
      return;
    }

    if (wakeActiveRef.current) {
      setError(
        "Disarm WAKE before starting CONVERSE manually.",
      );
      return;
    }

    if (recorderRef.current) {
      setError(
        "Finish the current manual listening turn before starting hands-free conversation.",
      );
      return;
    }

    if (!providers?.providers.stt.online) {
      setError(
        "whisper.cpp must be online before hands-free conversation can start.",
      );
      return;
    }

    conversationActiveRef.current = true;
    conversationLeaseActive = true;
    conversationRearmAttemptsRef.current = 0;
    sttHealthFailuresRef.current = 0;
    setConversationActive(true);

    if (providers.providers.tts.online) {
      setAutoSpeak(true);
    }

    void emitClientEvent(
      "sensory.conversation.started",
      undefined,
      {
        voiceEnabled: providers.providers.tts.online,
        noSpeechRearmMs: 20_000,
      },
    );

    await startListening("conversation");
  }, [emitClientEvent, providers, startListening]);

  const endConversation = useCallback(async (
    reason: SensoryShutdownReason = "manual",
  ) => {
    if (!conversationActiveRef.current) {
      return;
    }

    conversationActiveRef.current = false;
    conversationLeaseActive = false;
    conversationRearmAttemptsRef.current = 0;
    sttHealthFailuresRef.current = 0;
    setConversationActive(false);
    clearConversationRestart();
    setVadState("idle");
    setVadLevel(0);

    const recorder = recorderRef.current;
    recorderRef.current = null;
    activeTurnIdRef.current = null;
    vadGateRef.current = null;

    if (recorder) {
      await recorder.cancel().catch(() => undefined);
    }

    await stopBargeInMonitor();

    if (playbackRef.current) {
      await interruptPlayback("manual");
    }

    setMicState((current) =>
      current === "unavailable" ||
      current === "unsupported"
        ? current
        : "ready",
    );
    setBusy("idle");
    publishChernobogCoreState("idle");

    void emitClientEvent(
      "sensory.conversation.stopped",
      undefined,
      { reason },
    );
  }, [
    clearConversationRestart,
    emitClientEvent,
    interruptPlayback,
    stopBargeInMonitor,
  ]);

  const scheduleWakeRearm = useCallback(
    (delayMs = 350) => {
      if (!wakeActiveRef.current) {
        return;
      }

      clearWakeRestart();
      setWakeState("arming");
      publishChernobogCoreState("waiting");

      wakeRestartTimerRef.current = window.setTimeout(
        () => {
          wakeRestartTimerRef.current = null;

          if (!wakeActiveRef.current) {
            return;
          }

          wakeRearmRef.current?.();
        },
        delayMs,
      );
    },
    [clearWakeRestart],
  );

  const processWakeUtterance = useCallback(
    async (reason: "silence" | "max-duration") => {
      if (wakeStoppingRef.current) {
        return;
      }

      const recorder = wakeRecorderRef.current;
      if (!recorder || !wakeActiveRef.current) {
        return;
      }

      wakeStoppingRef.current = true;
      wakeRecorderRef.current = null;
      const turnId = makeTurnId();
      setWakeState("checking");
      setVadState("idle");
      setVadLevel(0);
      setBusy("transcribing");
      publishChernobogCoreState("thinking");

      try {
        const audio = await recorder.stop();
        const form = new FormData();
        form.append("audio", audio, "chernobog-wake.wav");
        form.append("turnId", turnId);

        const response = await fetch(
          "/api/sensory/transcribe",
          {
            method: "POST",
            body: form,
          },
        );

        if (!response.ok) {
          throw new Error(
            await responseError(
              response,
              "Wake phrase transcription failed.",
            ),
          );
        }

        const transcript =
          (await response.json()) as SensoryTranscriptResponse;
        const wake = matchWakePhrase(transcript.transcript);

        if (!wake.matched) {
          void emitClientEvent(
            "sensory.wake.rejected",
            transcript.turnId,
            {
              characters: transcript.transcript.length,
              reason,
            },
          );
          setBusy("idle");
          setWakeState("armed");
          publishChernobogCoreState("waiting");
          scheduleWakeRearm(250);
          return;
        }

        // A wake-prefixed local sleep command must turn Chernobog off
        // without ever entering the normal command/LLM pipeline.
        if (wake.command && isSensoryOffCommand(wake.command)) {
          setLastTranscript(transcript.transcript.trim());
          setLastReply("Sensory systems offline.");
          setBusy("idle");
          await sensoryOffRef.current?.("voice-command");
          return;
        }

        // Wake mode is deliberately one-shot. Once summoned, microphone
        // ownership transfers to CONVERSE and WAKE becomes OFF again.
        wakeActiveRef.current = false;
        wakeLeaseActive = false;
        setWakeArmed(false);
        setWakeState("summoned");
        clearWakeRestart();

        conversationActiveRef.current = true;
        conversationLeaseActive = true;
        conversationRearmAttemptsRef.current = 0;
        sttHealthFailuresRef.current = 0;
        setConversationActive(true);

        const voiceEnabled =
          providers?.providers.tts.online ?? false;
        if (voiceEnabled) {
          setAutoSpeak(true);
        }

        void emitClientEvent(
          "sensory.wake.detected",
          transcript.turnId,
          {
            phrase: WAKE_PHRASE,
            hasInlineCommand: Boolean(wake.command),
          },
        );
        void emitClientEvent(
          "sensory.conversation.started",
          transcript.turnId,
          {
            voiceEnabled,
            trigger: "wake-phrase",
          },
        );

        setBusy("idle");

        if (wake.command) {
          setLastTranscript(wake.command);
          await runCommand(
            wake.command,
            transcript.turnId,
            voiceEnabled,
          );
          return;
        }

        publishChernobogCoreState("listening");
        scheduleConversationRearm(150);
      } catch (wakeError) {
        setBusy("idle");
        setWakeState("failed");
        setError(
          wakeError instanceof Error
            ? wakeError.message
            : "Wake phrase detection failed.",
        );
        publishChernobogCoreState("waiting");
        void emitClientEvent(
          "sensory.wake.failed",
          turnId,
          { reason: "transcription-failed" },
        );
        scheduleWakeRearm(1_000);
      } finally {
        wakeStoppingRef.current = false;
      }
    },
    [
      clearWakeRestart,
      emitClientEvent,
      providers,
      runCommand,
      scheduleConversationRearm,
      scheduleWakeRearm,
    ],
  );

  const startWakeListening = useCallback(async () => {
    if (
      !wakeActiveRef.current ||
      conversationActiveRef.current ||
      wakeRecorderRef.current ||
      recorderRef.current ||
      bargeRecorderRef.current ||
      playbackRef.current ||
      wakeStoppingRef.current
    ) {
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setWakeState("failed");
      setMicState("unsupported");
      setError(
        "Wake mode requires browser microphone capture.",
      );
      void emitClientEvent(
        "sensory.wake.failed",
        undefined,
        { reason: "media-devices-unavailable" },
      );
      return;
    }

    if (!providers?.providers.stt.online) {
      setWakeState("failed");
      setError(
        "WAKE remains armed, but whisper.cpp is offline. Detection will resume when STT returns.",
      );
      publishChernobogCoreState("waiting");
      scheduleWakeRearm(1_500);
      return;
    }

    const generation = wakeGenerationRef.current + 1;
    wakeGenerationRef.current = generation;
    setWakeState("arming");
    setError("");

    try {
      const stream =
        await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            channelCount: 1,
          },
          video: false,
        });

      if (
        generation !== wakeGenerationRef.current ||
        !wakeActiveRef.current
      ) {
        for (const track of stream.getTracks()) {
          track.stop();
        }
        return;
      }

      const gate = new AdaptiveVoiceActivityGate({
        calibrationMs: 500,
        speechStartMs: 190,
        speechEndMs: 800,
        noSpeechTimeoutMs: 60_000,
        maxUtteranceMs: 12_000,
        absoluteSpeechFloor: 0.014,
        noiseMultiplier: 3.1,
        releaseRatio: 0.68,
      });
      let recorder: WavRecorder | null = null;

      recorder = await WavRecorder.start(stream, {
        onAudioFrame: (samples, sampleRate) => {
          if (
            generation !== wakeGenerationRef.current ||
            !wakeActiveRef.current
          ) {
            return;
          }

          const update = gate.push(samples, sampleRate);
          setVadState(update.phase);
          setVadLevel(update.level);

          if (update.event === "speech-started") {
            recorder?.retainRecentAudio(450);
            setWakeState("speech");
            publishChernobogCoreState("listening");
            void emitClientEvent(
              "sensory.wake.speech_detected",
              undefined,
              { threshold: update.threshold },
            );
          } else if (update.event === "speech-ended") {
            queueMicrotask(() =>
              void processWakeUtterance("silence"),
            );
          } else if (update.event === "max-duration") {
            queueMicrotask(() =>
              void processWakeUtterance("max-duration"),
            );
          } else if (
            update.event === "no-speech-timeout"
          ) {
            const current = wakeRecorderRef.current;
            wakeRecorderRef.current = null;
            if (current) {
              void current.cancel().finally(() => {
                setVadState("idle");
                setVadLevel(0);
                setWakeState("armed");
                scheduleWakeRearm(100);
              });
            }
          }
        },
      });

      if (
        generation !== wakeGenerationRef.current ||
        !wakeActiveRef.current
      ) {
        await recorder.cancel().catch(() => undefined);
        return;
      }

      wakeRecorderRef.current = recorder;
      setMicState("active");
      setWakeState("armed");
      setVadState("calibrating");
      setVadLevel(0);
      publishChernobogCoreState("waiting");
      void emitClientEvent("sensory.wake.armed", undefined, {
        phrase: WAKE_PHRASE,
        localOnlyUntilMatch: true,
      });
    } catch (wakeCaptureError) {
      setWakeState("failed");
      const name =
        wakeCaptureError instanceof DOMException
          ? wakeCaptureError.name
          : "";

      if (
        name === "NotAllowedError" ||
        name === "SecurityError"
      ) {
        setMicState("permission-required");
      } else if (
        name === "NotFoundError" ||
        name === "DevicesNotFoundError"
      ) {
        setMicState("unavailable");
      } else {
        setMicState("failed");
      }

      const message =
        wakeCaptureError instanceof Error
          ? wakeCaptureError.message
          : "Unable to arm wake microphone.";
      setError(message);
      publishChernobogCoreState("waiting");
      void emitClientEvent(
        "sensory.wake.failed",
        undefined,
        { reason: name || "microphone-start-failed" },
      );
    }
  }, [
    emitClientEvent,
    processWakeUtterance,
    providers,
    scheduleWakeRearm,
  ]);

  useEffect(() => {
    wakeRearmRef.current = () => {
      if (!wakeActiveRef.current) {
        return;
      }

      if (
        conversationActiveRef.current ||
        wakeRecorderRef.current ||
        recorderRef.current ||
        bargeRecorderRef.current ||
        playbackRef.current ||
        wakeStoppingRef.current
      ) {
        scheduleWakeRearm(250);
        return;
      }

      void startWakeListening();
    };

    return () => {
      wakeRearmRef.current = null;
    };
  }, [scheduleWakeRearm, startWakeListening]);

  useEffect(() => {
    if (
      !wakeArmed ||
      conversationActive ||
      wakeRecorderRef.current ||
      wakeRestartTimerRef.current !== null ||
      wakeStoppingRef.current
    ) {
      return;
    }

    wakeActiveRef.current = true;
    wakeLeaseActive = true;

    if (providers?.providers.stt.online) {
      scheduleWakeRearm(100);
    }
  }, [
    conversationActive,
    providers,
    scheduleWakeRearm,
    wakeArmed,
  ]);

  const armWakeMode = useCallback(async () => {
    setError("");

    if (wakeActiveRef.current) {
      return;
    }

    if (conversationActiveRef.current) {
      setError("END CHAT before arming WAKE.");
      return;
    }

    if (
      recorderRef.current ||
      bargeRecorderRef.current ||
      playbackRef.current ||
      busy !== "idle"
    ) {
      setError(
        "Finish the active sensory turn before arming WAKE.",
      );
      return;
    }

    if (!providers?.providers.stt.online) {
      setError(
        "whisper.cpp must be online before WAKE can be armed.",
      );
      return;
    }

    wakeActiveRef.current = true;
    wakeLeaseActive = true;
    setWakeArmed(true);
    setWakeState("arming");
    await startWakeListening();
  }, [busy, providers, startWakeListening]);

  const disarmWakeMode = useCallback(async (
    reason: SensoryShutdownReason = "manual",
  ) => {
    if (!wakeActiveRef.current && !wakeArmed) {
      return;
    }

    wakeActiveRef.current = false;
    wakeLeaseActive = false;
    wakeGenerationRef.current += 1;
    clearWakeRestart();
    setWakeArmed(false);
    setWakeState("off");
    setVadState("idle");
    setVadLevel(0);

    const recorder = wakeRecorderRef.current;
    wakeRecorderRef.current = null;
    if (recorder) {
      await recorder.cancel().catch(() => undefined);
    }

    if (!conversationActiveRef.current) {
      setMicState((current) =>
        current === "unavailable" ||
        current === "unsupported"
          ? current
          : "ready",
      );
      publishChernobogCoreState("idle");
    }

    void emitClientEvent("sensory.wake.stopped", undefined, {
      reason,
    });
  }, [clearWakeRestart, emitClientEvent, wakeArmed]);

  const turnSensoryOff = useCallback(async (
    reason: SensoryShutdownReason = "manual",
  ) => {
    setError("");

    // Master safety cutoff: release every browser-side sensory lease.
    // Providers may remain online in the background, but Chernobog no
    // longer owns the microphone, wake monitor, conversation loop, or TTS.
    if (conversationActiveRef.current) {
      await endConversation(reason);
    }
    // Clear the module-level lease even if a remount/race left the ref stale.
    conversationLeaseActive = false;

    if (wakeActiveRef.current || wakeArmed) {
      await disarmWakeMode(reason);
    }

    const recorder = recorderRef.current;
    recorderRef.current = null;
    activeTurnIdRef.current = null;
    vadGateRef.current = null;
    stoppingRef.current = false;

    if (recorder) {
      await recorder.cancel().catch(() => undefined);
    }

    await stopBargeInMonitor();

    if (playbackRef.current) {
      await interruptPlayback("manual");
    }

    setAutoSpeak(false);
    setBargeInState("idle");
    setVadState("idle");
    setVadLevel(0);
    setBusy("idle");
    setMicState((current) =>
      current === "unavailable" || current === "unsupported"
        ? current
        : "ready",
    );
    publishChernobogCoreState("idle");
  }, [
    disarmWakeMode,
    endConversation,
    interruptPlayback,
    stopBargeInMonitor,
    wakeArmed,
  ]);

  useEffect(() => {
    sensoryOffRef.current = turnSensoryOff;
    return () => {
      sensoryOffRef.current = null;
    };
  }, [turnSensoryOff]);

  useEffect(() => {
    if (!conversationActive && !wakeArmed) {
      return;
    }

    const timer = window.setInterval(() => {
      void refreshProviders();
    }, 10_000);

    return () => window.clearInterval(timer);
  }, [conversationActive, refreshProviders, wakeArmed]);

  useEffect(() => {
    if (!conversationActive || !providers) {
      sttHealthFailuresRef.current = 0;
      return;
    }

    if (providers.providers.stt.online) {
      sttHealthFailuresRef.current = 0;
      return;
    }

    sttHealthFailuresRef.current += 1;

    if (sttHealthFailuresRef.current < 3) {
      setError(
        `whisper.cpp health check missed (${sttHealthFailuresRef.current}/3). CONVERSE remains armed while Chernobog retries.`,
      );
      return;
    }

    // three consecutive whisper.cpp health-check failures now
    // suspend/retry the turn instead of releasing CONVERSE.
    setError(
      "whisper.cpp is temporarily unavailable. CONVERSE remains active and will resume automatically when STT returns.",
    );
    publishChernobogCoreState("waiting");
    scheduleConversationRearm(1_500);
  }, [
    conversationActive,
    providers,
    scheduleConversationRearm,
  ]);

  const analyzeImage = useCallback(
    async (
      image: Blob,
      filename: string,
      prompt?: string,
    ) => {
      const turnId = makeTurnId();
      setError("");
      setBusy("vision");
      publishChernobogCoreState("thinking");

      try {
        const form = new FormData();
        form.append("image", image, filename);
        form.append("turnId", turnId);

        if (prompt) {
          form.append("prompt", prompt);
        }

        const response = await fetch(
          "/api/sensory/vision",
          {
            method: "POST",
            body: form,
          },
        );

        if (!response.ok) {
          throw new Error(
            await responseError(
              response,
              "Vision analysis failed.",
            ),
          );
        }

        const result =
          (await response.json()) as SensoryVisionResponse;
        setLastVision(result.observation);

        if (autoSpeak) {
          await speak(
            result.observation,
            result.turnId,
          );
        } else {
          settleToIdle();
        }
      } catch (visionError) {
        setError(
          visionError instanceof Error
            ? visionError.message
            : "Vision analysis failed.",
        );
        publishChernobogCoreState("failure");
      } finally {
        setBusy("idle");
      }
    },
    [autoSpeak, settleToIdle, speak],
  );

  const lookWithCamera = useCallback(async () => {
    if (
      cameraState === "unavailable" ||
      cameraState === "unsupported"
    ) {
      setError(
        "No webcam is present. Vision itself is ready; use IMAGE or SELF TEST until camera hardware is added.",
      );
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraState("unsupported");
      return;
    }

    if (
      providers &&
      !providers.providers.vision.online
    ) {
      setError(
        "Ollama is offline. Camera capture is available, but vision analysis cannot run yet.",
      );
      return;
    }

    const turnId = makeTurnId();

    try {
      setError("");
      setCameraState("active");
      void emitClientEvent(
        "sensory.camera.capture_started",
        turnId,
      );

      const frame =
        await captureSingleCameraFrame();

      setCameraState("ready");
      void emitClientEvent(
        "sensory.camera.capture_completed",
        turnId,
        { bytes: frame.size },
      );

      await analyzeImage(
        frame,
        "chernobog-camera-frame.jpg",
      );
    } catch (cameraError) {
      const name =
        cameraError instanceof DOMException
          ? cameraError.name
          : "";

      if (
        name === "NotAllowedError" ||
        name === "SecurityError"
      ) {
        setCameraState("permission-required");
        void emitClientEvent(
          "sensory.camera.permission_required",
          turnId,
        );
      } else if (
        name === "NotFoundError" ||
        name === "DevicesNotFoundError"
      ) {
        setCameraState("unavailable");
        void emitClientEvent(
          "sensory.camera.unavailable",
          turnId,
        );
      } else {
        setCameraState("failed");
      }

      setError(
        cameraError instanceof Error
          ? cameraError.message
          : "Camera capture failed.",
      );
      publishChernobogCoreState("failure");
    }
  }, [
    analyzeImage,
    cameraState,
    emitClientEvent,
    providers,
  ]);

  const handleImageFile = useCallback(
    async (
      event: ChangeEvent<HTMLInputElement>,
    ) => {
      const file = event.target.files?.[0];
      event.target.value = "";

      if (!file) {
        return;
      }

      void emitClientEvent(
        "sensory.vision.file_selected",
        undefined,
        {
          bytes: file.size,
          mimeType: file.type,
        },
      );

      await analyzeImage(file, file.name);
    },
    [analyzeImage, emitClientEvent],
  );

  const runVisionSelfTest = useCallback(async () => {
    if (
      providers &&
      !providers.providers.vision.online
    ) {
      setError(
        "Ollama is offline. Start it before running the vision self-test.",
      );
      return;
    }

    try {
      const image =
        await createVisionSelfTestImage();
      await analyzeImage(
        image,
        "chernobog-vision-self-test.png",
        [
          "This is a Chernobog sensory self-test.",
          "State the large number and the main geometric shape visible in the image.",
        ].join(" "),
      );
    } catch (selfTestError) {
      setError(
        selfTestError instanceof Error
          ? selfTestError.message
          : "Vision self-test failed.",
      );
    }
  }, [analyzeImage, providers]);

  const sttOnline =
    providers?.providers.stt.online ?? false;
  const ttsOnline =
    providers?.providers.tts.online ?? false;
  const visionOnline =
    providers?.providers.vision.online ?? false;

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="fixed bottom-4 right-4 z-[90] flex items-center gap-2 rounded-md border border-orange-500/35 bg-black/85 px-3 py-2 text-xs font-semibold tracking-[0.18em] text-orange-100 shadow-2xl backdrop-blur-md"
      >
        <Eye className="h-4 w-4" />
        SENSORY
      </button>
    );
  }

  return (
    <aside className="fixed bottom-4 right-4 z-[90] w-[min(410px,calc(100vw-2rem))] overflow-hidden rounded-md border border-orange-500/25 bg-[#090b10]/95 shadow-2xl backdrop-blur-xl">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageFile}
      />

      <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
        <div>
          <div className="text-[10px] font-semibold tracking-[0.22em] text-orange-300">
            3D-10 // SENSORY PRESENCE
          </div>
          <div className="mt-0.5 text-[9px] tracking-[0.14em] text-zinc-500">
            VOICE · LISTENING · VISION · HANDS-FREE · BARGE-IN · WAKE
          </div>
        </div>

        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="rounded border border-white/10 px-2 py-1 text-[9px] tracking-[0.14em] text-zinc-400 hover:border-white/20 hover:text-zinc-200"
        >
          COLLAPSE
        </button>
      </div>

      <div className="grid grid-cols-3 gap-px bg-white/5">
        <div className="bg-[#0c0f15] p-2">
          <div className="text-[9px] tracking-[0.14em] text-zinc-500">
            MICROPHONE
          </div>
          <div
            className={`mt-1 text-[10px] font-semibold ${statusClass(
              micState,
            )}`}
          >
            {statusLabel(micState)}
          </div>
        </div>

        <div className="bg-[#0c0f15] p-2">
          <div className="text-[9px] tracking-[0.14em] text-zinc-500">
            CAMERA
          </div>
          <div
            className={`mt-1 text-[10px] font-semibold ${statusClass(
              cameraState,
            )}`}
          >
            {statusLabel(cameraState)}
          </div>
        </div>

        <div className="bg-[#0c0f15] p-2">
          <div className="text-[9px] tracking-[0.14em] text-zinc-500">
            RUNTIME
          </div>
          <div className="mt-1 text-[10px] font-semibold text-zinc-300">
            {busy === "idle"
              ? "READY"
              : busy.toUpperCase()}
          </div>
        </div>
      </div>

      <div className="space-y-2 p-3">
        <div className="grid grid-cols-4 gap-2">
          <button
            type="button"
            onClick={() =>
              micState === "active"
                ? void stopListening()
                : void startListening("manual")
            }
            disabled={
              conversationActive ||
              wakeArmed ||
              busy === "vision" ||
              busy === "command" ||
              busy === "transcribing"
            }
            className="flex min-h-10 items-center justify-center gap-2 rounded border border-orange-500/30 bg-orange-500/10 px-2 text-[9px] font-semibold tracking-[0.14em] text-orange-100 hover:bg-orange-500/15 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {micState === "active" ? (
              <>
                <Square className="h-3.5 w-3.5" />
                STOP
              </>
            ) : (
              <>
                <Mic className="h-3.5 w-3.5" />
                LISTEN
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              if (playbackRef.current) {
                void interruptPlayback("manual");
                return;
              }

              setAutoSpeak((enabled) => !enabled);
            }}
            className="flex min-h-10 items-center justify-center gap-1.5 rounded border border-white/10 bg-white/[0.035] px-2 text-[9px] font-semibold tracking-[0.14em] text-zinc-200 hover:border-white/20"
          >
            {autoSpeak ? (
              <Volume2 className="h-3.5 w-3.5" />
            ) : (
              <VolumeX className="h-3.5 w-3.5" />
            )}
            {playbackRef.current
              ? "STOP VOICE"
              : autoSpeak
                ? "VOICE ON"
                : "VOICE OFF"}
          </button>

          <button
            type="button"
            onClick={() =>
              conversationActive
                ? void endConversation()
                : void startConversation()
            }
            disabled={
              !conversationActive &&
              (
                !sttOnline ||
                wakeArmed ||
                micState === "unavailable" ||
                micState === "unsupported" ||
                busy !== "idle"
              )
            }
            className={`flex min-h-10 items-center justify-center gap-1.5 rounded border px-2 text-[9px] font-semibold tracking-[0.12em] disabled:cursor-not-allowed disabled:opacity-40 ${
              conversationActive
                ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-200"
                : "border-white/10 bg-white/[0.035] text-zinc-200 hover:border-white/20"
            }`}
          >
            <Mic className="h-3.5 w-3.5" />
            {conversationActive ? "END CHAT" : "CONVERSE"}
          </button>

          <button
            type="button"
            onClick={() =>
              wakeArmed
                ? void disarmWakeMode()
                : void armWakeMode()
            }
            disabled={
              !wakeArmed &&
              (
                conversationActive ||
                !sttOnline ||
                micState === "unavailable" ||
                micState === "unsupported" ||
                busy !== "idle"
              )
            }
            className={`flex min-h-10 items-center justify-center gap-1.5 rounded border px-2 text-[9px] font-semibold tracking-[0.11em] disabled:cursor-not-allowed disabled:opacity-40 ${
              wakeArmed
                ? "border-sky-500/35 bg-sky-500/10 text-sky-200"
                : "border-white/10 bg-white/[0.035] text-zinc-200 hover:border-white/20"
            }`}
          >
            <Mic className="h-3.5 w-3.5" />
            {wakeArmed ? "WAKE OFF" : "ARM WAKE"}
          </button>
        </div>

        <button
          type="button"
          onClick={() => void turnSensoryOff()}
          className="flex min-h-9 w-full items-center justify-center gap-2 rounded border border-red-500/45 bg-red-500/10 px-3 text-[9px] font-semibold tracking-[0.16em] text-red-200 hover:bg-red-500/15"
          title="Immediately release microphone, wake mode, conversation capture, barge-in monitoring, and voice playback. You can also say: Chernobog, go to sleep."
        >
          <Power className="h-3.5 w-3.5" />
          SENSORY OFF
        </button>

        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => void lookWithCamera()}
            disabled={
              cameraState === "unavailable" ||
              cameraState === "unsupported" ||
              conversationActive ||
              wakeArmed ||
              busy !== "idle"
            }
            className="flex min-h-9 items-center justify-center gap-1.5 rounded border border-white/10 bg-white/[0.025] px-2 text-[9px] font-semibold tracking-[0.12em] text-zinc-300 hover:border-white/20 disabled:cursor-not-allowed disabled:opacity-35"
          >
            <Camera className="h-3.5 w-3.5" />
            LOOK
          </button>

          <button
            type="button"
            onClick={() =>
              fileInputRef.current?.click()
            }
            disabled={conversationActive || wakeArmed || busy !== "idle"}
            className="flex min-h-9 items-center justify-center gap-1.5 rounded border border-white/10 bg-white/[0.025] px-2 text-[9px] font-semibold tracking-[0.12em] text-zinc-300 hover:border-white/20 disabled:cursor-not-allowed disabled:opacity-35"
          >
            <FileImage className="h-3.5 w-3.5" />
            IMAGE
          </button>

          <button
            type="button"
            onClick={() =>
              void runVisionSelfTest()
            }
            disabled={conversationActive || wakeArmed || busy !== "idle"}
            className="flex min-h-9 items-center justify-center gap-1.5 rounded border border-white/10 bg-white/[0.025] px-2 text-[9px] font-semibold tracking-[0.12em] text-zinc-300 hover:border-white/20 disabled:cursor-not-allowed disabled:opacity-35"
          >
            <Eye className="h-3.5 w-3.5" />
            SELF TEST
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2 rounded border border-white/[0.07] bg-black/25 p-2 text-[9px]">
          <div>
            <span className="text-zinc-600">
              STT
            </span>
            <div
              className={
                sttOnline
                  ? "text-emerald-300"
                  : "text-zinc-500"
              }
            >
              {sttOnline ? "ONLINE" : "OFFLINE"}
            </div>
          </div>

          <div>
            <span className="text-zinc-600">
              TTS
            </span>
            <div
              className={
                ttsOnline
                  ? "text-emerald-300"
                  : "text-zinc-500"
              }
            >
              {ttsOnline ? "ONLINE" : "OFFLINE"}
            </div>
          </div>

          <div>
            <span className="text-zinc-600">
              VISION
            </span>
            <div
              className={
                visionOnline
                  ? "text-emerald-300"
                  : "text-zinc-500"
              }
            >
              {visionOnline ? "ONLINE" : "OFFLINE"}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-[0.72fr_0.7fr_0.9fr_1.25fr] gap-2 rounded border border-white/[0.07] bg-black/20 p-2 text-[9px]">
          <div>
            <span className="text-zinc-600">
              MODE
            </span>
            <div
              className={
                conversationActive
                  ? "text-emerald-300"
                  : wakeArmed
                    ? "text-sky-300"
                    : "text-zinc-500"
              }
            >
              {conversationActive
                ? "HANDS-FREE"
                : wakeArmed
                  ? "DORMANT"
                  : "MANUAL"}
            </div>
          </div>

          <div>
            <span className="text-zinc-600">
              VAD
            </span>
            <div
              className={
                vadState === "speech"
                  ? "text-orange-200"
                  : conversationActive
                    ? "text-emerald-300"
                    : wakeArmed
                      ? "text-sky-300"
                      : "text-zinc-500"
              }
            >
              {conversationActive || wakeArmed
                ? vadState.toUpperCase()
                : "IDLE"}
            </div>
          </div>

          <div>
            <span className="text-zinc-600">
              BARGE-IN
            </span>
            <div
              className={
                bargeInState === "detected"
                  ? "text-orange-200"
                  : bargeInState === "unavailable"
                    ? "text-amber-200"
                    : conversationActive
                      ? "text-emerald-300"
                      : "text-zinc-500"
              }
            >
              {!conversationActive
                ? "IDLE"
                : bargeInState === "idle"
                  ? "STANDBY"
                  : bargeInState === "arming"
                    ? "CALIBRATE"
                    : bargeInState === "detected"
                      ? "INTERRUPT"
                      : bargeInState.toUpperCase()}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-zinc-600">
              <span>VOICE LEVEL</span>
              <span>{Math.round(vadLevel * 100)}%</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className="h-full bg-orange-300/70 transition-[width] duration-75"
                style={{
                  width: `${Math.round(vadLevel * 100)}%`,
                }}
              />
            </div>
          </div>
        </div>

        {wakeArmed && !conversationActive && (
          <div className="rounded border border-sky-500/15 bg-sky-500/[0.04] px-2.5 py-2 text-[9px] leading-relaxed text-sky-100/75">
            WAKE ARMED — say “{WAKE_PHRASE}” to summon Chernobog. Non-matching speech is checked locally by Whisper and discarded without entering the command pipeline. State: {wakeState.toUpperCase()}.
          </div>
        )}

        {conversationActive && (
          <div className="rounded border border-emerald-500/15 bg-emerald-500/[0.04] px-2.5 py-2 text-[9px] leading-relaxed text-emerald-100/75">
            HANDS-FREE ACTIVE — speak normally. About one second of silence closes the turn. While Chernobog speaks, BARGE-IN calibrates against speaker echo and lets sustained speech interrupt him. The session lease stays active across replies, re-arms automatically, and only END CHAT releases it.
          </div>
        )}

        {(conversationActive || wakeArmed) && (
          <div className="rounded border border-red-500/15 bg-red-500/[0.035] px-2.5 py-2 text-[9px] leading-relaxed text-red-100/70">
            VOICE OFF — say “Chernobog, go to sleep” to release active sensory listening without touching the controls. This command is intercepted locally before /api/chat.
          </div>
        )}

        <button
          type="button"
          onClick={() => {
            void refreshHardware();
            void refreshProviders();
          }}
          disabled={providersLoading}
          className="flex w-full items-center justify-center gap-2 rounded border border-white/[0.07] py-1.5 text-[9px] tracking-[0.14em] text-zinc-500 hover:text-zinc-300 disabled:opacity-50"
        >
          {providersLoading && (
            <LoaderCircle className="h-3 w-3 animate-spin" />
          )}
          REFRESH SENSORS
        </button>

        {cameraState === "unavailable" && (
          <div className="rounded border border-amber-500/15 bg-amber-500/[0.04] px-2.5 py-2 text-[9px] leading-relaxed text-amber-100/70">
            CAMERA HARDWARE ABSENT — vision pipeline remains
            available through IMAGE and SELF TEST.
          </div>
        )}

        {lastTranscript && (
          <section className="rounded border border-white/[0.07] bg-black/20 p-2">
            <div className="text-[8px] tracking-[0.16em] text-zinc-600">
              HEARD
            </div>
            <p className="mt-1 max-h-16 overflow-auto text-[10px] leading-relaxed text-zinc-300">
              {lastTranscript}
            </p>
          </section>
        )}

        {lastReply && (
          <section className="rounded border border-orange-500/10 bg-orange-500/[0.025] p-2">
            <div className="text-[8px] tracking-[0.16em] text-orange-400/60">
              CHERNOBOG
            </div>
            <p className="mt-1 max-h-24 overflow-auto text-[10px] leading-relaxed text-zinc-300">
              {lastReply}
            </p>
          </section>
        )}

        {lastVision && (
          <section className="rounded border border-sky-500/10 bg-sky-500/[0.025] p-2">
            <div className="text-[8px] tracking-[0.16em] text-sky-300/60">
              VISION
            </div>
            <p className="mt-1 max-h-24 overflow-auto text-[10px] leading-relaxed text-zinc-300">
              {lastVision}
            </p>
          </section>
        )}

        {error && (
          <div className="rounded border border-red-500/20 bg-red-500/[0.05] px-2.5 py-2 text-[9px] leading-relaxed text-red-200/80">
            {error}
          </div>
        )}
      </div>
    </aside>
  );
}
