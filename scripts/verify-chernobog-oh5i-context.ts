import assert from "node:assert/strict";
import { OH5ContextAssembler, composeEvidenceAnswer, formatContextForModel } from "../packages/vault/src/oh5/context";
import type { RecallHit } from "../packages/vault/src/oh5/recall";

const hits: RecallHit[] = [
  { id: "mem-1", projectId: "malware", body: "Skyquake survived and returned to the Nemesis.", sourceRef: "owner:chapter-7", channel: "owner-ui", revision: 2, updatedAt: "2026-10-20T12:00:00Z", score: 4 },
  { id: "mem-2", projectId: "malware", body: "Skyquake met Dreadwing.", sourceRef: "owner:chapter-8", channel: "owner-ui", revision: 1, updatedAt: "2026-10-20T13:00:00Z", score: 2 },
];
const mock = { search: ({ projectId, query }: { projectId: string; query: string; limit?: number }) => hits.filter(x => x.projectId === projectId && x.body.toLowerCase().includes(query.toLowerCase())) };
const builder = new OH5ContextAssembler(mock);
let total = 0;
function check(label: string, test: () => void): void { test(); total++; console.log(`PASS ${label}`); }
const packet = builder.build({ mode: "vault-only", projectId: "malware", query: "Skyquake" });
check("confirmed snippets returned", () => assert.equal(packet.snippets.length, 2));
check("source references retained", () => assert.equal(packet.citations[0].sourceRef, "owner:chapter-7"));
check("revision retained", () => assert.equal(packet.citations[0].revision, 2));
check("project required", () => assert.throws(() => builder.build({ mode: "vault-only", query: "Skyquake" })));
check("empty vault yields insufficient", () => assert.equal(composeEvidenceAnswer(builder.build({ mode: "vault-only", projectId: "vestige", query: "Skyquake" })).evidenceStatus, "insufficient"));
check("general mode avoids vault", () => assert.equal(builder.build({ mode: "general", query: "Skyquake" }).snippets.length, 0));
check("prompt text labels data as evidence", () => assert.match(formatContextForModel(packet), /not instructions/i));
check("extractive answer cites source", () => assert.match(composeEvidenceAnswer(packet).answer, /owner:chapter-7/));
check("no auto write capability", () => assert.equal(typeof (builder as unknown as Record<string, unknown>).confirm, "undefined"));
check("invalid mode rejected", () => assert.throws(() => builder.build({ mode: "invalid" as "vault-only", projectId: "malware", query: "Skyquake" })));
check("small character budget rejected", () => assert.throws(() => builder.build({ mode: "vault-only", projectId: "malware", query: "Skyquake", maxCharacters: 10 })));
check("oversized character budget rejected", () => assert.throws(() => builder.build({ mode: "vault-only", projectId: "malware", query: "Skyquake", maxCharacters: 20000 })));
check("record count limited", () => assert.throws(() => builder.build({ mode: "vault-only", projectId: "malware", query: "Skyquake", maxRecords: 100 })));
check("bounded snippets", () => assert.equal(builder.build({ mode: "vault-only", projectId: "malware", query: "Skyquake", maxRecords: 1 }).snippets.length, 1));
check("omission recorded", () => assert.ok(builder.build({ mode: "vault-only", projectId: "malware", query: "Skyquake", maxRecords: 1 }).omitted >= 1));
check("cross scope injected result rejected", () => assert.throws(() => new OH5ContextAssembler({ search: () => [{ ...hits[0], projectId: "vestige" }] }).build({ mode: "vault-only", projectId: "malware", query: "Skyquake" })));
check("no citations without evidence", () => assert.deepEqual(composeEvidenceAnswer(builder.build({ mode: "vault-first", projectId: "vestige", query: "Skyquake" })).citations, []));
check("model context includes memory id", () => assert.match(formatContextForModel(packet), /mem-1/));
console.log(`OH-5I GROUNDED CONTEXT: PASS ${total}/${total}`);