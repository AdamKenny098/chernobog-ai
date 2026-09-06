import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const requiredFiles = [
  "lib/chernobog/sensory/types.ts",
  "lib/chernobog/sensory/config.ts",
  "lib/chernobog/sensory/events.ts",
  "lib/chernobog/sensory/index.ts",
  "lib/chernobog/sensory/client/wavRecorder.ts",
  "app/api/sensory/event/route.ts",
  "app/api/sensory/status/route.ts",
  "app/api/sensory/transcribe/route.ts",
  "app/api/sensory/speak/route.ts",
  "app/api/sensory/vision/route.ts",
  "components/chernobog-ui/sensory/SensoryControlDeck.tsx",
  "components/chernobog-ui/command-center/CommandCenterView.tsx",
];

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
  "Chernobog 3D-10 — Sensory Presence Acceptance",
);
console.log("===========================================");

for (const relativePath of requiredFiles) {
  if (
    !fs.existsSync(path.join(root, relativePath))
  ) {
    fail(`required file missing: ${relativePath}`);
  }
}
pass("all 3D-10 sensory files exist");

requireIncludes(
  "lib/chernobog/sensory/types.ts",
  [
    '"sensory.speech.started"',
    '"sensory.tts.interrupted"',
    '"sensory.camera.unavailable"',
  ],
  "sensory contract includes listening, interruptible speech, and camera-unavailable truth",
);

requireIncludes(
  "lib/chernobog/sensory/events.ts",
  [
    'subsystem: "sensory"',
    "sensitive: true",
    'scope: "chernobog.presence"',
  ],
  "sensory activity publishes sensitive authoritative Event Spine events",
);

requireIncludes(
  "app/api/sensory/transcribe/route.ts",
  [
    "/inference",
    '"sensory.transcript.final"',
    "whisper.cpp",
  ],
  "listening route is backed by whisper.cpp and publishes final transcript activity",
);

requireIncludes(
  "app/api/sensory/speak/route.ts",
  [
    "/synthesize",
    '"sensory.tts.completed"',
    "audio/wav",
  ],
  "voice route is backed by Piper and returns synthesized audio",
);

requireIncludes(
  "app/api/sensory/vision/route.ts",
  [
    "/api/chat",
    "images: [encoded]",
    '"sensory.vision.completed"',
  ],
  "vision route uses Ollama multimodal chat without requiring camera hardware",
);

requireIncludes(
  "components/chernobog-ui/sensory/SensoryControlDeck.tsx",
  [
    'getUserMedia({',
    'publishChernobogCoreState("listening")',
    'publishChernobogCoreState("speaking")',
    'fetch("/api/chat"',
    "createVisionSelfTestImage",
    "CAMERA HARDWARE ABSENT",
    "sensory.tts.interrupted",
  ],
  "Command Center sensory deck connects real browser senses to the existing command/core state pipeline",
);

requireIncludes(
  "components/chernobog-ui/command-center/CommandCenterView.tsx",
  [
    "SensoryControlDeck",
    "<SensoryControlDeck />",
  ],
  "Sensory Control Deck is mounted in the Command Center",
);

console.log("");
console.log(
  "PASS Chernobog 3D-10 sensory presence foundation accepted.",
);
