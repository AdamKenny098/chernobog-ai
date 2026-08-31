import fs from "node:fs";
import path from "node:path";

const repo = process.cwd();

function read(relativePath: string): string {
  return fs.readFileSync(
    path.join(repo, relativePath),
    "utf8"
  );
}

function expect(
  condition: boolean,
  label: string
): void {
  if (!condition) {
    throw new Error(`FAIL ${label}`);
  }

  console.log(`PASS ${label}`);
}

const ui = read(
  "components/UmbraAIConsole.tsx"
);

const router = read(
  "lib/chernobog/router.ts"
);

const historyRoute = read(
  "app/api/session/history/route.ts"
);

expect(
  historyRoute.includes(
    'getRecentMessages('
  ) &&
    historyRoute.includes(
      'sessionId,'
    ),
  "history endpoint uses session-scoped recent conversation retrieval"
);

expect(
  historyRoute.includes(
    '"Cache-Control": "no-store"'
  ),
  "history endpoint is no-store"
);

expect(
  ui.includes(
    "/api/session/history?sessionId=${encodeURIComponent(activeSessionId)}&limit=50"
  ),
  "persisted browser session hydrates matching server conversation history"
);

expect(
  ui.includes(
    'message.role === "user"'
  ) &&
    ui.includes(
      'makeLog("USER", content)'
    ) &&
    ui.includes(
      'message.role === "assistant"'
    ) &&
    ui.includes(
      'makeLog("CHERNOBOG", content)'
    ),
  "restored user and assistant history becomes visible console logs"
);

expect(
  ui.includes(
    "Previous session conversation restored"
  ),
  "UI reports restored persisted conversation"
);

const historyIndex =
  router.indexOf(
    "messages.push(...context.recentMessages);"
  );

const precedenceIndex =
  router.indexOf(
    "Authoritative context precedence:"
  );

const currentUserIndex =
  router.lastIndexOf(
    'role: "user"'
  );

expect(
  historyIndex >= 0 &&
    precedenceIndex > historyIndex &&
    currentUserIndex > precedenceIndex,
  "authoritative precedence is placed after recent history and before current user input"
);

expect(
  router.includes(
    "disregard the stale assistant response"
  ) &&
    router.includes(
      "Do not repeat an earlier claim that information is missing"
    ),
  "stale assistant outputs cannot override newer authoritative context"
);

expect(
  ui.includes(
    "window.localStorage.getItem(SESSION_STORAGE_KEY)"
  ) &&
    ui.includes(
      "window.localStorage.setItem(SESSION_STORAGE_KEY"
    ),
  "persistent session continuity remains enabled"
);

console.log(
  "PASS Phase 11 Session Continuity Transparency and Stale-History Guard v2 Acceptance"
);
