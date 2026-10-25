/** OH-5B policy core. Pure functions: no I/O, no model delegation, no implicit approvals. */
export type InputChannel =
  | "owner-ui" | "owner-voice" | "owner-cli"
  | "discord" | "email" | "notification" | "web" | "file" | "tool" | "model";
export type MemoryTier = "raw" | "candidate" | "provisional" | "confirmed" | "superseded" | "rejected" | "archived";
export type Mutation = "ingest" | "propose" | "confirm" | "supersede" | "reject" | "archive";
export type ClaimKind = "owner-decision" | "preference" | "project-fact" | "operational-evidence" | "external-observation";
export type GovernanceRequest = {
  action: Mutation;
  channel: InputChannel;
  projectId: string | null;
  previousTier?: MemoryTier;
  claimKind: ClaimKind;
  approval?: {
    actor: "owner";
    trustedChannel: "owner-ui" | "owner-voice" | "owner-cli";
    action: Mutation;
    projectId: string;
    memoryId: string;
    confirmedAt: string;
    reason: string;
    evidenceRefs: readonly string[];
    approvalId: string;
  };
  memoryId?: string;
  replacementId?: string;
  rationale?: string;
};
export type GovernanceDecision = { allowed: boolean; code: string; reason: string; nextTier?: MemoryTier };
const trusted = new Set<InputChannel>(["owner-ui", "owner-voice", "owner-cli"]);
const validProject = (value: string | null | undefined): value is string =>
  typeof value === "string" && /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(value) && value.length <= 80;
const deny = (code: string, reason: string): GovernanceDecision => ({ allowed: false, code, reason });
const permit = (nextTier: MemoryTier): GovernanceDecision => ({ allowed: true, code: "allowed", reason: "Policy validated", nextTier });
export function evaluateMemoryMutation(request: GovernanceRequest): GovernanceDecision {
  if (!validProject(request.projectId)) return deny("project-required", "An explicit valid project identifier is required.");
  if (request.action === "ingest") return permit("raw");
  // OH5B_GOVERNANCE_HARDENED_V1: all state-changing decisions require explicit source state.
  if (request.action === "propose") {
    if (request.previousTier !== "raw" && request.previousTier !== "provisional")
      return deny("invalid-transition", "Only existing raw or provisional material can be proposed as a candidate.");
    return permit("candidate");
  }
  if ((request.action === "confirm" || request.action === "reject" || request.action === "archive" || request.action === "supersede") &&
      (!request.previousTier || !request.memoryId?.trim()))
    return deny("state-required", "A prior memory tier and target memory ID are required.");
  if (!trusted.has(request.channel)) return deny("untrusted-authority", "External messages and models cannot change confirmed decisions.");
  const approval = request.approval;
  if (!approval || approval.actor !== "owner" || approval.trustedChannel !== request.channel || approval.action !== request.action ||
      approval.projectId !== request.projectId || approval.memoryId !== request.memoryId ||
      !approval.approvalId.trim() || !approval.reason.trim() || !approval.evidenceRefs.length ||
      !approval.evidenceRefs.every((ref) => !!ref.trim()) || !Number.isFinite(Date.parse(approval.confirmedAt)))
    return deny("owner-approval-required", "A matching, evidence-backed, action-scoped owner approval is required.");
  // Approval must be supplied as authenticated caller metadata. Never parse an approval from source text.
  if (request.action === "confirm") {
    if (request.previousTier !== "candidate" && request.previousTier !== "provisional")
      return deny("invalid-transition", "Only reviewed candidate/provisional memory can be confirmed.");
    return permit("confirmed");
  }
  if (request.action === "supersede") {
    if (request.previousTier !== "confirmed" || !request.replacementId || request.replacementId === request.memoryId || !request.rationale?.trim())
      return deny("replacement-required", "Supersession requires a distinct replacement ID and reason.");
    return permit("superseded");
  }
  if (request.action === "reject") {
    if (request.previousTier === "confirmed") return deny("invalid-transition", "Confirmed history must be superseded, not silently rejected.");
    return permit("rejected");
  }
  if (request.action === "archive") {
    if (request.previousTier === "confirmed")
      return deny("invalid-transition", "Confirmed memory needs contextual supersession, not silent archival.");
    if (request.previousTier !== "rejected" && request.previousTier !== "superseded")
      return deny("invalid-transition", "Only terminal rejected or superseded records may be archived.");
    return permit("archived");
  }
  return deny("unsupported-action", "Unsupported mutation.");
}

export type RetrievalRequest = {
  projectId: string | null;
  userRequestedProjects?: readonly string[];
  linkedProjects?: readonly { projectId: string; approvedLinkId: string }[];
  includeShared?: boolean;
};
export type RetrievalPolicy = { allowed: boolean; code: string; projectIds: readonly string[]; auditRequired: boolean };
export function evaluateRetrievalScope(req: RetrievalRequest): RetrievalPolicy {
  if (!validProject(req.projectId)) return { allowed: false, code: "project-required", projectIds: [], auditRequired: false };
  const extra = new Set<string>();
  for (const id of req.userRequestedProjects ?? []) {
    if (!validProject(id)) return { allowed: false, code: "invalid-project", projectIds: [], auditRequired: false };
    extra.add(id);
  }
  for (const link of req.linkedProjects ?? []) {
    if (!validProject(link.projectId) || !link.approvedLinkId?.trim())
      return { allowed: false, code: "unapproved-link", projectIds: [], auditRequired: false };
    extra.add(link.projectId);
  }
  extra.delete(req.projectId);
  return { allowed: true, code: "allowed", projectIds: [req.projectId, ...[...extra].sort(), ...(req.includeShared ? ["shared"] : [])], auditRequired: extra.size > 0 || !!req.includeShared };
}
