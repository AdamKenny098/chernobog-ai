import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
const repo=process.cwd(); let failures=0;
const posix=p=>p.split(path.sep).join("/");
function pass(m){console.log("PASS "+m)} function fail(m){failures++;console.error("FAIL "+m)}
function exists(r){return fs.existsSync(path.join(repo,r))} function read(r){return fs.readFileSync(path.join(repo,r),"utf8")}
function walk(d){const a=path.join(repo,d);if(!fs.existsSync(a))return[];const o=[];for(const e of fs.readdirSync(a,{withFileTypes:true})){const p=path.join(a,e.name);e.isDirectory()?o.push(...walk(posix(path.relative(repo,p)))):o.push(posix(path.relative(repo,p)));}return o}
console.log("============================================================");
console.log("CHERNOBOG OH-1D TRUST BOUNDARY VERIFIER");
console.log("============================================================");
for(const p of [
 "packages/trust/package.json","packages/trust/README.md","packages/trust/src/index.ts","packages/trust/src/publicContracts.ts",
 "packages/trust/src/governance/policyBridge.ts","packages/trust/src/governance/runtimeGovernance.ts","packages/trust/src/governance/status.ts",
 "packages/trust/src/execution/approval.ts","packages/trust/src/execution/riskPolicy.ts",
 "packages/trust/src/trust/types.ts","packages/trust/src/vault/trustActionTypes.ts","packages/trust/src/vault/trustDecision.ts",
 "packages/trust/src/vault/trustAuditLog.ts","packages/trust/src/vault/trustPolicyManifest.ts","packages/trust/src/vault/toolPermissionRegistry.ts"
]) exists(p)?pass(`required file exists: ${p}`):fail(`missing required file: ${p}`);
const ts=JSON.parse(read("tsconfig.json")), paths=ts.compilerOptions?.paths??{};
paths["@chernobog/trust"]?.[0]==="./packages/trust/src/index.ts"?pass("@chernobog/trust alias resolves to package index"):fail("@chernobog/trust alias missing/incorrect");
paths["@chernobog/trust/*"]?.[0]==="./packages/trust/src/*"?pass("@chernobog/trust/* alias resolves to package modules"):fail("@chernobog/trust/* alias missing/incorrect");
const contract=read("packages/contracts/src/trust.ts");
for(const n of ["TrustAction","TrustDecision","ApprovalRequirement","TrustPolicy","TrustAuditEvent"]) contract.includes(n)?pass(`public trust contract declared: ${n}`):fail(`public trust contract missing: ${n}`);
const pub=read("packages/trust/src/publicContracts.ts");
pub.includes("@chernobog/contracts/trust")?pass("Trust package exposes cross-domain contracts from contracts package"):fail("Trust package does not expose contracts package trust types");
const gov=["packages/trust/src/governance/policyBridge.ts","packages/trust/src/governance/runtimeGovernance.ts","packages/trust/src/governance/status.ts"].map(read).join("\n");
(/most-restrictive-wins|execution-approval-required|disposition/.test(gov))?pass("accepted restrictive governance semantics are present in authoritative package"):fail("governance semantics markers missing from authoritative package");
for(const p of ["packages/trust/src/execution/approval.ts","packages/trust/src/execution/riskPolicy.ts"]) read(p).length>20?pass(`approval/risk implementation preserved: ${p}`):fail(`approval/risk implementation empty: ${p}`);
const mirrors=["lib/chernobog/trust","lib/chernobog/governance/policyBridge.ts","lib/chernobog/governance/runtimeGovernance.ts","lib/chernobog/governance/status.ts","lib/chernobog/execution/approval.ts","lib/chernobog/execution/riskPolicy.ts","lib/modules/vault-brain/trustActionTypes.ts","lib/modules/vault-brain/trustDecision.ts","lib/modules/vault-brain/trustAuditLog.ts","lib/modules/vault-brain/trustPolicyManifest.ts","lib/modules/vault-brain/toolPermissionRegistry.ts"];
const gd=spawnSync("git",["diff","--name-only","--",...mirrors],{cwd:repo,encoding:"utf8"});
(gd.stdout??"").trim()===""?pass("legacy trust/governance source mirrors remain unchanged for historical acceptance"):fail("legacy trust/governance mirrors were modified: "+(gd.stdout??"").trim());
const bad=[]; const srcExt=/\.(?:ts|tsx|mts|cts|js|jsx|mjs|cjs)$/;
for(const base of ["app","components","lib","packages"]){for(const f of walk(base)){if(!srcExt.test(f))continue;if(f.startsWith("packages/trust/")||f.startsWith("lib/chernobog/trust/")||["lib/chernobog/governance/policyBridge.ts","lib/chernobog/governance/runtimeGovernance.ts","lib/chernobog/governance/status.ts","lib/chernobog/execution/approval.ts","lib/chernobog/execution/riskPolicy.ts","lib/modules/vault-brain/trustActionTypes.ts","lib/modules/vault-brain/trustDecision.ts","lib/modules/vault-brain/trustAuditLog.ts","lib/modules/vault-brain/trustPolicyManifest.ts","lib/modules/vault-brain/toolPermissionRegistry.ts"].includes(f))continue;const s=read(f);if(/@\/lib\/chernobog\/governance(?:\/|["'])/.test(s)||/@\/lib\/chernobog\/trust(?:\/|["'])/.test(s)||/@\/lib\/chernobog\/execution\/(?:approval|riskPolicy)/.test(s)||/@\/lib\/modules\/vault-brain\/(?:trustActionTypes|trustDecision|trustAuditLog|trustPolicyManifest|toolPermissionRegistry)/.test(s))bad.push(f);}}
bad.length===0?pass("live runtime consumers no longer import legacy trust/governance implementation paths"):fail("legacy trust imports remain in: "+bad.join(", "));
const route="app/api/governance/trust/evaluate/route.ts";
if(exists(route)){const s=read(route);s.includes("@chernobog/trust/vault/")?pass("governance trust API consumes Trust package rather than Vault Brain trust implementation"):fail("governance trust API still bypasses Trust package");}
const pkg=walk("packages/trust").filter(f=>srcExt.test(f)).map(read).join("\n");
!pkg.includes("@/lib/modules/vault-brain/trustDecision")&&!pkg.includes("@/lib/modules/vault-brain/trustActionTypes")?pass("Trust decisions are no longer owned through Vault Brain implementation imports"):fail("Trust package still delegates action decisions to Vault Brain trust implementation");
if(failures){console.error(`OH-1D trust verifier: FAIL (${failures})`);process.exit(1);}console.log("OH-1D trust verifier: PASS");
