import assert from "node:assert/strict";

import {
  ACTION_BRIDGE_VERSION,
  ActionBridge,
  type ActionBridgeIntent,
} from "@chernobog/models/actionBridge";

import type {
  AuthorityBridgeDecision,
} from "@chernobog/models/authorityBridge";

import type {
  ConfidenceAssessment,
} from "@chernobog/models/confidenceEngine";

import type {
  CriticVerificationResult,
} from "@chernobog/models/criticVerificationLayer";

function pass(message: string) {
  console.log(`PASS ${message}`);
}

function authority(options: {
  status?: AuthorityBridgeDecision["status"];
  permittedToExecute?: boolean;
  executionRisk?: AuthorityBridgeDecision["executionRisk"];
  proposalId?: string;
} = {}): AuthorityBridgeDecision {
  const status = options.status ?? "permitted";

  return {
    version: "oh4w.test",
    proposalId: options.proposalId ?? "proposal:test",
    status,
    permittedToExecute:
      options.permittedToExecute ?? status === "permitted",
    executionRisk: options.executionRisk ?? "safe",
  } as unknown as AuthorityBridgeDecision;
}

function verification(): CriticVerificationResult {
  return {
    version: "oh4t.test",
    verdict: "pass",
    trustedConclusion: true,
  } as unknown as CriticVerificationResult;
}

function confidence(): ConfidenceAssessment {
  return {
    version: "oh4u.test",
    score: 0.93,
    percentage: 93,
  } as unknown as ConfidenceAssessment;
}

function intent(overrides: Partial<ActionBridgeIntent> = {}): ActionBridgeIntent {
  return {
    id: "intent:test",
    proposalId: "proposal:test",
    target: {
      kind: "tool",
      name: "read_text_file",
    },
    input: {
      path: "C:\\test\\note.txt",
    },
    goal: "Read the selected test note",
    description: "Read test note",
    category: "file_workflow",
    stepKind: "file",
    postActionVerification: {
      required: true,
      checks: [
        "Tool result reports success",
        "Returned content belongs to requested path",
      ],
      expectedOutcome: "File contents returned successfully",
    },
    ...overrides,
  };
}

function main() {
  console.log("Chernobog OH-4X â€” Action Bridge Verification");
  console.log("===========================================");

  const bridge = new ActionBridge();

  const ready = bridge.translate({
    authority: authority(),
    intent: intent(),
    verification: verification(),
    confidence: confidence(),
  });

  assert.equal(ready.version, ACTION_BRIDGE_VERSION);
  assert.equal(ready.status, "ready");
  assert.equal(ready.readyForExecution, true);
  assert.equal(ready.toolRequest?.toolName, "read_text_file");
  assert.equal(ready.toolRequest?.origin, "execution-task");
  assert.equal(ready.toolRequest?.executionHandlerAvailable, true);
  assert.equal(ready.executionTask.steps[0]?.action, "read_text_file");
  assert.equal(ready.executionTask.steps[0]?.risk, "safe");

  pass(
    "permitted registered tool intent becomes a concrete execution-task blueprint routed through the existing execution-task/tool-gateway path",
  );

  const sameAgain = bridge.translate({
    authority: authority(),
    intent: intent(),
    verification: verification(),
    confidence: confidence(),
  });

  assert.equal(ready.idempotencyKey, sameAgain.idempotencyKey);
  pass("equivalent authority + action input produces a stable idempotency key");

  const changedInput = bridge.translate({
    authority: authority(),
    intent: intent({ input: { path: "C:\\test\\other.txt" } }),
    verification: verification(),
    confidence: confidence(),
  });

  assert.notEqual(ready.idempotencyKey, changedInput.idempotencyKey);
  pass("material action-input changes produce a different idempotency key");

  const approvalPending = bridge.translate({
    authority: authority({
      status: "requires-approval",
      permittedToExecute: false,
      executionRisk: "approval_required",
    }),
    intent: intent(),
    verification: verification(),
    confidence: confidence(),
  });

  assert.equal(approvalPending.status, "approval-required");
  assert.equal(approvalPending.readyForExecution, false);
  assert.equal(
    approvalPending.executionTask.steps[0]?.risk,
    "approval_required",
  );

  pass(
    "pending approval may be translated into a concrete blueprint but never marked ready for execution",
  );

  const blocked = bridge.translate({
    authority: authority({
      status: "blocked",
      permittedToExecute: false,
      executionRisk: "blocked",
    }),
    intent: intent(),
    verification: verification(),
    confidence: confidence(),
  });

  assert.equal(blocked.status, "blocked");
  assert.equal(blocked.readyForExecution, false);
  assert.equal(blocked.executionTask.steps[0]?.risk, "blocked");

  pass(
    "blocked OH-4W authority remains blocked and its risk classification is never reduced",
  );

  assert.throws(
    () => bridge.translate({
      authority: authority({ proposalId: "proposal:one" }),
      intent: intent({ proposalId: "proposal:two" }),
      verification: verification(),
      confidence: confidence(),
    }),
    /proposalId does not match/i,
  );

  pass("action intent cannot be rebound to a different authority decision");

  assert.throws(
    () => bridge.translate({
      authority: authority(),
      intent: intent({
        target: {
          kind: "tool",
          name: "definitely_not_a_real_tool",
        },
      }),
      verification: verification(),
      confidence: confidence(),
    }),
    /not a registered Chernobog tool/i,
  );

  pass("unknown tool targets fail closed instead of bypassing the registry");

  const agent = bridge.translate({
    authority: authority(),
    intent: intent({
      id: "intent:agent",
      target: {
        kind: "agent",
        name: "communications-officer",
      },
      input: {
        task: "Relay project status",
      },
      category: "unknown",
      stepKind: "workflow",
    }),
    verification: verification(),
    confidence: confidence(),
  });

  assert.equal(agent.agentRequest?.agentId, "communications-officer");
  assert.equal(agent.agentRequest?.handlerResolutionRequired, true);
  assert.equal(agent.readyForExecution, false);
  assert.equal(agent.invariants.agentInvoked, false);

  pass(
    "agent targets are represented explicitly and fail closed until a real downstream handler exists",
  );

  assert.equal(ready.postActionVerification.required, true);
  assert.equal(ready.postActionVerification.checks.length, 2);
  assert.equal(
    ready.executionTask.context.postActionVerificationRequired,
    true,
  );

  pass(
    "post-action verification requirements are preserved into the execution blueprint",
  );

  assert.equal(ready.invariants.toolInvoked, false);
  assert.equal(ready.invariants.executionStarted, false);
  assert.equal(ready.invariants.authorityBypassed, false);
  assert.equal(ready.invariants.riskReduced, false);
  assert.equal(ready.invariants.approvalBypassed, false);

  pass(
    "OH-4X translates actions only; execution, authority, risk and approval remain owned by downstream runtime governance",
  );

  console.log("");
  console.log("OH-4X action bridge verification complete.");
}

main();