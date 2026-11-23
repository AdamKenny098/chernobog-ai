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
  const port = address.port;
  await new Promise<void>((resolve, reject) => socket.close(error => error ? reject(error) : resolve()));
  return port;
}
const secret = "oh7b15-test-secret-minimum-32-character-value";

test("B15 bootstrap requires external B13 authority", () => {
  assert.throws(() => createOH7B15Bootstrap({
    authority: {} as never,
    handlers: {},
    port: 3192,
    gatewaySecret: secret,
    chat: async () => Response.json({ ok: true }),
    session: async () => Response.json({ ok: true }),
  }), /externally acquired B13 authority/);
});

test("B15 composition integrates all four accepted components without touching production", async () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "oh7b15-bootstrap-"));
  const prior = process.env.CHERNOBOG_DATA_DIR;
  process.env.CHERNOBOG_DATA_DIR = temp;
  fs.mkdirSync(path.join(temp, "scheduler"));
  fs.writeFileSync(path.join(temp, "scheduler", "jobs.json"),
    JSON.stringify({ schemaVersion: 1, jobs: [], schedules: [], runs: [] }));
  const events: string[] = [];
  let owner = true;
  const authority = {
    paths: { data: temp },
    guard: new OH7B13OwnershipGuard({
      assertStillOwned() { if (!owner) throw new Error("synthetic owner revoked"); },
    }),
    release() { events.push("release"); },
  };
  const port = await freePort();
  try {
    const supervisor = createOH7B15Bootstrap({
      authority, port, gatewaySecret: secret,
      handlers: {},
      chat: async () => Response.json({ route: "injected-chat" }),
      session: async () => Response.json({ route: "injected-session" }),
      pa: {
        initializePA: async () => { events.push("PA started"); },
        initializeAndroid: async () => { events.push("Android started"); },
        closePA: async () => { events.push("PA closed"); },
      },
    });
    assert.deepEqual(events, []);
    await supervisor.start();
    try {
      assert.equal(supervisor.phase, "running");
      assert.equal(supervisor.composition.health().operationalCoreReady, true);
      const headers = { "x-chernobog-core-gateway": secret };
      const response = await fetch(`http://127.0.0.1:${port}/internal/session`, { headers });
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), { route: "injected-session" });
      owner = false;
      assert.equal(supervisor.composition.health().operationalCoreReady, false);
      assert.equal((await fetch(`http://127.0.0.1:${port}/health/ready`)).status, 503);
    } finally {
      await supervisor.stop();
    }
    assert.deepEqual(events, ["PA started", "Android started", "PA closed", "release"]);
  } finally {
    if (prior === undefined) delete process.env.CHERNOBOG_DATA_DIR;
    else process.env.CHERNOBOG_DATA_DIR = prior;
    fs.rmSync(temp, { recursive: true, force: true });
  }
});

test("B15 refuses mismatched storage root before starting services", () => {
  assert.throws(() => createOH7B15Bootstrap({
    authority: {
      guard: new OH7B13OwnershipGuard({ assertStillOwned() {} }),
      paths: { data: "/tmp/oh7b15-other-root" },
      release() {},
    },
    handlers: {},
    port: 3192,
    gatewaySecret: secret,
    chat: async () => Response.json({ ok: true }),
    session: async () => Response.json({ ok: true }),
  }), /data path does not match/);
});

test("B15 rejects absent scheduler store instead of creating one on idle worker polling", () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "oh7b15-no-jobs-"));
  const prior = process.env.CHERNOBOG_DATA_DIR;
  process.env.CHERNOBOG_DATA_DIR = temp;
  try {
    assert.throws(() => createOH7B15Bootstrap({
      authority: {
        guard: new OH7B13OwnershipGuard({ assertStillOwned() {} }),
        paths: { data: temp },
        release() {},
      },
      handlers: {},
      port: 3192,
      gatewaySecret: secret,
      chat: async () => Response.json({ ok: true }),
      session: async () => Response.json({ ok: true }),
    }), /existing scheduler jobs.json required/);
    assert.equal(fs.existsSync(path.join(temp, "scheduler", "jobs.json")), false);
  } finally {
    if (prior === undefined) delete process.env.CHERNOBOG_DATA_DIR;
    else process.env.CHERNOBOG_DATA_DIR = prior;
    fs.rmSync(temp, { recursive: true, force: true });
  }
});
