import { createRequire } from 'node:module';
import { mkdirSync, chmodSync } from 'node:fs';
import path from 'node:path';
import { randomUUID, createHash } from 'node:crypto';
import { evaluateMemoryMutation, evaluateRetrievalScope } from './oh5/governance';

const scope = 'owner-personal';
type MemoryDatabase = {
  exec(sql: string): void;
  close(): void;
  prepare(sql: string): { run(...values: unknown[]): unknown; get(...values: unknown[]): unknown; all(...values: unknown[]): unknown[] };
};
const { DatabaseSync } = createRequire(import.meta.url)('node:sqlite') as { DatabaseSync: new (filename: string) => MemoryDatabase };
export class MemoryError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
type Fact = { id: string; key: string; content: string; revision: number; status: string; source: string; createdAt: string; updatedAt: string };
const clean = (value: unknown, maximum: number) => {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > maximum) throw new MemoryError(400, `Enter 1 to ${maximum} characters.`);
  return value.trim();
};
const stop = new Set('a an the is are was were i my me you your do does did what which how where who that this it to in of for and please about know tell remember have has can would could'.split(' '));
const terms = (text: string) => [...new Set((text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []).filter(word => word.length > 1 && !stop.has(word)).map(word => /^(prefer|preference|preferences|favourite|favorite|like|likes)$/.test(word) ? 'prefer' : word))];

export class OwnerMemory {
  private database: MemoryDatabase;
  constructor(directory: string) {
    mkdirSync(directory, { recursive: true, mode: 0o700 });
    this.database = new DatabaseSync(path.join(directory, 'owner-memory.sqlite'));
    try {
    chmodSync(path.join(directory, 'owner-memory.sqlite'), 0o600);
    this.database.exec(`PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS owner_memory_meta(version INTEGER NOT NULL);
      INSERT INTO owner_memory_meta SELECT 1 WHERE NOT EXISTS (SELECT 1 FROM owner_memory_meta);
      CREATE TABLE IF NOT EXISTS owner_memories(id TEXT PRIMARY KEY, key TEXT NOT NULL UNIQUE, content TEXT NOT NULL, revision INTEGER NOT NULL, status TEXT NOT NULL, source TEXT NOT NULL, createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS owner_memory_audit(seq INTEGER PRIMARY KEY, id TEXT NOT NULL, action TEXT NOT NULL, revision INTEGER NOT NULL, at TEXT NOT NULL, approvalId TEXT NOT NULL);`);
    if ((this.database.prepare('SELECT version FROM owner_memory_meta').get() as { version: number }).version !== 1) throw new Error('Unsupported owner memory schema');
    } catch (error) { this.database.close(); throw error; }
  }
  close() { this.database.close(); }
  list(): Fact[] { return this.database.prepare('SELECT * FROM owner_memories ORDER BY updatedAt DESC,id').all() as Fact[]; }
  private authority(action: 'confirm' | 'supersede', id: string, previousTier: 'candidate' | 'confirmed', replacementId?: string) {
    const approvalId = randomUUID();
    const result = evaluateMemoryMutation({ action, projectId: scope, memoryId: id, previousTier, channel: 'owner-ui', claimKind: 'owner-decision', replacementId, rationale: 'Explicit authenticated owner memory operation', approval: { actor: 'owner', trustedChannel: 'owner-ui', action, projectId: scope, memoryId: id, confirmedAt: new Date().toISOString(), reason: 'Explicit authenticated owner memory operation', evidenceRefs: ['authenticated-phone-core'], approvalId } });
    if (!result.allowed) throw new MemoryError(403, result.reason);
    return approvalId;
  }
  private transaction<T>(operation: () => T): T {
    this.database.exec('BEGIN IMMEDIATE');
    try { const result = operation(); this.database.exec('COMMIT'); return result; }
    catch (error) { this.database.exec('ROLLBACK'); throw error; }
  }
  private audit(id: string, action: string, revision: number, approvalId: string) { this.database.prepare('INSERT INTO owner_memory_audit(id,action,revision,at,approvalId) VALUES(?,?,?,?,?)').run(id, action, revision, new Date().toISOString(), approvalId); }
  save(input: { key?: unknown; content: unknown; id?: unknown; expectedRevision?: unknown }): Fact {
    const content = clean(input.content, 1000);
    const key = clean(input.key ?? this.suggestKey(content), 80).toLowerCase();
    return this.transaction(() => {
      let old: Fact | undefined;
      if (input.id !== undefined) {
        old = this.database.prepare('SELECT * FROM owner_memories WHERE id=?').get(clean(input.id, 80)) as Fact | undefined;
        if (!old || old.revision !== input.expectedRevision) throw new MemoryError(409, 'Memory changed or was deleted. Refresh before editing.');
      }
      const duplicate = this.database.prepare('SELECT id FROM owner_memories WHERE key=? OR lower(content)=lower(?)').get(key, content) as { id: string } | undefined;
      if (duplicate && duplicate.id !== old?.id) throw new MemoryError(409, 'A memory with that label or exact fact already exists. Review and edit the existing memory.');
      if (!old && this.list().length >= 500) throw new MemoryError(409, 'Memory limit reached. Review existing memories first.');
      const id = randomUUID(), now = new Date().toISOString();
      if (old) {
        const approval = this.authority('supersede', old.id, 'confirmed', id);
        this.database.prepare('DELETE FROM owner_memories WHERE id=?').run(old.id);
        this.audit(old.id, 'superseded', old.revision, approval);
      }
      const approval = this.authority('confirm', id, 'candidate');
      const record: Fact = { id, key, content, revision: (old?.revision ?? 0) + 1, status: 'confirmed', source: 'owner-confirmed', createdAt: old?.createdAt ?? now, updatedAt: now };
      this.database.prepare('INSERT INTO owner_memories VALUES(?,?,?,?,?,?,?,?)').run(record.id, key, content, record.revision, record.status, record.source, record.createdAt, now);
      this.audit(id, old ? 'updated' : 'saved', record.revision, approval);
      return record;
    });
  }
  forget(id: unknown, expectedRevision: unknown) {
    return this.transaction(() => {
      const record = this.database.prepare('SELECT * FROM owner_memories WHERE id=?').get(clean(id, 80)) as Fact | undefined;
      if (!record || record.revision !== expectedRevision) throw new MemoryError(409, 'Memory changed or was deleted. Refresh before deleting.');
      const approval = this.authority('supersede', record.id, 'confirmed', randomUUID());
      this.database.prepare('DELETE FROM owner_memories WHERE id=?').run(record.id);
      this.audit(record.id, 'forgotten', record.revision, approval);
      return record;
    });
  }
  suggestKey(content: string) {
    if (/\bmy name is\b/i.test(content)) return 'name';
    if (/\b(?:i live in|my home is|my address is)\b/i.test(content)) return 'home';
    if (/\bmy (?:favourite|favorite) (?:drink|beverage) is\b/i.test(content)) return 'favourite-drink';
    return `note-${createHash('sha256').update(content.toLowerCase()).digest('hex').slice(0, 12)}`;
  }
  isRecallQuestion(message: string) { return /^(?:what(?:'s| is| are)?|where|when|who|which|do you (?:know|remember))\b.*\b(?:my|i live|i work|about me)\b/i.test(message.trim()); }
  relevant(query: string, text: string) {
    const words = terms(query);
    const specific = words.filter(word => !['prefer', 'saved', 'memory', 'memories', 'fact', 'facts'].includes(word));
    const candidates = terms(text);
    return (specific.length ? specific : words).some(word => candidates.includes(word));
  }
  recall(query: string, budget = 2400): Fact[] {
    const policy = evaluateRetrievalScope({ projectId: scope });
    if (!policy.allowed || policy.projectIds.length !== 1) throw new Error('Owner memory scope rejected');
    const words = terms(query);
    if (!words.length) return [];
    const ranked = this.list().filter(record => record.status === 'confirmed' && record.source === 'owner-confirmed' && this.relevant(query, record.key + ' ' + record.content)).map(record => ({ record, score: words.filter(word => terms(record.key + ' ' + record.content).includes(word)).length })).filter(hit => hit.score > 0).sort((left, right) => right.score - left.score);
    const selected: Fact[] = [];
    let used = 0;
    for (const hit of ranked) { const cost = JSON.stringify(hit.record).length; if (used + cost > Math.min(2400, budget)) continue; selected.push(hit.record); used += cost; if (selected.length >= 4) break; }
    return selected;
  }
  command(message: string, previousTarget?: { id: string; revision: number }): { reply: string; target?: { id: string; revision: number } } | null {
    const text = message.trim().replace(/^(?:please |can you |could you )/i, '');
    if (/^(?:what do you remember(?: about me)?|show (?:my |your )?(?:saved )?memor(?:y|ies)|list (?:my |your )?memories)[?.!]*$/i.test(text)) {
      const records = this.list();
      return { reply: records.length ? records.map(record => `${record.key}: ${record.content}`).join('\n') : 'You have no saved long-term memories.', target: records.length === 1 ? records[0] : undefined };
    }
    const remember = text.match(/^(?:remember|save (?:this |that )?(?:as )?(?:a )?memory)\b\s*(?:that\s+|this\s*:\s*)?(.+)$/i);
    if (remember && /^(?:my name|my address|my preference|my birthday|what you said|your answer)[.!]?$/i.test(remember[1].trim())) return { reply: 'What exact fact would you like saved? Nothing has been saved yet.' };
    if (remember && !/^(?:this|that)[.!]?$/i.test(remember[1].trim())) {
      try { const record = this.save({ content: remember[1].replace(/[.!]$/, '').trim() }); return { reply: `Saved to long-term memory: ${record.content}`, target: record }; }
      catch (error) { if (error instanceof MemoryError) return { reply: `Not saved. ${error.message}` }; throw error; }
    }
    if (/^(?:remember(?: this| that)?|save (?:this|that)(?: as (?:a )?memory)?)[.!]?$/i.test(text)) return { reply: 'What exact fact would you like me to remember? Say “Remember that …”. Nothing has been saved yet.' };
    const forget = text.match(/^(?:forget|delete (?:the )?memory)\s+(.+)$/i);
    if (forget) {
      const requested = forget[1].replace(/[.!?]$/, '').trim();
      const label = /^(?:where i live|my address|my home)$/i.test(requested) ? 'home' : requested.toLowerCase().replace(/^my\s+/, '').replace(/\s+/g, '-');
      const records = this.list();
      const matches = /^(?:this|that)$/i.test(requested) ? records.filter(record => record.id === previousTarget?.id && record.revision === previousTarget.revision) : records.filter(record => record.id === requested || record.key.toLowerCase() === label || record.content.toLowerCase() === requested.toLowerCase());
      if (matches.length !== 1) return { reply: 'Which saved memory should I forget? Give its exact label or ID, or select it in Memory. Nothing was deleted.' };
      this.forget(matches[0].id, matches[0].revision);
      return { reply: 'Removed that long-term memory. Original chat messages and backups are separate and are not erased by this command.' };
    }
    if (/^(?:do not|don't) (?:remember|save)\b/i.test(text)) return { reply: 'I have not saved that as long-term memory.' };
    return null;
  }
}
