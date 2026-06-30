export type ChernobogIncDepartmentId =
  | "executive-core"
  | "engineering"
  | "design"
  | "narrative"
  | "research"
  | "operations"
  | "security";

export type ChernobogIncRoleId =
  | "executive-core"
  | "project-lead"
  | "planner"
  | "designer"
  | "creator"
  | "reviewer"
  | "security-analyst";

export type ChernobogIncReportType =
  | "executive-briefing"
  | "department-report"
  | "work-proposal"
  | "risk-review"
  | "implementation-review";

export type ChernobogIncProposalStatus =
  | "proposed"
  | "awaiting-approval"
  | "approved"
  | "rejected"
  | "archived";

export type ChernobogIncApprovalGate = {
  required: boolean;
  reason: string;
  requiredBy: "governance" | "user" | "security" | "system";
};

export type ChernobogIncRoleDefinition = {
  id: ChernobogIncRoleId;
  title: string;
  purpose: string;
  responsibilities: string[];
  mayExecuteTools: boolean;
};

export type ChernobogIncDepartmentDefinition = {
  id: ChernobogIncDepartmentId;
  name: string;
  purpose: string;
  defaultRoles: ChernobogIncRoleId[];
  responsibilities: string[];
  boundaries: string[];
};

export type ChernobogIncExecutiveCore = {
  id: "executive-core";
  name: "Chernobog Executive Core";
  reportsTo: "CEO";
  purpose: string;
  responsibilities: string[];
  boundaries: string[];
};

export type ChernobogIncFoundation = {
  version: "v5.8";
  name: "Chernobog Inc Foundation";
  executiveCore: ChernobogIncExecutiveCore;
  departments: ChernobogIncDepartmentDefinition[];
  roles: ChernobogIncRoleDefinition[];
  reportTypes: ChernobogIncReportType[];
  safetyRules: string[];
};

export type ChernobogIncWorkProposalInput = {
  title: string;
  description: string;
  requestedBy?: string;
  departmentIds?: ChernobogIncDepartmentId[];
  projectId?: string;
  version?: string;
  tags?: string[];
};

export type ChernobogIncWorkProposal = {
  id: string;
  title: string;
  description: string;
  requestedBy: string;
  status: ChernobogIncProposalStatus;
  departmentIds: ChernobogIncDepartmentId[];
  projectId?: string;
  version?: string;
  tags: string[];
  approvalGate: ChernobogIncApprovalGate;
  executionAllowed: false;
  createdAt: string;
  updatedAt: string;
};

export type ChernobogIncProposalStore = {
  version: "v5.8";
  updatedAt: string;
  proposals: ChernobogIncWorkProposal[];
};
