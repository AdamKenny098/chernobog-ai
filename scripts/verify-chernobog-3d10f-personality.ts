import fs from "node:fs";
import path from "node:path";
import { buildSpokenReply } from "../lib/chernobog/personality/spokenReply";

const root = process.cwd();
let failed = false;

function read(relativePath: string): string {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function pass(message: string): void {
  console.log(`PASS ${message}`);
}

function fail(message: string): void {
  failed = true;
  console.error(`FAIL ${message}`);
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
    fail(`${message}; missing ${missing.map((value) => JSON.stringify(value)).join(", ")}`);
  } else {
    pass(message);
  }
}

console.log("Chernobog 3D-10F — Conversational Identity Acceptance");
console.log("=====================================================");

const requiredFiles = [
  "lib/chernobog/personality/profile.ts",
  "lib/chernobog/personality/spokenReply.ts",
  "lib/chernobog/personality/index.ts",
];

if (requiredFiles.every((file) => fs.existsSync(path.join(root, file)))) {
  pass("personality subsystem files exist");
} else {
  fail("personality subsystem files exist");
}

requireIncludes(
  "lib/chernobog/personality/profile.ts",
  [
    "calm, formidable, observant",
    "long-term technical counterpart",
    "Do not perform politeness theatre",
    "Dry wit is permitted",
    "VOICE REGISTER",
    "one to three short sentences",
    "TEXT REGISTER",
  ],
  "core identity and distinct text/voice registers are explicit",
);

requireIncludes(
  "lib/chernobog/router.ts",
  [
    "buildChernobogPersonalityPrompt",
    "responseMode?: ChernobogResponseMode",
    "buildChernobogPersonalityPrompt(",
    "real personal AI system",
  ],
  "routed LLM responses receive the Chernobog identity and modality",
);

requireIncludes(
  "lib/chernobog/pipeline/runCommand.ts",
  [
    "responseMode?: ChernobogResponseMode",
    "responseMode: options.responseMode ?? \"text\"",
  ],
  "command pipeline carries response modality to the response layer",
);

requireIncludes(
  "app/api/chat/route.ts",
  [
    "responseMode",
    "buildSpokenReply",
    "spokenReply",
  ],
  "chat API returns a dedicated spoken rendering for voice turns",
);

requireIncludes(
  "components/chernobog-ui/sensory/SensoryControlDeck.tsx",
  [
    "spokenReply?: string",
    'responseMode: "voice"',
    "payload.spokenReply?.trim()",
  ],
  "sensory conversation requests voice register and speaks the dedicated rendering",
);

const short = buildSpokenReply("Done. Everything held.");
if (short === "Done. Everything held.") {
  pass("short spoken replies remain intact");
} else {
  fail(`short spoken reply changed unexpectedly: ${short}`);
}

const markdown = buildSpokenReply(
  "## Result\nSee [documentation](https://example.com) and `status`.",
);
if (
  !markdown.includes("http") &&
  !markdown.includes("##") &&
  markdown.includes("documentation")
) {
  pass("spoken rendering strips markdown and raw URLs");
} else {
  fail(`spoken markdown sanitization failed: ${markdown}`);
}

const long = buildSpokenReply(
  `${"This is a detailed operational sentence. ".repeat(30)}\n\n\`\`\`ts\nconst x = 1;\n\`\`\``,
  260,
);
if (
  long.length < 360 &&
  long.includes("The full result is on screen.") &&
  !long.includes("const x")
) {
  pass("long/code-heavy replies are bounded for speech while preserving full screen output");
} else {
  fail(`spoken reply bounding failed: ${long}`);
}

if (failed) {
  process.exit(1);
}

console.log("\nPASS Chernobog 3D-10F conversational identity accepted.");
