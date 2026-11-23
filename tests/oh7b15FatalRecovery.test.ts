import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createServer } from "node:net";
import { once } from "node:events";
import { OH7B13OwnershipGuard } from "../lib/chernobog/coreHost/oh7b13OwnershipGuard";
import { createOH7B15Bootstrap } from "../lib/chernobog/coreHost/oh7b15Bootstrap";

async function freePort(): Promise<number> {
  const socket = createServer();
  socket.listen(0, "127.0.0.1");
  await once(socket, "listening");
  const address = socket.address();
  if (!address || typeof address === "string") throw new Error("No port");
  await new Promise<void>((resolve, reject) => socket.close(error => error ? reject(error) : resolve()));
  return address.port;
}

test("B15 fatal worker error notifies process host and drains before ownership release", {
  timeout: 5000,
}, async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "oh7b15-fatal-"));
  const prior = process.env.CHERNOBOG_DATA_DIR;
  process.env.CHERNOBOG_DATA_DIR = root;
  const schedulerRoot = path.join(root, "scheduler");
  fs.mkdirSync(schedulerRoot);
  const store = path.join(schedulerRoot, "jobs.json");
  fs.writeFileSync(store, JSON.stringify({
    schemaVersion: 1, jobs: [], schedules: [], runs: [],
  }));
  const events: string[] = [];
  let supervisor: ReturnType<typeof createOH7B15Bootstrap> | undefined;
  try {
    supervisor = createOH7B15Bootstrap({
      authority: {
        paths: { data: root },
        guard: new OH7B13OwnershipGuard({ assertStillOwned() {} }),
        release() { events.push("released"); },
      },
      gatewaySecret: "oh7b15-fatal-test-secret-32-bytes-minimum",
      port: await freePort(),
      handlers: {},
      onFatal(error) { events.push("fatal:" + error.name); },
      chat: async () => Response.json({ ok: true }),
      session: async () => Response.json({ ok: true }),
      pa: {
        initializePA: async () => {},
        initializeAndroid: async () => {},
        closePA: async () => { events.push("PA closed"); },
      },
    });
    await supervisor.start();
    assert.equal(supervisor.phase, "running");
    // This is an isolated test fixture; no live job store is involved.
    fs.writeFileSync(store, "{ malformed JSON");
    const deadline = Date.now() + 3500;
    while (!events.some(item => item.startsWith("fatal:")) && Date.now() < deadline) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    assert.ok(events.some(item => item.startsWith("fatal:")), "fatal observer must fire");
    await supervisor.stop();
    assert.equal(supervisor.phase, "stopped");
    assert.equal(events.filter(item => item === "released").length, 1);
    assert.ok(events.indexOf("PA closed") < events.indexOf("released"));
  } finally {
    await supervisor?.stop();
    if (prior === undefined) delete process.env.CHERNOBOG_DATA_DIR;
    else process.env.CHERNOBOG_DATA_DIR = prior;
    fs.rmSync(root, { recursive: true, force: true });
  }
});
