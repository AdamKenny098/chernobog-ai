/** OH-7B3 experimental headless chat/session host.
 * This host is deliberately restricted to an explicit isolated data fixture.
 * Production cutover needs further migrations, especially PA/event ownership.
 */
import http from "node:http";
import { existsSync, realpathSync } from "node:fs";
import { acquireProspectiveCoreLease, resolveStoragePaths } from "./oh7b2-storage-boundary.mjs";
import { OH7B13OwnershipGuard } from "../lib/chernobog/coreHost/oh7b13OwnershipGuard";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const host = "127.0.0.1";
const port = Number(process.env.CHERNOBOG_OH7B3_PORT ?? "3188");
const isolatedRoot = process.env.CHERNOBOG_DATA_DIR?.trim();
const permission = process.env.CHERNOBOG_OH7B3_ISOLATED_TEST === "I_UNDERSTAND_ISOLATED";
const secret = process.env.CHERNOBOG_OH7B3_GATEWAY_SECRET ?? "";

if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error("Invalid OH7B3 port");
if (!permission || !isolatedRoot || !path.isAbsolute(isolatedRoot)) {
  throw new Error("OH7B3 requires explicit isolated test permission and absolute CHERNOBOG_DATA_DIR");
}
const chosen = path.resolve(isolatedRoot);
const productionData = path.join(repoRoot, "data");
if (!existsSync(chosen) || !existsSync(path.join(chosen, ".oh7b3-fixture"))) {
  throw new Error("OH7B3 fixture directory and marker must exist; no auto-create");
}
if (realpathSync(chosen) === realpathSync(productionData) || chosen === repoRoot || chosen.startsWith(repoRoot + path.sep)) {
  throw new Error("OH7B3 refuses repository-owned data directories");
}
if (secret.length < 32) throw new Error("OH7B3 requires an isolated-test secret >=32 characters");
for (const envName of ["CHERNOBOG_VAULT_PATH", "CHERNOBOG_EVENT_LOG_PATH", "CHERNOBOG_RUNTIME_DIR"]) {
  const configured = process.env[envName]?.trim();
  if (!configured || !path.isAbsolute(configured) || !path.resolve(configured).startsWith(chosen + path.sep)) {
    throw new Error(`OH7B3 isolated host requires ${envName} inside fixture directory`);
  }
}

async function startHeadlessHost(): Promise<void> {
  // Intentional lazy loading: no SQLite/database import during preflight validation.
  const { handleChatRequest } = await import("../lib/chernobog/coreHost/chatService");
  const { handleSessionRequest } = await import("../lib/chernobog/coreHost/sessionService");
  // This is a disposable fixture lease, NOT the production OH-7B12 grant.
  // Production remains inaccessible under the fixture-root preflight above.
  const fixturePaths = resolveStoragePaths(repoRoot, process.env);
  const fixtureLease = acquireProspectiveCoreLease(fixturePaths, {
    explicitOptIn: true,
    legacyHostVerifiedStopped: true, // only for the marked fixture; never a production assertion
  });
  const guard = new OH7B13OwnershipGuard({
    assertStillOwned: () => fixtureLease.assertHeld(),
  });
  // Optional OH-7B13 operational composition. Never enabled for production.
  // Both the host and OH7B6 jobs require independently marked disposable roots.
  const jobsEnabled = process.env.CHERNOBOG_OH7B13_ISOLATED_JOBS === "1";
  let core: import("../lib/chernobog/coreHost/oh7b6Composition").OH7B6CoreComposition | undefined;
  if (jobsEnabled) {
    const { OH7B6IsolatedJobs } = await import("../lib/chernobog/coreHost/oh7b6IsolatedJobs");
    const { OH7B6CoreComposition } = await import("../lib/chernobog/coreHost/oh7b6Composition");
    const jobs = new OH7B6IsolatedJobs({
      fixtureRoot: path.join(chosen, "jobs"),
      hasOwnership: guard.hasOwnership,
      handlers: {}, // fail closed for every unregistered job kind
    });
    core = new OH7B6CoreComposition({
      mode: "isolated-test",
      hasOwnership: guard.hasOwnership,
      adapters: jobs.adapters,
      chat: guard.guardRequest(handleChatRequest),
      session: guard.guardRequest(handleSessionRequest),
    });
    await core.start();
  }
  const MAX_BYTES = 128 * 1024;
  let closing = false;

  const server = http.createServer(async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    try {
      if (closing) {res.writeHead(503);res.end();return;}
      if (req.url === "/health/live" && req.method === "GET") {
        res.writeHead(200, {"Content-Type":"application/json"});
        res.end(JSON.stringify({ok:true,mode:"isolated-test",operationalOwner:false}));return;
      }
      if (req.url === "/health/ready" && req.method === "GET") {
        const health = core?.health();
        const ready = health?.operationalCoreReady === true;
        res.writeHead(ready ? 200 : 503, {"Content-Type":"application/json","Cache-Control":"no-store"});
        res.end(JSON.stringify({ok:ready,mode:"isolated-test",operationalOwner:false,
          fixtureOperationalReady:ready,background:health?.background ?? null}));return;
      }
      if (req.headers["x-chernobog-core-gateway"] !== secret) {
        res.writeHead(401);res.end("Unauthorized");return;
      }
      if (!guard.hasOwnership()) {
        res.writeHead(503, {"Content-Type":"application/json","Cache-Control":"no-store"});
        res.end(JSON.stringify({error:"core_ownership_lost"}));return;
      }
      const url = new URL(req.url ?? "/", `http://${host}:${port}`);
      if (!((url.pathname === "/internal/mobile/heartbeat" && (req.method === "GET" || req.method === "POST")) ||
            (url.pathname.startsWith("/internal/mobile/reminders/") && ["claim", "authorize", "ack"].includes(url.pathname.split("/").at(-1) ?? "") && req.method === "POST") ||
            (url.pathname === "/internal/chat" && req.method === "POST") ||
            (url.pathname === "/internal/session" && req.method === "GET"))) {
        res.writeHead(404);res.end("Not found");return;
      }
      const chunks: Buffer[] = [];
      let size = 0;
      for await (const part of req) {
        const chunk = Buffer.isBuffer(part) ? part : Buffer.from(part);
        size += chunk.byteLength;
        if (size > MAX_BYTES) {res.writeHead(413);res.end("Payload too large");return;}
        chunks.push(chunk);
      }
      const headers = new Headers();
      for (const [key,value] of Object.entries(req.headers)) {
        if (key === "x-chernobog-core-gateway") continue;
        if (value !== undefined) headers.set(key, Array.isArray(value) ? value.join(",") : value);
      }
      const request = new Request(url, {method:req.method,headers,
        ...(req.method === "POST" ? {body:Buffer.concat(chunks).toString("utf8")} : {})});
      let reply: Response;
      if (url.pathname === "/internal/mobile/heartbeat") {
        const mobile = await import("../lib/chernobog/coreHost/mobileHandlers");
        reply = req.method === "GET" ? await mobile.handleMobileHeartbeatGet(request) : await mobile.handleMobileHeartbeatPost(request);
      } else if (url.pathname.startsWith("/internal/mobile/reminders/")) {
        const mobile = await import("../lib/chernobog/coreHost/mobileHandlers");
        if (url.pathname.endsWith("/claim")) reply = await mobile.handleMobileReminderClaim(request);
        else if (url.pathname.endsWith("/authorize")) reply = await mobile.handleMobileReminderAuthorize(request);
        else reply = await mobile.handleMobileReminderAck(request);
      } else {
        reply = core
          ? await core.dispatch(url.pathname as "/internal/chat" | "/internal/session", request)
          : url.pathname === "/internal/chat"
            ? await guard.guardRequest(handleChatRequest)(request)
            : await guard.guardRequest(handleSessionRequest)(request);
      }
      res.writeHead(reply.status, {"Content-Type":reply.headers.get("content-type") || "application/json","Cache-Control":"no-store"});
      res.end(Buffer.from(await reply.arrayBuffer()));
    } catch (error) {
      console.error("OH7B3 isolated host request failed",error);
      res.writeHead(500,{"Content-Type":"application/json"});res.end(JSON.stringify({error:"isolated_host_failed"}));
    }
  });
  server.listen(port,host,()=>console.log(`OH-7B3 isolated host listening at http://${host}:${port}`));
  for(const sig of ["SIGINT","SIGTERM"] as const){process.on(sig,()=>{
    if(closing)return;
    closing=true;
    server.close(async ()=>{
      try {
        await core?.stop();
        fixtureLease.release();
      } catch(error) {
        console.error("OH-7B3 isolated shutdown failed",error);
        process.exitCode=1;
      }
      console.log("OH-7B3 host stopped");
    });
  });}
}

void startHeadlessHost().catch((error: unknown) => {
  console.error("OH7B3 headless host failed to initialize", error);
  process.exitCode = 1;
});
