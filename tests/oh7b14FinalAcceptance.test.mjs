import assert from "node:assert/strict";
import { test } from "node:test";
import { inspectOH7B14FinalAcceptance } from "../scripts/oh7b14-final-acceptance.mjs";

function preflight() {
  return { productionCoreReady: false, activationAuthorized: false };
}
function exclusion() {
  return {
    activationAuthorized: false,
    runtimeWriterExclusionProven: false,
    candidateTemplateSafeForNonoperationalInspection: true,
    legacyServiceCurrentlyQuiescent: false,
  };
}

test("B14 final inspection explicitly denies production activation while legacy runs", () => {
  const result = inspectOH7B14FinalAcceptance({
    deployment: preflight,
    writerExclusion: exclusion,
    readCandidate: () => "[Service]\nProtectSystem=strict",
  });
  assert.equal(result.candidateTemplateSafe, true);
  assert.equal(result.liveLegacyQuiescent, false);
  assert.equal(result.productionCoreReady, false);
  assert.equal(result.activationAuthorized, false);
  assert.equal(result.supervisedOperationalCoreEntryPointPresent, false);
  assert.equal(result.blockersForB15.length, 4);
});

test("B14 final inspection never authorizes activation even if preflight erroneously does", () => {
  const result = inspectOH7B14FinalAcceptance({
    deployment: () => ({ productionCoreReady: true, activationAuthorized: true }),
    writerExclusion: () => ({
      activationAuthorized: true,
      runtimeWriterExclusionProven: true,
      candidateTemplateSafeForNonoperationalInspection: true,
      legacyServiceCurrentlyQuiescent: true,
    }),
    readCandidate: () => "",
  });
  assert.equal(result.activationAuthorized, false);
  assert.equal(result.productionCoreReady, false);
  assert.ok(result.findings.some(item => item.includes("did not explicitly deny")));
});

test("B14 final inspection remains safe if systemd or unit inspection fails", () => {
  const result = inspectOH7B14FinalAcceptance({
    deployment() { throw new Error("systemctl unavailable"); },
    writerExclusion() { throw new Error("unit missing"); },
    readCandidate: () => "",
  });
  assert.equal(result.activationAuthorized, false);
  assert.equal(result.candidateTemplateSafe, false);
  assert.equal(result.findings.length, 2);
});
