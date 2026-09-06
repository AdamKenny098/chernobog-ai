import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath: string): string {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
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
  const missing = needles.filter((needle) => !content.includes(needle));

  if (missing.length > 0) {
    fail(
      `${message}; missing ${missing
        .map((value) => JSON.stringify(value))
        .join(", ")}`,
    );
  }

  pass(message);
}

console.log("Chernobog 3D-10E2 — Live Barge-In Acceptance");
console.log("===============================================");

const requiredFiles = [
  "components/chernobog-ui/sensory/SensoryControlDeck.tsx",
  "lib/chernobog/sensory/client/voiceActivityDetector.ts",
  "lib/chernobog/sensory/client/wavRecorder.ts",
  "lib/chernobog/sensory/types.ts",
  "scripts/verify-chernobog-3d10e2-live-barge-in.ts",
];

for (const relativePath of requiredFiles) {
  if (!fs.existsSync(path.join(root, relativePath))) {
    fail(`required file missing: ${relativePath}`);
  }
}
pass("all 3D-10E2 barge-in files exist");

requireIncludes(
  "lib/chernobog/sensory/types.ts",
  [
    '"sensory.conversation.barge_in_armed"',
    '"sensory.conversation.barge_in_detected"',
    '"sensory.conversation.barge_in_unavailable"',
    '"sensory.tts.interrupted"',
  ],
  "Event Spine contract records barge-in arming, detection, degradation, and TTS interruption",
);

requireIncludes(
  "lib/chernobog/sensory/client/voiceActivityDetector.ts",
  [
    "initialArmingMs?: number",
    "initialArmingMs: 0",
    "Optional anti-echo arming window",
    'phase: "calibrating"',
  ],
  "adaptive VAD supports a non-breaking anti-echo calibration window",
);

requireIncludes(
  "lib/chernobog/sensory/client/wavRecorder.ts",
  [
    "retainRecentAudio(milliseconds: number)",
    "this.chunks.length = 0",
    "this.chunks.push(...retained)",
  ],
  "WAV recorder can retain speech pre-roll while discarding earlier TTS echo",
);

requireIncludes(
  "components/chernobog-ui/sensory/SensoryControlDeck.tsx",
  [
    "const armBargeInMonitor = useCallback(",
    "initialArmingMs: 650",
    "speechStartMs: 260",
    "monitor?.retainRecentAudio(500)",
    "recorderRef.current = monitor",
    '"sensory.conversation.barge_in_armed"',
    '"sensory.conversation.barge_in_detected"',
    'void interruptPlayback("barge-in").then(',
    "void armBargeInMonitor(turnId)",
    "await stopBargeInMonitor()",
    "BARGE-IN",
    "CALIBRATE",
    "INTERRUPT",
  ],
  "speaking turns arm anti-echo monitoring and promote detected interruptions into the next user utterance",
);

const deck = read(
  "components/chernobog-ui/sensory/SensoryControlDeck.tsx",
);

const stateFalseCount = (
  deck.match(/setConversationActive\(false\)/g) ?? []
).length;
const refFalseCount = (
  deck.match(/conversationActiveRef\.current = false/g) ?? []
).length;

if (stateFalseCount !== 1 || refFalseCount !== 1) {
  fail(
    `barge-in changed conversation lease ownership (state false=${stateFalseCount}, ref false=${refFalseCount})`,
  );
}
pass("barge-in does not gain authority to end the CONVERSE session lease");

if (!deck.includes("bargeRecorderRef.current ||\n        playbackRef.current")) {
  fail("conversation re-arm can race the active barge-in monitor");
}
pass("conversation re-arm waits for the barge-in monitor to release microphone ownership");

console.log("");
console.log("PASS Chernobog 3D-10E2 live barge-in accepted.");
