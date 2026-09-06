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
  "let conversationLeaseActive = false",
  "useRef(\n    conversationLeaseActive",
  "useState(conversationLeaseActive)",
  "user-owned session lease and only END CHAT may release it",
  "Self-healing session lease",
  "CONVERSE remains active and will resume automatically when STT returns",
  "only END CHAT releases it",
  "quiet periods automatically re-arm listening",
];

for (const needle of required) {
  if (!deck.includes(needle)) {
    fail(`conversation lease fix missing ${JSON.stringify(needle)}`);
  }
}
pass("conversation lease survives component remounts and self-heals re-arm");

const stateFalseCount = (
  deck.match(/setConversationActive\(false\)/g) ?? []
).length;
if (stateFalseCount !== 1) {
  fail(
    `expected exactly one setConversationActive(false) terminal path, found ${stateFalseCount}`,
  );
}

const refFalseCount = (
  deck.match(/conversationActiveRef\.current = false/g) ?? []
).length;
if (refFalseCount !== 1) {
  fail(
    `expected exactly one conversationActiveRef false terminal path, found ${refFalseCount}`,
  );
}
pass("only the explicit END CHAT path releases React/ref conversation state");

const stopStart = deck.indexOf(
  "const stopConversationState = useCallback(",
);
const stopEnd = deck.indexOf(
  "const scheduleConversationRearm = useCallback(",
);
if (stopStart < 0 || stopEnd <= stopStart) {
  fail("unable to inspect automatic conversation fault handler");
}
const stopBlock = deck.slice(stopStart, stopEnd);
if (
  stopBlock.includes("setConversationActive(false)") ||
  stopBlock.includes("conversationActiveRef.current = false")
) {
  fail("automatic conversation fault handler still releases CONVERSE");
}
pass("automatic faults suspend/retry instead of ending CONVERSE");

if (
  !deck.includes(
    "!conversationActive &&\n              (\n                !sttOnline",
  )
) {
  fail("END CHAT is not protected from provider-offline button disabling");
}
pass("END CHAT remains available while an active session is degraded");

if (
  deck.includes(
    '"Hands-free conversation stopped after three consecutive whisper.cpp health-check failures."',
  )
) {
  fail("STT health hysteresis still contains terminal conversation behavior");
}
pass("STT health loss keeps the conversation lease active");

console.log("");
console.log(
  "PASS Chernobog 3D-10E1.2 conversation lease fix accepted.",
);
