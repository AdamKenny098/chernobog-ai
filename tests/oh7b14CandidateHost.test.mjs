import assert from "node:assert/strict";
import { test } from "node:test";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:net";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const entry = path.join(root, "scripts/oh7b14-candidate-host.mjs");
const unit = path.join(root, "deploy/oh7/chernobog-core-candidate.service");

async function freePort() {
  const server = createServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Unexpected listener address");
  const port = address.port;
  await new Promise((resolve, reject) => server.close((err) => err ? reject(err) : resolve()));
  return port;
}

async function startedCandidate(port) {
  const child = spawn(process.execPath, [entry], {
    cwd: root,
    env: {
      PATH: process.env.PATH,
      HOME: process.env.HOME,
      CHERNOBOG_OH7B14_PORT: String(port),
      CHERNOBOG_CORE_ROUTE_MODE: "legacy",
      CHERNOBOG_STORAGE_ROLE: "legacy",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  const output = [];
  child.stderr.on("data", (chunk) => output.push(chunk.toString()));
  await Promise.race([
    new Promise((resolve, reject) => {
      child.stdout.on("data", (chunk) => {
        if (chunk.toString().includes("candidate alive")) resolve();
      });
      child.once("exit", (code) => reject(new Error(`Candidate exited ${code}: ${output.join("")}`)));
    }),
    new Promise((_, reject) => setTimeout(() => reject(new Error("Candidate startup timeout")), 5000)),
  ]);
  return child;
}

test("OH7B14 candidate has liveness only, denies all operational endpoints", async () => {
  const port = await freePort();
  let child;
  try {
    child = await startedCandidate(port);
    const base = `http://127.0.0.1:${port}`;
    const live = await fetch(base + "/health/live");
    assert.equal(live.status, 200);
    assert.deepEqual(await live.json(), {
      ok: true, mode: "oh7b14-candidate",
      operationalOwner: false, operationalCoreReady: false,
    });
    const ready = await fetch(base + "/health/ready");
    assert.equal(ready.status, 503);
    const body = await ready.json();
    assert.equal(body.activationAuthorized, false);
    assert.equal(body.operationalCoreReady, false);
    assert.equal((await fetch(base + "/internal/session")).status, 404);
    assert.equal((await fetch(base + "/internal/chat", { method: "POST" })).status, 405);
  } finally {
    if (child && child.exitCode === null) {
      child.kill("SIGTERM");
      await once(child, "exit");
    }
  }
});

test("OH7B14 candidate rejects attempts to turn on operational role", async () => {
  for (const override of [
    { CHERNOBOG_STORAGE_ROLE: "core" },
    { CHERNOBOG_CORE_ROUTE_MODE: "proxy" },
    { CHERNOBOG_OH7B14_ACTIVATE: "1" },
  ]) {
    const child = spawn(process.execPath, [entry], {
      cwd: root,
      env: { PATH: process.env.PATH, HOME: process.env.HOME,
        CHERNOBOG_OH7B14_PORT: "3191",
        CHERNOBOG_STORAGE_ROLE: "legacy",
        CHERNOBOG_CORE_ROUTE_MODE: "legacy",
        ...override },
      stdio: "ignore",
    });
    const [code] = await once(child, "exit");
    assert.notEqual(code, 0, "activation attempt must fail process initialization");
  }
});

test("OH7B14 systemd template cannot be enabled and grants no shared storage", async () => {
  const text = await readFile(unit, "utf8");
  assert.match(text, /User=omen/);
  assert.match(text, /ProtectSystem=strict/);
  assert.doesNotMatch(text, /^\[Install\]$/m);
  assert.doesNotMatch(text, /^EnvironmentFile=/m);
  assert.doesNotMatch(text, /^ReadWritePaths=/m);
  assert.doesNotMatch(text, /^SupplementaryGroups=/m);
  assert.doesNotMatch(text, /^ExecStart=.*oh7b3-core-host/m);
});
