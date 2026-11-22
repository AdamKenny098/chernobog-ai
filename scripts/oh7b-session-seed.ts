/** OH-7B isolated session persistence fixture; never run against live data. */
import { getSessionContext, saveSessionContext } from "../lib/chernobog/session/store";
const id = process.argv[2];
const root = process.env.CHERNOBOG_DATA_DIR;
if (!id?.startsWith("oh7b-fixture-") || !root || !process.env.CHERNOBOG_OH7B3_ISOLATED_TEST) {
  throw new Error("OH-7B fixture marker, isolated mode, and session id required");
}
const session = getSessionContext(id);
saveSessionContext(session);
process.stdout.write(JSON.stringify({ sessionId: session.sessionId, lastUpdatedAt: session.lastUpdatedAt }));
