import type {
  CognitiveActionEffect,
  CognitiveActionRisk,
  CognitiveAutonomyMode,
  CognitiveGovernanceSnapshot,
  CognitivePermissionState,
} from "@/lib/chernobog/cognition/actionTypes";

import type {
  ExecutionRiskLevel,
} from "@/lib/chernobog/execution/types";

import type {
  ExecutionApprovalMode,
} from "@/lib/chernobog/execution/riskPolicy";

import type {
  ConfidenceAssessment,
} from "./confidenceEngine";

import type {
  CriticVerificationResult,
} from "./criticVerificationLayer";

import type {
  EscalationDecision,
} from "./escalationEngine";

import type {
  ReasoningContract,
} from "./reasoningContracts";

export const AUTHORITY_BRIDGE_VERSION =
  "oh4w.v1";

export type AuthorityDecisionStatus =
  | "permitted"
  | "requires-approval"
  | "denied"
  | "blocked"
  | "advisory";

export type ResponsibilityOwner =
  | "user"
  | "chernobog"
  | "shared"
  | "external"
  | "unknown";

export type AuthorityApprovalStatus =
  | "not-required"
  | "pending"
  | "approved"
  | "denied";

export interface AuthorityResponsibility {
  owner:
    ResponsibilityOwner;

  ownerId?: string;

  delegatedToChernobog?:
    boolean;

  sourceRef?: string;
}

export interface AuthorityApprovalSnapshot {
  status:
    AuthorityApprovalStatus;

  approvalId?: string;

  approvedAt?: string;
  deniedAt?: string;
}

export interface CognitiveAuthorityProposal {
  id: string;

  description: string;

  capability?: string;

  effect:
    CognitiveActionEffect;

  risk:
    CognitiveActionRisk;

  reversible:
    boolean;

  requiresUserInput?:
    boolean;

  requestedExecutionRisk?:
    ExecutionRiskLevel;

  responsibility?:
    AuthorityResponsibility;
}

export type AuthorityReasonCode =
  | "verification-not-trusted"
  | "escalation-unresolved"
  | "safety-block"
  | "permission-denied"
  | "autonomy-disabled"
  | "advisory-only"
  | "requires-user-input"
  | "responsibility-not-delegated"
  | "critical-risk"
  | "high-risk"
  | "irreversible-side-effect"
  | "execution-policy-blocked"
  | "permission-confirmation"
  | "execution-approval-required"
  | "approval-pending"
  | "approval-denied"
  | "approval-satisfied"
  | "notice-required"
  | "bounded-authority-permits"
  | "reasoning-cannot-self-authorize";

export interface AuthorityReason {
  code:
    AuthorityReasonCode;

  detail: string;

  source:
    | "verification"
    | "escalation"
    | "safety"
    | "governance"
    | "responsibility"
    | "risk"
    | "execution-policy"
    | "approval"
    | "reasoning-contract";
}

export interface AuthorityBridgeDecision {
  version: string;
  decidedAt: string;

  proposalId: string;

  status:
    AuthorityDecisionStatus;

  permittedToPropose:
    boolean;

  permittedToExecute:
    boolean;

  executionRisk:
    ExecutionRiskLevel;

  executionApprovalMode:
    ExecutionApprovalMode;

  approval: {
    required: boolean;
    satisfied: boolean;
    status:
      AuthorityApprovalStatus;
    approvalId?: string;
  };

  governance: {
    permission:
      CognitivePermissionState;

    autonomy:
      CognitiveAutonomyMode;

    userInteractionAvailable:
      boolean;
  };

  responsibility: {
    owner:
      ResponsibilityOwner;

    delegatedToChernobog:
      boolean;

    ownerId?: string;
    sourceRef?: string;
  };

  reasons:
    AuthorityReason[];

  safetyBlocks:
    string[];

  confidence: {
    score: number;
    percentage: number;
    verificationTrusted:
      boolean;
  };

  unresolvedEscalation?:
    EscalationDecision[
      "selected"
    ]["kind"];

  provenance: {
    confidenceEngineVersion:
      string;

    criticVerificationVersion:
      string;

    escalationEngineVersion:
      string;

    reasoningContractVersion:
      string;

    responsibilitySourceRef?:
      string;
  };

  invariants: {
    cognitionCanSelfAuthorize:
      false;

    confidenceCanUpgradePermission:
      false;

    approvalCanOverrideDenial:
      false;

    approvalCanOverrideSafetyBlock:
      false;

    actionExecuted:
      false;

    executionTaskCreated:
      false;
  };
}

const EXECUTION_RISK_ORDER:
  Record<
    ExecutionRiskLevel,
    number
  > = {
    safe:
      0,

    notice:
      1,

    approval_required:
      2,

    blocked:
      3,
  };

function maxExecutionRisk(
  left:
    ExecutionRiskLevel,
  right:
    ExecutionRiskLevel,
): ExecutionRiskLevel {
  return (
    EXECUTION_RISK_ORDER[
      left
    ] >=
    EXECUTION_RISK_ORDER[
      right
    ]
  )
    ? left
    : right;
}

function executionModeForRisk(
  risk:
    ExecutionRiskLevel,
): ExecutionApprovalMode {
  switch (
    risk
  ) {
    case "safe":
      return "auto";

    case "notice":
      return "notice";

    case "approval_required":
      return "approval";

    case "blocked":
      return "blocked";
  }
}

function derivedRiskForProposal(
  proposal:
    CognitiveAuthorityProposal,
): ExecutionRiskLevel {
  if (
    proposal.risk ===
    "critical"
  ) {
    return "blocked";
  }

  if (
    proposal.risk ===
    "high"
  ) {
    return "approval_required";
  }

  if (
    (
      proposal.effect ===
        "write" ||
      proposal.effect ===
        "external"
    ) &&
    !proposal.reversible
  ) {
    return "approval_required";
  }

  if (
    proposal.effect ===
      "write"
  ) {
    return "approval_required";
  }

  if (
    proposal.effect ===
      "external"
  ) {
    return "notice";
  }

  return "safe";
}

function effectiveExecutionRisk(
  proposal:
    CognitiveAuthorityProposal,
): ExecutionRiskLevel {
  const derived =
    derivedRiskForProposal(
      proposal,
    );

  return proposal
    .requestedExecutionRisk
    ? maxExecutionRisk(
        derived,
        proposal
          .requestedExecutionRisk,
      )
    : derived;
}

function reason(
  reasons:
    AuthorityReason[],
  code:
    AuthorityReasonCode,
  detail:
    string,
  source:
    AuthorityReason[
      "source"
    ],
): void {
  reasons.push({
    code,
    detail,
    source,
  });
}

function normalizedResponsibility(
  responsibility:
    AuthorityResponsibility
    | undefined,
): AuthorityBridgeDecision[
  "responsibility"
] {
  const owner =
    responsibility
      ?.owner ??
    "unknown";

  return {
    owner,
    delegatedToChernobog:
      responsibility
        ?.delegatedToChernobog ??
      owner ===
        "chernobog",
    ownerId:
      responsibility
        ?.ownerId,
    sourceRef:
      responsibility
        ?.sourceRef,
  };
}

function approvalStatus(
  approval:
    AuthorityApprovalSnapshot
    | undefined,
): AuthorityApprovalStatus {
  return approval
    ?.status ??
    "not-required";
}

export class AuthorityBridge {
  decide(
    input: {
      proposal:
        CognitiveAuthorityProposal;

      governance:
        CognitiveGovernanceSnapshot;

      reasoningContract:
        ReasoningContract;

      verification:
        CriticVerificationResult;

      confidence:
        ConfidenceAssessment;

      escalation:
        EscalationDecision;

      approval?:
        AuthorityApprovalSnapshot;

      safetyBlocks?:
        string[];
    },
  ): AuthorityBridgeDecision {
    const reasons:
      AuthorityReason[] =
        [];

    const proposal =
      structuredClone(
        input.proposal,
      );

    const governance =
      structuredClone(
        input.governance,
      );

    const safetyBlocks =
      [
        ...new Set(
          (
            input.safetyBlocks ??
            []
          )
            .map(
              (entry) =>
                entry.trim(),
            )
            .filter(Boolean),
        ),
      ];

    const responsibility =
      normalizedResponsibility(
        proposal
          .responsibility,
      );

    const approval =
      input.approval;

    const currentApprovalStatus =
      approvalStatus(
        approval,
      );

    let executionRisk =
      effectiveExecutionRisk(
        proposal,
      );

    let hardBlocked =
      false;

    let denied =
      false;

    let advisoryOnly =
      false;

    let approvalRequired =
      executionRisk ===
      "approval_required";

    if (
      !input.reasoningContract
        .authority
        .reasoningMayAuthorizeActions
    ) {
      reason(
        reasons,
        "reasoning-cannot-self-authorize",
        "The active reasoning contract explicitly prevents cognition from authorizing its own proposed actions.",
        "reasoning-contract",
      );
    }

    if (
      !input.verification
        .trustedConclusion ||
      input.verification
        .verdict !==
        "pass"
    ) {
      hardBlocked =
        true;

      executionRisk =
        "blocked";

      reason(
        reasons,
        "verification-not-trusted",
        `OH-4T verdict=${input.verification.verdict}; untrusted cognitive conclusions cannot cross into execution authority.`,
        "verification",
      );
    }

    if (
      input.escalation
        .required ||
      input.escalation
        .selected.kind !==
        "none"
    ) {
      hardBlocked =
        true;

      executionRisk =
        "blocked";

      reason(
        reasons,
        "escalation-unresolved",
        `OH-4V still requires "${input.escalation.selected.kind}" before the cognitive result is ready for authority consideration.`,
        "escalation",
      );
    }

    if (
      safetyBlocks.length >
      0
    ) {
      hardBlocked =
        true;

      executionRisk =
        "blocked";

      reason(
        reasons,
        "safety-block",
        `Safety policy blocks this proposal: ${safetyBlocks.join("; ")}.`,
        "safety",
      );
    }

    if (
      governance.permission ===
      "deny"
    ) {
      denied =
        true;

      executionRisk =
        "blocked";

      reason(
        reasons,
        "permission-denied",
        "The existing Chernobog governance snapshot denies this capability.",
        "governance",
      );
    }

    if (
      governance.autonomy ===
      "disabled"
    ) {
      advisoryOnly =
        true;

      reason(
        reasons,
        "autonomy-disabled",
        "Autonomous execution is disabled by the existing governance snapshot.",
        "governance",
      );
    } else if (
      governance.autonomy ===
      "advisory"
    ) {
      advisoryOnly =
        true;

      reason(
        reasons,
        "advisory-only",
        "The existing governance snapshot allows recommendations but not autonomous execution.",
        "governance",
      );
    }

    if (
      proposal.requiresUserInput
    ) {
      approvalRequired =
        true;

      reason(
        reasons,
        "requires-user-input",
        "The proposal requires user-supplied information before execution can proceed.",
        "governance",
      );
    }

    if (
      !responsibility
        .delegatedToChernobog &&
      responsibility.owner !==
        "chernobog"
    ) {
      approvalRequired =
        true;

      reason(
        reasons,
        "responsibility-not-delegated",
        `Responsibility is owned by ${responsibility.owner}; execution authority has not been delegated to Chernobog.`,
        "responsibility",
      );
    }

    if (
      proposal.risk ===
      "critical"
    ) {
      hardBlocked =
        true;

      executionRisk =
        "blocked";

      reason(
        reasons,
        "critical-risk",
        "Critical-risk cognitive proposals are blocked from autonomous execution.",
        "risk",
      );
    } else if (
      proposal.risk ===
      "high"
    ) {
      approvalRequired =
        true;

      executionRisk =
        maxExecutionRisk(
          executionRisk,
          "approval_required",
        );

      reason(
        reasons,
        "high-risk",
        "High-risk cognitive proposals require explicit approval.",
        "risk",
      );
    }

    if (
      (
        proposal.effect ===
          "write" ||
        proposal.effect ===
          "external"
      ) &&
      !proposal.reversible
    ) {
      approvalRequired =
        true;

      executionRisk =
        maxExecutionRisk(
          executionRisk,
          "approval_required",
        );

      reason(
        reasons,
        "irreversible-side-effect",
        "Irreversible write/external effects require explicit approval.",
        "risk",
      );
    }

    if (
      proposal
        .requestedExecutionRisk ===
        "blocked"
    ) {
      hardBlocked =
        true;

      executionRisk =
        "blocked";

      reason(
        reasons,
        "execution-policy-blocked",
        "The existing execution-risk classification marks this action blocked.",
        "execution-policy",
      );
    } else if (
      proposal
        .requestedExecutionRisk ===
        "approval_required"
    ) {
      approvalRequired =
        true;

      reason(
        reasons,
        "execution-approval-required",
        "The existing execution-risk classification requires approval.",
        "execution-policy",
      );
    }

    if (
      governance.permission ===
      "confirm"
    ) {
      approvalRequired =
        true;

      reason(
        reasons,
        "permission-confirmation",
        "The existing governance permission state requires confirmation before execution.",
        "governance",
      );
    }

    let approvalSatisfied =
      !approvalRequired;

    if (
      approvalRequired
    ) {
      if (
        currentApprovalStatus ===
        "approved"
      ) {
        approvalSatisfied =
          true;

        reason(
          reasons,
          "approval-satisfied",
          "The required explicit approval is recorded as approved.",
          "approval",
        );
      } else if (
        currentApprovalStatus ===
        "denied"
      ) {
        denied =
          true;

        reason(
          reasons,
          "approval-denied",
          "The required approval was explicitly denied.",
          "approval",
        );
      } else {
        reason(
          reasons,
          "approval-pending",
          "Explicit approval is required and has not yet been satisfied.",
          "approval",
        );
      }
    }

    if (
      executionRisk ===
      "notice"
    ) {
      reason(
        reasons,
        "notice-required",
        "The existing execution-risk vocabulary requires notice before execution.",
        "execution-policy",
      );
    }

    const boundedAutonomy =
      governance.autonomy ===
      "bounded";

    const permissionAllows =
      governance.permission ===
        "allow" ||
      (
        governance.permission ===
          "confirm" &&
        approvalSatisfied
      );

    let status:
      AuthorityDecisionStatus;

    let permittedToExecute =
      false;

    if (
      hardBlocked
    ) {
      status =
        "blocked";
    } else if (
      denied
    ) {
      status =
        "denied";
    } else if (
      advisoryOnly ||
      !boundedAutonomy
    ) {
      status =
        "advisory";
    } else if (
      !permissionAllows
    ) {
      status =
        approvalRequired
          ? "requires-approval"
          : "denied";
    } else if (
      approvalRequired &&
      !approvalSatisfied
    ) {
      status =
        "requires-approval";
    } else {
      status =
        "permitted";

      permittedToExecute =
        true;

      reason(
        reasons,
        "bounded-authority-permits",
        "Existing governance, responsibility, risk, verification, escalation, and approval gates permit this proposal to cross the authority boundary.",
        "governance",
      );
    }

    if (
      status ===
        "blocked" ||
      status ===
        "denied"
    ) {
      executionRisk =
        "blocked";
    } else if (
      status ===
        "requires-approval"
    ) {
      executionRisk =
        maxExecutionRisk(
          executionRisk,
          "approval_required",
        );
    }

    return {
      version:
        AUTHORITY_BRIDGE_VERSION,
      decidedAt:
        new Date()
          .toISOString(),
      proposalId:
        proposal.id,
      status,
      permittedToPropose:
        !hardBlocked &&
        !denied,
      permittedToExecute,
      executionRisk,
      executionApprovalMode:
        executionModeForRisk(
          executionRisk,
        ),
      approval: {
        required:
          approvalRequired,
        satisfied:
          approvalSatisfied,
        status:
          currentApprovalStatus,
        approvalId:
          approval
            ?.approvalId,
      },
      governance: {
        permission:
          governance
            .permission,
        autonomy:
          governance
            .autonomy,
        userInteractionAvailable:
          governance
            .userInteractionAvailable,
      },
      responsibility,
      reasons:
        structuredClone(
          reasons,
        ),
      safetyBlocks,
      confidence: {
        score:
          input.confidence
            .score,
        percentage:
          input.confidence
            .percentage,
        verificationTrusted:
          input.verification
            .trustedConclusion,
      },
      unresolvedEscalation:
        input.escalation
          .selected.kind ===
          "none"
          ? undefined
          : input.escalation
              .selected.kind,
      provenance: {
        confidenceEngineVersion:
          input.confidence
            .version,
        criticVerificationVersion:
          input.verification
            .version,
        escalationEngineVersion:
          input.escalation
            .version,
        reasoningContractVersion:
          input
            .reasoningContract
            .version,
        responsibilitySourceRef:
          responsibility
            .sourceRef,
      },
      invariants: {
        cognitionCanSelfAuthorize:
          false,
        confidenceCanUpgradePermission:
          false,
        approvalCanOverrideDenial:
          false,
        approvalCanOverrideSafetyBlock:
          false,
        actionExecuted:
          false,
        executionTaskCreated:
          false,
      },
    };
  }
}

const defaultAuthorityBridge =
  new AuthorityBridge();

export function getAuthorityBridge():
  AuthorityBridge {
  return defaultAuthorityBridge;
}