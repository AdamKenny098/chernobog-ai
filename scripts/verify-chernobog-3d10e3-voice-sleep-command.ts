import fs from "node:fs";
import path from "node:path";

const repo = process.cwd();
let failed = false;

function read(relativePath: string): string {
  return fs.readFileSync(path.join(repo, relativePath), "utf8");
}

function pass(message: string): void {
  console.log(`PASS ${message}`);
}

function fail(message: string): void {
  failed = true;
  console.error(`FAIL ${message}`);
}

const deckPath = "components/chernobog-ui/sensory/SensoryControlDeck.tsx";
if (!fs.existsSync(path.join(repo, deckPath))) {
  fail("Sensory Control Deck exists");
} else {
  const deck = read(deckPath);

  const localCommandMarkers = [
    "SENSORY_OFF_COMMANDS",
    '"go to sleep"',
    '"stop listening"',
    '"sensory off"',
    "isSensoryOffCommand",
  ];
  if (localCommandMarkers.every((marker) => deck.includes(marker))) {
    pass("explicit local voice-off commands are defined");
  } else {
    fail("explicit local voice-off commands are defined");
  }

  const transcriptIntercept = deck.indexOf("if (isSensoryOffCommand(heard))");
  const commandDispatch = deck.indexOf("await runCommand(heard, transcript.turnId)");
  if (
    transcriptIntercept >= 0 &&
    commandDispatch >= 0 &&
    transcriptIntercept < commandDispatch &&
    deck.includes('sensoryOffRef.current?.("voice-command")')
  ) {
    pass("voice-off is intercepted before the normal /api/chat command path");
  } else {
    fail("voice-off is intercepted before the normal /api/chat command path");
  }

  const wakeIntercept = deck.indexOf(
    "if (wake.command && isSensoryOffCommand(wake.command))",
  );
  const wakeConversationTransfer = deck.indexOf(
    "conversationActiveRef.current = true;",
    wakeIntercept >= 0 ? wakeIntercept : 0,
  );
  if (
    wakeIntercept >= 0 &&
    wakeConversationTransfer > wakeIntercept
  ) {
    pass("wake-prefixed sleep command powers sensory mode down before CONVERSE starts");
  } else {
    fail("wake-prefixed sleep command powers sensory mode down before CONVERSE starts");
  }

  const safetyMarkers = [
    "turnSensoryOff",
    'reason: SensoryShutdownReason = "manual"',
    "await endConversation(reason)",
    "await disarmWakeMode(reason)",
    "await stopBargeInMonitor()",
    'await interruptPlayback("manual")',
    "setAutoSpeak(false)",
  ];
  if (safetyMarkers.every((marker) => deck.includes(marker))) {
    pass("voice sleep command releases conversation, wake, barge-in, and speech playback");
  } else {
    fail("voice sleep command releases conversation, wake, barge-in, and speech playback");
  }

  if (
    deck.includes("VOICE OFF") &&
    deck.includes("Chernobog, go to sleep")
  ) {
    pass("Sensory deck exposes the canonical spoken shutdown phrase");
  } else {
    fail("Sensory deck exposes the canonical spoken shutdown phrase");
  }
}

if (failed) {
  process.exit(1);
}

console.log("\nPASS Chernobog 3D-10E3.4 voice sleep command accepted.");
