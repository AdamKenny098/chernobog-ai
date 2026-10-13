import assert from "node:assert/strict";

import {
  AUTHORITY_BRIDGE_VERSION,
  AuthorityBridge,
  type CognitiveAuthorityProposal,
} from "@chernobog/models/authorityBridge";

import type {
  CognitiveGovernanceSnapshot,
} from "@/lib/chernobog/cognition/actionTypes";

import type {
  ConfidenceAssessment,
} from "@chernobog/models/confidenceEngine";

import type {
  CriticVerificationResult,
} from "@chernobog/models/criticVerificationLayer";

import type {
  EscalationDecision,
} from "@chernobog/models/escalationEngine";

import type {
  ReasoningContract,
} from "@chernobog/models/reasoningContracts";

function pass(
  message: string,
) {
  console.log(
    `PASS ${message}`,
  );
}

function proposal(
  overrides:
    Partial<
      CognitiveAuthorityProposal
    > = {},
): CognitiveAuthorityProposal {
  return {
    id:
      "proposal:test",
    description:
      "Read an approved project file",
    capability:
      "read_text_file",
    effect:
      "read",
    risk:
      "low",
    reversible:
      true,
    requiresUserInput:
      false,
    requestedExecutionRisk:
      "safe",
    responsibility: {
      owner:
        "chernobog",
      delegatedToChernobog:
        true,
      sourceRef:
        "responsibility:test",
    },
    ...overrides,
  };
}

function governance(
  overrides:
    Partial<
      CognitiveGovernanceSnapshot
    > = {},
): CognitiveGovernanceSnapshot {
  return {
    permission:
      "allow",
    autonomy:
      "bounded",
    userInteractionAvailable:
      true,
    ...overrides,
  };
}

function reasoningContract():
  ReasoningContract {
  return {
    version:
      "oh4o.test",
    authority: {
      reasoningMayAuthorizeActions:
        false,
      reasoningMayExecuteActions:
        false,
      reasoningMayProposeActions:
        true,
      approvalRequiredForExecution:
        true,
      rules:
        [],
    },
  } as unknown as ReasoningContract;
}

function verification(
  verdict:
    "pass"
    | "revise"
    | "reject"
    | "blocked" =
      "pass",
): CriticVerificationResult {
  return {
    version:
      "oh4t.test",
    verdict,
    trustedConclusion:
      verdict ===
      "pass",
  } as unknown as CriticVerificationResult;
}

function confidence():
  ConfidenceAssessment {
  return {
    version:
      "oh4u.test",
    score:
      0.94,
    percentage:
      94,
  } as unknown as ConfidenceAssessment;
}

function escalation(
  kind:
    EscalationDecision[
      "selected"
    ]["kind"] =
      "none",
): EscalationDecision {
  return {
    version:
      "oh4v.test",
    required:
      kind !==
      "none",
    selected: {
      kind,
    },
  } as unknown as EscalationDecision;
}

function baseInput() {
  return {
    proposal:
      proposal(),
    governance:
      governance(),
    reasoningContract:
      reasoningContract(),
    verification:
      verification(),
    confidence:
      confidence(),
    escalation:
      escalation(),
  };
}

function main() {
  console.log(
    "Chernobog OH-4W â€” Authority Bridge Verification",
  );
  console.log(
    "==============================================",
  );

  const bridge =
    new AuthorityBridge();

  const allowed =
    bridge.decide({
      ...baseInput(),
    });

  assert.equal(
    allowed.version,
    AUTHORITY_BRIDGE_VERSION,
  );

  assert.equal(
    allowed.status,
    "permitted",
  );

  assert.equal(
    allowed.permittedToExecute,
    true,
  );

  assert.equal(
    allowed.executionRisk,
    "safe",
  );

  assert.equal(
    allowed.executionApprovalMode,
    "auto",
  );

  pass(
    "trusted low-risk reversible work crosses the authority bridge only when existing governance explicitly allows bounded autonomy",
  );

  const denied =
    bridge.decide({
      ...baseInput(),
      governance:
        governance({
          permission:
            "deny",
        }),
      approval: {
        status:
          "approved",
        approvalId:
          "approval:test",
      },
    });

  assert.equal(
    denied.status,
    "denied",
  );

  assert.equal(
    denied.permittedToExecute,
    false,
  );

  assert.equal(
    denied.executionRisk,
    "blocked",
  );

  pass(
    "explicit approval cannot override an existing governance denial",
  );

  const confirmation =
    bridge.decide({
      ...baseInput(),
      governance:
        governance({
          permission:
            "confirm",
        }),
    });

  assert.equal(
    confirmation.status,
    "requires-approval",
  );

  assert.equal(
    confirmation.approval
      .required,
    true,
  );

  assert.equal(
    confirmation.permittedToExecute,
    false,
  );

  const confirmed =
    bridge.decide({
      ...baseInput(),
      governance:
        governance({
          permission:
            "confirm",
        }),
      approval: {
        status:
          "approved",
        approvalId:
          "approval:confirmed",
      },
    });

  assert.equal(
    confirmed.status,
    "permitted",
  );

  assert.equal(
    confirmed.permittedToExecute,
    true,
  );

  pass(
    "confirm permission maps into the existing approval lifecycle and permits only after explicit approval is satisfied",
  );

  const advisory =
    bridge.decide({
      ...baseInput(),
      governance:
        governance({
          autonomy:
            "advisory",
        }),
      approval: {
        status:
          "approved",
      },
    });

  assert.equal(
    advisory.status,
    "advisory",
  );

  assert.equal(
    advisory.permittedToExecute,
    false,
  );

  pass(
    "approval does not upgrade advisory autonomy into execution authority",
  );

  const write =
    bridge.decide({
      ...baseInput(),
      proposal:
        proposal({
          description:
            "Write a file",
          effect:
            "write",
          risk:
            "medium",
          reversible:
            true,
          requestedExecutionRisk:
            "approval_required",
        }),
    });

  assert.equal(
    write.status,
    "requires-approval",
  );

  assert.equal(
    write.executionRisk,
    "approval_required",
  );

  assert.equal(
    write.executionApprovalMode,
    "approval",
  );

  pass(
    "existing execution-risk classification remains authoritative and can require approval even under bounded autonomy",
  );

  const userOwned =
    bridge.decide({
      ...baseInput(),
      proposal:
        proposal({
          responsibility: {
            owner:
              "user",
            delegatedToChernobog:
              false,
            sourceRef:
              "responsibility:user",
          },
        }),
    });

  assert.equal(
    userOwned.status,
    "requires-approval",
  );

  assert.ok(
    userOwned.reasons
      .some(
        (entry) =>
          entry.code ===
          "responsibility-not-delegated",
      ),
  );

  pass(
    "responsibility ownership is preserved; Chernobog cannot silently act on work that was not delegated to it",
  );

  const rejected =
    bridge.decide({
      ...baseInput(),
      verification:
        verification(
          "reject",
        ),
      confidence: {
        ...confidence(),
        score:
          1,
        percentage:
          100,
      } as ConfidenceAssessment,
    });

  assert.equal(
    rejected.status,
    "blocked",
  );

  assert.equal(
    rejected.permittedToExecute,
    false,
  );

  pass(
    "confidence cannot upgrade an untrusted OH-4T result into authority",
  );

  const unresolvedEscalation =
    bridge.decide({
      ...baseInput(),
      escalation:
        escalation(
          "enrich-context",
        ),
    });

  assert.equal(
    unresolvedEscalation.status,
    "blocked",
  );

  assert.equal(
    unresolvedEscalation
      .unresolvedEscalation,
    "enrich-context",
  );

  pass(
    "unresolved OH-4V recovery directives block action authority until cognition is ready again",
  );

  const safetyBlocked =
    bridge.decide({
      ...baseInput(),
      approval: {
        status:
          "approved",
      },
      safetyBlocks: [
        "Policy forbids this capability.",
      ],
    });

  assert.equal(
    safetyBlocked.status,
    "blocked",
  );

  assert.equal(
    safetyBlocked.permittedToExecute,
    false,
  );

  assert.equal(
    safetyBlocked.executionRisk,
    "blocked",
  );

  pass(
    "explicit approval cannot override a safety-policy block",
  );

  const critical =
    bridge.decide({
      ...baseInput(),
      proposal:
        proposal({
          risk:
            "critical",
          requestedExecutionRisk:
            "safe",
        }),
      approval: {
        status:
          "approved",
      },
    });

  assert.equal(
    critical.status,
    "blocked",
  );

  assert.equal(
    critical.executionApprovalMode,
    "blocked",
  );

  pass(
    "critical cognitive risk fails closed even if a weaker requested execution classification or approval is supplied",
  );

  assert.equal(
    allowed.invariants
      .cognitionCanSelfAuthorize,
    false,
  );

  assert.equal(
    allowed.invariants
      .confidenceCanUpgradePermission,
    false,
  );

  assert.equal(
    allowed.invariants
      .approvalCanOverrideDenial,
    false,
  );

  assert.equal(
    allowed.invariants
      .approvalCanOverrideSafetyBlock,
    false,
  );

  assert.equal(
    allowed.invariants
      .actionExecuted,
    false,
  );

  assert.equal(
    allowed.invariants
      .executionTaskCreated,
    false,
  );

  pass(
    "OH-4W bridges cognition into authority but does not execute actions or create execution tasks",
  );

  console.log("");
  console.log(
    "OH-4W authority bridge verification complete.",
  );
}

main();