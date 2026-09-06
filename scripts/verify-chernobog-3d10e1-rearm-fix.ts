import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const deckPath = path.join(
  root,
  "components/chernobog-ui/sensory/SensoryControlDeck.tsx",
);

function fail(message: string): never {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

function pass(message: string): void {
  console.log(`PASS ${message}`);
}

if (!fs.existsSync(deckPath)) {
  fail("SensoryControlDeck.tsx exists");
}

const deck = fs.readFileSync(deckPath, "utf8");

const required = [
  "conversationRearmAttemptsRef",
  "sttHealthFailuresRef",
  "scheduleConversationRearm(350)",
  "microphone-rearm-exhausted",
  "quiet periods automatically re-arm listening",
  "three consecutive whisper.cpp health-check failures",
];

for (const needle of required) {
  if (!deck.includes(needle)) {
    fail(`re-arm fix missing ${JSON.stringify(needle)}`);
  }
}
pass("conversation re-arm retry and health hysteresis are present");

if (deck.includes('stopConversationState("inactivity-timeout")')) {
  fail("quiet no-speech window still terminates CONVERSE");
}
pass("quiet no-speech windows re-arm instead of terminating CONVERSE");

if (!deck.includes('await startListening("conversation")')) {
  fail("conversation re-arm does not reacquire the microphone");
}
pass("post-turn re-arm reacquires the microphone");

if (!deck.includes("stoppingRef.current")) {
  fail("re-arm path does not guard recorder shutdown races");
}
pass("re-arm waits through recorder shutdown races");

console.log("");
console.log(
  "PASS Chernobog 3D-10E1.1 conversation re-arm fix accepted.",
);
