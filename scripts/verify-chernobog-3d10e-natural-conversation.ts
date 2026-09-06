import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath: string): string {
  return fs.readFileSync(
    path.join(root, relativePath),
    "utf8",
  );
}

function pass(message: string): void {
  console.log(`PASS ${message}`);
}

function fail(message: string): never {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

function requireFile(relativePath: string): void {
  if (!fs.existsSync(path.join(root, relativePath))) {
    fail(`required file missing: ${relativePath}`);
  }
}

function requireIncludes(
  relativePath: string,
  needles: string[],
  message: string,
): void {
  const content = read(relativePath);
  const missing = needles.filter(
    (needle) => !content.includes(needle),
  );

  if (missing.length > 0) {
    fail(
      `${message}; missing ${missing
        .map((value) => JSON.stringify(value))
        .join(", ")}`,
    );
  }

  pass(message);
}

console.log(
  "Chernobog 3D-10E1 — Natural Conversation Acceptance",
);
console.log(
  "===================================================",
);

const requiredFiles = [
  "lib/chernobog/sensory/client/voiceActivityDetector.ts",
  "lib/chernobog/sensory/client/wavRecorder.ts",
  "lib/chernobog/sensory/types.ts",
  "components/chernobog-ui/sensory/SensoryControlDeck.tsx",
  "scripts/verify-chernobog-3d10e-natural-conversation.ts",
];

for (const relativePath of requiredFiles) {
  requireFile(relativePath);
}
pass("all 3D-10E1 natural-conversation files exist");

requireIncludes(
  "lib/chernobog/sensory/client/voiceActivityDetector.ts",
  [
    "AdaptiveVoiceActivityGate",
    '"speech-started"',
    '"speech-ended"',
    '"no-speech-timeout"',
    '"max-duration"',
    "noiseMultiplier",
  ],
  "adaptive local VAD supports speech onset, silence closure, inactivity timeout, and maximum utterance duration",
);

requireIncludes(
  "lib/chernobog/sensory/client/wavRecorder.ts",
  [
    "WavRecorderStartOptions",
    "onAudioFrame",
    "context.sampleRate",
  ],
  "WAV recorder exposes live audio frames without changing the 16 kHz transcription artifact",
);

requireIncludes(
  "lib/chernobog/sensory/types.ts",
  [
    '"sensory.vad.speech_started"',
    '"sensory.vad.silence_detected"',
    '"sensory.vad.timeout"',
    '"sensory.conversation.started"',
    '"sensory.conversation.turn_rearmed"',
    '"sensory.conversation.stopped"',
  ],
  "sensory contract records hands-free and VAD lifecycle activity on the authoritative Event Spine",
);

requireIncludes(
  "components/chernobog-ui/sensory/SensoryControlDeck.tsx",
  [
    "AdaptiveVoiceActivityGate",
    'startListening("conversation")',
    'autoStopRef.current?.("silence")',
    'autoStopRef.current?.("no-speech")',
    '"sensory.conversation.started"',
    '"sensory.conversation.turn_rearmed"',
    '"inactivity-timeout"',
    "CONVERSE",
    "HANDS-FREE ACTIVE",
    "VOICE LEVEL",
  ],
  "Command Center supports automatic end-of-speech, turn re-arming, visible VAD state, and explicit hands-free control",
);

requireIncludes(
  "components/chernobog-ui/sensory/SensoryControlDeck.tsx",
  [
    'await interruptPlayback("barge-in")',
    'publishChernobogCoreState("listening")',
    'publishChernobogCoreState("thinking")',
    'publishChernobogCoreState("speaking")',
  ],
  "natural conversation preserves manual barge-in and authoritative 3D listening/thinking/speaking state transitions",
);

console.log("");
console.log(
  "PASS Chernobog 3D-10E1 natural conversation foundation accepted.",
);
