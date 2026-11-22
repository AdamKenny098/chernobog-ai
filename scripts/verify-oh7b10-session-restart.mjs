/**
 * OH-7B10: verify real session persistence across full headless process restart.
 * Uses only a fresh disposable /tmp fixture. No production DB, systemd or cutover.
 */
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import { once } from "node:events";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fixture = fs.mkdtempSync(path.join(os.tmpdir(), "chernobog-oh7b10-"));
const data = path.join(fixture, "data");
const vault = path.join(data, "vault");
const runtime = path.join(data, "runtime");
const eventDir = path.join(data, "events");
const secret = randomBytes(40).toString("hex");
const sessionId = "oh7b10-" + randomBytes(8).toString("hex");
for (const dir of [data, vault, runtime, eventDir]) fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(data, ".oh7b3-fixture"), "", { flag: "wx" });
fs.writeFileSync(path.join(data, ".oh7b10-fixture"), "", { flag: "wx" });

const env = { ...process.env };
for (const key of Object.keys(env)) {
  if (key.startsWith("CHERNOBOG_") || key.startsWith("OBSIDIAN_") ||
      key.startsWith("OH5_") || key.startsWith("PA_") || key.startsWith("OH7B10_")) {
    delete env[key];
  }
}
Object.assign(env, {
  NODE_ENV: "test",
  CHERNOBOG_CORE_ROUTE_MODE: "legacy",
  CHERNOBOG_OH7B3_ISOLATED_TEST: "I_UNDERSTAND_ISOLATED",
  CHERNOBOG_OH7B3_GATEWAY_SECRET: secret,
  CHERNOBOG_DATA_DIR: data,
  CHERNOBOG_VAULT_PATH: vault,
  CHERNOBOG_VAULT_ROOT: vault,
  OBSIDIAN_VAULT_PATH: vault,
  CHERNOBOG_RUNTIME_DIR: runtime,
  CHERNOBOG_EVENT_LOG_PATH: path.join(eventDir, "events.jsonl"),
  OH7B10_SESSION_ID: sessionId,
});

async function choosePort() {
  const listener = net.createServer();
  listener.listen(0, "127.0.0.1");
  await once(listener, "listening");
  const address = listener.address();
  if (!address || typeof address === "string") throw new Error("Missing port");
  await new Promise((resolve, reject) => listener.close(error => error ? reject(error) : resolve()));
  return address.port;
}
const port = await choosePort();
env.CHERNOBOG_OH7B3_PORT = String(port);
const base = `http://127.0.0.1:${port}`;
let child;
let stderr = "";

async function launch() {
  stderr = "";
  const processHandle = spawn(process.execPath, ["--import", "tsx", "scripts/oh7b3-core-host.ts"], {
    cwd: repo, env, stdio: ["ignore", "ignore", "pipe"],
  });
  child = processHandle;
  processHandle.stderr.on("data", bytes => { stderr += String(bytes); });
  for (let i = 0; i < 80; i++) {
    if (processHandle.exitCode !== null) throw new Error("Host exited: " + stderr);
    try {
      const response = await fetch(base + "/health/live", { signal: AbortSignal.timeout(500) });
      if (response.ok) return;
    } catch { /* startup in progress */ }
    await new Promise(resolve => setTimeout(resolve, 125));
  }
  throw new Error("Timed out starting isolated host: " + stderr);
}

async function shutdown() {
  if (!child) return;
  const processHandle = child;
  child = undefined;
  if (processHandle.exitCode !== null) return;
  const exited = once(processHandle, "exit");
  processHandle.kill("SIGTERM");
  const timeout = new Promise(resolve => setTimeout(() => resolve(false), 5000));
  const completed = await Promise.race([exited.then(() => true), timeout]);
  if (!completed) {
    processHandle.kill("SIGKILL");
    await exited;
    throw new Error("Headless host did not shut down gracefully");
  }
}

async function inspectSession() {
  const unauthorized = await fetch(base + "/internal/session?sessionId=" + sessionId);
  assert.equal(unauthorized.status, 401);
  const response = await fetch(base + "/internal/session?sessionId=" + sessionId, {
    headers: { "x-chernobog-core-gateway": secret },
    signal: AbortSignal.timeout(10000),
  });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.sessionId, sessionId);
  assert.equal(body.route, "tools");
  assert.equal(body.tool, "oh7b10-persistence-test");
  assert.equal(body.toolSummary, "OH7B10 persisted session marker");
  return body;
}

try {
  await launch();
  console.log("PASS first isolated headless process started");

  const seeded = spawnSync(process.execPath, [
    "--import", "tsx", "scripts/oh7b10-seed-fixture-session.ts",
  ], { cwd: repo, env, encoding: "utf8", timeout: 30000 });
  assert.equal(seeded.status, 0, seeded.stderr || seeded.error?.message);
  assert.match(seeded.stdout, /PASS session persisted/);
  const first = await inspectSession();
  console.log("PASS real session state persisted and served by independent HTTP host");

  await shutdown();
  console.log("PASS first headless process stopped");
  assert.equal(fs.existsSync(path.join(data, "chernobog.db")), true);

  await launch();
  const second = await inspectSession();
  assert.equal(second.lastUpdatedAt, first.lastUpdatedAt);
  console.log("PASS real session restored after a complete headless process restart");
  console.log("OH-7B10 SESSION RESTART ACCEPTANCE: PASS (isolated fixture)");
} finally {
  try { await shutdown(); }
  finally { fs.rmSync(fixture, { recursive: true, force: true }); }
}
