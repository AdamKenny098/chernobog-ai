import {
  getToolCatalogSnapshot,
} from "@/lib/chernobog/execution/toolCapabilities";

import type {
  CreateExecutionTaskInput,
  ExecutionRiskLevel,
  ExecutionStepKind,
  ExecutionTaskCategory,
} from "@/lib/chernobog/execution/types";

import {
  getTool,
} from "@/lib/chernobog/tools/registry";

import type {
  AuthorityBridgeDecision,
} from "./authorityBridge";

import type {
  ConfidenceAssessment,
} from "./confidenceEngine";

import type {
  CriticVerificationResult,
} from "./criticVerificationLayer";

export const ACTION_BRIDGE_VERSION =
  "oh4x.v1";

export type ActionBridgeTargetKind =
  | "tool"
  | "agent";

export interface ActionBridgeTarget {
  kind: ActionBridgeTargetKind;
  name: string;
}

export interface ActionBridgeIntent {
  id: string;
  proposalId: string;
  target: ActionBridgeTarget;
  input: unknown;
  goal: string;
  description?: string;
  category?: ExecutionTaskCategory;
  stepKind?: ExecutionStepKind;
  postActionVerification?: {
    required: boolean;
    checks?: string[];
    expectedOutcome?: string;
  };
  idempotencyMaterial?: string;
  metadata?: Record<string, unknown>;
}

export type ActionBridgeStatus =
  | "ready"
  | "approval-required"
  | "blocked";

export interface ActionBridgeExecutionBlueprint {
  category: ExecutionTaskCategory;
  input: string;
  goal: string;
  steps: NonNullable<CreateExecutionTaskInput["steps"]>;
  context: Record<string, unknown>;
}

export interface ActionBridgePacket {
  version: string;
  createdAt: string;
  status: ActionBridgeStatus;
  readyForExecution: boolean;
  idempotencyKey: string;
  proposalId: string;
  actionIntentId: string;
  target: ActionBridgeTarget;
  normalizedInput: unknown;
  authorityStatus: AuthorityBridgeDecision["status"];
  executionRisk: ExecutionRiskLevel;
  executionTask: ActionBridgeExecutionBlueprint;
  toolRequest?: {
    toolName: string;
    input: unknown;
    origin: "execution-task";
    executionHandlerAvailable: boolean;
  };
  agentRequest?: {
    agentId: string;
    input: unknown;
    handlerAction: string;
    handlerResolutionRequired: true;
  };
  postActionVerification: {
    required: boolean;
    checks: string[];
    expectedOutcome?: string;
    sourceVerificationTrusted: boolean;
    sourceConfidence: number;
  };
  provenance: {
    authorityBridgeVersion: string;
    criticVerificationVersion: string;
    confidenceEngineVersion: string;
    proposalId: string;
    actionIntentId: string;
  };
  warnings: string[];
  invariants: {
    toolInvoked: false;
    agentInvoked: false;
    executionStarted: false;
    authorityBypassed: false;
    riskReduced: false;
    approvalBypassed: false;
  };
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stableValue);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort((left, right) => left[0].localeCompare(right[0]))
        .map(([key, entry]) => [key, stableValue(entry)]),
    );
  }

  return value;
}

function stableStringify(value: unknown): string {
  return JSON.stringify(stableValue(value));
}

function fnv1a32(text: string): string {
  let hash = 0x811c9dc5;

  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }

  return hash.toString(16).padStart(8, "0");
}

function normalizeTargetName(name: string): string {
  const normalized = name.trim();

  if (!normalized) {
    throw new Error("Action target name must be non-empty.");
  }

  return normalized;
}

function categoryFor(intent: ActionBridgeIntent): ExecutionTaskCategory {
  return intent.category ?? (intent.target.kind === "tool" ? "system_operation" : "unknown");
}

function stepKindFor(intent: ActionBridgeIntent): ExecutionStepKind {
  return intent.stepKind ?? (intent.target.kind === "tool" ? "tool" : "workflow");
}

function buildIdempotencyKey(
  authority: AuthorityBridgeDecision,
  intent: ActionBridgeIntent,
  normalizedTarget: string,
): string {
  return `oh4x:${fnv1a32(stableStringify({
    proposalId: authority.proposalId,
    actionIntentId: intent.id,
    target: {
      kind: intent.target.kind,
      name: normalizedTarget,
    },
    input: stableValue(intent.input),
    executionRisk: authority.executionRisk,
    extra: intent.idempotencyMaterial ?? null,
  }))}`;
}

function statusForAuthority(authority: AuthorityBridgeDecision): ActionBridgeStatus {
  if (authority.status === "permitted" && authority.permittedToExecute) {
    return "ready";
  }

  if (authority.status === "requires-approval") {
    return "approval-required";
  }

  return "blocked";
}

function validateAuthorityBinding(
  authority: AuthorityBridgeDecision,
  intent: ActionBridgeIntent,
): void {
  if (authority.proposalId !== intent.proposalId) {
    throw new Error(
      "Action intent proposalId does not match the OH-4W authority decision.",
    );
  }

  if (authority.status === "permitted" && !authority.permittedToExecute) {
    throw new Error(
      "OH-4W authority decision is internally inconsistent: permitted status without execution permission.",
    );
  }
}

function validateToolTarget(name: string): { executionHandlerAvailable: boolean } {
  if (!getTool(name)) {
    throw new Error(
      `Action Bridge target "${name}" is not a registered Chernobog tool.`,
    );
  }

  const capability = getToolCatalogSnapshot().tools.find(
    (entry) => entry.name === name,
  );

  return {
    executionHandlerAvailable: capability?.executionTaskAvailable ?? false,
  };
}

export class ActionBridge {
  translate(input: {
    authority: AuthorityBridgeDecision;
    intent: ActionBridgeIntent;
    verification: CriticVerificationResult;
    confidence: ConfidenceAssessment;
  }): ActionBridgePacket {
    validateAuthorityBinding(input.authority, input.intent);

    const targetName = normalizeTargetName(input.intent.target.name);
    const status = statusForAuthority(input.authority);
    const warnings: string[] = [];
    const risk = input.authority.executionRisk;
    const idempotencyKey = buildIdempotencyKey(
      input.authority,
      input.intent,
      targetName,
    );

    let executionHandlerAvailable = false;

    if (input.intent.target.kind === "tool") {
      executionHandlerAvailable = validateToolTarget(targetName).executionHandlerAvailable;

      if (!executionHandlerAvailable) {
        warnings.push(
          `Registered tool "${targetName}" has no execution-task handler coverage. The packet remains non-executable until runtime support exists.`,
        );
      }
    } else {
      warnings.push(
        `Agent target "${targetName}" requires a downstream execution handler; OH-4X does not invoke agents directly.`,
      );
    }

    if (status === "approval-required") {
      warnings.push(
        "The action packet is materialized for approval workflow only; it is not ready for execution.",
      );
    }

    if (status === "blocked") {
      warnings.push(
        `OH-4W authority status "${input.authority.status}" prevents execution readiness.`,
      );
    }

    const actionName =
      input.intent.target.kind === "tool"
        ? targetName
        : `agent:${targetName}`;

    const executionTask: ActionBridgeExecutionBlueprint = {
      category: categoryFor(input.intent),
      input: input.intent.description ?? input.intent.goal,
      goal: input.intent.goal,
      steps: [
        {
          kind: stepKindFor(input.intent),
          label:
            input.intent.description ??
            `Execute ${input.intent.target.kind} ${targetName}`,
          action: actionName,
          input: structuredClone(input.intent.input),
          risk,
        },
      ],
      context: {
        oh4x: true,
        idempotencyKey,
        proposalId: input.authority.proposalId,
        actionIntentId: input.intent.id,
        authorityStatus: input.authority.status,
        authorityDecisionVersion: input.authority.version,
        sourceVerificationVersion: input.verification.version,
        sourceConfidenceVersion: input.confidence.version,
        postActionVerificationRequired:
          input.intent.postActionVerification?.required ?? false,
        postActionVerificationChecks: structuredClone(
          input.intent.postActionVerification?.checks ?? [],
        ),
        ...(input.intent.metadata ?? {}),
      },
    };

    // Tools may become runtime-ready only when authority permits and the
    // existing execution-task layer has handler coverage. Agent targets stay
    // fail-closed until a concrete downstream agent handler exists.
    const readyForExecution =
      status === "ready" &&
      risk !== "blocked" &&
      input.intent.target.kind === "tool" &&
      executionHandlerAvailable;

    if (status === "ready" && !readyForExecution) {
      warnings.push(
        "Authority permits the proposal, but runtime target coverage is incomplete; readyForExecution remains false.",
      );
    }

    return {
      version: ACTION_BRIDGE_VERSION,
      createdAt: new Date().toISOString(),
      status,
      readyForExecution,
      idempotencyKey,
      proposalId: input.authority.proposalId,
      actionIntentId: input.intent.id,
      target: {
        kind: input.intent.target.kind,
        name: targetName,
      },
      normalizedInput: structuredClone(input.intent.input),
      authorityStatus: input.authority.status,
      executionRisk: risk,
      executionTask,
      toolRequest:
        input.intent.target.kind === "tool"
          ? {
              toolName: targetName,
              input: structuredClone(input.intent.input),
              origin: "execution-task",
              executionHandlerAvailable,
            }
          : undefined,
      agentRequest:
        input.intent.target.kind === "agent"
          ? {
              agentId: targetName,
              input: structuredClone(input.intent.input),
              handlerAction: actionName,
              handlerResolutionRequired: true,
            }
          : undefined,
      postActionVerification: {
        required: input.intent.postActionVerification?.required ?? false,
        checks: structuredClone(input.intent.postActionVerification?.checks ?? []),
        expectedOutcome: input.intent.postActionVerification?.expectedOutcome,
        sourceVerificationTrusted: input.verification.trustedConclusion,
        sourceConfidence: input.confidence.score,
      },
      provenance: {
        authorityBridgeVersion: input.authority.version,
        criticVerificationVersion: input.verification.version,
        confidenceEngineVersion: input.confidence.version,
        proposalId: input.authority.proposalId,
        actionIntentId: input.intent.id,
      },
      warnings,
      invariants: {
        toolInvoked: false,
        agentInvoked: false,
        executionStarted: false,
        authorityBypassed: false,
        riskReduced: false,
        approvalBypassed: false,
      },
    };
  }
}

const defaultActionBridge = new ActionBridge();

export function getActionBridge(): ActionBridge {
  return defaultActionBridge;
}