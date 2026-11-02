import assert from "node:assert/strict";
import test from "node:test";
import { verifyOH5MemoryScope } from "../lib/chernobog/project/oh5MemoryScope";

const projects = [
  { id: "chernobog", aliases: ["Chernobog"] },
  { id: "malware", aliases: ["Malware"] },
];
const check = (message: string, selectedProjectId: string, sessionProjectId?: string) =>
  verifyOH5MemoryScope({ sessionId: "psi1f-test", sessionProjectId, userMessage: message, selectedProjectId, projects });

test("PSI 1F: matching selected and active project allowed", () => {
  assert.deepEqual(check("Within Chernobog, what is Silver Heron?", "chernobog", "chernobog"), { allowed: true, projectId: "chernobog" });
});
test("PSI 1F: client project selector cannot override active project", () => {
  assert.equal(check("What is the current task?", "malware", "chernobog").allowed, false);
});
test("PSI 1F: different mentioned project cannot inherit existing session", () => {
  assert.equal(check("Within Malware, what is Silver Heron?", "chernobog", "chernobog").allowed, false);
});
test("PSI 1F: separately mentioned project cannot use unrelated selector", () => {
  assert.equal(check("Within Malware, what is Silver Heron?", "chernobog").allowed, false);
});
test("PSI 1F: ambiguous multi-project questions fail closed", () => {
  assert.equal(check("Compare Chernobog and Malware", "chernobog", "chernobog").allowed, false);
});
test("PSI 1F: missing project authority fails closed", () => {
  assert.equal(check("What is the next milestone?", "chernobog").allowed, false);
});
test("PSI 1F: mentioned project matches selected project without session", () => {
  assert.equal(check("Within Malware, what is Silver Heron?", "malware").allowed, true);
});
