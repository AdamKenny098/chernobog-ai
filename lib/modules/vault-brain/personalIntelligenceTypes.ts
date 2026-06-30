import type { ChernobogIncDepartment } from "./chernobogMissionTypes";
import type { TrustActionType, TrustDecision } from "./trustActionTypes";

export const V6_OPERATING_LOOP_PHASES = [
  "ceo-direction",
  "executive-interpretation",
  "vault-context",
  "governance-review",
  "department-routing",
  "mission-proposal",
  "controlled-execution-plan",
  "approval-checkpoints",
  "reporting",
  "memory-update-proposal",
] as const;

export type V6OperatingLoopPhaseId = (typeof V6_OPERATING_LOOP_PHASES)[number];

export const V6_OPERATING_LOOP_PHASE_STATUSES = [
  "ready",
  "requires-approval",
  "manual-only",
  "blocked",
] as const;

export type V6OperatingLoopPhaseStatus =
  (typeof V6_OPERATING_LOOP_PHASE_STATUSES)[number];

export type V6OperatingLoopPhase = {
  id: V6OperatingLoopPhaseId;
  title: string;
  status: V6OperatingLoopPhaseStatus;
  description: string;
  output: string;
  approvalRequired: boolean;
  executesTools: false;
};

export type V6PersonalIntelligenceBoundary = {
  vaultFirstByDefault: true;
  approvedMemoryRequiredForProjectHistory: true;
  rawMemoryCannotBecomeTruthAutomatically: true;
  missionsRequireApproval: true;
  controlledExecutionPlansRemainDryRunOnly: true;
  toolExecutionRequiresFutureMilestone: true;
  autonomousExecutionAllowed: false;
  freeRoamingAgentsAllowed: false;
};

export type V6OperatingPacketInput = {
  request: string;
  projectId?: string;
  version?: string;
  createdBy?: "ceo" | "executive-core" | "system";
};

export type V6OperatingPacket = {
  id: string;
  version: "v6.0";
  title: "Chernobog Personal Intelligence Operating Packet";
  request: string;
  projectId: string;
  milestoneVersion?: string;
  createdBy: "ceo" | "executive-core" | "system";
  createdAt: string;
  executiveSummary: string;
  inferredActionType: TrustActionType;
  governanceDecision: TrustDecision;
  recommendedDepartments: ChernobogIncDepartment[];
  recommendedMissionTitle: string;
  recommendedMissionObjective: string;
  phases: V6OperatingLoopPhase[];
  nextHumanApproval: string;
  reportNotes: string[];
  memoryUpdateProposal: {
    proposed: true;
    automaticWriteAllowed: false;
    status: "candidate";
    reason: string;
  };
  executionAllowed: false;
  toolExecutionAllowed: false;
  autonomousExecutionAllowed: false;
  boundary: V6PersonalIntelligenceBoundary;
};

export type V6PersonalIntelligenceSystemStatus = {
  version: "v6.0";
  title: "Chernobog Personal Intelligence System";
  ok: boolean;
  generatedAt: string;
  readinessOk: boolean;
  activeOperatingModel: "ceo-directed";
  coreLoop: V6OperatingLoopPhaseId[];
  boundary: V6PersonalIntelligenceBoundary;
  capabilities: string[];
  blockedCapabilities: string[];
  nextRecommendedStep: string;
};
