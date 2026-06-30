import type { ChernobogIncDepartment } from "./chernobogMissionTypes";
import { createTrustDecision } from "./trustDecision";
import type { TrustActionType } from "./trustActionTypes";
import { generateV6ReadinessReport } from "./v6ReadinessReport";
import type {
  V6OperatingLoopPhase,
  V6OperatingPacket,
  V6OperatingPacketInput,
  V6PersonalIntelligenceBoundary,
  V6PersonalIntelligenceSystemStatus,
} from "./personalIntelligenceTypes";

export const V6_PERSONAL_INTELLIGENCE_BOUNDARY: V6PersonalIntelligenceBoundary = {
  vaultFirstByDefault: true,
  approvedMemoryRequiredForProjectHistory: true,
  rawMemoryCannotBecomeTruthAutomatically: true,
  missionsRequireApproval: true,
  controlledExecutionPlansRemainDryRunOnly: true,
  toolExecutionRequiresFutureMilestone: true,
  autonomousExecutionAllowed: false,
  freeRoamingAgentsAllowed: false,
};

function nowIso(): string {
  return new Date().toISOString();
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function makePacketId(request: string): string {
  return `v6-packet-${slugify(request) || "request"}-${Date.now().toString(36)}`;
}

export function inferV6TrustActionType(request: string): TrustActionType {
  const normalized = request.toLowerCase();

  if (/\b(delete|remove|wipe|destroy|erase|trash)\b/.test(normalized)) {
    return "delete";
  }

  if (/\b(run|execute|build|test|verify|lint|compile|command)\b/.test(normalized)) {
    return "project-command";
  }

  if (/\b(write|patch|change|modify|edit|implement|fix|create|add)\b/.test(normalized)) {
    return "file-write";
  }

  if (/\b(send|email|post|publish|external)\b/.test(normalized)) {
    return "external-send";
  }

  if (/\b(memory|vault|recall|brief|summarize|summary|state)\b/.test(normalized)) {
    return "memory-read";
  }

  return "summarize";
}

export function inferV6Departments(request: string): ChernobogIncDepartment[] {
  const normalized = request.toLowerCase();
  const departments = new Set<ChernobogIncDepartment>();

  if (/\b(code|repo|typescript|api|route|build|compile|fix|patch|implementation)\b/.test(normalized)) {
    departments.add("engineering");
  }

  if (/\b(ui|visual|design|layout|screen|component|style)\b/.test(normalized)) {
    departments.add("design");
  }

  if (/\b(lore|story|narrative|character|chapter|dialogue)\b/.test(normalized)) {
    departments.add("narrative");
  }

  if (/\b(research|investigate|compare|inspect|analyze|analyse|source)\b/.test(normalized)) {
    departments.add("research");
  }

  if (/\b(schedule|deploy|ops|operation|process|workflow|report|briefing)\b/.test(normalized)) {
    departments.add("operations");
  }

  departments.add("security");

  if (departments.size === 1) {
    departments.add("engineering");
  }

  return Array.from(departments);
}

function titleFromRequest(request: string): string {
  const trimmed = request.trim().replace(/\s+/g, " ");
  if (trimmed.length <= 72) {
    return trimmed;
  }
  return `${trimmed.slice(0, 69)}...`;
}

function buildPhases(args: {
  request: string;
  projectId: string;
  version?: string;
  actionType: TrustActionType;
  departments: ChernobogIncDepartment[];
  governanceStatus: string;
}): V6OperatingLoopPhase[] {
  const scope = `${args.projectId}${args.version ? ` ${args.version}` : ""}`;

  return [
    {
      id: "ceo-direction",
      title: "CEO direction captured",
      status: "ready",
      description: "The user request is treated as CEO-level direction to the Executive Core.",
      output: args.request,
      approvalRequired: false,
      executesTools: false,
    },
    {
      id: "executive-interpretation",
      title: "Executive Core interpretation",
      status: "ready",
      description: "Chernobog interprets the direction into project scope, intent, and likely work type.",
      output: `Scope: ${scope}. Inferred action type: ${args.actionType}.`,
      approvalRequired: false,
      executesTools: false,
    },
    {
      id: "vault-context",
      title: "Approved vault context required",
      status: "manual-only",
      description: "Project history should come from approved structured vault memory before mission planning.",
      output: "Use approved structured memory, current-state briefings, code-summary memory, and project/version profiles.",
      approvalRequired: false,
      executesTools: false,
    },
    {
      id: "governance-review",
      title: "Governance review",
      status: args.governanceStatus === "blocked" ? "blocked" : "requires-approval",
      description: "Trust governance evaluates whether the request is safe, approval-gated, or blocked.",
      output: `Governance decision: ${args.governanceStatus}.`,
      approvalRequired: true,
      executesTools: false,
    },
    {
      id: "department-routing",
      title: "Department routing",
      status: "ready",
      description: "The request is routed to Chernobog Inc departments for planning responsibility.",
      output: `Recommended departments: ${args.departments.join(", ")}.`,
      approvalRequired: false,
      executesTools: false,
    },
    {
      id: "mission-proposal",
      title: "Mission proposal",
      status: "requires-approval",
      description: "A mission may be proposed, but it must go through V5.9 approval checkpoints.",
      output: "Create a proposed mission record if the CEO wants to proceed.",
      approvalRequired: true,
      executesTools: false,
    },
    {
      id: "controlled-execution-plan",
      title: "Controlled execution plan",
      status: "requires-approval",
      description: "Approved missions may receive a dry-run-only controlled execution plan.",
      output: "Execution planning remains dry-run only. Tool execution remains blocked.",
      approvalRequired: true,
      executesTools: false,
    },
    {
      id: "approval-checkpoints",
      title: "Approval checkpoints",
      status: "requires-approval",
      description: "CEO and Security checkpoints are required before any later execution milestone can be considered.",
      output: "Checkpoint approval must be explicit and audited.",
      approvalRequired: true,
      executesTools: false,
    },
    {
      id: "reporting",
      title: "Final report",
      status: "manual-only",
      description: "Chernobog reports what was planned, what is blocked, and what requires approval.",
      output: "Report first. Execute never in V6.0 without later explicit execution support.",
      approvalRequired: false,
      executesTools: false,
    },
    {
      id: "memory-update-proposal",
      title: "Memory update proposal",
      status: "requires-approval",
      description: "After work is reviewed, Chernobog proposes candidate memory updates instead of silently approving them.",
      output: "Memory updates are candidate/reviewed flow only; raw memory is never promoted automatically.",
      approvalRequired: true,
      executesTools: false,
    },
  ];
}

export function createV6OperatingPacket(
  input: V6OperatingPacketInput
): V6OperatingPacket {
  const request = input.request.trim();
  if (!request) {
    throw new Error("V6 operating packet request is required.");
  }

  const projectId = input.projectId?.trim() || "chernobog";
  const milestoneVersion = input.version?.trim() || undefined;
  const actionType = inferV6TrustActionType(request);
  const departments = inferV6Departments(request);
  const governanceDecision = createTrustDecision({
    title: `V6 operating packet: ${titleFromRequest(request)}`,
    description: request,
    actionType,
    requestedTool: actionType === "memory-read" ? "vault.memory.read" : undefined,
    projectId,
    version: milestoneVersion,
    target: request,
    actor: "chernobog-inc/executive-core",
    metadata: {
      v6OperatingPacket: true,
      dryRunOnly: true,
      autonomousExecutionAllowed: false,
    },
  });

  const recommendedMissionTitle = `Mission proposal — ${titleFromRequest(request)}`;
  const recommendedMissionObjective = [
    `Interpret and plan the CEO request: ${request}`,
    "Use approved vault memory first.",
    "Route work through Chernobog Inc departments.",
    "Apply governance before any risky action.",
    "Produce a controlled execution plan only after mission approval.",
  ].join(" ");

  const phases = buildPhases({
    request,
    projectId,
    version: milestoneVersion,
    actionType,
    departments,
    governanceStatus: governanceDecision.status,
  });

  return {
    id: makePacketId(request),
    version: "v6.0",
    title: "Chernobog Personal Intelligence Operating Packet",
    request,
    projectId,
    milestoneVersion,
    createdBy: input.createdBy ?? "ceo",
    createdAt: nowIso(),
    executiveSummary: `Chernobog can convert this CEO direction into a governed mission proposal for ${projectId}. Tool execution remains blocked; the next safe output is a proposal/report, not action.`,
    inferredActionType: actionType,
    governanceDecision,
    recommendedDepartments: departments,
    recommendedMissionTitle,
    recommendedMissionObjective,
    phases,
    nextHumanApproval:
      governanceDecision.status === "blocked"
        ? "Do not proceed. The governance layer blocked this request."
        : "CEO may approve creation of a mission proposal. Controlled execution remains dry-run only.",
    reportNotes: [
      "V6.0 unifies memory, governance, departments, missions, controlled execution planning, and reporting.",
      "Approved vault memory is the source of truth for project history.",
      "Chernobog Inc departments are planning/reporting structures unless later execution support is explicitly added.",
      "No free-roaming agents are enabled by this packet.",
    ],
    memoryUpdateProposal: {
      proposed: true,
      automaticWriteAllowed: false,
      status: "candidate",
      reason:
        "Any memory update produced from this work must enter the structured memory review flow and cannot be approved automatically.",
    },
    executionAllowed: false,
    toolExecutionAllowed: false,
    autonomousExecutionAllowed: false,
    boundary: V6_PERSONAL_INTELLIGENCE_BOUNDARY,
  };
}

export function getV6PersonalIntelligenceSystemStatus(): V6PersonalIntelligenceSystemStatus {
  const readiness = generateV6ReadinessReport({ includePackageScriptChecks: false });

  return {
    version: "v6.0",
    title: "Chernobog Personal Intelligence System",
    ok: readiness.ok,
    generatedAt: nowIso(),
    readinessOk: readiness.ok,
    activeOperatingModel: "ceo-directed",
    coreLoop: [
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
    ],
    boundary: V6_PERSONAL_INTELLIGENCE_BOUNDARY,
    capabilities: [
      "Approved structured vault memory",
      "Vault-only answer mode",
      "Project/version state profiles",
      "Current-state briefings",
      "Trust and governance decisions",
      "Chernobog Inc department structure",
      "Mission records and approval checkpoints",
      "Dry-run-only controlled execution plans",
      "V6 readiness reporting",
    ],
    blockedCapabilities: [
      "Free-roaming autonomous agents",
      "Ungated tool execution",
      "Automatic approval of raw memory",
      "Mission execution without CEO/security checkpoints",
      "File writes through the V6 operating loop",
    ],
    nextRecommendedStep:
      "Use the V6 operating loop to turn CEO direction into governed mission proposals and reports.",
  };
}

export function formatV6OperatingPacket(packet: V6OperatingPacket): string {
  return [
    `${packet.title}`,
    `ID: ${packet.id}`,
    `Version: ${packet.version}`,
    `Project: ${packet.projectId}`,
    packet.milestoneVersion ? `Milestone: ${packet.milestoneVersion}` : undefined,
    `Created by: ${packet.createdBy}`,
    "",
    "CEO request:",
    packet.request,
    "",
    "Executive summary:",
    packet.executiveSummary,
    "",
    "Governance:",
    `- Decision: ${packet.governanceDecision.status}`,
    `- Risk: ${packet.governanceDecision.risk}`,
    `- Approval required: ${packet.governanceDecision.approvalRequired ? "yes" : "no"}`,
    `- Allowed to execute now: ${packet.governanceDecision.allowedToExecute ? "yes" : "no"}`,
    "",
    "Recommended departments:",
    packet.recommendedDepartments.map((department) => `- ${department}`).join("\n"),
    "",
    "Recommended mission:",
    `- Title: ${packet.recommendedMissionTitle}`,
    `- Objective: ${packet.recommendedMissionObjective}`,
    "",
    "Operating loop:",
    packet.phases
      .map(
        (phase) =>
          `- ${phase.id}: ${phase.status} | approval: ${phase.approvalRequired ? "yes" : "no"} | executes tools: ${phase.executesTools ? "yes" : "no"}\n  ${phase.output}`
      )
      .join("\n"),
    "",
    "Execution boundary:",
    `- Execution allowed: ${packet.executionAllowed ? "yes" : "no"}`,
    `- Tool execution allowed: ${packet.toolExecutionAllowed ? "yes" : "no"}`,
    `- Autonomous execution allowed: ${packet.autonomousExecutionAllowed ? "yes" : "no"}`,
    `- Controlled execution dry-run only: ${packet.boundary.controlledExecutionPlansRemainDryRunOnly ? "yes" : "no"}`,
    "",
    "Next human approval:",
    packet.nextHumanApproval,
  ]
    .filter((line): line is string => typeof line === "string")
    .join("\n");
}

export function formatV6SystemStatus(status: V6PersonalIntelligenceSystemStatus): string {
  return [
    `${status.title}`,
    `Version: ${status.version}`,
    `Status: ${status.ok ? "ready" : "not ready"}`,
    `Readiness checks: ${status.readinessOk ? "passed" : "failed"}`,
    `Operating model: ${status.activeOperatingModel}`,
    "",
    "Core loop:",
    status.coreLoop.map((phase, index) => `${index + 1}. ${phase}`).join("\n"),
    "",
    "Capabilities:",
    status.capabilities.map((capability) => `- ${capability}`).join("\n"),
    "",
    "Blocked capabilities:",
    status.blockedCapabilities.map((capability) => `- ${capability}`).join("\n"),
    "",
    "Boundary:",
    `- Vault-first by default: ${status.boundary.vaultFirstByDefault ? "yes" : "no"}`,
    `- Approved memory required for project history: ${status.boundary.approvedMemoryRequiredForProjectHistory ? "yes" : "no"}`,
    `- Missions require approval: ${status.boundary.missionsRequireApproval ? "yes" : "no"}`,
    `- Tool execution requires future milestone: ${status.boundary.toolExecutionRequiresFutureMilestone ? "yes" : "no"}`,
    `- Free-roaming agents allowed: ${status.boundary.freeRoamingAgentsAllowed ? "yes" : "no"}`,
    "",
    `Next: ${status.nextRecommendedStep}`,
  ].join("\n");
}
