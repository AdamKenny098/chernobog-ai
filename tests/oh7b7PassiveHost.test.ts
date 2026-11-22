import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { test } from "node:test";

test("OH7B7 passive host is live but not operationally ready", async () => {
  const port = 43000 + Math.floor(Math.random() * 15000);
  const child = spawn(process.execPath, ["scripts/oh7b7-passive-host.mjs"], {
    cwd: process.cwd(),
    env: { ...process.env, CHERNOBOG_OH7B7_PORT: String(port), CHERNOBOG_CORE_ROUTE_MODE: "legacy" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  const failures: string[] = [];
  child.stderr?.on("data", chunk => failures.push(String(chunk)));
  try {
    const url = `http://127.0.0.1:${port}`;
    let live: Response | undefined;
    for (let attempt = 0; attempt < 50; attempt++) {
      if (child.exitCode !== null) throw new Error(`Host exited unexpectedly: ${failures.join("")}`);
      try {
        live = await fetch(`${url}/health/live`);
        break;
      } catch {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    assert.ok(live, `Host failed to start: ${failures.join("")}`);
    assert.equal(live.status, 200);
    assert.equal((await live.json() as { status: string }).status, "alive");

    const ready = await fetch(`${url}/health/ready`);
    assert.equal(ready.status, 503);
    const body = await ready.json() as { operationalCoreReady: boolean; operationalOwner: boolean; status: string };
    assert.equal(body.status, "passive-precutover");
    assert.equal(body.operationalCoreReady, false);
    assert.equal(body.operationalOwner, false);

    const commands = await fetch(`${url}/internal/chat`, { method: "POST", body: "{}" });
    assert.equal(commands.status, 405);
    const unknown = await fetch(`${url}/internal/chat`);
    assert.equal(unknown.status, 404);
  } finally {
    if (child.exitCode === null) {
      child.kill("SIGTERM");
      await once(child, "exit");
    }
  }
});

test("OH7B7 refuses to start when proxy cutover mode is requested", async () => {
  const child = spawn(process.execPath, ["scripts/oh7b7-passive-host.mjs"], {
    cwd: process.cwd(),
    env: { ...process.env, CHERNOBOG_CORE_ROUTE_MODE: "proxy" },
    stdio: ["ignore", "ignore", "pipe"],
  });
  const failures: string[] = [];
  child.stderr?.on("data", chunk => failures.push(String(chunk)));
  const [exitCode] = await once(child, "exit");
  assert.notEqual(exitCode, 0);
  assert.match(failures.join(""), /refuses legacy proxy mode/);
});
