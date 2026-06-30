import {
  CHERNOBOG_INC_DEPARTMENTS,
  CHERNOBOG_WORKER_ROLES,
  ChernobogIncDepartment,
  ChernobogWorkerRole,
  isChernobogIncDepartment,
  isChernobogWorkerRole,
} from "./chernobogMissionTypes";

export type ChernobogDepartmentWorkerProfile = {
  department: ChernobogIncDepartment;
  role: ChernobogWorkerRole;
  title: string;
  purpose: string;
  promptContract: string[];
  outputFormat: string[];
  mayExecuteTools: false;
  mayAutonomouslyAct: false;
  requiresApprovalFor: string[];
};

function titleCase(value: string) {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function makeWorkerProfile(
  department: ChernobogIncDepartment,
  role: ChernobogWorkerRole
): ChernobogDepartmentWorkerProfile {
  return {
    department,
    role,
    title: `${titleCase(department)} ${titleCase(role)}`,
    purpose: `Plan, analyse, and report on ${department} work from the perspective of the ${role} role.`,
    promptContract: [
      "Operate as a planning/reporting role only.",
      "Use approved vault memory and explicit mission context as source material.",
      "Do not execute tools or write files.",
      "Identify risks, unknowns, required approvals, and next safe steps.",
      "Escalate destructive, external, or ambiguous work to approval gates.",
    ],
    outputFormat: [
      "Summary",
      "Findings",
      "Risks",
      "Recommended next steps",
      "Required approvals",
    ],
    mayExecuteTools: false,
    mayAutonomouslyAct: false,
    requiresApprovalFor: [
      "file writes",
      "repo changes",
      "network actions",
      "memory approval",
      "mission status changes",
      "external communication",
    ],
  };
}

export function listChernobogDepartmentWorkerProfiles() {
  return CHERNOBOG_INC_DEPARTMENTS.flatMap((department) =>
    CHERNOBOG_WORKER_ROLES.map((role) => makeWorkerProfile(department, role))
  );
}

export function getChernobogDepartmentWorkerProfile(
  department: string,
  role: string
): ChernobogDepartmentWorkerProfile | undefined {
  const normalizedDepartment = department.trim().toLowerCase().replace(/\s+/g, "-");
  const normalizedRole = role.trim().toLowerCase().replace(/\s+/g, "-");

  if (!isChernobogIncDepartment(normalizedDepartment)) {
    return undefined;
  }

  if (!isChernobogWorkerRole(normalizedRole)) {
    return undefined;
  }

  return makeWorkerProfile(normalizedDepartment, normalizedRole);
}

export function getDefaultMissionWorkerRoles(
  department: ChernobogIncDepartment
): ChernobogWorkerRole[] {
  if (department === "security") {
    return ["planner", "reviewer", "security-analyst"];
  }

  if (department === "engineering") {
    return ["project-lead", "planner", "creator", "reviewer", "security-analyst"];
  }

  return ["project-lead", "planner", "reviewer", "security-analyst"];
}

export function formatChernobogDepartmentWorkers() {
  const profiles = listChernobogDepartmentWorkerProfiles();
  const lines = [
    "Chernobog Inc Department Workers",
    "",
    "Boundary: these are planning/reporting role profiles only. They cannot execute tools.",
    "",
  ];

  for (const department of CHERNOBOG_INC_DEPARTMENTS) {
    lines.push(`${titleCase(department)}:`);
    for (const profile of profiles.filter((item) => item.department === department)) {
      lines.push(`- ${profile.title}: ${profile.purpose}`);
    }
    lines.push("");
  }

  return lines.join("\n").trim();
}
