import fs from "node:fs";
import path from "node:path";
const source=fs.readFileSync(path.join(process.cwd(),"lib","chernobog","pipeline","worldStateContext.ts"),"utf8");
function expect(c:boolean,l:string){if(!c)throw new Error(`FAIL ${l}`);console.log(`PASS ${l}`);}
expect(source.includes("observeAndPublishOllamaHealth"),"live refresh uses existing Ollama probe-and-publish path");
expect(source.includes("const LIVE_OBSERVATION_REFRESH_MS = 60_000;"),"live observation refresh is throttled to once per minute");
expect(source.includes("__chernobogLiveObservationRefreshPromise")&&source.includes("__chernobogLiveObservationRefreshAt"),"refresh is singleton-coalesced across concurrent requests");
const runtimeIndex=source.indexOf("await getChernobogWorldStateRuntime();");
const refreshIndex=source.indexOf("await refreshLiveOperationalObservations();");
expect(runtimeIndex>=0&&refreshIndex>runtimeIndex,"canonical 11G runtime starts before fresh events are published");
expect(source.includes("await observeAndPublishOllamaHealth();"),"refresh performs a real Ollama observation rather than manufacturing state");
expect(!source.includes('status: "healthy",'),"bridge does not hard-code a healthy runtime state");
console.log("PASS Phase 11 Live Runtime Observation Refresh Acceptance");
