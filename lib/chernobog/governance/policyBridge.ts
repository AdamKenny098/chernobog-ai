import type {
  CognitiveActionOpportunity,
  CognitiveAutonomyMode,
  CognitiveGovernanceSnapshot,
  CognitivePermissionState,
} from "../cognition/actionTypes";
import {
  getRiskPolicy,
} from "../execution/riskPolicy";
import type {
  ExecutionApprovalMode,
} from "../execution/riskPolicy";
import type {
  ExecutionRiskLevel,
} from "../execution/types";

export type UnifiedGovernanceDisposition =
  | "allow"
  | "confirm"
  | "deny";

export type UnifiedGovernanceReasonCode =
  | "execution-auto"
  | "execution-notice"
  | "execution-approval-required"
  | "execution-blocked"
  | "permission-allowed"
  | "permission-confirmation-required"
  | "permission-denied"
  | "autonomy-disabled"
  | "autonomy-advisory"
  | "bounded-autonomy"
  | "requires-user-input"
  | "high-action-risk"
  | "critical-action-risk"
  | "irreversible-action";

export interface UnifiedGovernanceReason {
  code: UnifiedGovernanceReasonCode;
  detail: string;
}

export interface UnifiedGovernanceDecision {
  disposition: UnifiedGovernanceDisposition;
  executionRisk: ExecutionRiskLevel;
  executionMode: ExecutionApprovalMode;
  permission?: CognitivePermissionState;
  autonomy?: CognitiveAutonomyMode;
  reasons: UnifiedGovernanceReason[];
}

export interface UnifiedGovernanceInput {
  executionRisk: ExecutionRiskLevel;
  action?: string;
  cognitive?: {
    governance: CognitiveGovernanceSnapshot;
    opportunity?: CognitiveActionOpportunity;
  };
}

const DISPOSITION_ORDER: Record<
  UnifiedGovernanceDisposition,
  number
> = {
  allow: 0,
  confirm: 1,
  deny: 2,
};

export function mostRestrictiveDisposition(
  ...values: UnifiedGovernanceDisposition[]
): UnifiedGovernanceDisposition {
  let selected: UnifiedGovernanceDisposition =
    "allow";

  for (const value of values) {
    if (
      DISPOSITION_ORDER[value] >
      DISPOSITION_ORDER[selected]
    ) {
      selected = value;
    }
  }

  return selected;
}

export function mapExecutionModeToDisposition(
  mode: ExecutionApprovalMode,
): UnifiedGovernanceDisposition {
  switch (mode) {
    case "blocked":
      return "deny";

    case "approval":
      return "confirm";

    case "notice":
    case "auto":
      return "allow";
  }
}

function executionReason(
  mode: ExecutionApprovalMode,
  reason?: string,
): UnifiedGovernanceReason {
  switch (mode) {
    case "blocked":
      return {
        code: "execution-blocked",
        detail:
          reason ??
          "Execution policy blocks this action.",
      };

    case "approval":
      return {
        code:
          "execution-approval-required",
        detail:
          reason ??
          "Execution policy requires approval.",
      };

    case "notice":
      return {
        code: "execution-notice",
        detail:
          reason ??
          "Execution policy permits this action with notice.",
      };

    case "auto":
      return {
        code: "execution-auto",
        detail:
          reason ??
          "Execution policy permits automatic execution.",
      };
  }
}

function evaluateCognitiveGovernance(
  governance: CognitiveGovernanceSnapshot,
  opportunity?: CognitiveActionOpportunity,
): {
  disposition: UnifiedGovernanceDisposition;
  reasons: UnifiedGovernanceReason[];
} {
  const reasons: UnifiedGovernanceReason[] =
    [];

  let disposition: UnifiedGovernanceDisposition =
    "allow";

  if (governance.permission === "deny") {
    reasons.push({
      code: "permission-denied",
      detail:
        "Cognitive governance denies this action capability.",
    });

    return {
      disposition: "deny",
      reasons,
    };
  }

  if (governance.permission === "confirm") {
    disposition = "confirm";

    reasons.push({
      code:
        "permission-confirmation-required",
      detail:
        "Cognitive governance requires confirmation before execution.",
    });
  } else {
    reasons.push({
      code: "permission-allowed",
      detail:
        "Cognitive permission allows this capability.",
    });
  }

  if (governance.autonomy === "disabled") {
    disposition =
      mostRestrictiveDisposition(
        disposition,
        "confirm",
      );

    reasons.push({
      code: "autonomy-disabled",
      detail:
        "Autonomous execution is disabled and requires explicit authorization.",
    });
  } else if (
    governance.autonomy === "advisory"
  ) {
    disposition =
      mostRestrictiveDisposition(
        disposition,
        "confirm",
      );

    reasons.push({
      code: "autonomy-advisory",
      detail:
        "Advisory autonomy can recommend but cannot directly authorize execution.",
    });
  } else {
    reasons.push({
      code: "bounded-autonomy",
      detail:
        "Bounded autonomy may authorize only bounded reversible actions.",
    });
  }

  if (!opportunity) {
    return {
      disposition,
      reasons,
    };
  }

  if (opportunity.requiresUserInput) {
    disposition =
      mostRestrictiveDisposition(
        disposition,
        "confirm",
      );

    reasons.push({
      code: "requires-user-input",
      detail:
        "The action requires user-supplied information before execution.",
    });
  }

  if (opportunity.risk === "critical") {
    disposition =
      mostRestrictiveDisposition(
        disposition,
        "confirm",
      );

    reasons.push({
      code: "critical-action-risk",
      detail:
        "Critical cognitive action risk cannot be authorized autonomously.",
    });
  } else if (
    opportunity.risk === "high"
  ) {
    disposition =
      mostRestrictiveDisposition(
        disposition,
        "confirm",
      );

    reasons.push({
      code: "high-action-risk",
      detail:
        "High cognitive action risk requires confirmation.",
    });
  }

  if (
    !opportunity.reversible &&
    (
      opportunity.effect === "write" ||
      opportunity.effect === "external"
    )
  ) {
    disposition =
      mostRestrictiveDisposition(
        disposition,
        "confirm",
      );

    reasons.push({
      code: "irreversible-action",
      detail:
        "Irreversible write or external side effects require user involvement.",
    });
  }

  return {
    disposition,
    reasons,
  };
}

export function evaluateUnifiedGovernance(
  input: UnifiedGovernanceInput,
): UnifiedGovernanceDecision {
  const executionPolicy =
    getRiskPolicy(
      input.executionRisk,
      input.action,
    );

  const executionDisposition =
    mapExecutionModeToDisposition(
      executionPolicy.mode,
    );

  const reasons: UnifiedGovernanceReason[] =
    [
      executionReason(
        executionPolicy.mode,
        executionPolicy.reason,
      ),
    ];

  let cognitiveDisposition:
    UnifiedGovernanceDisposition =
      "allow";

  if (input.cognitive) {
    const cognitive =
      evaluateCognitiveGovernance(
        input.cognitive.governance,
        input.cognitive.opportunity,
      );

    cognitiveDisposition =
      cognitive.disposition;

    reasons.push(...cognitive.reasons);
  }

  return {
    disposition:
      mostRestrictiveDisposition(
        executionDisposition,
        cognitiveDisposition,
      ),
    executionRisk: input.executionRisk,
    executionMode: executionPolicy.mode,
    permission:
      input.cognitive?.governance
        .permission,
    autonomy:
      input.cognitive?.governance
        .autonomy,
    reasons,
  };
}
