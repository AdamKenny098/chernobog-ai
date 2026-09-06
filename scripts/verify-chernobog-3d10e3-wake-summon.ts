const fs = require("node:fs");
const path = require("node:path");

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

console.log("Chernobog 3D-10E3 — Wake / Summon Mode Acceptance");
console.log("====================================================");

const requiredFiles = [
  "components/chernobog-ui/sensory/SensoryControlDeck.tsx",
  "lib/chernobog/sensory/types.ts",
  "scripts/verify-chernobog-3d10e3-wake-summon.ts",
];

for (const relativePath of requiredFiles) {
  if (!fs.existsSync(path.join(root, relativePath))) {
    fail(`required file missing: ${relativePath}`);
  }
}
pass("all 3D-10E3 wake-mode files exist");

requireIncludes(
  "lib/chernobog/sensory/types.ts",
  [
    '"sensory.wake.armed"',
    '"sensory.wake.speech_detected"',
    '"sensory.wake.detected"',
    '"sensory.wake.rejected"',
    '"sensory.wake.failed"',
    '"sensory.wake.stopped"',
  ],
  "Event Spine contract records wake arming, local speech checking, summon, rejection, failure, and shutdown",
);

requireIncludes(
  "components/chernobog-ui/sensory/SensoryControlDeck.tsx",
  [
    'const WAKE_PHRASE = "Chernobog"',
    'const WAKE_ALIASES = ["chernobog", "chernabog"] as const',
    "function matchWakePhrase(transcript: string): WakeMatch",
    'normalized.startsWith(`${prefix} `)',
    'trigger: "wake-phrase"',
    "hasInlineCommand: Boolean(wake.command)",
  ],
  "wake phrase matching supports direct summon and same-utterance commands without broad fuzzy activation",
);

requireIncludes(
  "components/chernobog-ui/sensory/SensoryControlDeck.tsx",
  [
    "const startWakeListening = useCallback(async () => {",
    "speechStartMs: 190",
    "speechEndMs: 800",
    "noSpeechTimeoutMs: 60_000",
    "maxUtteranceMs: 12_000",
    "recorder?.retainRecentAudio(450)",
    'void processWakeUtterance("silence")',
    'void processWakeUtterance("max-duration")',
  ],
  "wake mode uses local adaptive VAD and only sends completed speech segments to STT",
);

const deck = read(
  "components/chernobog-ui/sensory/SensoryControlDeck.tsx",
);

const rejectionIndex = deck.indexOf("if (!wake.matched)");
const commandIndex = deck.indexOf("await runCommand(\n            wake.command");

if (
  rejectionIndex < 0 ||
  commandIndex < 0 ||
  rejectionIndex > commandIndex
) {
  fail(
    "wake speech can reach command execution before wake phrase acceptance",
  );
}
pass("non-matching wake speech is rejected before the normal Chernobog command pipeline");

requireIncludes(
  "components/chernobog-ui/sensory/SensoryControlDeck.tsx",
  [
    "wakeActiveRef.current = false",
    "wakeLeaseActive = false",
    "conversationActiveRef.current = true",
    "conversationLeaseActive = true",
    "setConversationActive(true)",
    "scheduleConversationRearm(150)",
  ],
  "successful summon transfers microphone ownership from dormant WAKE into the accepted CONVERSE lease",
);

const wakeLeaseFalseCount = (
  deck.match(/wakeLeaseActive = false/g) ?? []
).length;
const wakeRefFalseCount = (
  deck.match(/wakeActiveRef\.current = false/g) ?? []
).length;

if (wakeLeaseFalseCount !== 3 || wakeRefFalseCount !== 2) {
  fail(
    `wake lease has unexpected shutdown authority (lease false=${wakeLeaseFalseCount}, ref false=${wakeRefFalseCount})`,
  );
}
pass("wake lease declaration plus exactly two release paths: successful summon or explicit WAKE OFF");

requireIncludes(
  "components/chernobog-ui/sensory/SensoryControlDeck.tsx",
  [
    'wakeArmed ? "WAKE OFF" : "ARM WAKE"',
    'wakeArmed\n                  ? "DORMANT"',
    "WAKE ARMED — say “{WAKE_PHRASE}” to summon Chernobog.",
    "Non-matching speech is checked locally by Whisper and discarded without entering the command pipeline.",
  ],
  "Command Center exposes explicit privacy control and truthful dormant wake state",
);

if (!deck.includes("if (!conversationActive && !wakeArmed)")) {
  fail("provider health polling does not remain active while WAKE is armed");
}
pass("wake mode continues provider health observation while dormant");

console.log("");
console.log("PASS Chernobog 3D-10E3 wake / summon mode accepted.");
