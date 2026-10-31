import { randomUUID, createHash } from "node:crypto";
import { GovernedMemoryStore, defaultOH5BDatabasePath } from "@/packages/vault/src/oh5/store";
import { OH5ObsidianLayout, defaultObsidianRoot } from "@/packages/vault/src/oh5/layout";

/** Strict, deterministic bridge for explicitly named test milestones. No LLM can approve a write. */
export function parseGovernedMilestoneCommand(message: string):
  | { kind: "propose" | "confirm"; name: string; projectId: string; fictional: true }
  | null {
  const text = message.trim();
  if (!/\b(?:fictional|test|testing|acceptance-test)\b/i.test(text)) return null;
  const name = text.match(/\b(Project\s+[A-Za-z][A-Za-z0-9-]{1,60})\b/i)?.[1]?.replace(/\s+/g, " ");
  if (!name) return null;
  const projectId = /\b(?:for|under|of)\s+(?:the\s+)?Chernobog\s+project\b/i.test(text) || /\bChernobog(?:'s)?\s+(?:next\s+)?development milestone\b/i.test(text)
    ? "chernobog" : null;
  if (!projectId) return null;
  if (/\b(?:do not|don't|not to)\s+confirm\b/i.test(text) && /\b(?:propose|proposal)\b/i.test(text)) {
    return { kind: "propose", name, projectId, fictional: true };
  }
  if (/^\s*(?:please\s+)?(?:lock\s+in|confirm)\b/i.test(text) && /\b(?:milestone|memory)\b/i.test(text)) {
    return { kind: "confirm", name, projectId, fictional: true };
  }
  return null;
}

export function executeGovernedMilestoneCommand(
  message: string,
  opts: { authenticated: boolean; sessionId: string; dbPath?: string; vaultRoot?: string },
): string | null {
  const command = parseGovernedMilestoneCommand(message);
  if (!command) return null;
  if (!opts.authenticated) return "OH5 memory operation refused: authenticated owner token required. No changes made.";
  const store = new GovernedMemoryStore(opts.dbPath ?? defaultOH5BDatabasePath());
  try {
    const layout = new OH5ObsidianLayout(opts.vaultRoot ?? defaultObsidianRoot());
    if (!layout.projectRegistered(command.projectId)) {
      return `OH5 memory operation refused: project ${command.projectId} is not registered. No changes made.`;
    }
    const candidates = store.list(command.projectId, { tiers: ["raw", "candidate", "provisional", "confirmed"], limit: 100 });
    const matching = candidates.filter(r => r.body.includes(`Test milestone: ${command.name}\n`) && r.body.includes("Classification: fictional acceptance-test data"));
    if (command.kind === "propose") {
      if (matching.length) return `OH5 proposal already exists: ${matching.map(r => `${r.id} (${r.tier}, revision ${r.revision})`).join(", ")}. No changes made.`;
      const sourceRef = `owner-chat:${opts.sessionId}:${createHash("sha256").update(message).digest("hex")}`;
      const body = `Test milestone: ${command.name}\nClassification: fictional acceptance-test data\nProject: ${command.projectId}\nNot a real development decision.\nOwner proposal: ${message}`;
      const raw = store.ingest({ projectId: command.projectId, body, sourceRef, channel: "owner-ui" });
      const candidate = store.propose({ projectId: command.projectId, id: raw.id, expectedRevision: raw.revision, channel: "owner-ui" });
      layout.projectFromGovernedStore(store, command.projectId, candidate.id);
      return `OH5 candidate persisted: ${command.name}; project=${candidate.projectId}; tier=${candidate.tier}; id=${candidate.id}; revision=${candidate.revision}; fictional acceptance-test data. Not confirmed.`;
    }
    const pending = matching.filter(r => r.tier === "candidate" || r.tier === "provisional");
    if (pending.length !== 1) return `OH5 confirmation refused: expected exactly one matching candidate for ${command.name}; found ${pending.length}. No changes made.`;
    const candidate = pending[0];
    const approvalId = randomUUID();
    const confirmed = store.ownerDecision({
      action: "confirm", projectId: command.projectId, id: candidate.id,
      expectedRevision: candidate.revision,
      reason: "Owner explicitly confirmed fictional acceptance-test milestone; not a real development decision.",
      evidenceRefs: [candidate.sourceRef, `owner-chat:${opts.sessionId}:${createHash("sha256").update(message).digest("hex")}`],
      approvalId,
    }, true);
    layout.projectFromGovernedStore(store, command.projectId, confirmed.id);
    const verified = store.get(command.projectId, confirmed.id);
    if (verified?.tier !== "confirmed") throw new Error("OH5 confirmation verification failed");
    return `OH5 confirmation persisted: ${command.name}; project=${verified.projectId}; tier=${verified.tier}; id=${verified.id}; revision=${verified.revision}; approvalId=${approvalId}; fictional acceptance-test data, NOT a real development decision.`;
  } catch (error) {
    return `OH5 operation failed: ${error instanceof Error ? error.message : String(error)}. Do not treat this as confirmed.`;
  } finally { store.close(); }
}
