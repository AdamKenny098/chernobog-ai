/**
 * OH-7B9: direct HTTP smoke test of real extracted chat/session services.
 * Uses a disposable temp-root fixture and the EXISTING OH-7B3 isolated host.
 * Does not load systemd environment, production databases, or proxy settings.
 *
 * Optional OH7B9_EXERCISE_MODEL=1 runs a real "Hello" through OH-4/Ollama.
 * Without opt-in, only the real session handler and chat input validation run.
 */
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import { once } from "node:events";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import net from "node:net";

const root = path.resolve(import.meta.dirname ?? path.dirname(new URL(import.meta.url).pathname), "..");
const fixture = fs.mkdtempSync(path.join(os.tmpdir(), "chernobog-oh7b9-"));
const secret = randomBytes(40).toString("hex");
const mkdir = p => fs.mkdirSync(p, { recursive: true });

async function freePort() {
  const server = net.createServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("No TCP address");
  const port = address.port;
  await new Promise((resolve, reject) => server.close(err => err ? reject(err) : resolve()));
  return port;
}

const port = await freePort();
const data = path.join(fixture, "data");
const vault = path.join(data, "vault");
const runtime = path.join(data, "runtime");
const events = path.join(data, "events");
const jobs = path.join(data, "jobs");
for (const dir of [data, vault, runtime, events, jobs]) mkdir(dir);
fs.writeFileSync(path.join(data, ".oh7b3-fixture"), "", { flag: "wx" });
fs.writeFileSync(path.join(jobs, ".oh7b6-fixture"), "", { flag: "wx" });

const env = { ...process.env };
// Strip inherited production paths and credentials before starting the fixture.
for (const key of Object.keys(env)) {
  if (key.startsWith("CHERNOBOG_") || key.startsWith("OBSIDIAN_") ||
      key.startsWith("OH5_") || key.startsWith("PA_")) {
    delete env[key];
  }
}
Object.assign(env, {
  NODE_ENV: "test",
  CHERNOBOG_CORE_ROUTE_MODE: "legacy",
  CHERNOBOG_OH7B3_ISOLATED_TEST: "I_UNDERSTAND_ISOLATED",
  CHERNOBOG_OH7B13_ISOLATED_JOBS: "1",
  CHERNOBOG_OH7B3_PORT: String(port),
  CHERNOBOG_OH7B3_GATEWAY_SECRET: secret,
  CHERNOBOG_DATA_DIR: data,
  CHERNOBOG_VAULT_PATH: vault,
  CHERNOBOG_VAULT_ROOT: vault,
  OBSIDIAN_VAULT_PATH: vault,
  CHERNOBOG_RUNTIME_DIR: runtime,
  CHERNOBOG_EVENT_LOG_PATH: path.join(events, "events.jsonl"),
  // Avoid carrying owner tokens from a developer's shell.
});

let child;
const errors = [];
const url = `http://127.0.0.1:${port}`;
async function request(endpoint, options = {}) {
  return fetch(url + endpoint, {
    signal: AbortSignal.timeout(15_000),
    ...options,
    headers: { "x-chernobog-core-gateway": secret, ...options.headers },
  });
}
try {
  child = spawn(process.execPath, ["--import", "tsx", "scripts/oh7b3-core-host.ts"], {
    cwd: root,
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stderr.on("data", chunk => errors.push(String(chunk)));
  let live;
  for (let i = 0; i < 80; i++) {
    if (child.exitCode !== null) throw new Error("Headless host exited: " + errors.join(""));
    try {
      live = await fetch(url + "/health/live", { signal: AbortSignal.timeout(500) });
      break;
    } catch {
      await new Promise(resolve => setTimeout(resolve, 125));
    }
  }
  assert.ok(live, "Headless process did not listen: " + errors.join(""));
  assert.equal(live.status, 200);
  console.log("PASS isolated headless process started and accepted HTTP");
  const readiness = await fetch(url + "/health/ready");
  assert.equal(readiness.status, 200);
  const snapshot = await readiness.json();
  assert.equal(snapshot.fixtureOperationalReady, true);
  assert.equal(snapshot.operationalOwner, false);
  assert.equal(snapshot.background.components.scheduler, "active");
  assert.equal(snapshot.background.components.workers, "active");
  console.log("PASS isolated host started real OH-3 scheduler and worker adapters");

  const denied = await fetch(url + "/internal/session?sessionId=oh7b9");
  assert.equal(denied.status, 401);
  console.log("PASS internal endpoint rejects missing gateway authentication");

  const session = await request("/internal/session?sessionId=oh7b9");
  assert.equal(session.status, 200, await session.text().catch(() => ""));
  // Request a second time to inspect the response without consuming a body in the assertion.
  const sessionBody = await (await request("/internal/session?sessionId=oh7b9")).json();
  assert.equal(sessionBody.sessionId, "oh7b9");
  console.log("PASS real extracted session handler responds over authenticated loopback HTTP");

  const badChat = await request("/internal/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ sessionId: "oh7b9", message: "" }),
  });
  assert.equal(badChat.status, 400);
  const validation = await badChat.json();
  assert.equal(validation.error, "Message is required.");
  console.log("PASS real extracted chat handler validates requests");

  if (process.env.OH7B9_EXERCISE_MODEL === "1") {
    const hello = await request("/internal/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sessionId: "oh7b9", message: "Hello." }),
    });
    const body = await hello.text();
    assert.equal(hello.status, 200, `OH-4 command pipeline returned ${hello.status}: ${body.slice(0, 500)}`);
    console.log("PASS real OH-4 chat pipeline returned HTTP 200 in isolated storage");
  } else {
    console.log("SKIP live OH-4 model execution (set OH7B9_EXERCISE_MODEL=1 to opt in)");
  }
  // OH-7B13: prove the real HTTP host refuses all authenticated work
  // when its fixture owner token is stolen, even if subsequently restored.
  const ownerLock = path.join(runtime, "oh7b2-core-owner.lock");
  const originalLease = fs.readFileSync(ownerLock, "utf8");
  try {
    const payload = JSON.parse(originalLease);
    fs.writeFileSync(ownerLock, JSON.stringify({ ...payload, token: "revoked-fixture-token" }));
    const refused = await request("/internal/session?sessionId=oh7b9");
    assert.equal(refused.status, 503);
    assert.equal((await refused.json()).error, "core_ownership_lost");
    fs.writeFileSync(ownerLock, originalLease);
    const stillRefused = await request("/internal/session?sessionId=oh7b9");
    assert.equal(stillRefused.status, 503);
    console.log("PASS real HTTP host latches lease revocation and refuses future requests");
    assert.equal((await fetch(url + "/health/ready")).status, 503);
  } finally {
    fs.writeFileSync(ownerLock, originalLease);
  }
  console.log("OH-7B9 ISOLATED HTTP SMOKE: PASS");
} finally {
  if (child && child.exitCode === null) {
    child.kill("SIGTERM");
    await Promise.race([
      once(child, "exit"),
      new Promise(resolve => setTimeout(resolve, 5_000)),
    ]);
    if (child.exitCode === null) child.kill("SIGKILL");
  }
  fs.rmSync(fixture, { recursive: true, force: true });
}
