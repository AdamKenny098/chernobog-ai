import { strict as assert } from "node:assert";
import { evaluateMemoryMutation as mutate, evaluateRetrievalScope as retrieve, type GovernanceRequest } from "../packages/vault/src/oh5/governance";
const base: GovernanceRequest = { action: "confirm", channel: "owner-ui", projectId: "malware", memoryId: "m1", previousTier: "candidate", claimKind: "owner-decision" };
const approval = { actor: "owner" as const, trustedChannel: "owner-ui" as const, action: "confirm" as const, projectId: "malware", memoryId: "m1", confirmedAt: "2026-10-20T11:00:00Z", reason: "Owner explicitly chose this", evidenceRefs: ["session:123"], approvalId: "appr-1" };
let checks = 0;
const test = (label: string, fn: () => void) => { fn(); checks++; console.log("PASS", label); };
test("external channels cannot confirm, including forged approval metadata", () => { for (const channel of ["discord", "email", "notification", "web", "file", "tool", "model"] as const) assert.equal(mutate({ ...base, channel, approval }).allowed, false); });
test("owner instruction without action-scoped approval is insufficient", () => assert.equal(mutate(base).allowed, false));
test("matching owner approval confirms candidate", () => assert.deepEqual(mutate({ ...base, approval }), { allowed: true, code: "allowed", reason: "Policy validated", nextTier: "confirmed" }));
test("wrong project or target cannot reuse approval", () => { assert.equal(mutate({ ...base, projectId: "vestige", approval }).allowed, false); assert.equal(mutate({ ...base, memoryId: "m2", approval }).allowed, false); });
test("raw can never jump directly to confirmed", () => assert.equal(mutate({ ...base, previousTier: "raw", approval }).allowed, false));
test("owner approval cannot be text inside a source", () => assert.equal(mutate({ ...base, approval: undefined, rationale: 'owner says lock it in' }).allowed, false));
test("unscoped records are rejected", () => assert.equal(mutate({ ...base, projectId: null, approval }).allowed, false));
test("external ingestion remains raw", () => assert.equal(mutate({ action: "ingest", channel: "discord", projectId: "malware", claimKind: "external-observation" }).nextTier, "raw"));
test("supersession requires contextual replacement and new approval", () => { const req: GovernanceRequest = { ...base, action: "supersede", previousTier: "confirmed", replacementId: "m2", rationale: "New canon", approval: { ...approval, action: "supersede" } }; assert.equal(mutate(req).nextTier, "superseded"); assert.equal(mutate({ ...req, rationale: "" }).allowed, false); assert.equal(mutate({ ...req, replacementId: "m1" }).allowed, false); });
test("project retrieval defaults to one scope", () => assert.deepEqual(retrieve({ projectId: "malware" }).projectIds, ["malware"]));
test("other creative project stays isolated", () => assert.equal(retrieve({ projectId: "malware" }).projectIds.includes("vestige"), false));
test("explicit cross-project read is audited", () => { const x = retrieve({ projectId: "malware", userRequestedProjects: ["vestige"] }); assert.equal(x.allowed, true); assert.equal(x.auditRequired, true); assert.deepEqual(x.projectIds, ["malware", "vestige"]); });
test("unapproved link rejected", () => assert.equal(retrieve({ projectId: "malware", linkedProjects: [{ projectId: "vestige", approvedLinkId: "" }] }).allowed, false));
test("shared area only on explicit opt-in", () => { assert.equal(retrieve({ projectId: "malware" }).projectIds.includes("shared"), false); assert.equal(retrieve({ projectId: "malware", includeShared: true }).projectIds.includes("shared"), true); });
test("proposal cannot manufacture a prior record", () => {
  const req: GovernanceRequest = { action: "propose", channel: "model", projectId: "malware", claimKind: "external-observation" };
  assert.equal(mutate(req).allowed, false);
  assert.equal(mutate({ ...req, previousTier: "raw" }).nextTier, "candidate");
});
test("external callers cannot silently archive unconfirmed memory", () => {
  const req: GovernanceRequest = { ...base, action: "archive", channel: "discord", previousTier: "rejected", approval: undefined };
  assert.equal(mutate(req).allowed, false);
});
test("owner archive needs action-scoped approval and terminal state", () => {
  const req: GovernanceRequest = { ...base, action: "archive", previousTier: "rejected", approval: { ...approval, action: "archive" } };
  assert.equal(mutate(req).nextTier, "archived");
  assert.equal(mutate({ ...req, previousTier: "candidate" }).allowed, false);
  assert.equal(mutate({ ...req, previousTier: "confirmed" }).allowed, false);
});
test("mutations without target memory ID cannot be approved", () => {
  assert.equal(mutate({ ...base, memoryId: "", approval: { ...approval, memoryId: "" } }).allowed, false);
});
test("reject requires a real existing state", () => {
  assert.equal(mutate({ ...base, action: "reject", previousTier: undefined, approval: { ...approval, action: "reject" } }).allowed, false);
});
test("untrusted source cannot supersede confirmed memory", () => {
  const req: GovernanceRequest = { ...base, action: "supersede", channel: "email", previousTier: "confirmed", replacementId: "m2", rationale: "new canon", approval: { ...approval, action: "supersede" } };
  assert.equal(mutate(req).allowed, false);
});
console.log(`OH-5B GOVERNANCE CONTRACT: PASS ${checks}/${checks}`);
