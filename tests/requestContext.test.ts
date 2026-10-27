import { strict as assert } from "node:assert";
import { test } from "node:test";
import { resolveRequestContext, type ProjectDescriptor, type RequestContextInput } from "../lib/chernobog/project/requestContext";
const projects: ProjectDescriptor[] = [
  { id: "chernobog", aliases: ["Chernobog", "chernobog ai"] },
  { id: "crew-connect", aliases: ["Crew Connect"] },
  { id: "old", aliases: ["Old Project"], archived: true },
];
const base: RequestContextInput = { requestId: "r1", actorTrust: "authenticated-owner", userMessage: "Continue work" };
const resolve = (patch: Partial<RequestContextInput>) => resolveRequestContext({ ...base, ...patch }, projects);
test("explicit project wins over session", () => assert.equal(resolve({ explicitProjectId: "crew-connect", sessionProjectId: "chernobog" }).projectId, "crew-connect"));
test("session context is verified", () => { const r = resolve({ sessionProjectId: "chernobog" }); assert.equal(r.provenance, "verified"); assert.equal(r.projectId, "chernobog"); });
test("mentioned project switches focus", () => assert.equal(resolve({ userMessage: "Continue Crew Connect", sessionProjectId: "chernobog" }).projectId, "crew-connect"));
test("multiple projects remain ambiguous", () => { const r = resolve({ userMessage: "Compare Chernobog and Crew Connect" }); assert.equal(r.resolution, "ambiguous"); assert.equal(r.retrievalProjectId, null); assert.equal(r.mentionedProjectIds.length, 2); });
test("no context stays unresolved", () => assert.equal(resolve({}).resolution, "unresolved"));
test("conversation context is inferred", () => assert.equal(resolve({ conversationProjectId: "chernobog" }).provenance, "inferred"));
test("untrusted actor cannot select explicit project", () => assert.equal(resolve({ actorTrust: "external", explicitProjectId: "chernobog" }).projectId, null));
test("archived project cannot be selected", () => assert.equal(resolve({ explicitProjectId: "old" }).resolution, "ambiguous"));
test("unknown explicit selection does not fall back silently", () => assert.equal(resolve({ explicitProjectId: "missing", sessionProjectId: "chernobog" }).projectId, null));
test("read-only context", () => assert.equal(resolve({}).readOnly, true));
