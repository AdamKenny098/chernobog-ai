// packages/vault/src/phoneOwnerMemory.ts
import { createRequire } from "node:module";
import { mkdirSync, chmodSync } from "node:fs";
import path from "node:path";
import { randomUUID, createHash } from "node:crypto";

// packages/vault/src/oh5/governance.ts
var trusted = /* @__PURE__ */ new Set(["owner-ui", "owner-voice", "owner-cli"]);
var validProject = (value) => typeof value === "string" && /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(value) && value.length <= 80;
var deny = (code, reason) => ({ allowed: false, code, reason });
var permit = (nextTier) => ({ allowed: true, code: "allowed", reason: "Policy validated", nextTier });
function evaluateMemoryMutation(request) {
  if (!validProject(request.projectId)) return deny("project-required", "An explicit valid project identifier is required.");
  if (request.action === "ingest") return permit("raw");
  if (request.action === "propose") {
    if (request.previousTier !== "raw" && request.previousTier !== "provisional")
      return deny("invalid-transition", "Only existing raw or provisional material can be proposed as a candidate.");
    return permit("candidate");
  }
  if ((request.action === "confirm" || request.action === "reject" || request.action === "archive" || request.action === "supersede") && (!request.previousTier || !request.memoryId?.trim()))
    return deny("state-required", "A prior memory tier and target memory ID are required.");
  if (!trusted.has(request.channel)) return deny("untrusted-authority", "External messages and models cannot change confirmed decisions.");
  const approval = request.approval;
  if (!approval || approval.actor !== "owner" || approval.trustedChannel !== request.channel || approval.action !== request.action || approval.projectId !== request.projectId || approval.memoryId !== request.memoryId || !approval.approvalId.trim() || !approval.reason.trim() || !approval.evidenceRefs.length || !approval.evidenceRefs.every((ref) => !!ref.trim()) || !Number.isFinite(Date.parse(approval.confirmedAt)))
    return deny("owner-approval-required", "A matching, evidence-backed, action-scoped owner approval is required.");
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
function evaluateRetrievalScope(req) {
  if (!validProject(req.projectId)) return { allowed: false, code: "project-required", projectIds: [], auditRequired: false };
  const extra = /* @__PURE__ */ new Set();
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
  return { allowed: true, code: "allowed", projectIds: [req.projectId, ...[...extra].sort(), ...req.includeShared ? ["shared"] : []], auditRequired: extra.size > 0 || !!req.includeShared };
}

// packages/vault/src/phoneOwnerMemory.ts
var scope = "owner-personal";
var { DatabaseSync } = createRequire(import.meta.url)("node:sqlite");
var MemoryError = class extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
};
var clean = (value, maximum) => {
  if (typeof value !== "string" || !value.trim() || value.trim().length > maximum) throw new MemoryError(400, `Enter 1 to ${maximum} characters.`);
  return value.trim();
};
var stop = new Set("a an the is are was were i my me you your do does did what which how where who that this it to in of for and please about know tell remember have has can would could".split(" "));
var terms = (text) => [...new Set((text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []).filter((word) => word.length > 1 && !stop.has(word)).map((word) => /^(prefer|preference|preferences|favourite|favorite|like|likes)$/.test(word) ? "prefer" : word))];
var OwnerMemory = class {
  constructor(directory) {
    mkdirSync(directory, { recursive: true, mode: 448 });
    this.database = new DatabaseSync(path.join(directory, "owner-memory.sqlite"));
    try {
      chmodSync(path.join(directory, "owner-memory.sqlite"), 384);
      this.database.exec(`PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS owner_memory_meta(version INTEGER NOT NULL);
      INSERT INTO owner_memory_meta SELECT 1 WHERE NOT EXISTS (SELECT 1 FROM owner_memory_meta);
      CREATE TABLE IF NOT EXISTS owner_memories(id TEXT PRIMARY KEY, key TEXT NOT NULL UNIQUE, content TEXT NOT NULL, revision INTEGER NOT NULL, status TEXT NOT NULL, source TEXT NOT NULL, createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS owner_memory_audit(seq INTEGER PRIMARY KEY, id TEXT NOT NULL, action TEXT NOT NULL, revision INTEGER NOT NULL, at TEXT NOT NULL, approvalId TEXT NOT NULL);`);
      if (this.database.prepare("SELECT version FROM owner_memory_meta").get().version !== 1) throw new Error("Unsupported owner memory schema");
    } catch (error) {
      this.database.close();
      throw error;
    }
  }
  close() {
    this.database.close();
  }
  list() {
    return this.database.prepare("SELECT * FROM owner_memories ORDER BY updatedAt DESC,id").all();
  }
  authority(action, id, previousTier, replacementId) {
    const approvalId = randomUUID();
    const result = evaluateMemoryMutation({ action, projectId: scope, memoryId: id, previousTier, channel: "owner-ui", claimKind: "owner-decision", replacementId, rationale: "Explicit authenticated owner memory operation", approval: { actor: "owner", trustedChannel: "owner-ui", action, projectId: scope, memoryId: id, confirmedAt: (/* @__PURE__ */ new Date()).toISOString(), reason: "Explicit authenticated owner memory operation", evidenceRefs: ["authenticated-phone-core"], approvalId } });
    if (!result.allowed) throw new MemoryError(403, result.reason);
    return approvalId;
  }
  transaction(operation) {
    this.database.exec("BEGIN IMMEDIATE");
    try {
      const result = operation();
      this.database.exec("COMMIT");
      return result;
    } catch (error) {
      this.database.exec("ROLLBACK");
      throw error;
    }
  }
  audit(id, action, revision, approvalId) {
    this.database.prepare("INSERT INTO owner_memory_audit(id,action,revision,at,approvalId) VALUES(?,?,?,?,?)").run(id, action, revision, (/* @__PURE__ */ new Date()).toISOString(), approvalId);
  }
  save(input) {
    const content = clean(input.content, 1e3);
    const key = clean(input.key ?? this.suggestKey(content), 80).toLowerCase();
    return this.transaction(() => {
      let old;
      if (input.id !== void 0) {
        old = this.database.prepare("SELECT * FROM owner_memories WHERE id=?").get(clean(input.id, 80));
        if (!old || old.revision !== input.expectedRevision) throw new MemoryError(409, "Memory changed or was deleted. Refresh before editing.");
      }
      const duplicate = this.database.prepare("SELECT id FROM owner_memories WHERE key=? OR lower(content)=lower(?)").get(key, content);
      if (duplicate && duplicate.id !== old?.id) throw new MemoryError(409, "A memory with that label or exact fact already exists. Review and edit the existing memory.");
      if (!old && this.list().length >= 500) throw new MemoryError(409, "Memory limit reached. Review existing memories first.");
      const id = randomUUID(), now = (/* @__PURE__ */ new Date()).toISOString();
      if (old) {
        const approval2 = this.authority("supersede", old.id, "confirmed", id);
        this.database.prepare("DELETE FROM owner_memories WHERE id=?").run(old.id);
        this.audit(old.id, "superseded", old.revision, approval2);
      }
      const approval = this.authority("confirm", id, "candidate");
      const record = { id, key, content, revision: (old?.revision ?? 0) + 1, status: "confirmed", source: "owner-confirmed", createdAt: old?.createdAt ?? now, updatedAt: now };
      this.database.prepare("INSERT INTO owner_memories VALUES(?,?,?,?,?,?,?,?)").run(record.id, key, content, record.revision, record.status, record.source, record.createdAt, now);
      this.audit(id, old ? "updated" : "saved", record.revision, approval);
      return record;
    });
  }
  forget(id, expectedRevision) {
    return this.transaction(() => {
      const record = this.database.prepare("SELECT * FROM owner_memories WHERE id=?").get(clean(id, 80));
      if (!record || record.revision !== expectedRevision) throw new MemoryError(409, "Memory changed or was deleted. Refresh before deleting.");
      const approval = this.authority("supersede", record.id, "confirmed", randomUUID());
      this.database.prepare("DELETE FROM owner_memories WHERE id=?").run(record.id);
      this.audit(record.id, "forgotten", record.revision, approval);
      return record;
    });
  }
  suggestKey(content) {
    if (/\bmy name is\b/i.test(content)) return "name";
    if (/\b(?:i live in|my home is|my address is)\b/i.test(content)) return "home";
    if (/\bmy (?:favourite|favorite) (?:drink|beverage) is\b/i.test(content)) return "favourite-drink";
    return `note-${createHash("sha256").update(content.toLowerCase()).digest("hex").slice(0, 12)}`;
  }
  isRecallQuestion(message) {
    return /^(?:what(?:'s| is| are)?|where|when|who|which|do you (?:know|remember))\b.*\b(?:my|i live|i work|about me)\b/i.test(message.trim());
  }
  relevant(query, text) {
    const words = terms(query);
    const specific = words.filter((word) => !["prefer", "saved", "memory", "memories", "fact", "facts"].includes(word));
    const candidates = terms(text);
    return (specific.length ? specific : words).some((word) => candidates.includes(word));
  }
  recall(query, budget = 2400) {
    const policy = evaluateRetrievalScope({ projectId: scope });
    if (!policy.allowed || policy.projectIds.length !== 1) throw new Error("Owner memory scope rejected");
    const words = terms(query);
    if (!words.length) return [];
    const ranked = this.list().filter((record) => record.status === "confirmed" && record.source === "owner-confirmed" && this.relevant(query, record.key + " " + record.content)).map((record) => ({ record, score: words.filter((word) => terms(record.key + " " + record.content).includes(word)).length })).filter((hit) => hit.score > 0).sort((left, right) => right.score - left.score);
    const selected = [];
    let used = 0;
    for (const hit of ranked) {
      const cost = JSON.stringify(hit.record).length;
      if (used + cost > Math.min(2400, budget)) continue;
      selected.push(hit.record);
      used += cost;
      if (selected.length >= 4) break;
    }
    return selected;
  }
  command(message, previousTarget) {
    const text = message.trim().replace(/^(?:please |can you |could you )/i, "");
    if (/^(?:what do you remember(?: about me)?|show (?:my |your )?(?:saved )?memor(?:y|ies)|list (?:my |your )?memories)[?.!]*$/i.test(text)) {
      const records = this.list();
      return { reply: records.length ? records.map((record) => `${record.key}: ${record.content}`).join("\n") : "You have no saved long-term memories.", target: records.length === 1 ? records[0] : void 0 };
    }
    const remember = text.match(/^(?:remember|save (?:this |that )?(?:as )?(?:a )?memory)\b\s*(?:that\s+|this\s*:\s*)?(.+)$/i);
    if (remember && /^(?:my name|my address|my preference|my birthday|what you said|your answer)[.!]?$/i.test(remember[1].trim())) return { reply: "What exact fact would you like saved? Nothing has been saved yet." };
    if (remember && !/^(?:this|that)[.!]?$/i.test(remember[1].trim())) {
      try {
        const record = this.save({ content: remember[1].replace(/[.!]$/, "").trim() });
        return { reply: `Saved to long-term memory: ${record.content}`, target: record };
      } catch (error) {
        if (error instanceof MemoryError) return { reply: `Not saved. ${error.message}` };
        throw error;
      }
    }
    if (/^(?:remember(?: this| that)?|save (?:this|that)(?: as (?:a )?memory)?)[.!]?$/i.test(text)) return { reply: "What exact fact would you like me to remember? Say \u201CRemember that \u2026\u201D. Nothing has been saved yet." };
    const forget = text.match(/^(?:forget|delete (?:the )?memory)\s+(.+)$/i);
    if (forget) {
      const requested = forget[1].replace(/[.!?]$/, "").trim();
      const label = /^(?:where i live|my address|my home)$/i.test(requested) ? "home" : requested.toLowerCase().replace(/^my\s+/, "").replace(/\s+/g, "-");
      const records = this.list();
      const matches = /^(?:this|that)$/i.test(requested) ? records.filter((record) => record.id === previousTarget?.id && record.revision === previousTarget.revision) : records.filter((record) => record.id === requested || record.key.toLowerCase() === label || record.content.toLowerCase() === requested.toLowerCase());
      if (matches.length !== 1) return { reply: "Which saved memory should I forget? Give its exact label or ID, or select it in Memory. Nothing was deleted." };
      this.forget(matches[0].id, matches[0].revision);
      return { reply: "Removed that long-term memory. Original chat messages and backups are separate and are not erased by this command." };
    }
    if (/^(?:do not|don't) (?:remember|save)\b/i.test(text)) return { reply: "I have not saved that as long-term memory." };
    return null;
  }
};
export {
  MemoryError,
  OwnerMemory
};
