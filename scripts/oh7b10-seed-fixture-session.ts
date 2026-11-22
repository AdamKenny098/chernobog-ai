/**
 * OH-7B10: seed a disposable OH-7B3 session using the real session store.
 * Not an API endpoint. Requires explicit temporary fixture markers.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { getSessionContext, saveSessionContext } from "../lib/chernobog/session/store";

const data = process.env.CHERNOBOG_DATA_DIR;
const sessionId = process.env.OH7B10_SESSION_ID;
if (
  process.env.CHERNOBOG_OH7B3_ISOLATED_TEST !== "I_UNDERSTAND_ISOLATED" ||
  !data || !path.isAbsolute(data) ||
  !sessionId || !/^oh7b10-[a-f0-9]{16}$/.test(sessionId)
) {
  throw new Error("OH7B10 seed denied: marked isolated fixture and generated session ID required");
}
const root = fs.realpathSync(data);
const temporaryRoot = fs.realpathSync(os.tmpdir());
if (!root.startsWith(temporaryRoot + path.sep) ||
    !fs.existsSync(path.join(root, ".oh7b3-fixture")) ||
    !fs.existsSync(path.join(root, ".oh7b10-fixture"))) {
  throw new Error("OH7B10 seed denied: missing disposable fixture markers");
}
const session = getSessionContext(sessionId);
session.lastRoute = "tools";
session.lastTool = { name: "oh7b10-persistence-test" };
session.lastToolResult = { ok: true, summary: "OH7B10 persisted session marker" };
saveSessionContext(session);
console.log("PASS session persisted using real Chernobog session store");
