import type {
  ChernobogIncDepartmentDefinition,
  ChernobogIncDepartmentId,
  ChernobogIncFoundation,
  ChernobogIncRoleDefinition,
} from "./chernobogIncTypes";

const ROLE_DEFINITIONS: ChernobogIncRoleDefinition[] = [
  {
    id: "executive-core",
    title: "Executive Core",
    purpose: "Interpret CEO direction, coordinate departments, and keep work aligned with approved memory and governance.",
    responsibilities: [
      "Translate CEO direction into structured work proposals.",
      "Request department reports before execution is considered.",
      "Respect trust, permission, and approval boundaries.",
    ],
    mayExecuteTools: false,
  },
  {
    id: "project-lead",
    title: "Project Lead",
    purpose: "Own a scoped project area and report status, risks, and next steps.",
    responsibilities: [
      "Maintain project direction within a defined scope.",
      "Summarize progress and blockers.",
      "Prepare implementation proposals for review.",
    ],
    mayExecuteTools: false,
  },
  {
    id: "planner",
    title: "Planner",
    purpose: "Break proposed work into safe, reviewable steps.",
    responsibilities: [
      "Create phased plans.",
      "Identify dependencies and unclear requirements.",
      "Separate safe analysis from risky execution.",
    ],
    mayExecuteTools: false,
  },
  {
    id: "designer",
    title: "Designer",
    purpose: "Shape UX, architecture, narrative, or system design depending on department context.",
    responsibilities: [
      "Produce design options.",
      "Explain trade-offs.",
      "Keep output consistent with project identity and approved memory.",
    ],
    mayExecuteTools: false,
  },
  {
    id: "creator",
    title: "Creator",
    purpose: "Prepare implementation-ready artifacts after planning and review.",
    responsibilities: [
      "Draft files, specs, prompts, or implementation packages.",
      "Avoid direct execution unless a later approved execution layer allows it.",
      "Keep outputs reviewable and reversible.",
    ],
    mayExecuteTools: false,
  },
  {
    id: "reviewer",
    title: "Reviewer",
    purpose: "Evaluate quality, completeness, and alignment before approval.",
    responsibilities: [
      "Check proposals against known project state.",
      "Identify defects, gaps, and mismatches.",
      "Recommend approval, revision, or rejection.",
    ],
    mayExecuteTools: false,
  },
  {
    id: "security-analyst",
    title: "Security Analyst",
    purpose: "Review risk, permission boundaries, and unsafe actions.",
    responsibilities: [
      "Classify risky actions.",
      "Flag destructive or autonomous behavior.",
      "Require explicit approval where governance demands it.",
    ],
    mayExecuteTools: false,
  },
];

const DEPARTMENTS: ChernobogIncDepartmentDefinition[] = [
  {
    id: "engineering",
    name: "Engineering Department",
    purpose: "Handle code architecture, implementation planning, verification, and technical reports.",
    defaultRoles: ["project-lead", "planner", "creator", "reviewer", "security-analyst"],
    responsibilities: [
      "Design implementation packages.",
      "Prepare verification scripts.",
      "Summarize source-code systems into approved memory candidates.",
    ],
    boundaries: [
      "No autonomous code execution.",
      "No writes without governance approval in later execution layers.",
      "No bypassing TypeScript, lint, or verifier gates.",
    ],
  },
  {
    id: "design",
    name: "Design Department",
    purpose: "Handle interface, visual language, UX structure, and product feel.",
    defaultRoles: ["project-lead", "planner", "designer", "reviewer"],
    responsibilities: [
      "Prepare UI concepts and interaction rules.",
      "Keep interface decisions consistent with Chernobog identity.",
      "Convert design ideas into reviewable proposals.",
    ],
    boundaries: [
      "No UI rewrite without approved scope.",
      "No autonomous asset generation pipelines.",
    ],
  },
  {
    id: "narrative",
    name: "Narrative Department",
    purpose: "Handle lore, writing systems, character logic, and story-state organization.",
    defaultRoles: ["project-lead", "planner", "designer", "creator", "reviewer"],
    responsibilities: [
      "Organize narrative memory.",
      "Prepare lore reports and continuity checks.",
      "Separate canon, candidates, and rejected ideas.",
    ],
    boundaries: [
      "No canon changes without approval.",
      "No mixing project lore across unrelated projects.",
    ],
  },
  {
    id: "research",
    name: "Research Department",
    purpose: "Handle source gathering, comparisons, summaries, and evidence-backed reports.",
    defaultRoles: ["project-lead", "planner", "creator", "reviewer"],
    responsibilities: [
      "Prepare research briefs.",
      "Identify source quality and uncertainty.",
      "Convert useful findings into candidate memory.",
    ],
    boundaries: [
      "No uncited factual claims in research reports.",
      "No promotion of research candidates to approved memory without review.",
    ],
  },
  {
    id: "operations",
    name: "Operations Department",
    purpose: "Handle roadmap tracking, current state briefings, release flow, and project coordination.",
    defaultRoles: ["project-lead", "planner", "reviewer"],
    responsibilities: [
      "Maintain project/version state.",
      "Prepare release and milestone briefings.",
      "Track unresolved candidates, blockers, and next steps.",
    ],
    boundaries: [
      "No milestone advancement without pass evidence.",
      "No hidden schedule or background execution claims.",
    ],
  },
  {
    id: "security",
    name: "Security Department",
    purpose: "Handle safety, governance, permission review, and approval boundaries.",
    defaultRoles: ["project-lead", "planner", "security-analyst", "reviewer"],
    responsibilities: [
      "Review trust-policy decisions.",
      "Block forbidden or destructive proposals.",
      "Make approval requirements visible before execution.",
    ],
    boundaries: [
      "No silent downgrading of risk.",
      "No approval bypass.",
      "No autonomous execution authority in V5.8.",
    ],
  },
];

export function getChernobogIncFoundation(): ChernobogIncFoundation {
  return {
    version: "v5.8",
    name: "Chernobog Inc Foundation",
    executiveCore: {
      id: "executive-core",
      name: "Chernobog Executive Core",
      reportsTo: "CEO",
      purpose:
        "Coordinate company-style work as an executive layer while preserving user control, approved memory boundaries, and governance gates.",
      responsibilities: [
        "Receive direction from the CEO.",
        "Create structured reports and work proposals.",
        "Route work conceptually to departments.",
        "Require approval before any later execution-capable layer acts.",
      ],
      boundaries: [
        "Does not autonomously execute tools.",
        "Does not create missions yet.",
        "Does not bypass memory approval or trust governance.",
      ],
    },
    departments: DEPARTMENTS,
    roles: ROLE_DEFINITIONS,
    reportTypes: [
      "executive-briefing",
      "department-report",
      "work-proposal",
      "risk-review",
      "implementation-review",
    ],
    safetyRules: [
      "V5.8 defines organization structure only.",
      "Departments are planning and reporting abstractions, not autonomous agents.",
      "Work proposals require approval before execution can be considered.",
      "Security review must be available for risky work.",
      "Approved vault memory remains the source of truth for project history.",
    ],
  };
}

export function listChernobogIncDepartments(): ChernobogIncDepartmentDefinition[] {
  return getChernobogIncFoundation().departments;
}

export function listChernobogIncRoles(): ChernobogIncRoleDefinition[] {
  return getChernobogIncFoundation().roles;
}

export function resolveChernobogIncDepartment(
  input: string
): ChernobogIncDepartmentDefinition | undefined {
  const normalized = input.trim().toLowerCase().replace(/\s+/g, "-");
  return DEPARTMENTS.find(
    (department) =>
      department.id === normalized ||
      department.name.toLowerCase() === input.trim().toLowerCase() ||
      department.name.toLowerCase().replace(/\s+/g, "-") === normalized
  );
}

export function isChernobogIncDepartmentId(value: string): value is ChernobogIncDepartmentId {
  return DEPARTMENTS.some((department) => department.id === value);
}

export function formatChernobogIncFoundation(): string {
  const foundation = getChernobogIncFoundation();
  return [
    `${foundation.name} (${foundation.version})`,
    "",
    "Executive Core:",
    `- ${foundation.executiveCore.name}`,
    `- Reports to: ${foundation.executiveCore.reportsTo}`,
    `- Purpose: ${foundation.executiveCore.purpose}`,
    "",
    "Departments:",
    ...foundation.departments.map(
      (department) => `- ${department.name}: ${department.purpose}`
    ),
    "",
    "Safety rules:",
    ...foundation.safetyRules.map((rule) => `- ${rule}`),
  ].join("\n");
}

export function formatChernobogIncDepartment(
  department: ChernobogIncDepartmentDefinition
): string {
  return [
    `${department.name}`,
    `ID: ${department.id}`,
    `Purpose: ${department.purpose}`,
    "",
    "Default roles:",
    ...department.defaultRoles.map((role) => `- ${role}`),
    "",
    "Responsibilities:",
    ...department.responsibilities.map((item) => `- ${item}`),
    "",
    "Boundaries:",
    ...department.boundaries.map((item) => `- ${item}`),
  ].join("\n");
}

export function formatChernobogIncRoles(): string {
  return [
    "Chernobog Inc Role Catalog",
    "",
    ...ROLE_DEFINITIONS.map((role) =>
      [
        `${role.title}`,
        `ID: ${role.id}`,
        `Purpose: ${role.purpose}`,
        `May execute tools: ${role.mayExecuteTools ? "yes" : "no"}`,
        "Responsibilities:",
        ...role.responsibilities.map((item) => `- ${item}`),
      ].join("\n")
    ),
  ].join("\n\n");
}

export function formatChernobogIncReportFormat(): string {
  return [
    "Chernobog Inc Report Format",
    "",
    "Required sections:",
    "- Title",
    "- Department",
    "- Purpose",
    "- Approved memory basis",
    "- Findings",
    "- Risks",
    "- Recommended next step",
    "- Approval needed",
    "",
    "Rule: reports may propose work, but V5.8 reports do not execute work.",
  ].join("\n");
}
