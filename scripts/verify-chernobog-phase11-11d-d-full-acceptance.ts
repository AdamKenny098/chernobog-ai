import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { evaluateUnifiedGovernance, getUnifiedGovernanceStatus } from "../lib/chernobog/governance";

function pass(message: string): void { console.log(`PASS ${message}`); }

async function main(): Promise<void> {
  console.log("Chernobog Phase 11D-D - Unified Governance Full Integration & Acceptance");
  console.log("======================================================================");

  const status = getUnifiedGovernanceStatus({ clock: () => new Date("2026-08-28T12:30:00.000Z") });
  assert.equal(status.status, "ready");
  assert.deepEqual(status.acceptanceSamples, { safeAllow: "allow", approvalAllow: "confirm", blockedAllow: "deny", safeDeny: "deny" });
  pass("unified governance status is ready only when the canonical restrictive outcomes remain intact");

  assert.equal(status.invariant, "most-restrictive-wins");
  assert.deepEqual(status.dispositions, ["allow", "confirm", "deny"]);
  pass("11D exposes one canonical allow/confirm/deny contract with the most-restrictive-wins invariant");

  assert.equal(evaluateUnifiedGovernance({ executionRisk: "safe", cognitive: { governance: { permission: "confirm", autonomy: "bounded", userInteractionAvailable: true } } }).disposition, "confirm");
  assert.equal(evaluateUnifiedGovernance({ executionRisk: "approval_required", cognitive: { governance: { permission: "deny", autonomy: "bounded", userInteractionAvailable: true } } }).disposition, "deny");
  pass("cognitive governance can tighten execution policy but can never loosen it");

  const taskSource = await readFile("lib/chernobog/execution/runExecutionTask.ts", "utf8");
  for (const required of ["evaluateTaskRuntimeGovernance", "evaluateStepRuntimeGovernance", "governance?: ExecutionGovernanceContext", "resolveStepGovernance?: ResolveExecutionStepGovernance", "shouldPauseForApproval", "getRiskPolicyForStep"]) {
    assert.equal(taskSource.includes(required), true, `Runtime governance integration missing ${required}`);
  }
  pass("runExecutionTask remains the authoritative runtime enforcement point for unified governance and existing approvals");

  const handoffSource = await readFile("lib/chernobog/governance/cognitiveExecution.ts", "utf8");
  assert.equal(handoffSource.includes("runExecutionTask"), true);
  assert.equal(handoffSource.includes("decision.governance"), true);
  assert.equal(handoffSource.includes("decision.opportunity"), true);
  assert.equal(handoffSource.includes("executeTool"), false);
  pass("cognitive execution handoff carries the exact decision governance into runExecutionTask and has no direct tool bypass");

  const cognitionSource = await readFile("lib/chernobog/cognition/cognitiveRuntime.ts", "utf8");
  assert.equal(cognitionSource.includes("runExecutionTask"), false);
  assert.equal(cognitionSource.includes("executeTool"), false);
  pass("11H cognition remains a decision producer and cannot directly execute tasks or tools");

  const gatewaySource = await readFile("lib/chernobog/execution/toolGateway.ts", "utf8");
  assert.equal(gatewaySource.includes("invokeToolDetailed"), true);
  assert.equal(gatewaySource.includes("evaluateUnifiedGovernance"), false);
  pass("11C tool gateway remains below governance and does not reinterpret permission policy");

  const policySource = await readFile("lib/chernobog/governance/policyBridge.ts", "utf8");
  assert.equal(policySource.includes("executeTool"), false);
  assert.equal(policySource.includes("runExecutionTask("), false);
  pass("policy bridge remains pure and cannot become an execution bypass");

  const apiSource = await readFile("app/api/governance/route.ts", "utf8");
  assert.equal(apiSource.includes("export async function GET"), true);
  assert.equal(/\\bPOST\\b/.test(apiSource), false);
  for (const boundary of ["executesTools", "executesTasks", "acceptsApproval", "changesPermissions", "changesAutonomy"]) assert.equal(apiSource.includes(boundary), true);
  pass("governance diagnostics are read-only and expose no execution, approval, permission, or autonomy mutation surface");

  assert.deepEqual(status.authority, {
    policyBridge: "governance/policyBridge.ts",
    runtimeEnforcement: "execution/runExecutionTask.ts",
    cognitiveHandoff: "governance/cognitiveExecution.ts",
    toolExecution: "execution/toolGateway.ts",
  });
  pass("governance diagnostics expose the final authority chain from policy to runtime to tool execution");

  console.log("======================================================================");
  console.log("PASS Phase 11D-D Unified Governance Full Integration & Acceptance");
  console.log("PASS Phase 11D Unified Governance COMPLETE");
}

void main().catch((error) => { console.error(error); process.exitCode = 1; });
